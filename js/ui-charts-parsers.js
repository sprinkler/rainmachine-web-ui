/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */


var parserCharts = {
	temperature: null,
	qpf: null
};

var parsersHourlyChartData = {};

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
	getParserData(1);
	getParserData(3);
	getParserData(4);
	getParserData(5);
}

function processParserChartData(id) {

	var parserData = Data.parserData[id].parserData;

	parsersHourlyChartData[id] = {};

	//for (var parserDataIndex = 0; parserDataIndex < parserData.length; parserDataIndex++) {
		var days = parserData[0].dailyValues;

		for (var dailyValuesIndex = 0; dailyValuesIndex < days.length; dailyValuesIndex++) {
			var currentDay = days[dailyValuesIndex];
			var hours = currentDay.hourlyValues;
			var currentDayDate = currentDay.day.split(' ')[0];

			for (var hourlyValuesIndex = 0; hourlyValuesIndex < hours.length; hourlyValuesIndex++) {
				var currentHour =  hours[hourlyValuesIndex];
				parsersHourlyChartData[id][currentHour.hour] = {
					condition:	currentHour.condition,
					dewPoint:	currentHour.dewPoint,
					et0:		currentHour.et0,
					maxRh:		currentHour.maxRh,
					maxt: 		currentHour.maxTemperature,
					minRh:		currentHour.minRh,
					mint: 		currentHour.minTemperature,
					qpf:  		currentHour.qpf,
					pressure:	currentHour.pressure,
					rh:			currentHour.rh,
					solarRad:	currentHour.solarRad,
					temp: 		currentHour.temperature,
					wind:		currentHour.wind
				};
			}
		}
	//}

	console.log(parsersHourlyChartData);
	generateTemperatureParsersChart(id);
}

/**
 * Generates the Temperature chart for all available parsers
 */
function generateTemperatureParsersChart() {

	var tempData = {};
	var chartSeries = [];

    var todayTimestamp = new Date();
    todayTimestamp = todayTimestamp - (todayTimestamp % 86400000);

    for (id in parsersHourlyChartData) {
    	tempData[id] = [];
		for (date in parsersHourlyChartData[id]) {
			if (parsersHourlyChartData[id][date].temp === null)
				continue;
			tempData[id].push([Date.parse(date), parsersHourlyChartData[id][date].temp]);
		}


		if (tempData[id].length > 0) {
			//Build the chart series
			chartSeries.push({
				data: tempData[id],
				name: getParserName(id),
				/*
				zoneAxis: 'x',
				zones: [{
					value: todayTimestamp,
				}, {
					color: '#b4c5ff'
				}]
				*/
			});

			//Sort the data for charts
			tempData[id].sort(function(a, b) { return a[0] - b[0];});
		}
    }

	var temperatureChartOptions = {
		chart: {
			renderTo: 'temperatureParsersChartContainer',
			spacingTop: 20,
		},
		series: chartSeries,
		title: {
			text: '<h1>Temperature (&deg;C)</h1>',
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
	if (parserCharts.temperature) {
		parserCharts.temperature.destroy();
	}

	parserCharts.temperature = new Highcharts.Chart(temperatureChartOptions, null);
}


function getParserName(id) {
	for (var i = 0; i < Data.parsers.parsers.length; i++) {
		if (Data.parsers.parsers[i].uid == id) {
			return Data.parsers.parsers[i].name;
		}
	}
}