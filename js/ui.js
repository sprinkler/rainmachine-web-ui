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