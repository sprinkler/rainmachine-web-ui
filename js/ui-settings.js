/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

window.ui = window.ui || {};

(function(_settings) {

	var uiElems = {}

	function showWeather()
	{
        showParsers(false);

		//Rain, Wind, Days sensitivity
		var rs = Data.provision.location.rainSensitivity;
		var ws = Data.provision.location.windSensitivity;
		var fc = Data.provision.location.wsDays;

		var rsElem = $("#rainSensitivity");
		var wsElem = $("#windSensitivity");

		var rsSaveElem = $("#rainSensitivitySave");
		var wsSaveElem = $("#windSensitivitySave");

		var rsDefaultElem = $("#rainSensitivityDefault");
		var wsDefaultElem = $("#windSensitivityDefault");

		//Set the current values
		rsElem.value = parseInt(rs * 100);
		rsElem.oninput();

		wsElem.value = parseInt(ws * 100);
		wsElem.oninput();

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

		rsDefaultElem.onclick = function() { rsElem.value = rsDefaultElem.value; rsElem.oninput(); Data.provision = API.getProvision();};
		wsDefaultElem.onclick = function() { wsElem.value = wsDefaultElem.value; wsElem.oninput(); Data.provision = API.getProvision();};

		var updateWeatherButton = $('#weatherSourcesRun');
		updateWeatherButton.onclick = function() { onWeatherSourcesRun(); };

		setupWeatherSourceUpload();
		getAllEnabledParsersData()
	}

	function showParsers(onDashboard) {

		//Weather Sources List
		Data.parsers = API.getParsers();

		var container = $('#weatherDataSourcesList');

		if (onDashboard) {
			container = $('#weatherDataSourcesSimpleList');
		}

		clearTag(container);

		for (var i = 0; i < Data.parsers.parsers.length; i++)
		{
			var p = Data.parsers.parsers[i];
            var template;
            var enabledElem;
            var nameElem;
            var lastRunElem;

            if (onDashboard && !p.enabled) {
            	continue;
            }

            if (onDashboard) {
            	template = loadTemplate("weather-sources-simple-template");
            } else {
				template = loadTemplate("weather-sources-template");
				enabledElem = $(template, '[rm-id="weather-source-enable"]');

				if (p.enabled) {
					enabledElem.setAttribute("enabled", true);
				} else {
					enabledElem.removeAttribute("enabled");
				}
            }

			nameElem = $(template, '[rm-id="weather-source-name"]');
			lastRunElem = $(template, '[rm-id="weather-source-lastrun"]');

			template.parserid = p.uid;
			template.parseridx = i;

			var lw = p.name.lastIndexOf(" ");
			var parserName =  p.name.substring(0, lw); //Don't show "Parser" word in weather parsers

			if (p.custom) {
				parserName = "Custom:" + parserName
			}

			nameElem.textContent = parserName;

			if (p.lastRun) {
				lastRunElem.textContent = Util.sinceDateAsText(p.lastRun) + " ago";
			} else {
				lastRunElem.textContent = "Never";
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

		clearTag(weatherDataSourcesEditContent);
		makeHidden('#weatherSourcesList');
		makeVisible('#weatherSourcesEdit');

		var template = loadTemplate("weather-sources-details-template");
		var nameElem = $(template, '[rm-id="weather-source-name"]');
        var enabledElem = $(template, '[rm-id="weather-source-enable"]');
        var lastRunElem = $(template, '[rm-id="weather-source-lastrun"]');
        var paramsElem = $(template, '[rm-id="weather-source-params"]');

        nameElem.textContent = p.name;
		enabledElem.checked = p.enabled;
		enabledElem.id = 'weatherSourceStatus-' + p.uid;
		lastRunElem.textContent = p.lastRun ? p.lastRun: "Never";

		if (p.params) {
			for (param in p.params) {
				Util.generateTagFromDataType(paramsElem, p.params[param], param);
			}
		}

		weatherDataSourcesEditContent.appendChild(template);

		closeButton.onclick = onWeatherSourceClose;
		saveButton.onclick = function() { onWeatherSourceSave(p.uid); }
		runButton.onclick = function() { onWeatherSourceRun(p.uid); }
	}

	function onWeatherSourceClose() {
		makeHidden('#weatherSourcesEdit');
		makeVisible('#weatherSourcesList');
	}

	function onWeatherSourceRun(id) {
		if (id === undefined || id === null)
			id = -1;

		API.runParser(id, true, false, false);
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
			console.log(API.setParserEnable(p.uid, enabledElem.checked));
		}

		if (shouldSaveParams) {
			console.log(API.setParserParams(p.uid, newParams));
		}

		if (shouldSaveEnable || shouldSaveParams) {
			showWeather();
			onWeatherSourceClose();
		}
	}

	function setWeatherSource(id, enabled)
	{
		console.log("Setting weather source %d to %o", id, enabled);
		API.setParserEnable(id, enabled);
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
        	makeVisible("#weatherSourcesList");
        	makeHidden("#weatherSourcesUpload");
        	uiElems.weatherSources.Upload.Status.textContent = "Please select a *.py or *.pyc file";
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
			var ret = API.uploadParser(status.file.name, status.file.type, status.data);
			if (ret === null) {
				o.textContent = "Error uploading" + status.file.name;
			} else {
				o.textContent = "Successful uploaded " + status.file.name
			}
		}
	}

	function showRainDelay()
	{
		var raindelay = API.getRestrictionsRainDelay();
		var rd = +raindelay.delayCounter;

		console.log("Device is snoozing for %d seconds", rd);

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
		}
		else
		{
			makeHidden(onDiv);
			makeVisible(offDiv);
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
		var days = parseInt($("#waterHistoryDays").value);
		console.log("Getting water log starting from %s for %d days...", startDate, days);

		APIAsync.getWateringLog(false, true, startDate, days).then(
			function(o) {Data.waterLogCustom = o; showWaterLog();}
		);
	}

	function showWaterLog() {

		var container = $("#wateringHistoryContent");
		var startDateElem = $("#waterHistoryStartDate");
		var daysElem = $("#waterHistoryDays");
		var buttonElem = $("#waterHistoryFetch");

		buttonElem.onclick = function() { onWaterLogFetch() };
		clearTag(container);

		//First time on this page view 7 past days
		if (Data.waterLogCustom === null) {
			var days = 7;
			var startDate = Util.getDateWithDaysDiff(days);

			startDateElem.value = startDate;
			daysElem.value = days;

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
			var dayContainerElem = $(dayTemplate, '[rm-id="wateringLogProgramsContainer"]');

			//console.log("Day: %s", day.date);
			dayNameElem.textContent = day.date;

			for (var j = 0; j < day.programs.length; j++)
			{
				var program = day.programs[j];

				if (program.id == 0)
					var name = "Manual Watering";
				else
					var name = "Program " + program.id;


				var programTemplate = loadTemplate("watering-history-day-programs-template");
				var programNameElem = $(programTemplate, '[rm-id="wateringLogProgramName"]');
				var programContainerElem = $(programTemplate, '[rm-id="wateringLogZonesContainer"]');
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
					}

					var zoneListTemplate = loadTemplate("watering-history-day-programs-zone-template")

					var zoneNameElem = $(zoneListTemplate, '[rm-id="wateringLogZoneName"]');
					var zoneSchedElem = $(zoneListTemplate, '[rm-id="wateringLogZoneSchedTime"]');
					var zoneWateredElem = $(zoneListTemplate, '[rm-id="wateringLogZoneRealTime"]');
					var zoneSavedElem = $(zoneListTemplate, '[rm-id="wateringLogZoneSaved"]');

					zoneNameElem.textContent = "Zone " + zone.uid;
					zoneSchedElem.textContent = Util.secondsToText(zoneDurations.user);
					zoneWateredElem.textContent = Util.secondsToText(zoneDurations.real);

					var saved = (100 - parseInt((zoneDurations.real/zoneDurations.user) * 100));
					if (saved < 0) saved = 0;
					zoneSavedElem.textContent =  saved + " %";

					programContainerElem.appendChild(zoneListTemplate);

					//console.log("\t\tZone %d Durations: Scheduled: %f Watered: %f Saved: %d %", zone.uid, zoneDurations.user, zoneDurations.real,  100 - parseInt((zoneDurations.real/zoneDurations.user) * 100));
				}
				dayContainerElem.appendChild(programTemplate);
			}
			container.appendChild(dayTemplate);
		}
	}
	//--------------------------------------------------------------------------------------------
	//
	//
	_settings.showWeather = showWeather;
	_settings.showParsers = showParsers;
	_settings.showRainDelay = showRainDelay;
	_settings.showWaterLog = showWaterLog;

} (window.ui.settings = window.ui.settings || {}));