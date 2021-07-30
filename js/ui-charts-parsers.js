/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

var parserCharts = {
	temperature:	{ chart: null, container: "temperatureParsersChartContainer",	title: "Temperature" },
	maxTemperature:	{ chart: null, container: "maxTemperatureParsersChartContainer",title: "Maximum Temperature" },
	minTemperature:	{ chart: null, container: "minTemperatureParsersChartContainer",title: "Minimum Temperature" },
	qpf: 			{ chart: null, container: "qpfParsersChartContainer", 			title: "Precipitation Forecast" },
	wind:			{ chart: null, container: "windParsersChartContainer",			title: "Wind" },
	dewPoint: 		{ chart: null, container: "dewParsersChartContainer",			title: "Dew Point" },
	rh:				{ chart: null, container: "rhParsersChartContainer",			title: "Relative Humidity" },
    pressure:		{ chart: null, container: "pressureParsersChartContainer",		title: "Atmospheric Pressure" },
	et0:			{ chart: null, container: "etParsersChartContainer",			title: "EvapoTranspiration" },
	rain:			{ chart: null, container: "rainParsersChartContainer",			title: "Observed Weather Station Rain" }
};

var parserNameToColor = {
	"NOAA": 				'#cccccc',
	"WUnderground":			'#f2aeac',
	"METNO": 				'#d8e4aa',
	"Netatmo":				'#b8d2eb',
	"ForecastIO":			'#f2d1b0',
	"OpenWeatherMap":		'#d4b2d3',
	"Local Weather Push": 	'#ddb8a9',
	"CIMIS":				'#ebbfd9',
	"FAWN": 				'#dbe7f9',
	"DWD": 					'#f9f4db',
	"WeatherFlow": 			'#e6edde',
	"PWS":					'#dee7ed'
};

var doyET0Chart = null;
var et0AvgGraphed = false;

/*
 *	Holds parsed data from weather parsers, each possible observation has multiple id (for each parser) and
 * an array containing [timestamp, data] (eg: parsersHourlyChartData.temp[id] has [timestamp, data] as value
 */
var parsersHourlyChartData = {
	condition: {},
	dewPoint: {},
	et0:  {},
	maxRh: {},
	maxTemperature:  {},
	minRh:  {},
	minTemperature:  {},
	qpf:  {},
	pressure:  {},
	rh:  {},
	solarRad: {},
	temperature:  {},
	wind:  {},
	rain: {}
};

function clearParserHourlyData() {
	var keys = Object.keys(parsersHourlyChartData);
	for (var i = 0; i < keys.length; i++) {
		var key = keys[i];
		parsersHourlyChartData[key] = {};
	}
}


function getParserData(startDate, days, id) {
	APIAsync.getParserData(id, startDate, days)
		.start(uiFeedback.start, $("#weatherServicesFetch"))
		.then(function(o) {
			if (Data.parserData === null) {
				Data.parserData = {};
			}

			Data.parserData[id] = o;
			processParserChartData(id, startDate, days);
			uiFeedback.success($("#weatherServicesFetch"));
		})
		.error(uiFeedback.error, $("#weatherServicesFetch"))

}

function getAllEnabledParsersData(startDate, days) {
	clearParserHourlyData();
	for (var i = 0; i < Data.parsers.parsers.length; i++) {
		if (Data.parsers.parsers[i].enabled) {
			getParserData(startDate, days, Data.parsers.parsers[i].uid);
		}
	}
	//TODO Also get the mixerData for the period
}

