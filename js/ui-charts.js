/* global Highcharts */
var chartsLevel = { // available viewing levels for the charts
		weekly: 0,
		monthly: 1,
		yearly: 2
	},
	chartsCurrentLevel = chartsLevel.weekly, // current viewing level for all the charts
	chartsDateFormat = '%b %e', // format for the dates used in chart labels
	chartsMaximumDataRange = 365, // the maximum amount of data that the application loads
	chartsWeeklySlice = 14, // the size of the weekly data
	chartsMonthlySlice = 30, // the size of the montly data
	chartsMonthlyPeriod = 0, // the current period of the charts (0 includes the current date, larger than 0 is in the past)
	chartsMinMonthlyPeriod = 0, // the minimum value that the chartsMonthlyPeriod can take
	chartsMaxMonthlyPeriod = Math.floor(chartsMaximumDataRange / chartsMonthlySlice), // the maximum value that the chartsMonthlyPeriod can take
	chartsData = new ChartData(), // this will hold all the data for the charts
	charts = { // array that holds the currently generated charts (used for destroying charts when other charts are rendered in the same container - memory optimization)
		waterNeed: null,
		temperature: null,
		qpf: null,
		programs: []
	};

/**
 * Holds data for a chart: data[chartsMaximumDataRange], monthsData (aggregated data from the original API data), currentSeries
 * @param startDate
 * @constructor
 */
function ChartSeries (startDate) {
	this.startDate = startDate;
	this.data = new Array(chartsMaximumDataRange);
	this.monthsData = [];
	this.currentSeries = [];

	// initialize each position of the data array with null
	for (var i = 0; i < this.data.length; this.data[i] = null, i++);
}

/**
 * Sets a point of data in a series (located at the same index at which the date is located)
 * @param dateStr
 * @param value
 * @returns {boolean}
 */
ChartSeries.prototype.insertAtDate = function (dateStr, value) {
	var index = Util.getDateIndex(dateStr, this.startDate);

	if (index < 0 || index >= chartsMaximumDataRange) {
		console.log('Index %d for date %s outside needed range', index, dateStr);
		return false;
	}

	this.data[index] = value;
	return true;
};

/**
 * Gets a point of data from a series (located at the same index at which the date is located)
 * @param dateStr
 * @returns {*}
 */
ChartSeries.prototype.getAtDate = function (dateStr) {
	var index = Util.getDateIndex(dateStr, this.startDate);
	if (index < 0 || index >= chartsMaximumDataRange) {
    		console.log('Index %d for date %s outside needed range', index, dateStr);
		return null;
	}

	return this.data[index];
};

/**
 * Object that holds entire weather/programs watering data
 * @constructor
 */
function ChartData () {
	this.days = []; //array with dates ('YYYY-MM-DD')
	this.months = []; //array with dates ('YYYY-MM-01')
	this.maxWN = 100; //maximum percentage of water need/used
	this.currentAxisCategories = [];

	var end = new Date();
	end.setDate(end.getDate() + 7); //Forecast for 7 days in the future

	this.startDate = new Date(end);  //The start date in the past for this chart data
	this.startDate.setFullYear(end.getFullYear() - 1);

	// fill the days array with 365 (chartsMaximumDataRange) days and calculate the months found within those dates
	var _start = new Date(this.startDate);
	while (_start < end) {
		var isoDate = _start.toISOString().split('T')[0],
			isoDateMonthStart = isoDate.split('-')[0] + '-' + isoDate.split('-')[1] + '-' + '01';

		this.days.push(isoDate);

		// if the months array is empty or if the last month pushed in the array is different than the current calculated month
		if (this.months.length === 0 || this.months[this.months.length - 1] !== isoDateMonthStart) {
			this.months.push(isoDateMonthStart);
		}

		_start.setDate(_start.getDate() + 1);
	}

	this.qpf = new ChartSeries(this.startDate);
	this.maxt = new ChartSeries(this.startDate);
	this.mint = new ChartSeries(this.startDate);
	this.waterNeed = new ChartSeries(this.startDate);
	this.condition = new ChartSeries(this.startDate);
	this.programs = [];

	console.log('Initialised ChartData from %s to %s',this.startDate.toDateString(), end.toDateString());
}

/**
 * Gets the data from the API for all the Charts, parses and processes the data into the correct holders
 * @param pastDays
 */
