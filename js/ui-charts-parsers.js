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
	APIAsync.getParserData(id, startDate, days).then(function(o) {
	 	if (Data.parserData === null) {
	 		Data.parserData = {};
	 	}

		Data.parserData[id] = o;
		processParserChartData(id, startDate, days);
	})
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

	// initialize all data points for this parser id
	var keys = Object.keys(parsersHourlyChartData);
	for (var i = 0; i < keys.length; i++) {
		var key = keys[i];
		parsersHourlyChartData[key][id] = [];
	}
	console.log("initialised id: %d %o", id, parsersHourlyChartData);

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
		// Build the chart series
		chartSeries.push({
			data: data[id],
			name: getParserName(id),
			zoneAxis: 'x',
			/*
			zones: [{
				value: todayTimestamp,
			}, {
				dashStyle: 'LongDash'
			}]
			*/
		});
		}
	}

	//Translation from parser keys to mixer keys
	mixerKey = key;

	if (key === "maxTemperature") {
		mixerKey = "maxt";
	}

	if (key === "minTemperature") {
		mixerKey = "mint";
	}

	//Add mixer entry
	if (chartsData.hasOwnProperty(mixerKey)) {
		var index = Util.getDateIndex(startDate, chartsData.startDate);
		var mixerData = chartsData[mixerKey].data.slice(index, index + days);
        var mixerDates =  chartsData.days.slice(index, index + days);
		console.log("Sliced from %d to %d", index, index+days);
        var mixerChartData = [];
        for (var i = 0; i < mixerData.length; i++) {
			// Fix for the rain workaround in ui-charts where null is being replaced with -1
			if (key == 'rain' && mixerData[i] == -1) {
				mixerData[i] = null;
			}

			mixerChartData.push([Date.parse(mixerDates[i]), Util.convert.withType(key, mixerData[i])]);
		}

		chartSeries.push({
			data: mixerChartData,
			name: "RainMachine Mixer",
			color: "#f44336",
			lineWidth: 3,
			zoneAxis: 'x'
		});
	}

	var todayTimestamp = new Date();
	todayTimestamp = todayTimestamp - (todayTimestamp % 86400000);

	var chartOptions = {
		chart: {
			renderTo: parserCharts[key].container,
			spacingTop: 20
		},
		tooltip: {
			shared: true
		},

		series: chartSeries,
		title: {
			text: '<h1>' +  parserCharts[key].title + ' (' + Util.convert.getUnits(key) + ')</h1>',
			useHTML: true
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
	if (key == 'et0') {
		var et0Avg = Util.convert.withType('et0', Data.provision.location.et0Average);
		chartOptions.yAxis.minRange = et0Avg;
		chartOptions.yAxis.plotLines = [{
			value: et0Avg,
			color: '#003399',
			width: 3,
			zIndex:4,
			label:{
				text:'Summer Average (100% watering)'
			}
		}];
	}

	// before generating the chart we must destroy the old one if it exists
	if (parserCharts[key].chart) {
		parserCharts[key].chart.destroy();
	}

	parserCharts[key].chart = new Highcharts.Chart(chartOptions, null);
}


function getParserName(id) {
	for (var i = 0; i < Data.parsers.parsers.length; i++) {
		if (Data.parsers.parsers[i].uid == id) {
			var name = Data.parsers.parsers[i].name;
			var lw = name.lastIndexOf(" ");
            var newName =  name.substring(0, lw); //Don't show "Parser" word in weather parsers
			return newName;
		}
	}
}