window.ui = window.ui || {};

(function(_settings) {

	function showWeather()
	{
		//Weather Sources List
		var parsers = API.getParsers();
		var weatherSourcesDiv = $('#weatherDataSourcesList');
		clearTag(weatherDataSourcesList);

		console.log("%o", parsers);

		for (var i = 0; i < parsers.parsers.length; i++)
		{
			var p = parsers.parsers[i];

			var template = loadTemplate("weather-sources-template");
			var enabledElem = $(template, '[rm-id="weather-source-enable"]');
			var nameElem = $(template, '[rm-id="weather-source-name"]');
			var lastRunElem = $(template, '[rm-id="weather-source-lastrun"]');

			enabledElem.checked = p.enabled;
			enabledElem.value = p.uid;
			enabledElem.onchange = function() { setWeatherSource(+this.value, this.checked); };
			nameElem.textContent = p.name;
			lastRunElem.textContent = p.lastRun ? p.lastRun: "Never";

			weatherSourcesDiv.appendChild(template);
		}

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
	}

	function setWeatherSource(id, enabled)
	{
		console.log("Setting weather source %d to %o", id, enabled);
		API.setParserEnable(id, enabled);
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

		var snoozeDays = $('#snoozeDays').value;

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
		setButton.onclick = function() { console.log(API.setRestrictionsRainDelay(+snoozeDays)); showRainDelay() };
	}

	function onWaterLogFetch() {
		var startDate = $("#waterHistoryStartDate").value;
		var days = parseInt($("#waterHistoryDays").value);
		console.log("Getting water log starting from %s for %d days...", startDate, days);
		Data.waterLogCustom = API.getWateringLog(false, true, startDate, days);

		showWaterLog();
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

			Data.waterLogCustom = API.getWateringLog(false, true, startDate, days);
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
	_settings.showRainDelay = showRainDelay;
	_settings.showWaterLog = showWaterLog;

} (window.ui.settings = window.ui.settings || {}));