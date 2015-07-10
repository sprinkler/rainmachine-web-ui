var settingsSubmenus = [
		{ name: "Programs", 		func: window.ui.programs.showPrograms, 			container: '#programs' },
    	{ name: "Watering History", func: window.ui.settings.showWaterLog,			container: '#wateringHistory' },
    	{ name: "Snooze",  			func: window.ui.settings.showRainDelay,			container: '#snooze' },
    	{ name: "Restrictions",  	func: window.ui.restrictions.showRestrictions,	container: '#restrictions' },
    	{ name: "Weather", 			func: window.ui.settings.showWeather,			container: '#weather' },
    	{ name: "System Settings",  func: window.ui.system.showSettings,			container: '#systemSettings' },
    	{ name: "About",  			func: window.ui.about.showAbout, 				container: '#about' }
	];

var dashboardSubmenus = [
    	{ name: "Weekly", 		func: loadWeeklyCharts,		container: null },
        { name: "Monthly", 		func: loadMonthlyCharts,	container: null },
        { name: "Yearly",  		func: loadYearlyCharts,		container: null }
      ];

var zonesSubmenus = [
		{ name: "Stop All",		func: window.ui.zones.stopAllWatering,		container: null }
];

var loop = null;

function _genericSubMenu()
{
	console.log("SubMenu: %s : %s", this.id, this.name)
}

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

function uiLoop()
{
	if (isVisible("#zones") && isVisible("#zonesList"))
	{
		var waterQueue = API.getWateringQueue();

		if (waterQueue === undefined || !waterQueue || !waterQueue.queue || !waterQueue.queue.length)
			return;

		console.log("Watering Loop: %o", waterQueue);
		window.ui.zones.showZones();
		return;
	}
	else
	{
		console.log("Idle Loop");
	}

	return;
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
		makeVisible("#zonesList"); //Added to set initial display property to this layer which we use on uiLoop

		makeVisible(zonesDiv);
		makeVisible(zonesMenu);

		makeHidden(settingsDiv);
		makeHidden(dashboardDiv);

		makeHidden(settingsMenu);
        makeHidden(dashboardMenu);

        zonesBtn.setAttribute("selected", true);
        dashboardBtn.removeAttribute("selected");
        settingsBtn.removeAttribute("selected");

		window.ui.zones.showZones();
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
		makeVisibleBlock(dashboardDiv);
		makeVisibleBlock(dashboardMenu);

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
		loadCharts(true, 60); //generate charts forcing data refresh for 60 days in the past
		window.ui.about.showDeviceInfo();
		loop = setInterval(uiLoop, 1000);
	});
}

window.addEventListener("load", uiStart);
