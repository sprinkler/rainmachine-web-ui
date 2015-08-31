/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

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
	chartsWeeklyPeriod = 0, // the current period of the charts (0 includes the current date, larger than 0 is in the past)
	chartsMinWeeklyPeriod = 0, // the minimum value that the chartsWeeklyPeriod can take
	chartsMaxWeeklyPeriod = Math.floor(chartsMaximumDataRange / chartsWeeklySlice), // the maximum value that the chartsWeeklyPeriod can take
	chartsCurrentDayIndex = 7, // current day index from the array of days of length chartsWeeklySlice (e.g. this should be 7 - the eight day - when the chartsWeeklySlice is 14) - starts at 0
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
		//console.log('Index %d for date %s outside needed range', index, dateStr);
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
    	//console.log('Index %d for date %s outside needed range', index, dateStr);
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
	this.programsMap = {}; //Holds programs uid to programs array index mapping

	console.log('Initialised ChartData from %s to %s',this.startDate.toDateString(), end.toDateString());
}

/**
* Returns a program object. Requires Data.programs structure to be available
* @param id
*/
function getProgramById (id) {
	for (var p = 0; p < Data.programs.programs.length; p++) {
		var existingProgram = Data.programs.programs[p];
		if (id == existingProgram.uid && existingProgram.active == true) {
			return existingProgram;
		}
	}
    return null;
}

/**
 * Gets the data from the API for all the Charts, parses and processes the data into the correct holders
 * @param pastDays
 */
