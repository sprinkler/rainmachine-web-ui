/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */
var parserCharts = {
	temperature:	{ chart: null, container: "temperatureParsersChartContainer",	title: "Temperature (&deg;C)" },
	qpf: 			{ chart: null, container: "qpfParsersChartContainer", 			title: "Precipitation Forecast(mm)" },
	wind:			{ chart: null, container: "windParsersChartContainer",			title: "Wind (m/s)" },
	dewPoint: 		{ chart: null, container: "dewParsersChartContainer",			title: "Dew Point (&deg;C)" },
	rh:				{ chart: null, container: "rhParsersChartContainer",			title: "Relative Humidity (%)" },
    pressure:		{ chart: null, container: "pressureParsersChartContainer",		title: "Atmospheric Pressure" }
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
	wind:  {}
};


function getParserData(id) {
	var startDate = Util.getDateWithDaysDiff(0); //7 days from today

	APIAsync.getParserData(id, startDate, 7).then(function(o) {
	 	if (Data.parserData === null) {
	 		Data.parserData = {};
	 	}

		Data.parserData[id] = o;
		processParserChartData(id);
	})
}

function getAllEnabledParsersData() {
	for (var i = 0; i < Data.parsers.parsers.length; i++) {
		if (Data.parsers.parsers[i].enabled) {
			getParserData(Data.parsers.parsers[i].uid);
		}
	}
}

function processParserChartData(id) {

	var parserData = Data.parserData[id].parserData;

	// initialize all data points for this parser id
	var keys = Object.keys(parsersHourlyChartData);
	for (var i = 0; i < keys.length; i++) {
		var key = keys[i];
		parsersHourlyChartData[key][id] = [];
	}
	console.log("initialised id: %d", id);

	//for (var parserDataIndex = 0; parserDataIndex < parserData.length; parserDataIndex++) {
		var days = parserData[0].dailyValues;

		for (var dailyValuesIndex = 0; dailyValuesIndex < days.length; dailyValuesIndex++) {
			var currentDay = days[dailyValuesIndex];
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
			}
		}
	//}

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

	console.log(parsersHourlyChartData);
	generateAllKnownCharts(id);
}

function addDataPoint(id, data, key) {
	if (data[key]) {
        parsersHourlyChartData[key][id].push([Date.parse(data.hour), data[key]]);
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


function generateAllKnownCharts(id) {
	var keys = Object.keys(parserCharts);
	for (var i = 0; i < keys.length; i++) {
		var keyName = keys[i];
		console.log("Generating chart for parser %d key: %s", id, keyName);
		generateSpecificParsersChart(keyName);
	}
}

/**
 * Generates chart for a specific data point for all available parsers
 */
function generateSpecificParsersChart(key) {

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

	var todayTimestamp = new Date();
	todayTimestamp = todayTimestamp - (todayTimestamp % 86400000);

	var chartOptions = {
		chart: {
			renderTo: parserCharts[key].container,
			spacingTop: 20,
		},
		series: chartSeries,
		title: {
			text: '<h1>' +  parserCharts[key].title + '</h1>',
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
		yAxis: [{
			title: false
		}]
	};

	// before generating the chart we must destroy the old one if it exists
	if (parserCharts[key].chart) {
		parserCharts[key].chart.destroy();
	}

	parserCharts[key].chart = new Highcharts.Chart(chartOptions, null);
}


function getParserName(id) {
	for (var i = 0; i < Data.parsers.parsers.length; i++) {
		if (Data.parsers.parsers[i].uid == id) {
			return Data.parsers.parsers[i].name;
		}
	}
}