function getChartData (pastDays) {
	Data.mixerData = API.getMixer(); //for weather measurements
	Data.dailyDetails = API.getDailyStats(null, true); //for water need in the future
	Data.waterLog = API.getWateringLog(false, true,  Util.getDateWithDaysDiff(pastDays), pastDays); //for used water

	var mixedDataIndex,
		programIndex,
		dailyValuesIndex,
		dailyDetailsIndex,
		zoneIndex,
		monthsIndex,
		daysIndex,
		currentProgram,
		currentProgramIndex;

	//Get all available days in mixer TODO: Can be quite long (365 - chartsMaximumDataRange - days)
	for (mixedDataIndex = 0; mixedDataIndex < Data.mixerData.mixerData.length; mixedDataIndex++) {
		var recent = Data.mixerData.mixerData[mixedDataIndex].dailyValues;

		for (dailyValuesIndex = 0; dailyValuesIndex < recent.length; dailyValuesIndex++) {
			var dvDay =  recent[dailyValuesIndex].day.split(' ')[0];
			chartsData.qpf.insertAtDate(dvDay, recent[dailyValuesIndex].qpf);
			chartsData.maxt.insertAtDate(dvDay, recent[dailyValuesIndex].maxTemp);
			chartsData.mint.insertAtDate(dvDay, recent[dailyValuesIndex].minTemp);
			chartsData.condition.insertAtDate(dvDay, recent[dailyValuesIndex].condition);
		}
	}

	//Total Water Need future days
	var daily = Data.dailyDetails.DailyStatsDetails;

	for (dailyDetailsIndex = 0; dailyDetailsIndex < daily.length; dailyDetailsIndex++) {
		var wnfTotalDayUserWater = 0,
			wnfTotalDayScheduledWater = 0;

		//programs for the day
		for (programIndex = 0; programIndex < daily[dailyDetailsIndex].programs.length; programIndex++) {
			currentProgram = daily[dailyDetailsIndex].programs[programIndex];

			// Program index not in our struct ?
			if (programIndex > chartsData.programs.length - 1) {
				currentProgramIndex = chartsData.programs.push(new ChartSeries(chartsData.startDate)) - 1;
			} else {
				currentProgramIndex = programIndex;
			}

			//zones for the programs
			for (zoneIndex = 0; zoneIndex < currentProgram.zones.length; zoneIndex++) {
				wnfTotalDayUserWater += currentProgram.zones[zoneIndex].computedWateringTime;
				wnfTotalDayScheduledWater += currentProgram.zones[zoneIndex].scheduledWateringTime;
				//console.log('User: %d, Scheduled: %d', wnfTotalDayUserWater, wnfTotalDayScheduledWater);
			}

			var wnfProgramDayWN = Util.normalizeWaterNeed(wnfTotalDayUserWater, wnfTotalDayScheduledWater);
			chartsData.programs[currentProgramIndex].insertAtDate(daily[dailyDetailsIndex].day, wnfProgramDayWN);
		}

		var wnfDailyWN = Util.normalizeWaterNeed(wnfTotalDayUserWater, wnfTotalDayScheduledWater);
		if (wnfDailyWN > chartsData.maxWN)
			chartsData.maxWN = wnfDailyWN;

		chartsData.waterNeed.insertAtDate(daily[dailyDetailsIndex].day, wnfDailyWN);
	}

	//Used 'water need'
	for (var i = Data.waterLog.waterLog.days.length - 1; i >= 0 ; i--) {
		var day =  Data.waterLog.waterLog.days[i];
		var wnpTotalDayUserWater = 0,
			wnpTotalDayScheduledWater = 0;

		for (programIndex = 0; programIndex < day.programs.length; programIndex++) {
			currentProgram = day.programs[programIndex];

			// Program index not in our struct ?
			if (programIndex > chartsData.programs.length - 1) {
				currentProgramIndex = chartsData.programs.push(new ChartSeries(chartsData.startDate)) - 1;
			} else {
				currentProgramIndex = programIndex;
			}

			for (zoneIndex = 0; zoneIndex < currentProgram.zones.length; zoneIndex++) {
				var zone = currentProgram.zones[zoneIndex];
				//var zoneDurations = { machine: 0, user: 0, real: 0 };
				for (var c = 0; c < zone.cycles.length; c++) {
					var cycle = zone.cycles[c];
					wnpTotalDayScheduledWater += cycle.realDuration;
					wnpTotalDayUserWater += cycle.userDuration;
				}

				var wnpProgramDayWN = Util.normalizeWaterNeed(wnpTotalDayUserWater, wnpTotalDayScheduledWater);
				chartsData.programs[currentProgramIndex].insertAtDate(day.date, wnpProgramDayWN);
			}
		}

		var wnpDailyWN = Util.normalizeWaterNeed(wnpTotalDayUserWater, wnpTotalDayScheduledWater);
		if (wnpDailyWN > chartsData.maxWN) {
			chartsData.maxWN = wnpDailyWN;
		}

		chartsData.waterNeed.insertAtDate(day.date, wnpDailyWN);
	}

	// calculate months data
	for (monthsIndex = 0; monthsIndex < chartsData.months.length; monthsIndex++) {
		var daysInMonth = 0,
			monthPrefix = chartsData.months[monthsIndex].split('-')[0] + '-' + chartsData.months[monthsIndex].split('-')[1];

		// initialize the months data for each chart with 0
		chartsData.waterNeed.monthsData[monthsIndex] = 0;
		chartsData.maxt.monthsData[monthsIndex] = 0;
		chartsData.mint.monthsData[monthsIndex] = 0;
		chartsData.qpf.monthsData[monthsIndex] = 0;
		for (programIndex = 0; programIndex < chartsData.programs.length; programIndex++) {
			chartsData.programs[programIndex].monthsData[monthsIndex] = 0;
		}

		// go through all of the days data and aggregate them (sum)
		for (daysIndex = 0; daysIndex < chartsData.days.length; daysIndex++) {
			if (chartsData.days[daysIndex].indexOf(monthPrefix) >= 0) {
				daysInMonth++;

				chartsData.waterNeed.monthsData[monthsIndex] += chartsData.waterNeed.getAtDate(chartsData.days[daysIndex]) === null ? 0 : chartsData.waterNeed.getAtDate(chartsData.days[daysIndex]);
				chartsData.maxt.monthsData[monthsIndex] += chartsData.maxt.getAtDate(chartsData.days[daysIndex]) === null ? 0 : chartsData.maxt.getAtDate(chartsData.days[daysIndex]);
				chartsData.mint.monthsData[monthsIndex] += chartsData.mint.getAtDate(chartsData.days[daysIndex]) === null ? 0 : chartsData.mint.getAtDate(chartsData.days[daysIndex]);
				chartsData.qpf.monthsData[monthsIndex] += chartsData.qpf.getAtDate(chartsData.days[daysIndex]) === null ? 0 : chartsData.qpf.getAtDate(chartsData.days[daysIndex]);

				for (programIndex = 0; programIndex < chartsData.programs.length; programIndex++) {
					chartsData.programs[programIndex].monthsData[monthsIndex] += chartsData.programs[programIndex].getAtDate(chartsData.days[daysIndex]) === null ? 0 : chartsData.programs[programIndex].getAtDate(chartsData.days[daysIndex]);
				}
			}
		}

		// for all the charts except QPF we need to aggregate with an AVG (and round to max two decimals)
		chartsData.waterNeed.monthsData[monthsIndex] = Math.round((chartsData.waterNeed.monthsData[monthsIndex] / daysInMonth) * 100) / 100;
		chartsData.maxt.monthsData[monthsIndex] = Math.round((chartsData.maxt.monthsData[monthsIndex] / daysInMonth) * 100) / 100;
		chartsData.mint.monthsData[monthsIndex] = Math.round((chartsData.mint.monthsData[monthsIndex] / daysInMonth) * 100) / 100;
		for (programIndex = 0; programIndex < chartsData.programs.length; programIndex++) {
			chartsData.programs[programIndex].monthsData[monthsIndex] = Math.round((chartsData.programs[programIndex].monthsData[monthsIndex]) / daysInMonth * 100) / 100;
		}
	}
}

