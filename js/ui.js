function _genericSubMenu()
{
	//$('#settingsTitle').innerHTML = this.name;
	console.log("SubMenu: %s : %s", this.id, this.name)
}

var currentZoneProperties = null;

var settingsSubmenus = [
		{ name: "Programs", 		func: window.ui.programs.showPrograms, 	container: '#programs' },
    	{ name: "Watering History", func: _genericSubMenu, 					container: '#wateringHistory' },
    	{ name: "Snooze",  			func: _genericSubMenu, 					container: '#snooze' },
    	{ name: "Restrictions",  	func: _genericSubMenu, 					container: '#restrictions' },
    	{ name: "Weather", 			func: _genericSubMenu, 					container: '#weather' },
    	{ name: "System Settings",  func:_genericSubMenu, 					container: '#systemSettings' },
    	{ name: "About",  			func: _genericSubMenu, 					container: '#about' },
    	{ name: "Software Updates", func: _genericSubMenu, 					container: '#softwareUpdate' }
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

function zoneTypeToString(type)
{
	switch (type)
	{
		case 2:
			return "Lawn";
		case 3:
			return "Fruit Trees";
		case 4:
			return "Flowers";
		case 5:
			return "Vegetables";
		case 6:
			return "Citrus";
		case 7:
			return "Trees and Bushes";
		default:
			return "Other"
	}
}

function showZoneSettings(zone)
{
	currentZoneProperties = zone;

	var zoneSettingsDiv = $("#zonesSettings");
	clearTag(zoneSettingsDiv);
	makeHidden('#zonesList');

	var zoneTemplate = loadTemplate("zone-settings-template");

	var zoneMasterValveElem = $(zoneTemplate, '[rm-id="zone-master-valve"]');
	var zoneMasterValveContainerElem = $(zoneTemplate, '[rm-id="zone-master-valve-option"]');
	var zoneNameElem = $(zoneTemplate, '[rm-id="zone-name"]');
	var zoneActiveElem = $(zoneTemplate, '[rm-id="zone-active"]');
	var zoneVegetationElem = $(zoneTemplate, '[rm-id="zone-vegetation-type"]');
	var zoneForecastElem = $(zoneTemplate, '[rm-id="zone-forecast-data"]');
	var zoneHistoricalElem = $(zoneTemplate, '[rm-id="zone-historical-averages"]');


	if (zone.uid != 1)
		makeHidden(zoneMasterValveContainerElem);

	zoneTemplate.id = "zone-settings-" + zone.uid;
	zoneNameElem.value = zone.name;
	console.log(zone.name)
	zoneActiveElem.checked = zone.active;
	zoneForecastElem.checked = zone.internet;
	zoneHistoricalElem.checked = zone.history;


	$(zoneTemplate, '[rm-id="zone-cancel"]').onclick = function(){ closeZoneSettings(); };
	$(zoneTemplate, '[rm-id="zone-save"]').onclick = function(){ saveZone(zone.uid); };
	zoneSettingsDiv.appendChild(zoneTemplate);
}

// Set zone running/pending/idle status

function setZoneState(uid, state, remaining)
{
	var zoneDiv = $("#zone-" + uid);

	if (zoneDiv === undefined || zoneDiv === null)
	{
		console.log("Zone State: Cannot find zone %d", uid);
		return -2;
	}

    var statusElem = $(zoneDiv, '[rm-id="zone-status"]');
    var startElem = $(zoneDiv, '[rm-id="zone-start"]');
    var stopElem = $(zoneDiv, '[rm-id="zone-stop"]');

    // API keeps state 2 pending but can have remaining 0 if it was stopped
    if (remaining <= 0 && state == 2)
    	state = 0;

    switch (state)
    {
    	case 1: //running
    		statusElem.className = "zoneRunning";
            makeHidden(startElem)
    		makeVisible(stopElem);
			break;
    	case 2: //pending running
    		statusElem.className = "zonePending";
            makeHidden(startElem)
    		makeVisible(stopElem);
    		break;
    	default: //idle
			statusElem.className = "zoneIdle";
			makeHidden(stopElem);
			makeVisible(startElem);
			break;
    }
}

function updateZoneTimer(uid, seconds)
{
	var zoneDiv = $("#zone-" + uid);

	if (zoneDiv === undefined || zoneDiv === null)
	{
		console.log("Zone Timer: Cannot find zone %d", uid);
		return -2;
	}

    var minutesElem = $(zoneDiv, '[rm-id="zone-minutes"]');
    var secondsElem = $(zoneDiv, '[rm-id="zone-seconds"]');


    var m = (seconds / 60) >> 0;
    var s = (seconds % 60) >> 0;

    console.log("Seconds: %d - %d:%d", seconds, m, s);

    minutesElem.value = m;
    secondsElem.value = s;
}

function startZone(uid)
{
	var zoneDiv = $("#zone-" + uid);

	if (zoneDiv === undefined || zoneDiv === null)
	{
		console.log("Zone Start: Cannot find zone %d", uid);
		return -2;
	}

	var minutesElem = $(zoneDiv, '[rm-id="zone-minutes"]');
	var secondsElem = $(zoneDiv, '[rm-id="zone-seconds"]');

    try {
    	var duration = parseInt(minutesElem.value) * 60 + parseInt(secondsElem.value);
    	API.startZone(uid, duration);
    } catch(e) {
    	console.log("Cannot start zone %d with duration %d", uid, duration);
    }

    showZones();
}

function stopZone(uid)
{
	API.stopZone(uid);
	showZones();
}

function stopAllWatering()
{
	console.log("Stop All Watering");
}

function closeZoneSettings()
{
	var zoneSettingsDiv = $('#zoneSettings');
	clearTag(zoneSettingsDiv);
	makeVisible('#zonesList');
	currentZoneProperties = null;
}

function saveZone(uid)
{
	var zoneSettingsDiv = $('#zone-settings-' + uid);
	var zoneProperties = {}

	if (zoneSettingsDiv === undefined || zoneSettingsDiv === null)
	{
		console.log("Cannot find zone settings div for zone %d", uid);
		return -2;
	}

	var zoneMasterValveElem = $(zoneSettingsDiv, '[rm-id="zone-master-valve"]');
    var zoneNameElem = $(zoneSettingsDiv, '[rm-id="zone-name"]');
    var zoneActiveElem = $(zoneSettingsDiv, '[rm-id="zone-active"]');
    var zoneVegetationElem = $(zoneSettingsDiv, '[rm-id="zone-vegetation-type"]');
    var zoneForecastElem = $(zoneSettingsDiv, '[rm-id="zone-forecast-data"]');
    var zoneHistoricalElem = $(zoneSettingsDiv, '[rm-id="zone-historical-averages"]');

    zoneProperties.uid = uid;
    zoneProperties.name = zoneNameElem.value;
    zoneProperties.active = zoneActiveElem.checked;
    zoneProperties.internet = zoneForecastElem.checked;
    zoneProperties.history = zoneHistoricalElem.checked;

    if (uid == 1)
    	zoneProperties.master = zoneMasterValveElem.checked;

    console.log("Saving zone %d with properties: %o", uid, zoneProperties);
    API.setZonesProperties(uid, zoneProperties, null);
    closeZoneSettings();
    showZones();
}

function showZones()
{
	var zoneData = API.getZones();
	var zoneAdvData = API.getZonesProperties();

	var zonesDiv = $('#zonesList');

	clearTag(zonesDiv);

	for (var i = 0; i < zoneData.zones.length; i++)
	{
		var z = zoneData.zones[i];
		var za = zoneAdvData.zones[i];

		var template = loadTemplate("zone-entry");
		var nameElem = template.querySelector('div[rm-id="zone-name"]');
		var startElem = template.querySelector('button[rm-id="zone-start"]');
		var stopElem = template.querySelector('button[rm-id="zone-stop"]');
		var editElem = template.querySelector('button[rm-id="zone-edit"]');
		var typeElem = template.querySelector('div[rm-id="zone-info"]');


		template.id = "zone-" + z.uid;
		template.data = za;

		if (! za.active)
			template.className += " inactive";

		nameElem.innerHTML = z.name;
		typeElem.innerHTML = zoneTypeToString(z.type);
		startElem.onclick = function() { startZone(this.parentNode.data.uid); };
		stopElem.onclick = function() { stopZone(this.parentNode.data.uid); };
		editElem.onclick = function() { showZoneSettings(this.parentNode.data); };

		zonesDiv.appendChild(template);

		setZoneState(z.uid, z.state, z.remaining);
		updateZoneTimer(z.uid, z.remaining);
	}
}

/* Globals to hold returned API json */
var provision = {};
var diag = {};

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

	buildSubMenu(settingsSubmenus, "settings", $('#settingsMenu'));
	buildSubMenu(dashboardSubmenus, "dashboard", $('#dashboardMenu'));
	buildSubMenu(zonesSubmenus, "zones", $('#zonesMenu'));

	dashboardBtn.setAttribute("selected", true);

	API.auth("admin", true);

	generateCharts();
	showDeviceInfo();
}

window.addEventListener("load", uiStart);