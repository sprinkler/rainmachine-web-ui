function _genericSubMenu()
{
	//$('#settingsTitle').innerHTML = this.name;
	console.log("SubMenu: %s : %s", this.id, this.name)
}

var currentZoneProperties = null;

var settingsSubmenus = [
		{ name: "Programs", 		func: window.ui.programs.showPrograms, 	container: '#programs' },
    	{ name: "Watering History", func: wateringLogUI, 					container: '#wateringHistory' },
    	{ name: "Snooze",  			func: rainDelaySettingsUI, 				container: '#snooze' },
    	{ name: "Restrictions",  	func: restrictionsSettingsUI,			container: '#restrictions' },
    	{ name: "Weather", 			func: weatherSettingUI, 				container: '#weather' },
    	{ name: "System Settings",  func:_genericSubMenu, 					container: '#systemSettings' },
    	{ name: "About",  			func: aboutSettingsUI, 					container: '#about' }
	];

var dashboardSubmenus = [
    	{ name: "Daily", 		func: _genericSubMenu,		container: null },
        { name: "Weekly", 		func: _genericSubMenu,		container: null },
        { name: "Yearly",  		func: _genericSubMenu,		container: null }
      ];

var zonesSubmenus = [
		{ name: "Stop All",		func: stopAllWatering,		container: null }
];


function buildSubMenu(submenus, category, parentTag)
{

	for (var i = 0; i < submenus.length; i++)
	{
		var div = addTag(parentTag, 'div')
		div.className = "submenu";
		div.id = category + i;
		div.name = div.innerHTML = submenus[i].name;
		div.func = submenus[i].func;
		div.onclick = function()
			{
				//Hide other containers and Show the selected container
				for (var t = 0; t < submenus.length; t++)
				{
					if (submenus[t].container === null)
						continue;

					var c = $(submenus[t].container);
                    var b = "#" + category + t;

					if (this.name !== submenus[t].name)
					{
						$(b).removeAttribute("selected");
						makeHidden(c);
					}
					else
					{
						this.setAttribute("selected", true);
						makeVisible(c);
					}
				}
				//Call the button function
				this.func();
			}
	}
}


/* Globals to hold returned API json */
var provision = {};
var diag = {};

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
	var rs = provision.location.rainSensitivity;
	var ws = provision.location.windSensitivity;
	var fc = provision.location.wsDays;

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

	rsDefaultElem.onclick = function() { rsElem.value = rsDefaultElem.value; rsElem.oninput(); provision = API.getProvision();};
	wsDefaultElem.onclick = function() { wsElem.value = wsDefaultElem.value; wsElem.oninput(); provision = API.getProvision();};
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

function restrictionsSettingsUI()
{
	var rh = API.getRestrictionsHourly();
	var rg = API.getRestrictionsGlobal();
	rh = rh.hourlyRestrictions;

	var extraWateringElem = $("#restrictionsExtraWatering");
	var freezeProtectElem = $("#restrictionsFreezeProtect");
	var freezeProtectTempElem = $("#restrictionsFreezeProtectTemp");

	var buttonExtraSet = $("#restrictionsHotDaysSet");
	var buttonFreezeSet = $("#restrictionFreezeSet");
	var buttonMonthsSet = $("#restrictionsMonthsSet");
	var buttonWeekDaysSet = $("#restrictionWeekDaysSet");
	var buttonHourlySet = $("#restrictionHourlyAdd");

	extraWateringElem.checked = rg.hotDaysExtraWatering;
	freezeProtectElem.checked = rg.freezeProtectEnabled;
	setSelectOption(freezeProtectTempElem, parseInt(rg.freezeProtectTemp), true);

	//Set the months restrictions
	for (var i = 0; i < Util.monthNames.length; i++)
	{
		var id = "#restrictions" + Util.monthNames[i];
		var e = $(id);

		if (rg.noWaterInMonths[i] == "1")
			e.checked = true;
		else
			e.checked = false;
	}

	//Set the WeekDays restrictions
	for (var i = 0; i < Util.weekDaysNames.length; i++)
	{
		var id = "#restrictions" + Util.weekDaysNames[i];
		var e = $(id);

		if (rg.noWaterInWeekDays[i] == "1")
			e.checked = true;
		else
			e.checked = false;
	}

	//List the Hourly Restrictions
	var containerHourly = $("#restrictionsHourly");
	clearTag(containerHourly);

	for (var i = 0; i < rh.length; i++)
	{
		var r = rh[i];
		var template = loadTemplate('restriction-hourly-template');
		var nameElem = $(template, '[rm-id="restriction-hourly-name"]');
		var intervalElem = $(template, '[rm-id="restriction-hourly-interval"]');
		var weekDaysElem = $(template, '[rm-id="restriction-hourly-weekdays"]');
		var deleteElem = $(template, '[rm-id="restriction-hourly-delete"]');

		nameElem.textContent = "Restriction " + r.uid;
		intervalElem.textContent = r.interval;
		weekDaysElem.textContent = Util.bitStringToWeekDays(r.weekDays);

		deleteElem.uid = r.uid;
		deleteElem.onclick = function() { API.deleteRestrictionsHourly(+this.uid); restrictionsSettingsUI(); };

		containerHourly.appendChild(template);
	}

	//Button actions
	buttonExtraSet.onclick = function() { restrictionsSetExtraWatering(); };
	buttonFreezeSet.onclick = function() { restrictionsSetFreezeProtect(); };
	buttonMonthsSet.onclick = function() { restrictionsSetMonths(); };
	buttonWeekDaysSet.onclick = function() { restrictionsSetWeekDays(); };
	buttonHourlySet.onclick = function() { restrictionsSetHourly(); };
}