/**
 * Generates the containers for the Program charts
 */
function generateProgramsChartsContainers () {
	for (var programIndex = 0; programIndex < chartsData.programs.length; programIndex++) {
		var div = addTag($('#dashboard'), 'div');
		div.id = 'programChartContainer-' + programIndex;
		div.className = 'charts';
	}
}

/**
 * Sets the chartsLevel to weekly, sets the categories and series for the charts and generates all the charts
 */
function loadWeeklyCharts () {
	chartsCurrentLevel = chartsLevel.weekly;
	chartsDateFormat = '%b %e';

	// reset the charts montly period
	chartsMonthlyPeriod = 0;

	var sliceStart = -chartsWeeklySlice;

	// set the categories and series for all charts
	chartsData.currentAxisCategories = chartsData.days.slice(sliceStart);
	chartsData.waterNeed.currentSeries = chartsData.waterNeed.data.slice(sliceStart);
	chartsData.maxt.currentSeries = chartsData.maxt.data.slice(sliceStart);
	chartsData.mint.currentSeries = chartsData.mint.data.slice(sliceStart);
	chartsData.qpf.currentSeries = chartsData.qpf.data.slice(sliceStart);

	for (var programIndex = 0; programIndex < chartsData.programs.length; programIndex++) {
		chartsData.programs[programIndex].currentSeries = chartsData.programs[programIndex].data.slice(sliceStart);
	}

	// render all charts with the currentAxisCategories and currentSeries
	generateCharts();
}