function processParserChartData(id, startDate, days) {

	var parserData = Data.parserData[id].parserData;

	if (parserData[0] === undefined || !parserData[0]) {
		console.error("No recent data for parser %s", getParserName(id));
		return;
	}
	console.log("Processing parser %s", id);
	// initialize all data points for this parser id
	var keys = Object.keys(parsersHourlyChartData);
	for (var i = 0; i < keys.length; i++) {
		var key = keys[i];
		parsersHourlyChartData[key][id] = [];
	}
//	console.log("initialised id: %d %o", id, parsersHourlyChartData);

	for (var parserDataIndex = 0; parserDataIndex < parserData.length; parserDataIndex++) {
		var d = parserData[parserDataIndex].dailyValues;

		for (var dailyValuesIndex = 0; dailyValuesIndex < d.length; dailyValuesIndex++) {
			var currentDay = d[dailyValuesIndex];
			var hours = currentDay.hourlyValues;
			var currentDayDate = currentDay.day.split(' ')[0];

			for (var hourlyValuesIndex = 0; hourlyValuesIndex < hours.length; hourlyValuesIndex++) {
				var currentHour =  hours[hourlyValuesIndex];

				addDataPoint(id, currentHour, "condition");
				addDataPoint(id, currentHour, "dewPoint");
                addDataPoint(id, currentHour, "et0");
                addDataPoint(id, currentHour, "maxRh");
                addDataPoint(id, currentHour, "maxTemperature");
                addDataPoint(id, currentHour, "minRh");
                addDataPoint(id, currentHour, "minTemperature");
                addDataPoint(id, currentHour, "qpf");
                addDataPoint(id, currentHour, "pressure");
                addDataPoint(id, currentHour, "rh");
                addDataPoint(id, currentHour, "solarRad");
                addDataPoint(id, currentHour, "temperature");
                addDataPoint(id, currentHour, "wind");
				addDataPoint(id, currentHour, "rain");
			}
		}
	}

	//HighCharts needs data points to be sorted
	sortDataPoint("condition");
    sortDataPoint("dewPoint");
    sortDataPoint("et0");
    sortDataPoint("maxRh");
    sortDataPoint("maxTemperature");
    sortDataPoint("minRh");
    sortDataPoint("minTemperature");
    sortDataPoint("qpf");
    sortDataPoint("pressure");
    sortDataPoint("rh");
    sortDataPoint("solarRad");
    sortDataPoint("temperature");
    sortDataPoint("wind");
	sortDataPoint("rain");


	//console.log(parsersHourlyChartData);
	generateAllKnownCharts(id, startDate, days);
}

function addDataPoint(id, data, key) {
	if (data[key] !== null) {
		var value = Util.convert.withType(key, data[key]);
        parsersHourlyChartData[key][id].push([Date.parse(data.hour.replace(' ', 'T')), value]);
	}
}

function sortDataPoint(key) {
	var data = parsersHourlyChartData[key];
	for (id in data) {
		if (data[id].length > 0) {
			data[id].sort(function(a, b) { return a[0] - b[0];});
		}
	}
}

function generateAllKnownCharts(id, startDate, days) {
	et0AvgGraphed = false;
	var keys = Object.keys(parserCharts);
	for (var i = 0; i < keys.length; i++) {
		var keyName = keys[i];
		//console.log("Generating chart for parser %d key: %s", id, keyName);
		generateSpecificParsersChart(keyName, startDate, days);
	}
}

/**
 * Generates chart for a specific data point for all available parsers
 */
function generateSpecificParsersChart(key, startDate, days) {

	var data = parsersHourlyChartData[key];
	var chartSeries = [];

    for (id in data) {
		if (data[id].length > 0) {
			var parserName = getParserName(id);
			var parserColor = null;
			if (parserName in parserNameToColor) {
				parserColor = parserNameToColor[parserName];
			}

			// Build the chart series
			chartSeries.push({
				data: data[id],
				name: getParserName(id),
				zoneAxis: 'x',
				tooltip: {
					valueSuffix: Util.convert.getUnits(key)
				}
				/*
				zones: [{
					value: todayTimestamp,
				}, {
					dashStyle: 'LongDash'
				}]
				*/
			});

			if (parserColor) {
				chartSeries[chartSeries.length - 1].color = parserColor;
			}
		}
	}

	//Add mixer entry
	var mixerChartData = generateMixerData(key, startDate, days);

	if (mixerChartData) {
		chartSeries.push({
			data: mixerChartData,
			tooltip: {
				valueSuffix: Util.convert.getUnits(key)
			},
			name: "RainMachine Mixer",
			color: "#f44336",
			lineWidth: 3,
			zoneAxis: 'x'
		});
	}

	var todayTimestamp = Util.today();
	todayTimestamp = todayTimestamp - (todayTimestamp % 86400000);

	var title = parserCharts[key].title + ' (' + Util.convert.getUnits(key) + ')';
	var subtitle = "";

	if (key == 'rain') {
		subtitle = "Only available when a weather service that supports observed data is enabled";
	}
	if (key == 'wind') {
		subtitle = "RainMachine final wind value reduced by " + Data.provision.location.windSensitivity * 100 + "% sensitivity";
	}

	var chartOptions = {
		chart: {
			renderTo: parserCharts[key].container,
			spacingTop: 20,
			zoomType: 'x'
		},
		tooltip: {
			shared: true
		},
		tooltip: {
			shared: true,
			useHTML: true,
			xDateFormat: '%b %d %H:%M',
			//Removed div inline style to css class highcharts-parsers-tooltip
			headerFormat: '<div class="highcharts-parsers-tooltip"><h1>{point.key}</h1><table class="highcharts-parsers-tooltip">',
			pointFormat: '<tr><td><nobr>{series.name}: </nobr></td>' +
			'<td style="text-align: right"><nobr><b>{point.y}</b></nobr></td></tr>',
			footerFormat: '</table></div>',
			valueDecimals: 2
		},
		series: chartSeries,
		title: {
			text:'<h1>' + title + '</h1>',
			useHTML: true
		},
		subtitle: {
			text: subtitle
		},
		plotOptions: {
        	series: {
        		pointInterval: 1000*60*60
        	}
        },
		xAxis: {
			type: 'datetime',
			title: {
				text: 'Date'
			}
		},
		yAxis: {
			title: false
		}
	};


	//Add Summer ET0 Average for EvapoTranspiration graph
	if (key == 'et0' && ! et0AvgGraphed) {
		var et0AvgLine = [];
		var et0Avg = Util.convert.withType('et0', +Data.provision.location.et0Average);

		//We generate this line as plotLines minRange is not reliable to show the line when
		//other data is much lower
		for (i = 0; i < days; i++) {
			var date = new Date(startDate);
			et0AvgLine.push([date.setDate(date.getDate() + i), et0Avg])
		}

		chartSeries.push({
			data: et0AvgLine,
			name: "Summer Average",
			color: "#003399",
			lineWidth: 3,
			zoneAxis: 'x'
		});

		chartOptions.yAxis.plotLines = [{
			value: et0Avg,
			color: '#003399',
			width: 3,
			zIndex:4,
			label:{
				text:'Summer Average: ' + et0Avg + Util.convert.uiQuantityStr() + ' (100% watering)'
			}
		}];

		et0AvgGraphed = true;
	}

	// before generating the chart we must destroy the old one if it exists
	if (parserCharts[key].chart) {
		parserCharts[key].chart.destroy();
	}

	parserCharts[key].chart = new Highcharts.Chart(chartOptions, null);
}


