function _genericSubMenu()
{
	//$('#settingsTitle').innerHTML = this.name;
	console.log("SubMenu: %s : %s", this.id, this.name)
}

var currentZoneProperties = null;

var settingsSubmenus = [
		{ name: "Programs", 		func: window.ui.programs.showPrograms, 	container: '#programs' },
    	{ name: "Watering History", func: _genericSubMenu, 					container: '#wateringHistory' },
    	{ name: "Snooze",  			func: rainDelaySettingsUI, 				container: '#snooze' },
    	{ name: "Restrictions",  	func: _genericSubMenu, 					container: '#restrictions' },
    	{ name: "Weather", 			func: weatherSettingUI, 				container: '#weather' },
    	{ name: "System Settings",  func:_genericSubMenu, 					container: '#systemSettings' },
    	{ name: "About",  			func: _genericSubMenu, 					container: '#about' }
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

	API.auth("admin", true);

	generateCharts();
	showDeviceInfo();
}

window.addEventListener("load", uiStart);