function getChartData (pastDays) {
	Data.programs = API.getPrograms(); //for programs name and status
	//Data.mixerData = API.getMixer(); //for weather measurements
	//Data.dailyDetails = API.getDailyStats(null, true); //for water need in the future
	//Data.waterLog = API.getWateringLog(false, true,  Util.getDateWithDaysDiff(pastDays), pastDays); //for used water

	var mixedDataIndex,
		programIndex,
		dailyValuesIndex,
		dailyDetailsIndex,
		zoneIndex,
		monthsIndex,
		daysIndex,
		currentProgram,
		currentProgramIndex;

	var days = 5; // Days you want to subtract
	var date = new Date();
	var last = new Date(date.getTime() - (days * 24 * 60 * 60 * 1000));
	var day = last.getDate();
	var month = last.getMonth()+1;
	var year = last.getFullYear();

	var pastDays = 11;

	API.getMixer(year + '-' + month + '-' + day , pastDays, function (r) {


		Data.mixerData = r;
		var dataByDate = Data.mixerData.mixerData;

		if(dataByDate == undefined) {
			dataByDate = Data.mixerData.mixerDataByDate;
		}

		//Get all available days in mixer TODO: Can be quite long (365 - chartsMaximumDataRange - days)
		for (mixedDataIndex = 0; mixedDataIndex < dataByDate.length; mixedDataIndex++) {
			var recent = dataByDate[mixedDataIndex];

				var dvDay =  recent.day.split(' ')[0];
				chartsData.qpf.insertAtDate(dvDay, recent.qpf);
				chartsData.maxt.insertAtDate(dvDay, recent.maxTemp);
				chartsData.mint.insertAtDate(dvDay, recent.minTemp);
				chartsData.condition.insertAtDate(dvDay, recent.condition);
		}
	});

	API.getDailyStats(null, true, function (r) {
		Data.dailyDetails = r;
		var daily = Data.dailyDetails.DailyStatsDetails;

		for (dailyDetailsIndex = 0; dailyDetailsIndex < daily.length; dailyDetailsIndex++) {
			var wnfTotalDayUserWater = 0,
				wnfTotalDayScheduledWater = 0;

			//programs for the day
			for (programIndex = 0; programIndex < daily[dailyDetailsIndex].programs.length; programIndex++) {
				currentProgram = daily[dailyDetailsIndex].programs[programIndex];

				//zones for the programs
				for (zoneIndex = 0; zoneIndex < currentProgram.zones.length; zoneIndex++) {
					wnfTotalDayUserWater += currentProgram.zones[zoneIndex].scheduledWateringTime;
					wnfTotalDayScheduledWater += currentProgram.zones[zoneIndex].computedWateringTime;
					//console.log('User: %d, Scheduled: %d', wnfTotalDayUserWater, wnfTotalDayScheduledWater);
				}

				var wnfProgramDayWN = Util.normalizeWaterNeed(wnfTotalDayUserWater, wnfTotalDayScheduledWater);

				//Add program used water
				//Skip Manual run programs (id 0)
				if (currentProgram.id == 0)
					continue;

				// Is program active/still available in current programs list (might be an old deleted program)?
				var existingProgram = getProgramById(currentProgram.id)
				if (existingProgram === null || existingProgram.active == false)
					continue;

				// Program index not in our struct ?
				if (currentProgram.id in chartsData.programsMap) {
					currentProgramIndex = chartsData.programsMap[currentProgram.id];
				} else {
					currentProgramIndex = chartsData.programs.push(new ChartSeries(chartsData.startDate)) - 1;
					chartsData.programsMap[currentProgram.id] = currentProgramIndex;
				}
				chartsData.programs[currentProgramIndex].insertAtDate(daily[dailyDetailsIndex].day, wnfProgramDayWN);
			}

			var wnfDailyWN = Util.normalizeWaterNeed(wnfTotalDayUserWater, wnfTotalDayScheduledWater);
			if (wnfDailyWN > chartsData.maxWN)
				chartsData.maxWN = wnfDailyWN;

			chartsData.waterNeed.insertAtDate(daily[dailyDetailsIndex].day, wnfDailyWN);
		}
	});
	//Total Water Need future days


	Data.waterLog = API.getWateringLog(false, true,  Util.getDateWithDaysDiff(pastDays), pastDays, function (r) {

		Data.waterLog = r;
		//Used 'water need'
		for (var i = Data.waterLog.waterLog.days.length - 1; i >= 0 ; i--) {
			var day =  Data.waterLog.waterLog.days[i];
			var wnpTotalDayUserWater = 0,
				wnpTotalDayScheduledWater = 0;

			for (programIndex = 0; programIndex < day.programs.length; programIndex++) {
				currentProgram = day.programs[programIndex];

				for (zoneIndex = 0; zoneIndex < currentProgram.zones.length; zoneIndex++) {
					var zone = currentProgram.zones[zoneIndex];

					for (var c = 0; c < zone.cycles.length; c++) {
						var cycle = zone.cycles[c];
						wnpTotalDayScheduledWater += cycle.realDuration;
						wnpTotalDayUserWater += cycle.userDuration;
					}

					var wnpProgramDayWN = Util.normalizeWaterNeed(wnpTotalDayUserWater, wnpTotalDayScheduledWater);

					//Add program used water
					//Skip Manual run programs (id 0)
					if (currentProgram.id == 0)
						continue;

					// Is program active/still available in current programs list (might be an old deleted program)?
					var existingProgram = getProgramById(currentProgram.id)
					if (existingProgram === null || existingProgram.active == false)
						continue;

					// Program index not in our struct ?
					if (currentProgram.id in chartsData.programsMap) {
						currentProgramIndex = chartsData.programsMap[currentProgram.id];
					} else {
						currentProgramIndex = chartsData.programs.push(new ChartSeries(chartsData.startDate)) - 1;
						chartsData.programsMap[currentProgram.id] = currentProgramIndex;
					}

					chartsData.programs[currentProgramIndex].insertAtDate(day.date, wnpProgramDayWN);
				}
			}

			var wnpDailyWN = Util.normalizeWaterNeed(wnpTotalDayUserWater, wnpTotalDayScheduledWater);
			if (wnpDailyWN > chartsData.maxWN) {
				chartsData.maxWN = wnpDailyWN;
			}

			chartsData.waterNeed.insertAtDate(day.date, wnpDailyWN);
		}
	});


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

	// reset the charts monthly period
	chartsMonthlyPeriod = 0;

	// taking care of weird situations when the period might be out of bounds
	if (chartsWeeklyPeriod < chartsMinWeeklyPeriod) {
		chartsWeeklyPeriod = chartsMinWeeklyPeriod;
	} else if (chartsWeeklyPeriod > chartsMaxWeeklyPeriod) {
		chartsWeeklyPeriod = chartsMaxWeeklyPeriod;
	}

	var sliceStart = -(chartsWeeklySlice * (chartsWeeklyPeriod + 1)),
		sliceEnd = -(chartsWeeklySlice * chartsWeeklyPeriod);

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
 * Sets the chartsLevel to monthly, sets the categories and series for the charts and generates all the charts
 */
function loadMonthlyCharts () {
	chartsCurrentLevel = chartsLevel.monthly;
	chartsDateFormat = '%b %e';

	// reset the charts weekly period
	chartsWeeklyPeriod = 0;

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

	// reset the charts weekly and monthly periods
	chartsWeeklyPeriod = 0;
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

	//Walk by uid
    var uids = Object.keys(chartsData.programsMap);
	for (var i = 0; i < uids.length; i++) {
		var uid = +uids[i];
		var index = chartsData.programsMap[uid];
		generateProgramChart(uid, index);
	}
}

function redrawCurrentDayRectangle(containerId, chart) {
	//delete old rectangle
	var container = $('#' + containerId);
	var rectangleElem = $(container, '[class="day_rectangle"]');
	rectangleElem.parentNode.removeChild(rectangleElem);

	//create new rectangle
	var highlighter = null,
		highlighterXStart = parseInt(chartsCurrentDayIndex, 10) - 0.5,
		highlighterXEnd = parseInt(chartsCurrentDayIndex, 10) + 0.5,
		x1 = chart.xAxis[0].toPixels(highlighterXStart, false),
		x2 = chart.xAxis[0].toPixels(highlighterXEnd, false),
		y1 = chart.yAxis[0].toPixels(chart.yAxis[0].getExtremes().min, false),
		y2 = chart.yAxis[0].toPixels(chart.yAxis[0].getExtremes().max, false);

	// if we have all the points needed
	if (!isNaN(x1) && !isNaN(x2) && !isNaN(y1) && !isNaN(y2)) {
		// draw the highlighter
		highlighter = chart.renderer.rect(x1, y2, x2 - x1, y1 - y2);

		// add properties to the highlighter
		highlighter.attr({
			fill: 'gray',
			opacity: 0.2,
			'class': 'day_rectangle'
		});

		// add the highlighter to the chart stage
		highlighter.add();
	}

}

/**
 * Generates the Water Need chart
 */
function generateWaterNeedChart () {
	var waterNeedChartOptions = {
		chart: {
			renderTo: 'waterNeedChartContainer',
			spacingTop: 20,
			events: {
				redraw: function () {
						redrawCurrentDayRectangle('waterNeedChartContainer', this);
				}
			}
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
					var condition = chartsData.condition.getAtDate(this.value);
					var temperature = chartsData.maxt.getAtDate(this.value);
					var conditionValue, temperatureValue;

					if (condition === undefined || condition === null) {
						conditionValue = String.fromCharCode(122);
					} else {
						conditionValue = String.fromCharCode(97 + condition);
					}

					if (temperature === undefined || temperature === null) {
						temperatureValue = "-";
					} else {
						temperatureValue = Math.round(temperature) + "\xB0C";
					}

					return '<span style="font-family: RainMachine, sans-serif; font-size: 42px;">' + conditionValue + '</span>' +
						'<br />' +
						'<span style="font-size: 16px; line-height: 24px;">' + temperatureValue + '</span>';
				},
				style: {
					color: '#3399cc',
					textAlign: 'center'
				},
				useHTML: true,
				x: -1
			},
			lineWidth: 0,
			linkedTo: 0,
			offset: 50,
			opposite: true,
			tickWidth: 0
		});
	}

	// Hide labels from monthly charts
	if (chartsCurrentLevel === chartsLevel.monthly)  {
    		waterNeedChartOptions.series[0].dataLabels.enabled = false;
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
			spacingTop: 20,
			events: {
				redraw: function () {
					redrawCurrentDayRectangle('temperatureChartContainer', this);
				}
			}
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
	console.log(charts.temperature);
}