function generateDOYET0Chart() {

	var chartOptions = {
		chart: {
			renderTo: $('#doyChart'),
			zoomType: 'x'
		},
		title: null,
		xAxis: {
			type: 'datetime',
			dateTimeLabelFormats: { // don't display the dummy year
				month: '%e. %b',
				year: '%b'
			},
			title: {
				text: 'Day of Year'
			}
		},
		yAxis: {
			title: {
				text: 'EvapoTranspiration (' + Util.convert.uiQuantityStr() + ')'
			},
			min: 0
		},
		tooltip: {
			headerFormat: '<b>EvapoTranspiration</b><br>',
			pointFormat: '{point.x:%e. %b}: {point.y:.2f} (' + Util.convert.uiQuantityStr() + ')'
		},

		series: [{
			name: 'Historical EvapoTranspiration',
			data: Data.doyET0
		}]
	};


	// before generating the chart we must destroy the old one if it exists
	if (doyET0Chart) {
		doyET0Chart.destroy();
	}
	doyET0Chart = new Highcharts.Chart(chartOptions, null);
}

function generateAWChart(container, id, capacity,  past, days) {
	var startDateStr = Util.getDateWithDaysDiff(past);
	var startDate = Date.parse(startDateStr);

	capacity = Util.convert.uiQuantity(capacity);
	var aw = {};

	//Code below consider this sorted ascending by date (as returned by REST API)
	var data = Data.availableWater.availableWaterValues;

	for (var i = 0; i < data.length; i++) {
		var value = 0;
		var zid = data[i].zid;

		if (zid !== id) {
			continue;
		}

		var pid = data[i].pid;
		if (! (pid in aw)) {
			//Init array with same length as days
			aw[pid] = [];
			for (var j = 0; j < days; j++) {
				aw[pid][j] = [startDate + j * 86400, null];
			}
		}

		var dateStr = data[i].dateTime.split(" ")[0];
		var date = Date.parse(dateStr);
		value = +data[i].aw;

		//Find corresponding day index in the array (so we have missing data with 0 to sync with top row)
		var dateIndex = Util.getDateIndex(dateStr, startDate);
		aw[pid][dateIndex] = [date, Util.convert.uiQuantity(value)];
	}


	var chartSeries = [];

	/*
	chartSeries.push({
		name: "EvapoTranspiration",
		type: "area",
		color: "rgba(220, 118, 51, 0.2)",
		yAxis: 1,
		data: generateMixerData("et0", startDateStr, days),
		marker: {
			enabled: false
		},
		tooltip: {
			valueSuffix: Util.convert.uiQuantityStr()
		},
		connectNulls: true
	});
*/
	for (i in aw) {
		var p = getProgramById(i);
		var name = "Program " + i;
		if (p !== null) {
			name = "Program " + p.name; // " @ " + p.startTime;
		}

		name += " available water";

		chartSeries.push({
			name: name,
			data: aw[i],
			yAxis: 0,
			marker: {
				enabled: true,
				radius: 5
			},
			tooltip: {
				valueSuffix: Util.convert.uiQuantityStr()
			},
			connectNulls: true
		});
	}

	var chartOptions = {
		chart: {
			type: 'area',
			backgroundColor: '#f6f6f6',
			alignTicks: false,
			height: 300,
			renderTo: container
		},
		credits: {
			enabled: false
		},
		colors: [
			"#00BFFF",
			"#1E90FF",
			"#7B68EE",
			"#87CEFA",
			"#483D8B",
			"#0000FF",
			"#000080",
			"#4B0082",
			"#8A2BE2"
		],
		title: null,
		xAxis: {
			type: 'datetime',
			minorTickLength: 0,
			//tickPixelInterval: 64,
			labels: {
				enabled: false
			},
			//tickInterval:24 * 3600 * 1000,
			lineColor: 'transparent',
			title: null,
			tickLength: 0
		},
		yAxis: [
			{
				gridLineWidth: 0,
				title: {
					text: null,
					style: {
						color: Highcharts.getOptions().colors[1]
					}
				},
				labels: {
					enabled: false
				},

				plotBands: [{
					color: "#f6f6f6",
					from: capacity,
					to: 0,
					zIndex: 0
				}],

				plotLines: [{
					color: 'rgba(220, 118, 51, 1)',
					value: capacity,
					width: 2,
					zIndex: 1,
					label: {
						y: -15,
						text: '<span style="font-size: 14px">Maximum Field Capacity: ' + capacity + " " + Util.convert.uiQuantityStr() + '</span>'
					}
				},
					//Optimal level band
					{
					color: '#00e500',
					value: 0,
					width: 15,
					zIndex: 1,
				},  //Optimal level text
					{
					color: 'transparent',
					value: 0,
					width: 15,
					zIndex: 5,
					label: {
						y: 3,
						text: '<span style="font-size: 14px; color: #003300; font-weight: bold;">Optimal level</span>'
					}
					}
				],
				max: capacity * 1.2,
				opposite: true
			},
			{
				gridLineWidth: 0,
				title: {
					text: null,
					style: {
						color: "rgba(255,152,0, 0.5)"
					}
				},
				labels: {
					enabled: false
				},
				reversed: true
			}
		],
		tooltip: {
			shared: true
		},
		/*
		plotOptions: {
			series: {
				fillOpacity: 0.2
			}
		},*/

		tooltip: {
			shared: true,
			useHTML: true,
			xDateFormat: '%b %d',
			headerFormat: '<h1>{point.key}</h1><table>',
			pointFormat: '<tr><td><nobr>{series.name}: </nobr></td>' +
			'<td style="text-align: right"><nobr><b>{point.y}</b></nobr></td></tr>',
			footerFormat: '</table>',
			valueDecimals: 2
		},
		series: chartSeries
	};

	//This is destroyed along with parent node from calling function
	var awChart = new Highcharts.Chart(chartOptions, null);
}

