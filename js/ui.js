function generateZones()
{
	var zoneData = API.getZones();
	var zonesDiv = $('#zones');

	for (var i = 0; i < zoneData.zones.length; i++)
	{
		var z = zoneData.zones[i];
		var div = addTag(zonesDiv, 'div');

		div.className = "zone";
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

	zonesBtn.onclick = function() {
		makeVisible(zonesDiv);
		makeHidden(settingsDiv);
		makeHidden(dashboardDiv);
		console.log("Zones");
	}

	settingsBtn.onclick = function() {
		makeVisible(settingsDiv);
		makeHidden(zonesDiv);
		makeHidden(dashboardDiv);
		console.log("Settings");
	}

	dashboardBtn.onclick = function() {
		makeVisible(dashboardDiv);
		makeHidden(zonesDiv);
		makeHidden(settingsDiv);
		console.log("Dashboard");
	}

	API.auth("admin", true);
	generateCharts();
	generateZones();
}

window.addEventListener("load", uiStart);