/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

window.ui = window.ui || {};

(function(_weatherservices) {
    //---------------------------------------------------------------------------------------
    // NOAA Parser Custom UI
    // 
    //
    function noaaRenderer(parent, params) {
        clearTag(parent);
        var ui = loadTemplate("weather-sources-noaa-ui");
        var uiObserved = $(ui, '[rm-id="weather-sources-noaa-stationsui"]');
        var uiAlert = $(ui, '[rm-id="weather-sources-noaa-alertui"]');
        var stationsList = $(ui, '[rm-id="weather-sources-noaa-stationslist"]');
        var useCustom = $(ui, '[rm-id="weather-sources-noaa-usecustom"]');

        useCustom.id = "weather-sources-noaa-usecustom";
        useCustom.checked = params.useObservations;
        useCustom.onclick = function() {
            if (this.checked) { makeVisible(uiObserved); } else { makeHidden(uiObserved); }
        }

        if (!useCustom.checked) {
            makeHidden(uiObserved);
        }

        if (params._stations.length > 0) {
            var markerAdded = false;
            for (var i = 0; i < params._stations.length; i++) {
                var s = params._stations[i];

                var name = s[0];
                var distance = +s[1];
                var elev = +s[2];

                if (!markerAdded && params._recommendedDistance < +distance) {
                    var elMarker = addTag(stationsList, "div");
                    elMarker.textContent = "Not recommended due to distance:";
                    elMarker.className = "subtitle";
                    markerAdded = true;
                }

                var elName = addTag(stationsList, "div");
                var elLink = addTag(elName, "a");
                var elDistance = addTag(stationsList, "div");
                var elSelected = addTag(stationsList, "input")

                elName.style.width = "150px";
                elName.style.display = "inline-block";
                elLink.setAttribute("href", "http://forecast.weather.gov/zipcity.php?inputstring=" + name);
                elLink.target = "_blank";
                elLink.innerText = name;
                elLink.className = "weatherStationLink";


                elDistance.style.width = "100px";
                elDistance.style.display = "inline-block";
                elDistance.textContent = Util.convert.uiDistance(distance) + Util.convert.uiDistanceStr();

                elSelected.name = "noaa_station";
                elSelected.type = "radio";
                elSelected.value = name;
                elSelected.checked = i == 0;
                addTag(stationsList, "br");
            }
        } else {
            var elNoStations = addTag(stationsList, "div");
            elNoStations.textContent = "No nearby stations found";
        }

        if (params._lastAlert) {
            var elHeadline = addTag(uiAlert, "h1");
            var elInstructions = addTag(uiAlert, "div");
            var elDescription = addTag(uiAlert, "pre");

            elHeadline.style.fontWeight = "bold";
            elHeadline.textContent = params._lastAlert.headline;
            elDescription.textContent = params._lastAlert.description;
            elInstructions.textContent = params._lastAlert.instruction;
        }

        parent.appendChild(ui);
    }

    // Returns new parameters if they are different from the old ones or null otherwise
    function noaaSave(oldparams) {
        var useCustom = $("#weather-sources-noaa-usecustom");

        var params = {};

        params.useObservations = useCustom.checked;
        params.selectedStation = document.querySelector('input[name="noaa_station"]:checked').value;

        return params;
    }

    //---------------------------------------------------------------------------------------
    // CWOP (Weather Stations) Parser Custom UI
    // 
    //	
    function cwopRenderer(parent, params) {
        clearTag(parent);
        var ui = loadTemplate("weather-sources-cwop-ui");
        var uiObserved = $(ui, '[rm-id="weather-sources-cwop-stationsui"]');
        var stationsList = $(ui, '[rm-id="weather-sources-cwop-stationslist"]');

        if (params._stations.length > 0) {
            var markerAdded = false;
            for (var i = 0; i < params._stations.length; i++) {
                var s = params._stations[i];

                var name = s[0];
                var distance = +s[1];

                if (!markerAdded && params._recommendedDistance < +distance) {
                    var elMarker = addTag(stationsList, "div");
                    elMarker.textContent = "Not recommended due to distance:";
                    elMarker.className = "subtitle";
                    markerAdded = true;
                }

                var elName = addTag(stationsList, "div");
                var elLink = addTag(elName, "a");
                var elDistance = addTag(stationsList, "div");
                var elSelected = addTag(stationsList, "input");

                elName.style.width = "150px";
                elName.style.display = "inline-block";

                elLink.setAttribute("href", "https://aprs.fi/#!call=a%2F" + name + "&timerange=3600&tail=3600");
                elLink.target = "_blank";
                elLink.innerText = name;
                elLink.className = "weatherStationLink";

                elDistance.style.width = "100px";
                elDistance.style.display = "inline-block";
                elDistance.textContent = Util.convert.uiDistance(distance) + Util.convert.uiDistanceStr();

                elSelected.name = "cwop_station";
                elSelected.type = "radio";
                elSelected.value = name;
                elSelected.checked = i == 0;

                addTag(stationsList, "br");
            }
        } else {
            var elNoStations = addTag(stationsList, "div");
            elNoStations.textContent = "No nearby stations found";
        }

        parent.appendChild(ui);
    }

    // Returns new parameters if they are different from the old ones or null otherwise
    function cwopSave(oldparams) {
        var params = {};
        params.selectedStation = document.querySelector('input[name="cwop_station"]:checked').value;

        return params;
    }

    //---------------------------------------------------------------------------------------
    // WUnderground Parser Custom UI
    // 
    //
    function wundergroundRender(parent, params) {
        clearTag(parent);
        var elUI = loadTemplate("weather-sources-wu-ui");
        var elApiKey = $(elUI, '[rm-id="weather-sources-wu-apikey"]');
        var elNoStations = $(elUI, '[rm-id="weather-sources-wu-nostations"]');
        var elStationsList = $(elUI, '[rm-id="weather-sources-wu-stationslist"]');


        elApiKey.id = "weather-sources-wu-apikey";
        elApiKey.value = params.apiKey;

        elStationsList.id = "weather-sources-wu-stationslist";

        function refreshStationsRole() {
            var currentSelected = Array.from(document.querySelectorAll('input[name="wu_station"]:checked'));
            console.log(currentSelected);
        }

        if (params._nearbyStationsIDList.length > 0) {
            makeHidden(elNoStations);
            var selectedStations = params.customStationName.split(',');
            wundergroundShowStations(params, elStationsList, selectedStations);
        } else {
            makeVisible(elNoStations);
        }

        parent.appendChild(elUI);
    }

    // Draws the station lists. This will be refreshed everytime user changes a selection
    function wundergroundShowStations(params, container, selectedStations) {
        clearTag($('#weather-sources-wu-stationslist'));

        for (var i = 0; i < params._nearbyStationsIDList.length; i++) {
            var tokens = params._nearbyStationsIDList[i].split("(");
            var name = tokens[0].trim();
            var distance = tokens[1].split(";")[0];

            var elName = addTag(container, "div");
            var elLink = addTag(elName, "a");
            var elDistance = addTag(container, "div");
            var elSelected = addTag(container, "input");
            var elType = addTag(container, "div");

            elName.style.width = "250px";
            elName.style.display = "inline-block";

            elLink.setAttribute("href", "https://www.wunderground.com/dashboard/pws/" + name);
            elLink.target = "_blank";
            elLink.innerText = name;
            elLink.className = "weatherStationLink";

            elDistance.style.width = "100px";
            elDistance.style.display = "inline-block";
            elDistance.textContent = Util.convert.uiDistance(distance) + Util.convert.uiDistanceStr();

            elSelected.style.display = "inline-block";
            elSelected.name = "wu_station";
            elSelected.type = "checkbox";
            elSelected.value = name;
            elSelected.checked = selectedStations.indexOf(name) > -1;
            elSelected.onclick = function() {
                var selectedStations = Array.from(
                    document.querySelectorAll('input[name="wu_station"]:checked')
                ).map(x => x.value);
                console.log(selectedStations);
                wundergroundShowStations(params, container, selectedStations);
            }

            elType.style.display = "inline-block";
            elType.name = "wu_type"; // For dinamically refreshing primary/backup info
            elType.className = "subtitle";

            if (elSelected.checked) {
                if (selectedStations.length > 1) {
                    elType.textContent = selectedStations.indexOf(name) == 0 ? "primary" : "backup"
                } else {
                    elType.textContent = "primary";
                }

            }
            addTag(container, "br");
        }
    }
    // Returns new parameters if they are different from the old ones or null otherwise
    function wundergroundSave(oldparams) {
        var apiKey = $("#weather-sources-wu-apikey");
        //var customStations = $("#weather-sources-wu-customstations");
        //var useCustom = $("#weather-sources-wu-usecustom");
        var selectedStations = Array.from(document.querySelectorAll('input[name="wu_station"]:checked'))
        var params = {};
        params.apiKey = apiKey.value;
        params.customStationName = selectedStations.map(x => x.value).join(',');
        params.useCustomStation = selectedStations.length > 0;
        console.log(params.customStationName);
        console.log(params.useCustomStation);

        if (params.apiKey == oldparams.apiKey &&
            params.useCustomStation == oldparams.useCustomStation &&
            params.customStationName == oldparams.customStationName) {
            return null;
        }

        return params;
    }


    //---------------------------------------------------------------------------------------
    // NetAtmo Parser Custom UI
    // 
    //
    function netatmoRender(parent, params) {
        clearTag(parent);
        var ui = loadTemplate("weather-sources-netatmo-ui");
        var user = $(ui, '[rm-id="weather-sources-netatmo-user"]');
        var pass = $(ui, '[rm-id="weather-sources-netatmo-pass"]');
        var modulesList = $(ui, '[rm-id="weather-sources-netatmo-modules"]');
        var showPassword = $(ui, '[rm-id="weather-sources-netatmo-showpass"]');

        var selectedModules = params.specificModules.split(',');

        user.id = "weather-sources-netatmo-user";
        user.value = params.username;
        pass.id = "weather-sources-netatmo-pass";
        pass.value = params.password;

        if (params._availableModules.length > 0) {
            var deviceName = null;
            var deviceLoc = null;
            var lastDeviceName = "";

            for (var i = 0; i < params._availableModules.length; i++) {
                var name = params._availableModules[i][0];
                var id = params._availableModules[i][1];
                // Extra parameters in newer service version
                if (params._availableModules[i].length > 2) {
                    deviceName = params._availableModules[i][2];
                    deviceLoc = params._availableModules[i][3];
                }

                if (deviceName && lastDeviceName !== deviceName) {
                    var elDeviceName = addTag(modulesList, "div");
                    elDeviceName.textContent = deviceName;
                    elDeviceName.style.textDecoration = 'underline';
                    elDeviceName.title = deviceLoc;

                    lastDeviceName = deviceName;
                }

                var elName = addTag(modulesList, "div");
                var elId = addTag(modulesList, "div");
                var elSelected = addTag(modulesList, "input");

                elName.style.width = "250px";
                elName.style.display = "inline-block";
                elName.textContent = name;

                elId.style.width = "250px";
                elId.style.display = "inline-block";
                elId.textContent = id;

                elSelected.style.display = "inline-block";
                elSelected.name = "netatmo_module";
                elSelected.type = "checkbox";
                elSelected.value = id;
                elSelected.checked = selectedModules.indexOf(id) > -1;

                addTag(modulesList, "br");
            }
        }

        showPassword.onclick = function() { togglePasswordDisplay(pass, showPassword); };
        parent.appendChild(ui);
    }

    // Returns new parameters if they are different from the old ones or null otherwise
    function netatmoSave(oldparams) {
        var user = $("#weather-sources-netatmo-user");
        var pass = $("#weather-sources-netatmo-pass");
        var selectedModules = Array.from(document.querySelectorAll('input[name="netatmo_module"]:checked'))

        var params = {};

        params.username = user.value;
        params.password = pass.value;
        params.useSpecifiedModules = selectedModules.length > 0;
        params.specificModules = selectedModules.map(x => x.value).join(',');
        console.log(params.specificModules);

        if (params.username == oldparams.username &&
            params.password == oldparams.password &&
            params.useSpecifiedModules == oldparams.useSpecifiedModules &&
            params.specificModules == oldparams.specificModules) {
            return null;
        }

        return params;
    }

    _weatherservices.custom = {
        "NOAA Parser": { "render": noaaRenderer, "save": noaaSave },
        "Weather Stations Parser": { "render": cwopRenderer, "save": cwopSave },
        "WUnderground Parser": { "render": wundergroundRender, "save": wundergroundSave },
        "Netatmo Parser": { "render": netatmoRender, "save": netatmoSave }
    };
}(window.ui.weatherservices = window.ui.weatherservices || {}));