function generateMixerData(key, startDate, days) {

	var mixerChartData = [];

	//Translation from received parser keys to mixer keys
	mixerKey = key;

	if (key === "maxTemperature") {
		mixerKey = "maxt";
	}

	if (key === "minTemperature") {
		mixerKey = "mint";
	}

	if (!chartsData.hasOwnProperty(mixerKey)) {
		return null;
	}

	var index = Util.getDateIndex(startDate, chartsData.startDate);
	var mixerData = chartsData[mixerKey].data.slice(index, index + days);
	var mixerDates =  chartsData.days.slice(index, index + days);
//	console.log("Sliced from %d to %d", index, index+days);

	for (var i = 0; i < mixerData.length; i++) {
		// Fix for the rain workaround in ui-charts where null is being replaced with -1
		if (key == 'rain' && mixerData[i] == -1) {
			mixerData[i] = null;
		}

		mixerChartData.push([Date.parse(mixerDates[i]), Util.convert.withType(key, mixerData[i])]);
	}

	return mixerChartData;
}

function getParserName(id) {
	for (var i = 0; i < Data.parsers.parsers.length; i++) {
		if (Data.parsers.parsers[i].uid == id) {
			var name = Data.parsers.parsers[i].name;
			var lw = name.lastIndexOf(" ");
			var newName =  name.replace(/\s*Parser$/i, ""); // Don't show "Parser" at end of weather service name
			return newName;
		}
	}
}