/**
 * Generates the QPF chart
 */
function generateQPFChart () {
	var qpfChartOptions = {
		chart: {
			renderTo: 'qpfChartContainer',
			spacingTop: 20,
			events: {
				redraw: function () {
					redrawCurrentDayRectangle('qpfChartContainer', this);
				}
			}
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

	// Hide labels from monthly charts
	if (chartsCurrentLevel === chartsLevel.monthly)  {
		qpfChartOptions.series[0].dataLabels.enabled = false;
	}

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
function generateProgramChart (programUid, programIndex) {
	var program = getProgramById(programUid);

	if (program === null)
		var programName = programIndex;
	else
		var programName = program.name;

	var programChartOptions = {
		chart: {
			renderTo: 'programChartContainer-' + programIndex,
			spacingTop: 20,
			events: {
				redraw: function () {
					redrawCurrentDayRectangle('programChartContainer-' + programIndex, this);
				}
			}

		},
		series: [{
			data: chartsData.programs[programIndex].currentSeries,
			dataLabels: {
				enabled: true,
				format: '{y}%',
				inside: true,
				verticalAlign: 'bottom'
			},
			name: 'Program ' + programName,
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
			text: '<h1>' + programName + ' program water need (%)</h1>',
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

	// Hide labels from monthly charts
	if (chartsCurrentLevel === chartsLevel.monthly)  {
		programChartOptions.series[0].dataLabels.enabled = false;
	}

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
	if (chartsCurrentLevel === chartsLevel.weekly) {
	//if we are on level weekly we need to highlight the current day but only if the chartsWeeklyPeriod is 0 (period which contains the current date)
		if (chartsWeeklyPeriod === 0) {
			highlightCurrentDayInChart(chart);


		}

		// add the previous button if available
		if (chartsWeeklyPeriod < chartsMaxWeeklyPeriod) {
			generatePeriodNavigationButton(chart, true, loadWeeklyPeriod);
		}

		// add the next button if available
		if (chartsWeeklyPeriod > chartsMinWeeklyPeriod) {
			generatePeriodNavigationButton(chart, false, loadWeeklyPeriod);
		}
	} else if (chartsCurrentLevel === chartsLevel.monthly) { // if we are on the level monthly we need to draw the next/previous buttons
		// add the previous button if available
		if (chartsMonthlyPeriod < chartsMaxMonthlyPeriod) {
			generatePeriodNavigationButton(chart, true, loadMonthlyPeriod);
		}

		// add the next button if available
		if (chartsMonthlyPeriod > chartsMinMonthlyPeriod) {
			generatePeriodNavigationButton(chart, false, loadMonthlyPeriod);
		}
	}
}

/**
 * Generates a button for generating within a period
 * @param chart - chart to generate the button on
 * @param previous - if true we will generate a previous button, otherwise a next button
 * @param callback - this callback is called when the button is pressed
 */
function generatePeriodNavigationButton (chart, previous, callback) {
	var navButton = null;

	// generate either a previous or a next button
	if (previous === true) {
		navButton = chart.renderer.image('images/arrow_left_24.png', 16, 16, 24, 24);
	} else {
		navButton = chart.renderer.image('images/arrow_right_24.png', chart.chartWidth - 40, 16, 24, 24);
	}

	// add the buttons + styles + callback for click
	navButton.add();
	navButton.css({'cursor': 'pointer'});
	navButton.attr({'title': 'Previous period'});
	navButton.on('click', function() {
		// prevent the default behaviour of the button to avoid interface errors
		event.preventDefault();
		event.stopPropagation();

		// execute the callback passed as a parameter
		callback(previous);
	});
}

/**
 * Adjust the weekly period and load the weekly charts
 * @param previous - if true we will load the previous period
 */
function loadWeeklyPeriod (previous) {
	if (previous === true) {
		chartsWeeklyPeriod += 1;
	} else {
		chartsWeeklyPeriod -= 1;
	}

	loadWeeklyCharts();
}

/**
 * Adjust the monthly period and load the monthly charts
 * @param previous - if true we will load the previous period
 */
function loadMonthlyPeriod (previous) {
	if (previous === true) {
		chartsMonthlyPeriod += 1;
	} else {
		chartsMonthlyPeriod -= 1;
	}

	loadMonthlyCharts();
}

/**
 * Draws a highlighter rectangle behind the current days plot
 * @param chart
 */
function highlightCurrentDayInChart(chart) {
	var highlighter = null,
		highlighterXStart = parseInt(chartsCurrentDayIndex, 10) - 0.5,
		highlighterXEnd = parseInt(chartsCurrentDayIndex, 10) + 0.5,
		x1 = chart.xAxis[0].toPixels(highlighterXStart, false),
		x2 = chart.xAxis[0].toPixels(highlighterXEnd, false),
		y1 = chart.yAxis[0].toPixels(chart.yAxis[0].getExtremes().min, false),
		y2 = chart.yAxis[0].toPixels(chart.yAxis[0].getExtremes().max, false);

	// if we have all the points needed
	if(!isNaN(x1) && !isNaN(x2) && !isNaN(y1) && !isNaN(y2)) {
		// draw the highlighter
		highlighter = chart.renderer.rect(x1, y2, x2 - x1, y1 - y2);

		// add properties to the highlighter
		highlighter.attr({
			fill: 'gray',
			opacity: 0.2,
			'class': 'day_rectangle'
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
