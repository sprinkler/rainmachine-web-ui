function _genericSubMenu() { console.log("SubMenu: %s : %s", this.id, this.name) }

var settingsSubmenus = [
		{ name: "Programs", func: _genericSubMenu },
    	{ name: "Watering History", func: _genericSubMenu },
    	{ name: "Snooze",  func: _genericSubMenu },
    	{ name: "Restrictions",  func: _genericSubMenu },
    	{ name: "Weather", func: _genericSubMenu },
    	{ name: "System Settings",  func:_genericSubMenu },
    	{ name: "About",  func: _genericSubMenu },
    	{ name: "Software Updates", func: _genericSubMenu }
	];

var dashboardSubmenus = [
    	{ name: "Daily", func: _genericSubMenu },
        { name: "Weekly", func: _genericSubMenu },
        { name: "Yearly",  func: _genericSubMenu }
      ];


function buildSubMenu(submenus, category, parentTag)
{

	for (var i = 0; i < submenus.length; i++)
	{
		var div = addTag(parentTag, 'div')
		div.className = "submenu";
		div.id = category + i;
		div.name = div.innerHTML = submenus[i].name;
		div.func = submenus[i].func
		div.onclick = function() { this.func(); }
	}
}

function generateZones()
{
	var zoneData = API.getZones();
	var zonesMenu = $('#zonesMenu');

	for (var i = 0; i < zoneData.zones.length; i++)
	{
		var z = zoneData.zones[i];
		var div = addTag(zonesMenu, 'div');

		div.className = "submenu";
		div.id = "zone" + z.uid;
        div.innerHTML = z.name;
	}
}

function generateCharts()
{
	var mixerData = API.getMixer();

	console.log("%o", mixerData.mixerData[0].dailyValues);

	var chartQpf = c3.generate(
	{
		bindto: '#chartQpf',
		data: {
			json: mixerData.mixerData[0].dailyValues,

			keys: {
				x: 'day',
				//value: ['minTemp', 'maxTemp', 'rh', 'et0final', ],
				value: ['qpf'],
			},

			type: 'bar',
			xFormat: '%Y-%m-%d %H:%M:%S',

		},

		bar: {
			width: {
				ratio: 0.5
			}
		},

		axis: {
			x: {
				type: 'timeseries',
				tick: {
					format: '%d %a'
				}
			}
		},

		color: {
			pattern: ['#ffffff']
		}
	});

	var chartTemperature = c3.generate(
	{
		bindto: '#chartTemperature',
		data: {
			json: mixerData.mixerData[0].dailyValues,

			keys: {
				x: 'day',
				//value: ['minTemp', 'maxTemp', 'rh', 'et0final', ],
				value: ['temperature'],
			},

			//type: 'bar',
			xFormat: '%Y-%m-%d %H:%M:%S',

		},

		bar: {
			width: {
				ratio: 0.5
			}
		},

		axis: {
			x: {
				type: 'timeseries',
				tick: {
					format: '%Y-%m-%d %H:%M:%S'
				}
			}
		},

		color: {
			pattern: ['#ffffff']
		}
	});
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
		console.log("Zones");
	}

	settingsBtn.onclick = function() {
		makeVisible(settingsDiv);
		makeVisible(settingsMenu);

		makeHidden(zonesDiv);
		makeHidden(dashboardDiv);

		makeHidden(zonesMenu);
        makeHidden(dashboardMenu);
		console.log("Settings");
	}

	dashboardBtn.onclick = function() {
		makeVisible(dashboardDiv);
		makeVisible(dashboardMenu);

		makeHidden(zonesDiv);
		makeHidden(settingsDiv);

		makeHidden(zonesMenu);
		makeHidden(settingsMenu);

		console.log("Dashboard");
	}

	buildSubMenu(settingsSubmenus, "settings", $('#settingsMenu'));
	buildSubMenu(dashboardSubmenus, "dashboard", $('#dashboardMenu'));

	API.auth("admin", true);
	generateCharts();
	generateZones();
}

window.addEventListener("load", uiStart);