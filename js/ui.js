function _genericSubMenu()
{
	$('#settingsTitle').innerHTML = this.name;
	console.log("SubMenu: %s : %s", this.id, this.name)
	makeHidden('#programs');
}

function showProgramSettings(data)
{
	var programSettingsDiv = $('#programsSettings');
	clearTag(programSettingsDiv);

	var programTemplate = loadTemplate("program-settings-template");
	var zoneTable = programTemplate.querySelector("table tbody");

	for (var s in data)
	{
		var div = addTag(programTemplate, 'div');
		div.innerHTML = s + ": " + JSON.stringify(data[s]);

		if(s === "wateringTimes") {
			var wateringTimeList = data[s];
			for(var index = 0; index < wateringTimeList.length; index++) {
				var wateringTime = wateringTimeList[index];

				var zoneTemplate = loadTemplate("program-settings-zone-template");

				var zoneNameElem = zoneTemplate.querySelector('[rm-id="program-zone-name"]');
				var zoneDurationElem = zoneTemplate.querySelector('[rm-id="program-zone-duration"]');
				var zoneActiveElem = zoneTemplate.querySelector('[rm-id="program-zone-active"]');

				zoneNameElem.textContent = wateringTime.name;
				zoneDurationElem.textContent = wateringTime.duration;
				zoneActiveElem.checked = wateringTime.active;

				zoneTable.appendChild(zoneTemplate);
			}
		}
	}

	programSettingsDiv.appendChild(programTemplate);
}

function showPrograms()
{
	var programData = API.getPrograms();
	var programListDiv = $('#programsList');
	clearTag(programListDiv);
	makeVisible('#programs');
	
	$('#settingsTitle').innerHTML = "Programs";

	for (var i = 0; i < programData.programs.length; i++)
	{
		var p = programData.programs[i];

		var template = loadTemplate("program-entry");

		var nameElem = template.querySelector('div[rm-id="program-name"]');
		var startElem = template.querySelector('button[rm-id="program-start"]');
		var editElem = template.querySelector('button[rm-id="program-edit"]');

		template.className = "listItem";
		template.id = "program-" + p.uid;

		template.data = p;
		editElem.data = p;

		nameElem.innerHTML = p.uid + " - " + p.name;
		startElem.onclick = function() { alert("TODO"); };
		editElem.onclick = function() { showProgramSettings(this.data); };

		programListDiv.appendChild(template);
	}

	var div = addTag(programListDiv, 'div');
	div.className = "listItem";
	div.innerHTML = "Add new program";
	div.onclick = function() { console.log("Add new program"); };
}

var settingsSubmenus = [
		{ name: "Programs", func: showPrograms },
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
		div.func = submenus[i].func;
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
		div.id = "zone-" + z.uid;
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

		generateZones();
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
	showDeviceInfo();
}

window.addEventListener("load", uiStart);