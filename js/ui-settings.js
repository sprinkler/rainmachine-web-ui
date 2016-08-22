/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

window.ui = window.ui || {};

(function(_settings) {

	var uiElems = {};

	var waterLogReason = {
	    0: "",
        1: "Stopped by user",
        2: "Watering time below minimum threshold",
        3: "Freeze protect",
        4: "Day restriction",
        5: "Watering time reaches next day",
        6: "Water surplus",
        7: "Rain detected",
		8: "Software rain sensor restriction",
		9: "Month Restricted",
		10: "Rain Delay set by user",
		11: "Program Rain Restriction"
};

	//Separate the developers focused parsers to make the weather sources list easier to understand
	var developerParsers = {
		"My Example Parser": 1,
		"Fixed Parser": 1,
		"PWS Parser": 1,
		"Simulator Parser": 1,
		"Weather Rules Parser": 1
	};

	function showWeather()
	{
        showParsers(false);

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

		rsSaveElem.onclick = function() {
			var rsNew = +rsElem.value/100.0;
			if (rsNew != rs)
			{
				var data = {rainSensitivity: rsNew};
				API.setProvision(null, data);
				console.log("Set Rain Sensitivity: %f",  rsNew);
			}
		};

		wsSaveElem.onclick = function() {
			var wsNew = +wsElem.value/100.0;
			if (wsNew != ws)
			{
				var data = {windSensitivity: wsNew};
				API.setProvision(null, data);
				console.log("Set Wind Sensitivity: %f",  wsNew);
			}
		};

		correctionPastSet.onclick = function() {
			window.ui.system.changeSingleSystemProvisionValue("useCorrectionForPast", correctionPastElem.checked);
		};

		rsDefaultElem.onclick = function() { rsElem.value = rsDefaultElem.value; rsElem.oninput(); Data.provision = API.getProvision();};
		wsDefaultElem.onclick = function() { wsElem.value = wsDefaultElem.value; wsElem.oninput(); Data.provision = API.getProvision();};

		var updateWeatherButton = $('#weatherSourcesRun');
		updateWeatherButton.onclick = onWeatherSourceRun;

		var fetchWeatherServicesButton = $("#weatherServicesFetch");
		fetchWeatherServicesButton.onclick = function() { onWeatherServicesFetch() };

		setupWeatherSourceUpload();
		onWeatherServicesFetch();
	}

	function showParsers(onDashboard) {
		APIAsync.getParsers().then(function(o) { Data.parsers = o; updateParsers(onDashboard)});
	}

	function updateParsers(onDashboard) {

		var containerNormal = $('#weatherDataSourcesList');
		var containerDeveloper = $('#weatherDataSourcesListDeveloper'); //container for separating developer parsers
		var containerUploaded = $('#weatherDataSourcesListUploaded'); //container for separating user uploaded parsers
		var containerDashboard = $('#weatherDataSourcesSimpleList'); //container for showing on dashboard
		var container = containerNormal;

		if (onDashboard) {
			container = containerDashboard
		}

		clearTag(container);
		clearTag(containerDeveloper);
		clearTag(containerUploaded);

		for (var i = 0; i < Data.parsers.parsers.length; i++)
		{
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

			//Separate the parsers list in these 2 categories
			if (!onDashboard) {
				if (p.name in developerParsers) {
					container = containerDeveloper;
				} else {
					container = containerNormal;
				}
			}

			if (onDashboard) {
            	template = loadTemplate("weather-sources-simple-template");
            } else {
				template = loadTemplate("weather-sources-template");
				activeElem = $(template, '[rm-id="weather-source-enable"]');
				descriptionElem = $(template, '[rm-id="weather-source-description"]');
				hasForecastElem = $(template, '[rm-id="weather-source-hasforecast"]');
				hasHistoryElem = $(template, '[rm-id="weather-source-hashistory"]');
				descriptionElem.textContent = p.description;

				toggleAttr(activeElem, p.enabled);
				toggleAttr(hasForecastElem, p.hasForecast, "circle");
				toggleAttr(hasHistoryElem, p.hasHistorical, "circle");
            }

			nameElem = $(template, '[rm-id="weather-source-name"]');
			lastRunElem = $(template, '[rm-id="weather-source-lastrun"]');

			template.parserid = p.uid;
			template.parseridx = i;

			var parserName =  p.name
			var lw = parserName.lastIndexOf(" ");

			if (lw > 0) {
				parserName = parserName.substring(0, lw); //Don't show "Parser" word in weather parsers
			}

			if (p.custom) {
				parserName = "Custom:" + parserName;
				if (!onDashboard) {
					container = containerUploaded;
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
					lastRunElem.textContent = p.lastKnownError;
					lastRunElem.style.color = "red";
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
	}

	function showParserDetails(p) {

		if (!p) {
			console.error("No parser data");
			return;
		}

		var weatherDataSourcesEditContent = $('#weatherSourcesEditContent');
		var saveButton =  $('#weatherSourcesEditSave');
		var runButton = $('#weatherSourcesEditRun');
		var closeButton =  $('#weatherSourcesEditClose');
		var resetButton = $('#weatherSourcesEditDefaults');

		clearTag(weatherDataSourcesEditContent);
		makeHidden('#weatherSourcesList');
		makeVisible('#weatherSourcesEdit');

		var template = loadTemplate("weather-sources-details-template");
		var nameElem = $(template, '[rm-id="weather-source-name"]');
        var enabledElem = $(template, '[rm-id="weather-source-enable"]');
        var lastRunElem = $(template, '[rm-id="weather-source-lastrun"]');
        var paramsElem = $(template, '[rm-id="weather-source-params"]');
		var descriptionElem = $(template, '[rm-id="weather-source-description"]');

        nameElem.textContent = p.name;
		enabledElem.checked = p.enabled;
		enabledElem.id = 'weatherSourceStatus-' + p.uid;
		lastRunElem.textContent = p.lastRun ? p.lastRun: "Never";
		descriptionElem.textContent = p.description;

		if (p.params) {
			for (param in p.params) {
				Util.generateTagFromDataType(paramsElem, p.params[param], param);
			}
		}

		// we only allow delete on custom uploaded parsers
		if (p.custom) {
			var deleteButton = $(template, '[rm-id="weather-source-delete"]');
			deleteButton.onclick = function() { onWeatherSourceDelete(p.uid); };
			makeVisible(deleteButton);
		}

		weatherDataSourcesEditContent.appendChild(template);

		closeButton.onclick = onWeatherSourceClose;
		saveButton.onclick = function() { onWeatherSourceSave(p.uid); };
		runButton.onclick = function() { onWeatherSourceRun(p.uid); };
		resetButton.onclick = function() { onWeatherSourceReset(p.uid); };
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

		API.runParser(id, true, withMixer, false);
		showParsers(false);
		onWeatherSourceClose();
		window.ui.main.refreshGraphs = true; //Force refresh of graphs
	}

	function onWeatherSourceReset(id) {
		API.resetParserParams(id);
		var p = API.getParsers(id);
		showParserDetails(p.parser);
		showParsers(false);
	}

	function onWeatherSourceDelete(id) {
		var r = API.deleteParser(id);
		if (r === undefined || !r || r.statusCode != 0)
		{
			console.error("Can't delete parser %d: %o",id, r);
			return;
		}
		showParsers(false);
		onWeatherSourceClose();
	}

	function onWeatherSourceSave(id) {
		var shouldSaveEnable = false;
		var shouldSaveParams = false;

		var p = null;
		for (var i = 0; i < Data.parsers.parsers.length; i++) {
			if (Data.parsers.parsers[i].uid == id) {
				p = Data.parsers.parsers[i];
				break;
			}
		}

		if (!p) {
			console.error("Parser id not found in list !");
			return;
		}

		var enabledElem = $("#weatherSourceStatus-" + p.uid);
		if (enabledElem != p.enabled) {
			console.log("Parser %s changed configuration from %s to %s", p.name, p.enabled, enabledElem.checked)
			shouldSaveEnable = true;
		}

		var newParams = {}
        if (p.params) {
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

		if (shouldSaveEnable) {
			console.log("Setting weather source %d to %o", p.uid, enabledElem.checked);
			console.log(API.setParserEnable(p.uid, enabledElem.checked));
		}

		if (shouldSaveParams) {
			console.log(API.setParserParams(p.uid, newParams));
		}

		if (shouldSaveEnable || shouldSaveParams) {
			showWeather();
			showParsers(false);
			onWeatherSourceClose();
		}
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
        }

        uiElems.weatherSources.Upload.Close.onclick = function() {
        	makeVisibleBlock("#weatherSourcesList");
        	makeHidden("#weatherSourcesUpload");
        	uiElems.weatherSources.Upload.Status.textContent = "Please select a python source file (.py extension).";
        }

		uiElems.weatherSources.Upload.Upload.onclick = function() {
			Util.loadFileFromDisk(uiElems.weatherSources.Upload.File.files, onParserLoad, true);
		}
	}

	function onParserLoad(status) {
		var o = uiElems.weatherSources.Upload.Status;

		if (status.message) {
			o.textContent = status.message;
		}

		if (status.data && status.file) {
			o.textContent = "Uploading file " + status.file.name;
			var r = API.uploadParser(status.file.name, status.file.type, status.data);
			if (r === undefined || !r || r.statusCode != 0) {
				o.textContent = "Error uploading" + status.file.name;
				if (r.message) {
					o.textContent += ": " + r.message;
				}
			} else {
				o.textContent = "Successful uploaded " + status.file.name
				showParsers(false);
			}
		}
	}

	function getRainDelay() {
		APIAsync.getRestrictionsRainDelay().then(function(o) {
				Data.rainDelay = o;
				showRainDelay();
		});
	}

	function showRainDelay()
	{
		var rd = +Data.rainDelay.delayCounter;

		var onDiv = $("#snoozeCurrentContent");
		var offDiv = $("#snoozeSetContent");

		var stopButton = $("#snoozeStop");
		var setButton = $("#snoozeSet");

		//Are we already in Snooze
		if (rd > 0)
		{
			makeHidden(offDiv);
			makeVisible(onDiv);
			var v = Util.secondsToHuman(rd);
			var vdiv = $("#snoozeCurrentValue");
			vdiv.textContent = v.days + " days " + v.hours + " hours " + v.minutes + " mins ";
			console.log("Device is snoozing for %d seconds", rd);
		}
		else
		{
			makeHidden(onDiv);
			makeVisible(offDiv);
			console.log("Device is not snoozing");
		}

		stopButton.onclick = function() { console.log(API.setRestrictionsRainDelay(0)); showRainDelay(); };
		setButton.onclick = function() {
			var snoozeDays = $('#snoozeDays').value;
			console.log(API.setRestrictionsRainDelay(parseInt(snoozeDays)));
			showRainDelay();
		};
	}

	function onWaterLogFetch() {
		var startDate = $("#waterHistoryStartDate").value;
		var days = parseInt($("#waterHistoryDays").value) || 7;
		console.log("Getting water log starting from %s for %d days...", startDate, days);

		APIAsync.getWateringLog(false, true, startDate, days).then(
			function(o) {Data.waterLogCustom = o; showWaterLog();}
		);
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

	function showWaterLog() {

		var days = 7;
		var startDate = Util.getDateWithDaysDiff(days);

		var container = $("#wateringHistoryContent");
		var startDateElem = $("#waterHistoryStartDate");
		var daysElem = $("#waterHistoryDays");
		var buttonElem = $("#waterHistoryFetch");

		buttonElem.onclick = function() { onWaterLogFetch() };
		clearTag(container);

		//First time on this page view 7 past days
		if (!startDateElem.value || !daysElem.value) {
			startDateElem.value = startDate;
			daysElem.value = days;
		}
		if (Data.waterLogCustom === null) {
			APIAsync.getWateringLog(false, true, startDate, days).then(
            	function(o) {Data.waterLogCustom = o; showWaterLog();}
            );
			return;
		}

		var waterLog = Data.waterLogCustom;

		for (var i = waterLog.waterLog.days.length - 1; i >= 0 ; i--)
		{
			var day =  waterLog.waterLog.days[i];
			var dayTemplate = loadTemplate("watering-history-day-template");
			var dayNameElem = $(dayTemplate, '[rm-id="wateringLogDayName"]');
			var dayConditionElem = $(dayTemplate, '[rm-id="wateringLogDayWeatherIcon"]');
			var dayTempElem = $(dayTemplate, '[rm-id="wateringLogDayWeatherTemp"]');
			var dayQpfElem = $(dayTemplate, '[rm-id="wateringLogDayWeatherQpf"]');

			var dayContainerElem = $(dayTemplate, '[rm-id="wateringLogProgramsContainer"]');

			var dayCondition;
			var dayMinTemp;
			var dayMaxTemp;
			var dayQpf;

			try {
				dayCondition =  Util.conditionAsIcon(chartsData.condition.getAtDate(day.date));

				dayMinTemp = Util.convert.uiTemp(chartsData.mint.getAtDate(day.date));
				if (dayMinTemp !== null) {
					dayMinTemp += Util.convert.uiTempStr();
				} else {
					dayMinTemp = "--";
				}

				dayMaxTemp = Util.convert.uiTemp(chartsData.maxt.getAtDate(day.date));
				if (dayMaxTemp !== null) {
					dayMaxTemp += Util.convert.uiTempStr();
				} else {
					dayMaxTemp = "--";
				}

				dayQpf =  Util.convert.uiQuantity(chartsData.qpf.getAtDate(day.date));
				if (dayQpf !== null) {
					dayQpf +=  Util.convert.uiQuantityStr()
				} else {
					dayQpf = "--";
				}
			} catch(e) {
				console.error("Missing mixer data for day %s", day.date);
			}

			//console.log("Day: %s Condition: %s Temp: %s/%s QPF: %s", day.date, dayCondition, dayMinTemp, dayMaxTemp, dayQpf);

			dayNameElem.textContent = day.date;
			dayConditionElem.textContent = dayCondition;
			dayTempElem.textContent = dayMinTemp + " / " + dayMaxTemp;
			dayQpfElem.textContent = dayQpf;

			for (var j = 0; j < day.programs.length; j++)
			{
				var program = day.programs[j];

				if (program.id == 0) {
					var name = "Manual Watering";
				} else {
					//TODO make sure we have Data.programs
					//TODO Optimize
					var p = getProgramById(program.id);
					if (p !== null)
						var name = p.name;
					else
						var name = "Program " + program.id
				}

				var programTemplate = loadTemplate("watering-history-day-programs-template");
				var programNameElem = $(programTemplate, '[rm-id="wateringLogProgramName"]');
				var programContainerElem = $(programTemplate, '[rm-id="wateringLogZonesContainer"]');
				programNameElem.textContent = name;

				//console.log("\t%s", name);

				//Convert between program/zones/cycles to program/cycles/zones
				cycles = {};
				var maxCycles = 0;
				var zoneid;
				var zoneName;

				for (var k = 0; k < program.zones.length; k++)
				{
					var zone = program.zones[k];
					var zoneDurations = { machine: 0, user: 0, real: 0 };

					if (zone.cycles.length > maxCycles) {
						maxCycles = zone.cycles.length;
					}

					//Calculate cycles total per zones and also create per cycle structure
					for (var c = 0; c < zone.cycles.length; c++)
					{
						var cycle = zone.cycles[c];
						if (! (c in cycles)) {
							cycles[c] = { machine: 0, user: 0, real: 0, id: c};
							cycles[c].zones = {};
							cycles[c].start = cycle.startTime.split(" ")[1];
						}

						cycles[c].machine += cycle.machineDuration;
						cycles[c].real += cycle.realDuration;
						cycles[c].user += cycle.userDuration;

						cycles[c].zones[k] = {};

						cycles[c].zones[k].machine = cycle.machineDuration;
						cycles[c].zones[k].real = cycle.realDuration;
						cycles[c].zones[k].user = cycle.userDuration;
						cycles[c].zones[k].start = cycle.startTime.split(" ")[1];

						zoneDurations.machine += cycle.machineDuration;
						zoneDurations.real += cycle.realDuration;
						zoneDurations.user += cycle.userDuration;

						zoneid = zone.uid - 1;

						if (Data.zoneData.zones[zoneid] && Data.zoneData.zones[zoneid].name) {
							cycles[c].zones[k].name = zone.uid + ". " + Data.zoneData.zones[zoneid].name;
						}
						else {
							cycles[c].zones[k].name  = "Zone " + zone.uid;
						}

						cycles[c].zones[k].flag = zone.flag;
					}

					zoneid = zone.uid - 1;

					if (Data.zoneData.zones[zoneid] && Data.zoneData.zones[zoneid].name) {
						zoneName = zone.uid + ". " + Data.zoneData.zones[zoneid].name;
					}
					else {
						zoneName = "Zone " + zone.uid;
					}

					var zoneStartTime = "";
					try {
						zoneStartTime = zone.cycles[0].startTime.split(" ")[1];
					} catch(e) {}

					//Show default view without cycles detailed information
					var zoneListTemplate = createZoneWateringHistoryElems(
						zoneName,
						zoneDurations.user,
						zoneDurations.real,
						zone.flag,
						zoneStartTime
					);

					programContainerElem.appendChild(zoneListTemplate);
					//console.log("\t\tZone %d Durations: Scheduled: %f Watered: %f Saved: %d %", zone.uid, zoneDurations.user, zoneDurations.real,  100 - parseInt((zoneDurations.real/zoneDurations.user) * 100));
				}

				//Show cycles detailed information if more than 1 cycle
				if (maxCycles > 1) {
					var cycleParentContainer = insertTag(programContainerElem, "div", null);
					var cycleExpanderButton = addTag(cycleParentContainer, "span");

					cycleParentContainer.className = "cyclesExpanded";

					cycleExpanderButton.textContent = "watering cycles";
					cycleExpanderButton.className = "displayCyclesContract";
					cycleExpanderButton.onclick = function() {
						var targetElem = this.parentNode.lastChild;
						if (isVisible(targetElem)) {
							makeHidden(targetElem);
							this.className = "displayCyclesContract";
						} else {
							makeVisible(targetElem);
							this.className = "displayCyclesExpand";
						}
					};

					var cycleDetailsContainer = addTag(cycleParentContainer, "div");
					makeHidden(cycleDetailsContainer);

					//Append detailed per cycle information
					for (c in cycles) {
						var cycleTitle = "Totals Cycle " + (+c + 1) + " / " + maxCycles ;
						zoneListTemplate = createZoneWateringHistoryElems(
							cycleTitle,
							cycles[c].user,
							cycles[c].real,
							0,
							cycles[c].start,
							"historyZoneCycles"
						);
						cycleDetailsContainer.appendChild(zoneListTemplate);

						for (k in cycles[c].zones) {
							zoneListTemplate = createZoneWateringHistoryElems(
								cycles[c].zones[k].name,
								cycles[c].zones[k].user,
								cycles[c].zones[k].real,
								cycles[c].zones[k].flag,
								cycles[c].zones[k].start
							);

							cycleDetailsContainer.appendChild(zoneListTemplate);
						}
					}
				}

				//console.log(JSON.stringify(cycles, null, 4));
				dayContainerElem.appendChild(programTemplate);
			}
			container.appendChild(dayTemplate);
		}
	}

		function showWaterLogSimple() {

    		var container = $("#wateringHistorySimpleContent");
    		var waterLog = Data.waterLogCustom;

			if (Data.waterLogCustom === null) {
				var days = 6;
				var startDate = Util.getDateWithDaysDiff(days);
				APIAsync.getWateringLog(false, true, startDate, days + 1).then(
					function(o) {Data.waterLogCustom = o; showWaterLogSimple();}
				);
				return;
			}

			var waterLog = Data.waterLogCustom;

            clearTag(container);

    		for (var i = waterLog.waterLog.days.length - 1; i >= 0 ; i--)
    		{
    			var day =  waterLog.waterLog.days[i];
    			var dayDurations = { scheduled: 0, watered: 0 };

    			var dayTemplate = loadTemplate("watering-history-day-simple-template");
    			var dayNameElem = $(dayTemplate, '[rm-id="wateringLogDayName"]');
    			var dayScheduledElem = $(dayTemplate, '[rm-id="wateringLogDayScheduled"]');
    			var dayWateredElem = $(dayTemplate, '[rm-id="wateringLogDayWatered"]');
    			var dayContainerElem = $(dayTemplate, '[rm-id="wateringLogProgramsContainer"]');

    			//console.log("Day: %s", day.date);
    			var d = Util.dateStringToLocalDate(day.date);
    			dayNameElem.textContent = Util.monthNamesShort[d.getMonth()] + " " + d.getDate();

    			for (var j = 0; j < day.programs.length; j++)
    			{
    				var program = day.programs[j];

    				if (program.id == 0) {
    				    var name = "Manual Watering";
    				} else {
    					//TODO make sure we have Data.programs
    					var p = getProgramById(program.id);
    					if (p !== null)
    						var name = p.name;
    					else
    						var name = "Program " + program.id
    				}

    				var programTemplate = loadTemplate("watering-history-day-programs-simple-template");
    				var programNameElem = $(programTemplate, '[rm-id="wateringLogProgramName"]');
					var programStartElem = $(programTemplate, '[rm-id="wateringLogProgramStart"]');
    				var programContainerElem = $(programTemplate, '[rm-id="wateringLogZonesContainer"]');
					var programStart = null;

    				programNameElem.textContent = name;

    				//console.log("\t%s", name);

    				for (var k = 0; k < program.zones.length; k++)
    				{
    					var zone = program.zones[k];
    					var zoneDurations = { machine: 0, user: 0, real: 0 };
    					for (var c = 0; c < zone.cycles.length; c++)
    					{
							var cycle = zone.cycles[c];
    						zoneDurations.machine += cycle.machineDuration;
    						zoneDurations.real += cycle.realDuration;
    						zoneDurations.user += cycle.userDuration;
							if (programStart === null)
								programStart = cycle.startTime;

    					}

    					var zoneListTemplate = loadTemplate("watering-history-day-programs-zone-simple-template");

    					var zoneNameElem = $(zoneListTemplate, '[rm-id="wateringLogZoneName"]');
    					var zoneSchedElem = $(zoneListTemplate, '[rm-id="wateringLogZoneSchedTime"]');
    					var zoneWateredElem = $(zoneListTemplate, '[rm-id="wateringLogZoneRealTime"]');

						var zoneid = zone.uid - 1;
						if (Data.zoneData.zones[zoneid] && Data.zoneData.zones[zoneid].name) {
							zoneNameElem.textContent = zone.uid + ". " + Data.zoneData.zones[zoneid].name;
						}
						else {
							zoneNameElem.textContent = "Zone " + zone.uid;
						}
    					zoneSchedElem.textContent = Util.secondsToMMSS(zoneDurations.user);
    					zoneWateredElem.textContent = Util.secondsToMMSS(zoneDurations.real);

    					dayDurations.scheduled += zoneDurations.user;
    					dayDurations.watered += zoneDurations.real;


						programStartElem.textContent = "start time: " + programStart.split(" ")[1].substr(0, 5); //Get only HH:MM
    					programContainerElem.appendChild(zoneListTemplate);

    					//console.log("\t\tZone %d Durations: Scheduled: %f Watered: %f Saved: %d %", zone.uid, zoneDurations.user, zoneDurations.real,  100 - parseInt((zoneDurations.real/zoneDurations.user) * 100));
    				}
    				dayContainerElem.appendChild(programTemplate);
    			}

    			dayScheduledElem.textContent = ((dayDurations.scheduled / 60) >> 0) + " min";
                dayWateredElem.textContent = ((dayDurations.watered / 60) >> 0) + " min";

				dayTemplate.onclick = function() {
					var tag = this.children[1];
					if (isVisible(tag)) {
						makeHidden(tag);
						this.removeAttribute("selected");
					}
					else {
						makeVisible(tag);
						this.setAttribute("selected", true);
					}
				};

    			container.appendChild(dayTemplate);
    		}
    	}

	function getParserById(id) {
		for (var i = 0; i < Data.parsers.parsers.length; i++) {
			if (Data.parsers.parsers[i].id === id)
				return Data.parsers.parsers[i];
		}

		return null;
	}

	function createZoneWateringHistoryElems(name, sched, watered,  flag, startTime, cssClass) {
		var zoneListTemplate = loadTemplate("watering-history-day-programs-zone-template");

		var zoneNameElem = $(zoneListTemplate, '[rm-id="wateringLogZoneName"]');
		var zoneSchedElem = $(zoneListTemplate, '[rm-id="wateringLogZoneSchedTime"]');
		var zoneWateredElem = $(zoneListTemplate, '[rm-id="wateringLogZoneRealTime"]');
		var zoneSavedElem = $(zoneListTemplate, '[rm-id="wateringLogZoneSaved"]');
		var zoneReasonElem = $(zoneListTemplate, '[rm-id="wateringLogZoneSavedReason"]');
		var zoneStartTimeElem = $(zoneListTemplate, '[rm-id="wateringLogZoneStartTime"]');

		zoneNameElem.textContent = name;
		zoneSchedElem.textContent = Util.secondsToText(sched);
		zoneWateredElem.textContent = Util.secondsToText(watered);
		zoneReasonElem.textContent = waterLogReason[flag];
		zoneStartTimeElem.textContent = startTime;

		if (flag != 0 && flag != 6) {
			zoneReasonElem.style.color = "red";
		}

		var saved = (100 - parseInt((watered/sched) * 100));
		if (saved < 0) saved = 0;
		if (saved > 100) saved = 100;
		zoneSavedElem.textContent =  saved + " %";

		if (typeof cssClass !== "undefined") {
			zoneListTemplate.className = cssClass;
		}

		return zoneListTemplate
	}

	//--------------------------------------------------------------------------------------------
	//
	//
	_settings.showWeather = showWeather;
	_settings.showParsers = showParsers;
	_settings.updateParsers = updateParsers;
	_settings.showWaterLog = showWaterLog;
	_settings.showWaterLogSimple = showWaterLogSimple;
	_settings.getRainDelay = getRainDelay;
	_settings.waterLogReason = waterLogReason;


} (window.ui.settings = window.ui.settings || {}));