/**
 * Sets the chartsLevel to monthly, sets the categories and series for the charts and generates all the charts
 */
function loadMonthlyCharts () {
	chartsCurrentLevel = chartsLevel.monthly;
	chartsDateFormat = '%b %e';

	// taking care of weird situations when the period might be out of bounds
	if (chartsMonthlyPeriod < chartsMinMonthlyPeriod) {
		chartsMonthlyPeriod = chartsMinMonthlyPeriod;
	} else if (chartsMonthlyPeriod > chartsMaxMonthlyPeriod) {
		chartsMonthlyPeriod = chartsMaxMonthlyPeriod;
	}

	var sliceStart = -(chartsMonthlySlice * (chartsMonthlyPeriod + 1)),
		sliceEnd = -(chartsMonthlySlice * chartsMonthlyPeriod);

	// if the slice end is 0 than we need to make it
	if (sliceEnd === 0) {
		sliceEnd = chartsData.days.length;
	}

	// set the categories and series for all charts
	chartsData.currentAxisCategories = chartsData.days.slice(sliceStart, sliceEnd);
	chartsData.waterNeed.currentSeries = chartsData.waterNeed.data.slice(sliceStart, sliceEnd);
	chartsData.maxt.currentSeries = chartsData.maxt.data.slice(sliceStart, sliceEnd);
	chartsData.mint.currentSeries = chartsData.mint.data.slice(sliceStart, sliceEnd);
	chartsData.qpf.currentSeries = chartsData.qpf.data.slice(sliceStart, sliceEnd);

	for (var programIndex = 0; programIndex < chartsData.programs.length; programIndex++) {
		chartsData.programs[programIndex].currentSeries = chartsData.programs[programIndex].data.slice(sliceStart, sliceEnd);
	}

	// render all charts with the currentAxisCategories and currentSeries
	generateCharts();
}

/**
 * Sets the chartsLevel to yearly, sets the categories and series for the charts and generates all the charts
 */
function loadYearlyCharts () {
	chartsCurrentLevel = chartsLevel.yearly;
	chartsDateFormat = '%b';

	// reset the charts montly period
	chartsMonthlyPeriod = 0;

	// set the categories and series for all charts
	chartsData.currentAxisCategories = chartsData.months;
	chartsData.waterNeed.currentSeries = chartsData.waterNeed.monthsData;
	chartsData.maxt.currentSeries = chartsData.maxt.monthsData;
	chartsData.mint.currentSeries = chartsData.mint.monthsData;
	chartsData.qpf.currentSeries = chartsData.qpf.monthsData;

	for (var programIndex = 0; programIndex < chartsData.programs.length; programIndex++) {
		chartsData.programs[programIndex].currentSeries = chartsData.programs[programIndex].monthsData;
	}

	// render all charts with the currentAxisCategories and currentSeries
	generateCharts();
}

/**
 * Generates all the charts: Water Need, Temperature, QPF and Programs
 */
function generateCharts () {
	generateWaterNeedChart();
	generateTemperatureChart();
	generateQPFChart();

	for (var programIndex = 0; programIndex < chartsData.programs.length; programIndex++) {
		generateProgramChart(programIndex);
	}
}

/**
 * Generates the Water Need chart
 */