function restrictionsSetExtraWatering()
{
	var extraWateringElem = $("#restrictionsExtraWatering");
    var data = { hotDaysExtraWatering: extraWateringElem.checked };

	console.log("Extra Watering %o", data);

	API.setRestrictionsGlobal(data);

}

function restrictionsSetFreezeProtect()
{
	var freezeProtectElem = $("#restrictionsFreezeProtect");
	var freezeProtectTempElem = $("#restrictionsFreezeProtectTemp");

	var temp = parseInt(freezeProtectTempElem.options[freezeProtectTempElem.selectedIndex].value);

	var data = {
	 	freezeProtectEnabled: freezeProtectElem.checked,
        freezeProtectTemp: temp
	};
	console.log("FreezeProtect %o", data);
	API.setRestrictionsGlobal(data);
}

function restrictionsSetMonths()
{

	//Read the months restrictions
	var bitstrMonths = "";
	for (var i = 0; i < Util.monthNames.length; i++)
	{
		var id = "#restrictions" + Util.monthNames[i];
		var e = $(id);
		if (e.checked)
			bitstrMonths += "1";
		else
			bitstrMonths += "0";
	}

	var data = { noWaterInMonths: bitstrMonths };
	console.log("Months restrictions: %o", data);
	API.setRestrictionsGlobal(data);
}

function restrictionsSetWeekDays()
{

	//Read the WeekDays restrictions
	var bitstrWeekDays = "";
	for (var i = 0; i < Util.weekDaysNames.length; i++)
	{
		var id = "#restrictions" + Util.weekDaysNames[i];
		var e = $(id);
		if (e.checked)
			bitstrWeekDays += "1";
		else
			bitstrWeekDays += "0";
	}

	var data = { noWaterInWeekDays: bitStringToWeekDays };
	console.log("WeekDays restrictions: %o", data);
	API.setRestrictionsGlobal(data);
}


function restrictionsSetHourly()
{
	var startHourElem = $("#restrictionHourlyStartHour");
	var startMinuteElem = $("#restrictionHourlyStartMinute");
	var durationElem = $("#restrictionHourlyDuration");

	//Read the WeekDays restrictions
	var bitstrWeekDays = "";
	for (var i = 0; i < Util.weekDaysNames.length; i++)
	{
		var id = "#restrictionHourly" + Util.weekDaysNames[i];
		var e = $(id);
		if (e.checked)
			bitstrWeekDays += "1";
		else
			bitstrWeekDays += "0";
	}

	var dayMinuteStart = parseInt(startHourElem.value) * 60 + parseInt(startMinuteElem.value);

	var data = {
		start: dayMinuteStart,
		duration: durationElem.value,
		weekDays: bitstrWeekDays
	}

	console.log("Hourly Restriction %o", data);
	API.setRestrictionsHourly(data);
	restrictionsSettingsUI(); //refresh
}

