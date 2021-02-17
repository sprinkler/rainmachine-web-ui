/*
 *	Copyright (c) 2021 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

window.ui = window.ui || {};

(function(_weather_settings) {

    var uiElems = {};

    //Separate the developers focused parsers to make the weather sources list easier to understand
    var developerParsers = {
        "My Example Parser": 1,
        "Fixed Parser": 1,
        "WeatherDisplay Parser": 1,
        "Simulator Parser": 1,
        "Weather Rules Parser": 1,
    };

    // URL to the community parsers metadata
    var communityUrl = "https://raw.githubusercontent.com/sprinkler/rainmachine-developer-resources/master/";

    function showWeather() {
        onWeatherSourceClose();
        showParsers(false, true);

        //Rain, Wind, Days sensitivity
        var rs = Data.provision.location.rainSensitivity;
        var ws = Data.provision.location.windSensitivity;
        var fc = Data.provision.location.wsDays; //TODO global field capacity no longer used as Watersense is per zones
        var correctionPast = Data.provision.system.useCorrectionForPast;

        var rsElem = $("#rainSensitivity");
        var wsElem = $("#windSensitivity");
        var correctionPastElem = $("#weatherCorrectionPast");

        var rsSaveElem = $("#rainSensitivitySave");
        var wsSaveElem = $("#windSensitivitySave");
        var correctionPastSet = $("#weatherCorrectionPastSet");

        var rsDefaultElem = $("#rainSensitivityDefault");
        var wsDefaultElem = $("#windSensitivityDefault");

        //Set the current values
        rsElem.value = parseInt(rs * 100);
        rsElem.oninput();

        wsElem.value = parseInt(ws * 100);
        wsElem.oninput();

        correctionPastElem.checked = correctionPast;

        uiFeedback.sync(rsSaveElem, function() {
            var rsNew = +rsElem.value / 100.0;
            var data = { rainSensitivity: rsNew };
            console.log("Set Rain Sensitivity: %f", rsNew);
            return API.setProvision(null, data);

        });

        uiFeedback.sync(wsSaveElem, function() {
            var wsNew = +wsElem.value / 100.0;
            var data = { windSensitivity: wsNew };
            console.log("Set Wind Sensitivity: %f", wsNew);
            return API.setProvision(null, data);
        });

        uiFeedback.sync(correctionPastSet, function() {
            return window.ui.system.changeSingleSystemProvisionValue("useCorrectionForPast", correctionPastElem.checked);
        });

        rsDefaultElem.onclick = function() {
            rsElem.value = rsDefaultElem.value;
            rsElem.oninput();
            Data.provision = API.getProvision();
        };
        wsDefaultElem.onclick = function() {
            wsElem.value = wsDefaultElem.value;
            wsElem.oninput();
            Data.provision = API.getProvision();
        };

        var updateWeatherButton = $('#weatherSourcesRun');
        uiFeedback.sync(updateWeatherButton, onWeatherSourceRun);

        var fetchWeatherServicesButton = $("#weatherServicesFetch");
        fetchWeatherServicesButton.onclick = function() { onWeatherServicesFetch() };

        setupWeatherSourceUpload();
        onDOYET0Fetch();
    }

    function showParsers(onDashboard, fetchData, callback) {
        APIAsync.getParsers().then(function(o) {
            Data.parsers = o;
            APIAsync.getEx(communityUrl + "version-metadata.json").then(function(o) {
                var builtin = Data.parsers.parsers;

                var tmpMap = {};
                for (var i = 0; i < builtin.length; i++) {
                    tmpMap[builtin[i].name] = i;
                    builtin[i].installed = true;
                }

                for (var file in o.files) {
                    var parserInfo = {};
                    var name = o.files[file].name;

                    parserInfo.name = name;
                    parserInfo.custom = true;
                    parserInfo.description = o.files[file].description;
                    parserInfo.latestVersion = o.files[file].version;
                    parserInfo.author = o.files[file].author;
                    parserInfo.instructions = o.files[file].instructions;
                    parserInfo.installed = false;
                    parserInfo.hasUpdate = false;
                    parserInfo.url = file;

                    // Loop over installed parsers and update properties. Also checks for version update
                    if (name in tmpMap) {
                        var installedParser = builtin[tmpMap[name]];
                        parserInfo.installed = true;
                        if (+installedParser.version < +parserInfo.latestVersion) {
                            parserInfo.hasUpdate = true;
                        }
                        Object.assign(installedParser, parserInfo);
                        console.log("FOUND INSTALLED")
                        console.log(installedParser);
                    } else {
                        Data.parsers.parsers.push(parserInfo);
                    }
                }

                // Sort the list by enabled state and name
                Data.parsers.parsers.sort(sortParserByEnabledAndName);
                updateParsers(onDashboard);

                if (fetchData) {
                    onWeatherServicesFetch();
                }

                if (callback) {
                    callback();
                }
            });
        })
    }

    function updateParsers(onDashboard) {
        var containerNormal = $('#weatherDataSourcesList');
        var containerDeveloper = $('#weatherDataSourcesListDeveloper'); //container for separating developer parsers
        var containerCommunity = $('#weatherDataSourcesListUploaded'); //container for separating user uploaded parsers
        var containerDashboard = $('#weatherDataSourcesSimpleList'); //container for showing on dashboard
        var container = containerNormal;
        var disabledParsers = 0;

        if (onDashboard) {
            container = containerDashboard
        }

        clearTag(container);
        clearTag(containerDeveloper);
        clearTag(containerCommunity);

        for (var i = 0; i < Data.parsers.parsers.length; i++) {
            var p = Data.parsers.parsers[i];
            var template;
            var activeElem;
            var nameElem;
            var descriptionElem;
            var lastRunElem;
            var hasForecastElem;
            var hasHistoryElem;

            if (onDashboard && !p.enabled) {
                continue;
            }

            // Don't show optional built-in parsers but count them so we can add a "Show More" button
            if (!(onDashboard || Data.sharedSettings.showOptionalParsers || p.enabled || p.custom)) {
                disabledParsers++;
                continue;
            }

            //Separate the parsers list in these 2 categories
            if (!onDashboard) {
                if (p.name in developerParsers) {
                    container = containerDeveloper;
                } else {
                    container = containerNormal;
                }
            }

            // Load proper template
            if (onDashboard) {
                template = loadTemplate("weather-sources-simple-template");
            } else {
                template = loadTemplate("weather-sources-template");
                activeElem = $(template, '[rm-id="weather-source-enable"]');
                descriptionElem = $(template, '[rm-id="weather-source-description"]');
                hasForecastElem = $(template, '[rm-id="weather-source-hasforecast"]');
                hasHistoryElem = $(template, '[rm-id="weather-source-hashistory"]');
                essentialElem = $(template, '[rm-id="weather-source-essential"]');
                installedElem = $(template, '[rm-id="weather-source-installed"]');
                updateElem = $(template, '[rm-id="weather-source-update"]');
                descriptionElem.textContent = p.description;

                toggleAttr(activeElem, p.enabled);
                toggleAttr(hasForecastElem, p.hasForecast, "circle");
                toggleAttr(hasHistoryElem, p.hasHistorical, "circle");
            }

            nameElem = $(template, '[rm-id="weather-source-name"]');
            lastRunElem = $(template, '[rm-id="weather-source-lastrun"]');

            template.parserid = p.uid;
            template.parseridx = i;

            var parserName = p.name;
            var lw = parserName.lastIndexOf(" ");

            if (lw > 0 && parserName.substring(lw + 1, parserName.length) == "Parser") {
                parserName = parserName.substring(0, lw); // Don't show "Parser" word in weather parsers
            }

            if ((parserName === "NOAA" || parserName === "METNO") && !onDashboard) {
                makeVisibleBlock(essentialElem, true);
            }

            if (p.custom) {
                if (!onDashboard) {
                    container = containerCommunity;

                    if (p.installed) {
                        if (p.hasUpdate) {
                            makeVisibleBlock(updateElem, true);
                        } else {
                            makeVisibleBlock(installedElem, true)
                        }
                    }
                }
            }

            nameElem.textContent = parserName;

            if (p.enabled) {
                if (p.lastKnownError === "") {
                    if (p.lastRun !== null)
                        lastRunElem.textContent = "Success";
                    else
                        lastRunElem.textContent = "Never";
                } else {
                    lastRunElem.style.color = "red";
                    if (!onDashboard) {
                        lastRunElem.textContent = p.lastKnownError;
                    } else {
                        lastRunElem.textContent = "Issues";
                    }
                }
            } else {
                lastRunElem.textContent = "	";
            }

            //template.onclick = function() { APIAsync.getParsers(this.parserid).then(function(parserData){ showParserDetails(parserData.parser) }); }
            if (!onDashboard) {
                template.onclick = function() { showParserDetails(Data.parsers.parsers[this.parseridx]); }
            }
            container.appendChild(template);
        }

        if (disabledParsers > 0) {
            var showMoreElem = addTag(containerNormal, "div");
            showMoreElem.textContent = "Show " + disabledParsers + " more optional services";
            showMoreElem.className = "displayOptionalWeatherServices center";
            showMoreElem.onclick = function() {
                Data.sharedSettings.showOptionalParsers = !Data.sharedSettings.showOptionalParsers;
                window.ui.settings.updateParsers();
            }
        }
    }

    function showParserDetails(p) {
        if (!p) {
            console.error("No parser data");
            return;
        }

        var weatherDataSourcesEditContent = $('#weatherSourcesEditContent');
        var saveButton = $('#weatherSourcesEditSave');
        var closeButton = $('#weatherSourcesEditClose');
        var resetButton = $('#weatherSourcesEditDefaults');

        clearTag(weatherDataSourcesEditContent);
        makeHidden('#weatherSourcesList');
        makeVisible('#weatherSourcesEdit');

        var template = loadTemplate("weather-sources-details-template");
        var runButton = $(template, '[rm-id="weatherSourcesEditRun"]');
        var nameElem = $(template, '[rm-id="weather-source-name"]');
        var enabledElem = $(template, '[rm-id="weather-source-enable"]');
        var lastRunElem = $(template, '[rm-id="weather-source-lastrun"]');
        var paramsCommonElem = $(template, '[rm-id="weather-source-common-params"]');
        var paramsElem = $(template, '[rm-id="weather-source-params"]');
        var descriptionElem = $(template, '[rm-id="weather-source-description"]');
        var authorElem = $(template, '[rm-id="weather-source-author"]');
        var versionElem = $(template, '[rm-id="weather-source-current-version"]');
        var instructionsElem = $(template, '[rm-id="weather-source-instructions"]');

        var updateButton = $(template, '[rm-id="weather-source-update"]');
        var installButton = $(template, '[rm-id="weather-source-install"]');
        var deleteButton = $(template, '[rm-id="weather-source-delete"]');


        nameElem.textContent = p.name;
        descriptionElem.textContent = p.description;

        enabledElem.checked = p.enabled;
        enabledElem.id = 'weatherSourceStatus-' + p.uid;
        lastRunElem.textContent = p.lastRun ? p.lastRun : "Never";

        if (!p.installed && p.custom) {
            makeHidden(paramsCommonElem);
            makeHidden(runButton);
            makeHidden(resetButton);
        } else {
            makeVisible(paramsCommonElem);
            makeVisibleBlock(runButton);
            makeVisibleBlock(resetButton);
        }

        if (p.params) {
            if (window.ui.weatherservices.custom.hasOwnProperty(p.name)) {
                console.log("Found custom UI for %s ", p.name);
                window.ui.weatherservices.custom[p.name].render(paramsElem, p.params);
            } else {
                //Automatically generated
                for (param in p.params) {
                    Util.generateTagFromDataType(paramsElem, p.params[param], param);
                }
            }
        }

        // we only allow delete on custom uploaded parsers
        if (p.custom) {
            if (p.author) {
                makeVisible(authorElem);
                authorElem.textContent = "Author: " + p.author;
            }

            if (p.version) {
                makeVisible(versionElem);
                versionElem.textContent = "Version: " + p.version;
                if (p.hasUpdate) {
                    versionElem.textContent += " Available: " + p.latestVersion;
                }
            }

            if (p.instructions) {
                var linkHtml = Util.convertToHtmlLink(p.instructions);

                if (linkHtml) {
                    instructionsElem.innerHTML = linkHtml

                } else {
                    instructionsElem.textContent = p.instructions;
                }
                makeVisible(instructionsElem);
            }

            if (p.installed) {
                deleteButton.onclick = function() { onWeatherSourceDelete(p.uid); };
                makeVisible(deleteButton);
            }
        }

        if (p.installed || !p.hasOwnProperty('installed')) {
            makeHidden(installButton);
        }

        if (!p.hasUpdate || !p.installed) {
            makeHidden(updateButton);
        }

        weatherDataSourcesEditContent.appendChild(template);

        closeButton.onclick = onWeatherSourceClose;
        uiFeedback.sync(saveButton, function() { return onWeatherSourceSave(p.uid); });
        uiFeedback.sync(runButton, function() { return onWeatherSourceRun(p.uid); });
        uiFeedback.sync(resetButton, function() { return onWeatherSourceReset(p.uid); });
        installButton.onclick = function() { onDownloadAndInstallSource(p, installButton); };
        updateButton.onclick = function() { onDownloadAndInstallSource(p, updateButton); };
    }

    function onDownloadAndInstallSource(parser, elem) {
        var url = parser.url;
        console.log("DOWNLOAD AND INSTALL %s", url);
        APIAsync.getEx(communityUrl + url, true)
            .start(uiFeedback.start, elem)
            .then(function(o) {
                var filename = url.split("/").pop();
                var data = new FormData();
                data.append(filename, o);

                var extraInfo = {
                    type: "community",
                    version: parser.latestVersion
                };

                var r = API.uploadParser(filename, data, extraInfo);
                if (r && r.statusCode == 0) {
                    uiFeedback.done(elem);
                    // Automatically refresh the new parser details window
                    showParsers(false, false, function() {
                        for (var i = 0; i < Data.parsers.parsers.length; i++) {
                            if (Data.parsers.parsers[i].name == parser.name) {
                                showParserDetails(Data.parsers.parsers[i]);
                            }
                        }
                    });
                } else {
                    uiFeedback.error(elem);
                }
            })
            .error(uiFeedback.error, elem);
    }


    function onWeatherSourceClose() {
        makeHidden('#weatherSourcesEdit');
        makeVisibleBlock('#weatherSourcesList');
    }

    function onWeatherSourceRun(id) {
        var withMixer = false;

        if (id === undefined || id === null) {
            id = -1;
            withMixer = true;
        }

        //Allow some time after a parser refresh was issued so that the parser finish downloading data
        var r = API.runParser(id, true, withMixer, false);

        setTimeout(function() {
            showParsers(false, true, function() {
                for (var i = 0; i < Data.parsers.parsers.length; i++) {
                    if (id > 0 && Data.parsers.parsers[i].uid == id) {
                        showParserDetails(Data.parsers.parsers[i]);
                    }
                }
            });
        }, 4000);


        window.ui.main.refreshGraphs = true; //Force refresh of graphs
        return r;
    }

    function onWeatherSourceReset(id) {
        var r = API.resetParserParams(id);
        showParsers(false, true, function() {
            for (var i = 0; i < Data.parsers.parsers.length; i++) {
                if (Data.parsers.parsers[i].uid == id) {
                    showParserDetails(Data.parsers.parsers[i]);
                }
            }
        });


        return r;
    }

    function onWeatherSourceDelete(id) {
        var r = API.deleteParser(id);
        if (r === undefined || !r || r.statusCode != 0) {
            console.error("Can't delete parser %d: %o", id, r);
            return null;
        }
        showParsers(false, false);
        onWeatherSourceClose();

        return r;
    }

    function onWeatherSourceSave(id) {
        var shouldSaveEnable = false;
        var shouldSaveParams = false;
        var r = null;

        var p = null;
        for (var i = 0; i < Data.parsers.parsers.length; i++) {
            if (Data.parsers.parsers[i].uid == id) {
                p = Data.parsers.parsers[i];
                break;
            }
        }

        if (!p) {
            console.error("Parser id not found in list !");
            return null;
        }

        var enabledElem = $("#weatherSourceStatus-" + p.uid);
        if (enabledElem != p.enabled) {
            console.log("Parser %s changed configuration from %s to %s", p.name, p.enabled, enabledElem.checked)
            shouldSaveEnable = true;
        }

        var newParams = {};
        if (p.params) {
            if (window.ui.weatherservices.custom.hasOwnProperty(p.name)) {
                console.log("Found custom save function for %s ", p.name);
                newParams = window.ui.weatherservices.custom[p.name].save(p.params);
                if (newParams !== null) {
                    console.log("Parameters have been changed, saving.");
                    shouldSaveParams = true;
                }
            } else {
                //Read automatically generated tags
                for (param in p.params) {
                    var t = Util.readGeneratedTagValue(param);
                    if (t && t.length == 2) {
                        newParams[t[0]] = t[1];
                    }

                    if (p.params[param] != t[1]) {
                        shouldSaveParams = true;
                    }
                }
            }

        }

        if (shouldSaveEnable) {
            console.log("Setting weather source %d to %o", p.uid, enabledElem.checked);
            r = API.setParserEnable(p.uid, enabledElem.checked);
            console.log(r);
        }

        if (shouldSaveParams) {
            r = API.setParserParams(p.uid, newParams);
            console.log(r);
        }

        if (shouldSaveEnable || shouldSaveParams) {
            showParsers(false, false);
            //onWeatherSourceClose();
            return r;
        }

        return {}; //dummy return for uiFeedback
    }

    function setupWeatherSourceUpload() {
        if (uiElems.hasOwnProperty("weatherSources"))
            return;

        uiElems.weatherSources = {};
        uiElems.weatherSources.Upload = {};

        uiElems.weatherSources.Add = $('#weatherSourcesAdd');
        uiElems.weatherSources.Upload.Close = $('#weatherSourcesUploadClose');
        uiElems.weatherSources.Upload.File = $('#weatherSourcesUploadFile');
        uiElems.weatherSources.Upload.Upload = $('#weatherSourcesUploadUpload');
        uiElems.weatherSources.Upload.Status = $('#weatherSourcesUploadStatus');

        uiElems.weatherSources.Add.onclick = function() {
            makeHidden("#weatherSourcesList");
            makeVisible("#weatherSourcesUpload");
        };

        uiElems.weatherSources.Upload.Close.onclick = function() {
            makeVisibleBlock("#weatherSourcesList");
            makeHidden("#weatherSourcesUpload");
            uiElems.weatherSources.Upload.Status.textContent = "Please select a python source file (.py extension).";
        };

        uiElems.weatherSources.Upload.Upload.onclick = function() {
            if (Util.parseVersion(Data.provision.api.swVer).revision < 978) {
                //Async load file from disk and send REST POST
                Util.loadFileFromDisk(uiElems.weatherSources.Upload.File.files, onParserLoad, true);
            } else {
                //Send file as FormData()
                var o = uiElems.weatherSources.Upload.Status;
                var files = uiElems.weatherSources.Upload.File.files;
                var status = {
                    message: null,
                    data: new FormData(),
                    file: null
                };

                if (!files || files.length < 0) {
                    status = "No files selected";
                } else {
                    status.file = files[0];
                    status.data.append(status.file.name, status.file);
                }
                onParserLoad(status, true);
            }
        };
    }

    function onParserLoad(status, useFormData) {
        if (!defined(useFormData)) useFormData = False;

        var o = uiElems.weatherSources.Upload.Status;
        if (status.message) {
            o.textContent = status.message;
        }

        if (status.data && status.file) {
            o.textContent = "Uploading file " + status.file.name;
            var r = null;
            if (useFormData)
                r = API.uploadParser(status.file.name, status.data);
            else
                r = API.uploadParserOld(status.file.name, status.file.type, status.data);

            if (r === undefined || !r || r.statusCode != 0) {
                o.textContent = "Error uploading " + status.file.name;
                if (r.message) {
                    o.textContent += ": " + r.message;
                }
            } else {
                o.textContent = "Successful uploaded " + status.file.name + " !";
                showParsers(false, false);
            }
        }
    }

    function onWeatherServicesFetch() {
        var startDateElem = $("#weatherServicesStartDate");
        var daysElem = $("#weatherServicesDays");

        // For parsers we want 8 days from which 1 day in the past rest in the future
        if (!startDateElem.value || !daysElem.value) {
            startDateElem.value = Util.getDateWithDaysDiff(1);
            daysElem.value = 8;
        }

        console.log("Getting weather services data starting from %s for %d days...", startDateElem.value, parseInt(daysElem.value));
        getAllEnabledParsersData(startDateElem.value, parseInt(daysElem.value));
    }

    function sortParserByEnabledAndName(a, b) {

        if (a.name.startsWith("NOAA") || a.name.startsWith("METNO")) {
            return -1;
        } else if (b.name.startsWith("NOAA") || b.name.startsWith("METNO")) {
            return 1;
        } else if (a.enabled > b.enabled) {
            return -1;
        } else if (a.installed > b.installed) {
            return -1;
        } else if ((a.enabled === b.enabled) && (a.name < b.name)) {
            return -1;
        } else {
            return 1;
        }

        return 0;
    }

    function getParserById(id) {
        for (var i = 0; i < Data.parsers.parsers.length; i++) {
            if (Data.parsers.parsers[i].uid === id)
                return Data.parsers.parsers[i];
        }
        return null;
    }


    //--------------------------------------------------------------------------------------------
    //
    //
    _weather_settings.showWeather = showWeather;
    _weather_settings.showParsers = showParsers;
    _weather_settings.updateParsers = updateParsers;

}(window.ui.weather_settings = window.ui.weather_settings || {}))