function generateWaterNeedChart () {
	var waterNeedChartOptions = {
		chart: {
			renderTo: 'waterNeedChartContainer',
			spacingTop: 20
		},
		series: [{
			data: chartsData.waterNeed.currentSeries,
			dataLabels: {
				enabled: true,
				format: '{y}%',
				inside: true,
				verticalAlign: 'bottom'
			},
			name: 'Water need',
			tooltip: {
				headerFormat: '',
				pointFormatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat(chartsDateFormat, new Date(this.category))
						+ '</span>: <span style="font-size: 14px;">' + this.y + '%</span>';
				}
			},
			type: 'column'
		}],
		title: {
			text: '<h1>Water need (%)</h1>',
			useHTML: true
		},
		xAxis: [{
			categories: chartsData.currentAxisCategories,
			labels: {
				formatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat(chartsDateFormat, new Date(this.value)) + '</span>';
				}
			}
		}],
		yAxis: [{
			labels: {
				format: '{value}%'
			},
			max: chartsData.maxWN,
			min: 0,
			title: false
		}]
	};

	if (chartsCurrentLevel === chartsLevel.weekly) {
		waterNeedChartOptions.chart.marginTop = 130;

		waterNeedChartOptions.xAxis.push({
			categories: chartsData.currentAxisCategories,
			labels: {
				formatter: function () {
					//Our condition mapping in TTF front
					var condition = chartsData.condition.getAtDate(this.value),
						temperatureValue = Math.round(chartsData.maxt.getAtDate(this.value)),
						conditionValue;

					if (condition === undefined) {
						conditionValue = String.fromCharCode(122);
					} else {
						conditionValue = String.fromCharCode(97 + condition);
					}

					return '<span style="font-family: RainMachine, sans-serif; font-size: 42px;">' + conditionValue + '</span>' +
						'<br />' +
						'<span style="font-size: 16px; line-height: 24px;">' + temperatureValue + '\xB0C</span>';
				},
				style: {
					color: '#808080',
					textAlign: 'center'
				},
				useHTML: true,
				x: -10
			},
			lineWidth: 0,
			linkedTo: 0,
			offset: 50,
			opposite: true,
			tickWidth: 0
		});
	}

	// before generating the chart we must destroy the old one if it exists
	if (charts.waterNeed) {
		charts.waterNeed.destroy();
	}

	// generate the chart
	charts.waterNeed = new Highcharts.Chart(waterNeedChartOptions, generateChartCallback);
}

/**
 * Generates the Temperature chart
 */
function generateTemperatureChart () {
	var temperatureChartOptions = {
		chart: {
			renderTo: 'temperatureChartContainer',
			spacingTop: 20
		},
		series: [{
			data: chartsData.maxt.currentSeries,
			name: 'Maximum Temperature',
			tooltip: {
				headerFormat: '',
				pointFormatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat(chartsDateFormat, new Date(this.category))
						+ '</span>: <span style="font-size: 14px;">' + this.y + '\xB0C</span>';
				}
			},
			type: 'line'
		}, {
			data: chartsData.mint.currentSeries,
			name: 'Minimum Temperature',
			tooltip: {
				headerFormat: '',
				pointFormatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat(chartsDateFormat, new Date(this.category))
						+ '</span>: <span style="font-size: 14px;">' + this.y + '\xB0C</span>';
				}
			},
			type: 'line'
		}],
		title: {
			text: '<h1>Temperature (&deg;C)</h1>',
			useHTML: true
		},
		xAxis: [{
			categories: chartsData.currentAxisCategories,
			labels: {
				formatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat(chartsDateFormat, new Date(this.value)) + '</span>';
				}
			}
		}],
		yAxis: [{
			labels: {
				format: '{value}\xB0C'
			},
			title: false
		}]
	};

	// before generating the chart we must destroy the old one if it exists
	if (charts.temperature) {
		charts.temperature.destroy();
	}

	charts.temperature = new Highcharts.Chart(temperatureChartOptions, generateChartCallback);
}

/**
 * Generates the QPF chart
 */
function generateQPFChart () {
	var qpfChartOptions = {
		chart: {
			renderTo: 'qpfChartContainer',
			spacingTop: 20
		},
		series: [{
			data: chartsData.qpf.currentSeries,
			dataLabels: {
				enabled: true,
				format: '{y}mm',
				inside: true,
				verticalAlign: 'bottom'
			},
			name: 'Rain Amount',
			tooltip: {
				headerFormat: '',
				pointFormatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat(chartsDateFormat, new Date(this.category))
						+ '</span>: <span style="font-size: 14px;">' + this.y + 'mm</span>';
				}
			},
			type: 'column'
		}],
		title: {
			text: '<h1>QPF (mm)</h1>',
			useHTML: true
		},
		xAxis: [{
			categories: chartsData.currentAxisCategories,
			labels: {
				formatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat(chartsDateFormat, new Date(this.value)) + '</span>';
				}
			}
		}],
		yAxis: [{
			labels: {
				format: '{value}mm'
			},
			title: false
		}]
	};

	// before generating the chart we must destroy the old one if it exists
	if (charts.qpf) {
		charts.qpf.destroy();
	}

	charts.qpf = new Highcharts.Chart(qpfChartOptions, generateChartCallback);
}