function aboutSettingsUI()
{
	$("#aboutName").textContent = provision.system.netName;
	$("#aboutVersion").textContent = provision.api.swVer;
	$("#aboutHardware").textContent = provision.api.hwVer;
	$("#aboutAPI").textContent = provision.api.apiVer;
	$("#aboutIP").textContent = provision.wifi.ipAddress;
	$("#aboutNetmask").textContent = provision.wifi.netmaskAddress;
	$("#aboutGateway").textContent = diag.gatewayAddress;
	$("#aboutMAC").textContent = provision.wifi.macAddress;
	$("#aboutAP").textContent = provision.wifi.ssid;
	$("#aboutMemory").textContent = diag.memUsage + " Kb";
	$("#aboutCPU").textContent = diag.cpuUsage.toFixed(2) + " %";
	$("#aboutUptime").textContent = diag.uptime;
}

function showDeviceInfo()
{

	diag = API.getDiag();
    provision = API.getProvision();
    provision.wifi = API.getProvisionWifi();
    provision.api = API.getApiVer();

    var deviceImgDiv = $('#deviceImage');
    var deviceNameDiv = $('#deviceName');
    var deviceNetDiv = $('#deviceNetwork');
    var footerInfoDiv = $('#footerInfo');

    deviceNameDiv.innerHTML = provision.system.netName;
    deviceNetDiv.innerHTML = provision.location.name + "  (" + provision.wifi.ipAddress + ")";

    if (provision.api.hwVer == 3)
    	deviceImgDiv.className = "spk3";

	footerInfoDiv.innerHTML = "Rainmachine " + provision.api.swVer + "  Uptime: " + diag.uptime + " CPU Usage " + diag.cpuUsage.toFixed(2) + " %";
}

function uiStart()
{
	var zonesDiv = $('#zones');
	var settingsDiv = $('#settings');
	var dashboardDiv = $('#dashboard');

	var zonesBtn = $('#zonesBtn');
	var settingsBtn = $('#settingsBtn');
	var dashboardBtn = $('#dashboardBtn');

	var zonesMenu = $('#zonesMenu');
    var settingsMenu = $('#settingsMenu');
    var dashboardMenu = $('#dashboardMenu');


    buildSubMenu(settingsSubmenus, "settings", $('#settingsMenu'));
    buildSubMenu(dashboardSubmenus, "dashboard", $('#dashboardMenu'));
    buildSubMenu(zonesSubmenus, "zones", $('#zonesMenu'));

	zonesBtn.onclick = function() {
		makeVisible(zonesDiv);
		makeVisible(zonesMenu);

		makeHidden(settingsDiv);
		makeHidden(dashboardDiv);

		makeHidden(settingsMenu);
        makeHidden(dashboardMenu);

        zonesBtn.setAttribute("selected", true);
        dashboardBtn.removeAttribute("selected");
        settingsBtn.removeAttribute("selected");

		showZones();
		console.log("Zones");
	}

	settingsBtn.onclick = function() {
		makeVisible(settingsDiv);
		makeVisible(settingsMenu);

		makeHidden(zonesDiv);
		makeHidden(dashboardDiv);

		makeHidden(zonesMenu);
        makeHidden(dashboardMenu);

        settingsBtn.setAttribute("selected", true);
        zonesBtn.removeAttribute("selected");
        dashboardBtn.removeAttribute("selected");

        var defaultViewDiv = $("#settings0");
        defaultViewDiv.onclick();

		console.log("Settings");
	}

	dashboardBtn.onclick = function() {
		makeVisible(dashboardDiv);
		makeVisible(dashboardMenu);

		makeHidden(zonesDiv);
		makeHidden(settingsDiv);

		makeHidden(zonesMenu);
		makeHidden(settingsMenu);

		dashboardBtn.setAttribute("selected", true);
		zonesBtn.removeAttribute("selected");
		settingsBtn.removeAttribute("selected");

		console.log("Dashboard");
	}

	dashboardBtn.setAttribute("selected", true);

	ui.login.login(function() {
		generateCharts();
		showDeviceInfo();
	});
}

window.addEventListener("load", uiStart);