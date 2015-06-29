function weatherSettingUI()
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

		enabledElem.checked = p.enabled;
		enabledElem.value = p.uid;
		enabledElem.onchange = function() { setWeatherSource(+this.value, this.checked); };
		nameElem.textContent = p.name;

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

function rainDelaySettingsUI()
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

	stopButton.onclick = function() { console.log(API.setRestrictionsRainDelay(0)); rainDelaySettingsUI(); };
	setButton.onclick = function() { console.log(API.setRestrictionsRainDelay(+snoozeDays)); rainDelaySettingsUI() };
}


function wateringLogUI()
{
	var today = new Date();
	var startDate = new Date();
	var days = 7;

	startDate.setDate(today.getDate() - days);
	startDate = startDate.toISOString().split("T")[0];

	waterLog = API.getWateringLog(false, true, startDate, days);
	console.log(waterLog);

	var container = $("#wateringHistoryContent");

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

var systemSettingsView = {};

function systemSettingsUI()
{
	systemSettingsView = {
		AP: $("#systemSettingsAP"),
		ConnectionStatus: $("#systemSettingsConnectionStatus"),

		CloudEnable: $("#systemSettingsCloudEnable"),
		Email: $("#systemSettingsEmail"),
		CloudSet: $("#systemSettingsCloudSet"),

		MasterValveBefore: $("#systemSettingsMasterValveBefore"),
		MasterValveAfter: $("#systemSettingsMasterValveAfter"),
		MasterValveSet: $("#systemSettingsMasterValveSet"),

		DeviceName: $("#systemSettingsDeviceName"),
		DeviceNameSet: $("#systemSettingsDeviceNameSet"),

		LocationFull: $("#systemSettingsLocationFull"),
		LocationLat: $("#systemSettingsLocationLat"),
		LocationLon: $("#systemSettingsLocationLon"),
		LocationElev: $("#systemSettingsLocationElev"),
		LocationSet: $("#systemSettingsLocationSet"),

		TimeZoneSelect: $("#systemSettingsTimeZoneSelect"),
		TimeZoneSet: $("#systemSettingsTimeZoneSet"),

		UnitsUS: $("#systemSettingsUnitsUS"),
		UnitsMetric: $("#systemSettingsUnitsMetric"),

		UnitsSet: $("#systemSettingsUnitsSet"),
		Password: $("#systemSettingsPassword"),
		PasswordSet: $("#systemSettingsPasswordSet"),
		ResetDefaultSet: $("#systemSettingsResetDefaultSet"),
	};

	systemSettingsView.AP.textContent = Data.provision.wifi.ssid;
	systemSettingsView.ConnectionStatus.textContent = Data.provision.wifi.hasClientLink ? "Connected" : "Not Connected";
	systemSettingsView.ConnectionStatus.className = Data.provision.wifi.hasClientLink ? "green" : "restriction";

	systemSettingsView.CloudEnable.checked = Data.provision.cloud.enabled;
	systemSettingsView.Email = Data.provision.cloud.email;

	systemSettingsView.MasterValveBefore.value = Data.provision.system.masterValveBefore;
	systemSettingsView.MasterValveAfter.value = Data.provision.system.masterValveAfter;

	systemSettingsView.LocationFull.textContent = Data.provision.location.name + " (" +
												Data.provision.location.latitude + ", " +
												Data.provision.location.longitude + ")";

	systemSettingsView.LocationLat.value = Data.provision.location.latitude;
	systemSettingsView.LocationLon.value = Data.provision.location.longitude;
	systemSettingsView.LocationElev.value = Data.provision.location.elevation;

	for (var key in Data.timeZoneDB)
	{
		var o = addTag(systemSettingsView.TimeZoneSelect, 'option');
		o.value = o.textContent = key;
		if (key == Data.provision.location.timezone)
			o.selected = true;
	}
}

function aboutSettingsUI()
{
	$("#aboutName").textContent = Data.provision.system.netName;
	$("#aboutVersion").textContent = Data.provision.api.swVer;
	$("#aboutHardware").textContent = Data.provision.api.hwVer;
	$("#aboutAPI").textContent = Data.provision.api.apiVer;
	$("#aboutIP").textContent = Data.provision.wifi.ipAddress;
	$("#aboutNetmask").textContent = Data.provision.wifi.netmaskAddress;
	$("#aboutGateway").textContent = Data.diag.gatewayAddress;
	$("#aboutMAC").textContent = Data.provision.wifi.macAddress;
	$("#aboutAP").textContent = Data.provision.wifi.ssid;
	$("#aboutMemory").textContent = Data.diag.memUsage + " Kb";
	$("#aboutCPU").textContent = Data.diag.cpuUsage.toFixed(2) + " %";
	$("#aboutUptime").textContent = Data.diag.uptime;
}

function buildTimeZSelect(jsonData)
{
	var s = document.getElementById("timezoneSelect")
	if (!s || !jsonData || typeof s === "undefined")
		return;

	var sortedData = [];
	//Sort the keys
	for (var z in jsonData)
		sortedData.push(z);

	sortedData.sort();

	for (var i = 0; i < sortedData.length; i++)
	{
		var o = document.createElement('option');
		o.value = o.textContent = sortedData[i];
		s.appendChild(o);
	}
}