/**
 * Generates a chart for a program
 * @param programIndex
 */
function generateProgramChart (programIndex) {
	var programChartOptions = {
		chart: {
			renderTo: 'programChartContainer-' + programIndex,
			spacingTop: 20
		},
		series: [{
			data: chartsData.programs[programIndex].currentSeries,
			dataLabels: {
				enabled: true,
				format: '{y}%',
				inside: true,
				verticalAlign: 'bottom'
			},
			name: 'Program ' + programIndex,
			tooltip: {
				headerFormat: '',
				pointFormatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat(chartsDateFormat, new Date(this.category))
						+ '</span>: <span style="font-size: 14px;">' + this.y + '%</span>';
				}
			},
			type: 'column'
		}],
		title: {
			text: '<h1>Program ' + programIndex + ': Water Need (%)</h1>',
			useHTML: true
		},
		xAxis: [{
			categories: chartsData.currentAxisCategories,
			labels: {
				formatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat(chartsDateFormat, new Date(this.value)) + '</span>';
				}
			}
		}],
		yAxis: [{
			labels: {
				format: '{value}%'
			},
			title: false
		}]
	};

	// before generating the chart we must destroy the old one if it exists
	if (charts.programs[programIndex]) {
		charts.programs[programIndex].destroy();
	}

	charts.programs[programIndex] = new Highcharts.Chart(programChartOptions, generateChartCallback);
}

/**
 * Gets executed after a chart has finished rendering
 * If the level is weekly it highlights the current day
 * If the level is monthly it adds the previous and next buttons
 * @param chart
 */
function generateChartCallback (chart) {
	if (chartsCurrentLevel === chartsLevel.weekly) { //if we are on level weekly we need to highlight the current day
		highlightCurrentDayInChart(chart);
	} else if (chartsCurrentLevel === chartsLevel.monthly) { // if we are on the level monthly we need to draw the next/previous buttons

		// add the previous button if available
		if (chartsMonthlyPeriod < chartsMaxMonthlyPeriod) {
			var previousBtn = chart.renderer.image('images/arrow_left_24.png', 16, 16, 24, 24);
			previousBtn.add();
			previousBtn.css({'cursor': 'pointer'});
			previousBtn.attr({'title': 'Previous period'});
			previousBtn.on('click', function() {
				event.preventDefault();
				event.stopPropagation();

				chartsMonthlyPeriod += 1;
				loadMonthlyCharts();
			});
		}

		// add the next button if available
		if (chartsMonthlyPeriod > chartsMinMonthlyPeriod) {
			var nextButton = chart.renderer.image('images/arrow_right_24.png', chart.chartWidth - 40, 16, 24, 24);
			nextButton.add();
			nextButton.css({'cursor': 'pointer'});
			nextButton.attr({'title': 'Next period'});
			nextButton.on('click', function(event) {
				event.preventDefault();
				event.stopPropagation();

				chartsMonthlyPeriod -= 1;
				loadMonthlyCharts();
			});
		}
	}
}

/**
 * Draws a highlighter rectangle behind the current days plot
 * @param chart
 */
function highlightCurrentDayInChart(chart) {
	var highlighter = null,
		x1 = chart.xAxis[0].toPixels(6.5, false),
		x2 = chart.xAxis[0].toPixels(7.5, false),
		y1 = chart.yAxis[0].toPixels(chart.yAxis[0].getExtremes().min, false),
		y2 = chart.yAxis[0].toPixels(chart.yAxis[0].getExtremes().max, false);

	// if we have all the points needed
	if(!isNaN(x1) && !isNaN(x2) && !isNaN(y1) && !isNaN(y2)) {
		// draw the highlighter
		highlighter = chart.renderer.rect(x1, y2, x2 - x1, y1 - y2);

		// add properties to the highlighter
		highlighter.attr({
			fill: 'gray',
			opacity: 0.2
		});

		// add the highlighter to the chart stage
		highlighter.add();
	}
}

/**
 * Gets the data from the API and loads all the charts
 * @param shouldRefreshData
 * @param pastDays
 */
function loadCharts (shouldRefreshData, pastDays) {
	if (shouldRefreshData) {
		getChartData(pastDays);
	}

	generateProgramsChartsContainers();

	// make the dashboard visible before generating the charts so that the charts can take the correct size
	makeVisibleBlock($('#dashboard'));

	loadWeeklyCharts();
}
