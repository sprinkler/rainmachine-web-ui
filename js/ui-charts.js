/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

/* global Highcharts */
var YEARDAYS = Util.getYearDays((new Date()).getFullYear());
var chartsDataCounter = 0;
var chartsLevel = { // available viewing levels for the charts
		weekly: 0,
		monthly: 1,
		yearly: 2
	},
	chartsCurrentLevel = chartsLevel.weekly, // current viewing level for all the charts
	chartsDateFormat = '%b %e', // format for the dates used in chart labels
	chartsDateFormatSmall = '%e', // format for the dates used in chart labels when charts are in a small container
	chartsMaximumDataRange = YEARDAYS, // the maximum amount of data that the application loads
	chartsWeeklySlice = 7, // the size of the weekly data
	chartsWeeklyPeriod = 0, // the current period of the charts (0 includes the current date, larger than 0 is in the past)
	chartsMinWeeklyPeriod = 0, // the minimum value that the chartsWeeklyPeriod can take
	chartsMaxWeeklyPeriod = Math.floor(chartsMaximumDataRange / chartsWeeklySlice), // the maximum value that the chartsWeeklyPeriod can take
	chartsCurrentDayIndex = 1, // current day index from the array of days of length chartsWeeklySlice (e.g. this should be 7 - the eight day - when the chartsWeeklySlice is 14) - starts at 0
	chartsMonthlySlice = 30, // the size of the montly data
	chartsMonthlyPeriod = 0, // the current period of the charts (0 includes the current date, larger than 0 is in the past)
	chartsMinMonthlyPeriod = 0, // the minimum value that the chartsMonthlyPeriod can take
	chartsMaxMonthlyPeriod = Math.floor(chartsMaximumDataRange / chartsMonthlySlice), // the maximum value that the chartsMonthlyPeriod can take
	chartsData = new ChartData(), // this will hold all the data for the charts
	charts = { // array that holds the currently generated charts (used for destroying charts when other charts are rendered in the same container - memory optimization)
		waterSaved: null,
		waterNeed: null,
		temperature: null,
		qpf: null,
		programs: []
	};

var syncCharts = []; // hold the charts that will have their mouse over tooltips syncronized
var downloadedYearlyData = false; //TODO: Temporary until we design this better. If data for 365days has been downloaded.

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
 * Gets a the date object that corresponds to the index
 * @param index
 * @returns {*}
 */
ChartSeries.prototype.getDateAtIndex = function(index) {

	var d = new Date(this.startDate);
	d.setDate(d.getDate() + index);
	return d;
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
	this.temperature = new ChartSeries(this.startDate);
//	this.waterNeedReal = new ChartSeries(this.startDate);
//	this.waterNeedSimulated = new ChartSeries(this.startDate);
	this.waterSaved = new ChartSeries(this.startDate);
	this.condition = new ChartSeries(this.startDate);
	this.et0 = new ChartSeries(this.startDate);
	this.pressure = new ChartSeries(this.startDate);
	this.rh = new ChartSeries(this.startDate);
	this.wind = new ChartSeries(this.startDate);
	this.rain = new ChartSeries(this.startDate);
	this.dewPoint = new ChartSeries(this.startDate);
	this.programs = [];
	this.programsFlags = [];
	this.programsMap = {}; //Holds programs uid to programs array index mapping

	console.log('Initialised ChartData from %s to %s',this.startDate.toDateString(), end.toDateString());
}

/**
* Returns a program object. Requires Data.programs structure to be available
* @param id
*/
function getProgramById(id) {

	if (Data.programs === null) {
		return null;
	}

	for (var p = 0; p < Data.programs.programs.length; p++) {
		var existingProgram = Data.programs.programs[p];
		if (id == existingProgram.uid) {
			return existingProgram;
		}
	}
    return null;
}

/**
 * Gets the daily future data from the API for charts
 * @param pastDays
 */
function getDailyStatsWithRetry(retryCount, retryDelay) {

	if (retryCount-- > 0) {
		APIAsync.getDailyStats(null, true)
        	.then(function(o) {
				makeHidden("#error");
				Data.dailyDetails = o; chartsDataCounter++; processChartData();}) //for water need in the future
        	.error(function(o) {
				window.ui.main.showError("Please wait while new graphs are generated");
        	 	setTimeout(getDailyStatsWithRetry.bind(null, retryCount, retryDelay), retryDelay)})
	} else {
		// hide the spinner
        makeHidden($('#pageLoadSpinner'));
        window.ui.main.showError("Error loading Daily Stats !");
	}
}

/**
 * Gets the data from the API for all the Charts,
 * @param pastDays
 */
function getChartData(pastDays) {
	console.log("Getting all dashboard data for %d past days...", pastDays);
	//for programs name and status
	APIAsync.getPrograms()
	.then(function(o) { Data.programs = o; chartsDataCounter++; processChartData(); });

	//for weather data in the  past + 7 future
	APIAsync.getMixer(Util.getDateWithDaysDiff(pastDays), pastDays + 7)
	.then(function(o) { Data.mixerData = o.mixerDataByDate; chartsDataCounter++; processChartData(); });

	//for used water
	APIAsync.getWateringLog(false, true,  Util.getDateWithDaysDiff(pastDays), pastDays)
	.then(function(o) { Data.waterLog = o; chartsDataCounter++; processChartData();});

//	APIAsync.getWateringLog(true, true,  Util.getDateWithDaysDiff(pastDays), pastDays)
//	.then(function(o) { Data.waterLogSimulated = o; chartsDataCounter++; processChartData();}) //for simulated used water

	//for future watering/program runs
	getDailyStatsWithRetry(20, 6000);

	// for water saved gauge (entire year)
	APIAsync.getWateringLog(false, false, Util.getDateWithDaysDiff(YEARDAYS + 7), YEARDAYS + 7)
	.then(function(o) { Data.waterLogSimple = o; processDataWaterSaved(); });
}

/**
 * Parses and processes the yearly water log without details into chartsData.waterSaved
 */
function processDataWaterSaved() {

	var waterLog = Data.waterLogSimple.waterLog.days;
	for (var i = 0; i < waterLog.length; i++) {
		var day = waterLog[i].date;
		var saved = (100 - parseInt((waterLog[i].realDuration / waterLog[i].userDuration) * 100));
        if (saved < 0) saved = 0;
        if (saved > 100) saved = 100;

		chartsData.waterSaved.insertAtDate(day, saved);
	}
}

/**
 * Parses and processes the data into the correct holders
 */
function processChartData() {
	var mixedDataIndex,
		programIndex,
		dailyValuesIndex,
		dailyDetailsIndex,
		zoneIndex,
		monthsIndex,
		daysIndex,
		currentProgram,
		currentProgramIndex;

	if (chartsDataCounter < 4) {
		return;
	} else {
		chartsDataCounter = 0;
	}

	//Get all available days in mixer TODO: Can be quite long (365 - chartsMaximumDataRange - days)
	for (mixedDataIndex = 0; mixedDataIndex < Data.mixerData.length; mixedDataIndex++) {
		var entry = Data.mixerData[mixedDataIndex];

		var dvDay =  entry.day.split(' ')[0];
		chartsData.qpf.insertAtDate(dvDay, entry.qpf);
		chartsData.maxt.insertAtDate(dvDay, entry.maxTemp);
		chartsData.mint.insertAtDate(dvDay, entry.minTemp);
		chartsData.temperature.insertAtDate(dvDay, entry.temperature);
		chartsData.condition.insertAtDate(dvDay, entry.condition);
		chartsData.et0.insertAtDate(dvDay, entry.et0final);
		chartsData.pressure.insertAtDate(dvDay, entry.pressure);
		chartsData.rh.insertAtDate(dvDay, entry.rh);
		chartsData.wind.insertAtDate(dvDay, entry.wind);
		chartsData.rain.insertAtDate(dvDay, entry.rain);
		chartsData.dewPoint.insertAtDate(dvDay, entry.dewPoint);
	}

	//Total Water Need future days
	var daily = Data.dailyDetails.DailyStatsDetails;

	for (dailyDetailsIndex = 0; dailyDetailsIndex < daily.length; dailyDetailsIndex++) {
		var wnfTotalDayUserWater = 0;
		var wnfTotalDayScheduledWater = 0;
		var wnfTotalDaySimulatedUserWater = 0;
		var wnfTotalDaySimulatedScheduledWater = 0;

		/*
		//simulated machine programs for the day
		for (programIndex = 0; programIndex < daily[dailyDetailsIndex].simulatedPrograms.length; programIndex++) {
			currentProgram = daily[dailyDetailsIndex].simulatedPrograms[programIndex];

			//zones for the simulated programs, we only need day stats not per-program stats
			for (zoneIndex = 0; zoneIndex < currentProgram.zones.length; zoneIndex++) {
				wnfTotalDaySimulatedUserWater += currentProgram.zones[zoneIndex].scheduledWateringTime;
				wnfTotalDaySimulatedScheduledWater += currentProgram.zones[zoneIndex].computedWateringTime;
			}
			//console.log("%s Program %d User:%d, Sch: %d", daily[dailyDetailsIndex].day, programIndex,  wnfTotalDaySimulatedUserWater, wnfTotalDaySimulatedScheduledWater);
		}
		*/

		//real user programs for the day
		for (programIndex = 0; programIndex < daily[dailyDetailsIndex].programs.length; programIndex++) {
			currentProgram = daily[dailyDetailsIndex].programs[programIndex];
			var wnfTotalDayProgramUserWater = 0;
			var wnfTotalDayProgramScheduledWater = 0;
			var programFlag = 0;

			//Skip Manual run programs (id 0)
			if (currentProgram.id == 0)
				continue;

			//zones for the real user programs
			for (zoneIndex = 0; zoneIndex < currentProgram.zones.length; zoneIndex++) {
				wnfTotalDayProgramUserWater += currentProgram.zones[zoneIndex].scheduledWateringTime;
				wnfTotalDayProgramScheduledWater += currentProgram.zones[zoneIndex].computedWateringTime;

				var _programFlag = currentProgram.zones[zoneIndex].wateringFlag;
				if (_programFlag > 0) {
					programFlag = _programFlag;
					console.log("Program %s flag %s", currentProgram.id, programFlag);
				}
			}

			var wnfProgramDayWN = Util.normalizeWaterNeed(wnfTotalDayProgramUserWater, wnfTotalDayProgramScheduledWater);
			wnfTotalDayUserWater += wnfTotalDayProgramUserWater;
			wnfTotalDayScheduledWater += wnfTotalDayProgramScheduledWater;

			// Is program active/still available in current programs list (might be an old deleted program)?
			var existingProgram = getProgramById(currentProgram.id);
			if (existingProgram === null)
				continue;

			// Program index not in our struct ?
			if (currentProgram.id in chartsData.programsMap) {
				currentProgramIndex = chartsData.programsMap[currentProgram.id];
				console.log("Already existing id: %d", currentProgramIndex);
			} else {
				currentProgramIndex = chartsData.programs.push(new ChartSeries(chartsData.startDate)) - 1;
				chartsData.programsFlags.push(new ChartSeries(chartsData.startDate));
				console.log("Non existent id: %d ProgramsFlags push len %d", currentProgramIndex, chartsData.programsFlags.length);
				chartsData.programsMap[currentProgram.id] = currentProgramIndex;
			}
			chartsData.programs[currentProgramIndex].insertAtDate(daily[dailyDetailsIndex].day, wnfProgramDayWN);
			chartsData.programsFlags[currentProgramIndex].insertAtDate(daily[dailyDetailsIndex].day, programFlag);
		}

		var wnfDailyWN = Util.normalizeWaterNeed(wnfTotalDayUserWater, wnfTotalDayScheduledWater);
		var wnfDailySimulatedWN = Util.normalizeWaterNeed(wnfTotalDaySimulatedUserWater, wnfTotalDaySimulatedScheduledWater);
		if (wnfDailyWN > chartsData.maxWN)
			chartsData.maxWN = wnfDailyWN;

		if (wnfDailySimulatedWN > chartsData.maxWN)
			chartsData.maxWN = wnfDailySimulatedWN;

		//chartsData.waterNeedReal.insertAtDate(daily[dailyDetailsIndex].day, wnfDailyWN);
		//chartsData.waterNeedSimulated.insertAtDate(daily[dailyDetailsIndex].day, wnfDailySimulatedWN);
	}
     /*
	//Past 'water need' for simulated machine programs, we only need per day sum of all programs
	for (var i = Data.waterLogSimulated.waterLog.days.length - 1; i >= 0 ; i--) {
		day =  Data.waterLogSimulated.waterLog.days[i];
		var wnpTotalDaySimulatedUserWater = 0;
		var wnpTotalDaySimulatedScheduledWater = 0;

		for (programIndex = 0; programIndex < day.programs.length; programIndex++) {
			currentProgram = day.programs[programIndex];

			for (zoneIndex = 0; zoneIndex < currentProgram.zones.length; zoneIndex++) {
				var zone = currentProgram.zones[zoneIndex];

				for (var c = 0; c < zone.cycles.length; c++) {
					var cycle = zone.cycles[c];
					wnpTotalDaySimulatedScheduledWater += cycle.realDuration;
					wnpTotalDaySimulatedUserWater += cycle.userDuration;
				}
			}
		}

		var wnpDailySimultatedWN = Util.normalizeWaterNeed(wnpTotalDaySimulatedUserWater, wnpTotalDaySimulatedScheduledWater);
		if (wnpDailySimultatedWN > chartsData.maxWN) {
			chartsData.maxWN = wnpDailySimultatedWN;
		}

		chartsData.waterNeedSimulated.insertAtDate(day.date, wnpDailySimultatedWN);
	}
	*/

	//Past 'water need' for real user programs
	for (var i = Data.waterLog.waterLog.days.length - 1; i >= 0 ; i--) {
		var day =  Data.waterLog.waterLog.days[i];
		var wnpTotalDayUserWater = 0;
		var wnpTotalDayScheduledWater = 0;

		for (programIndex = 0; programIndex < day.programs.length; programIndex++) {
			currentProgram = day.programs[programIndex];
			var wnpTotalDayProgramUserWater = 0;
			var wnpTotalDayProgramScheduledWater = 0;
			var programFlag = 0;

			//Skip Manual run programs (id 0)
			if (currentProgram.id == 0)
				continue;

			for (zoneIndex = 0; zoneIndex < currentProgram.zones.length; zoneIndex++) {
				var zone = currentProgram.zones[zoneIndex];
				var _programFlag = zone.flag;
				if (_programFlag > 0) {
					programFlag = _programFlag;
					//console.log("History Program %s flag %s", currentProgram.id, programFlag);
				}

				for (var c = 0; c < zone.cycles.length; c++) {
					var cycle = zone.cycles[c];
					wnpTotalDayProgramScheduledWater += cycle.realDuration;
					wnpTotalDayProgramUserWater += cycle.userDuration;
				}

				var wnpProgramDayWN = Util.normalizeWaterNeed(wnpTotalDayProgramUserWater, wnpTotalDayProgramScheduledWater);
				wnpTotalDayUserWater += wnpTotalDayProgramUserWater;
				wnpTotalDayScheduledWater += wnpTotalDayProgramScheduledWater;

				//Add program used water
				// Is program active/still available in current programs list (might be an old deleted program)?
				var existingProgram = getProgramById(currentProgram.id);
				if (existingProgram === null)
					continue;

				// Program index not in our struct ?
				if (currentProgram.id in chartsData.programsMap) {
					currentProgramIndex = chartsData.programsMap[currentProgram.id];
				} else {
					currentProgramIndex = chartsData.programs.push(new ChartSeries(chartsData.startDate)) - 1;
					chartsData.programsFlags.push(new ChartSeries(chartsData.startDate));
					chartsData.programsMap[currentProgram.id] = currentProgramIndex;

				}
				chartsData.programs[currentProgramIndex].insertAtDate(day.date, wnpProgramDayWN);
				chartsData.programsFlags[currentProgramIndex].insertAtDate(day.date, programFlag);
			}
		}

		var wnpDailyWN = Util.normalizeWaterNeed(wnpTotalDayUserWater, wnpTotalDayScheduledWater);
		if (wnpDailyWN > chartsData.maxWN) {
			chartsData.maxWN = wnpDailyWN;
		}

		//chartsData.waterNeedReal.insertAtDate(day.date, wnpDailyWN);
	}

	// calculate months data
	for (monthsIndex = 0; monthsIndex < chartsData.months.length; monthsIndex++) {
		var daysInMonth = 0,
			monthPrefix = chartsData.months[monthsIndex].split('-')[0] + '-' + chartsData.months[monthsIndex].split('-')[1];

		// initialize the months data for each chart with 0
		//chartsData.waterNeedReal.monthsData[monthsIndex] = 0;
		//chartsData.waterNeedSimulated.monthsData[monthsIndex] = 0;
		chartsData.maxt.monthsData[monthsIndex] = 0;
		chartsData.mint.monthsData[monthsIndex] = 0;
		chartsData.temperature.monthsData[monthsIndex] = 0;
		chartsData.qpf.monthsData[monthsIndex] = 0;
		chartsData.rain.monthsData[monthsIndex] = 0;
		for (programIndex = 0; programIndex < chartsData.programs.length; programIndex++) {
			chartsData.programs[programIndex].monthsData[monthsIndex] = 0;
		}

		// go through all of the days data and aggregate them (sum)
		for (daysIndex = 0; daysIndex < chartsData.days.length; daysIndex++) {
			if (chartsData.days[daysIndex].indexOf(monthPrefix) >= 0) {
				daysInMonth++;

				//chartsData.waterNeedReal.monthsData[monthsIndex] += chartsData.waterNeedReal.getAtDate(chartsData.days[daysIndex]) === null ? 0 : chartsData.waterNeedReal.getAtDate(chartsData.days[daysIndex]);
				//chartsData.waterNeedSimulated.monthsData[monthsIndex] += chartsData.waterNeedSimulated.getAtDate(chartsData.days[daysIndex]) === null ? 0 : chartsData.waterNeedSimulated.getAtDate(chartsData.days[daysIndex]);
				chartsData.maxt.monthsData[monthsIndex] += chartsData.maxt.getAtDate(chartsData.days[daysIndex]) === null ? 0 : chartsData.maxt.getAtDate(chartsData.days[daysIndex]);
				chartsData.mint.monthsData[monthsIndex] += chartsData.mint.getAtDate(chartsData.days[daysIndex]) === null ? 0 : chartsData.mint.getAtDate(chartsData.days[daysIndex]);
				chartsData.temperature.monthsData[monthsIndex] += chartsData.temperature.getAtDate(chartsData.days[daysIndex]) === null ? 0 : chartsData.temperature.getAtDate(chartsData.days[daysIndex]);
				chartsData.qpf.monthsData[monthsIndex] += chartsData.qpf.getAtDate(chartsData.days[daysIndex]) === null ? 0 : chartsData.qpf.getAtDate(chartsData.days[daysIndex]);
				chartsData.rain.monthsData[monthsIndex] += chartsData.rain.getAtDate(chartsData.days[daysIndex]) === null ? 0 : chartsData.rain.getAtDate(chartsData.days[daysIndex]);

				for (programIndex = 0; programIndex < chartsData.programs.length; programIndex++) {
					chartsData.programs[programIndex].monthsData[monthsIndex] += chartsData.programs[programIndex].getAtDate(chartsData.days[daysIndex]) === null ? 0 : chartsData.programs[programIndex].getAtDate(chartsData.days[daysIndex]);
				}
			}
		}

		// for all the charts except QPF we need to aggregate with an AVG (and round to max two decimals)
		//chartsData.waterNeedReal.monthsData[monthsIndex] = Math.round((chartsData.waterNeedReal.monthsData[monthsIndex] / daysInMonth) * 100) / 100;
		//chartsData.waterNeedSimulated.monthsData[monthsIndex] = Math.round((chartsData.waterNeedSimulated.monthsData[monthsIndex] / daysInMonth) * 100) / 100;
		chartsData.maxt.monthsData[monthsIndex] = Math.round((chartsData.maxt.monthsData[monthsIndex] / daysInMonth) * 100) / 100;
		chartsData.mint.monthsData[monthsIndex] = Math.round((chartsData.mint.monthsData[monthsIndex] / daysInMonth) * 100) / 100;
		chartsData.temperature.monthsData[monthsIndex] = Math.round((chartsData.temperature.monthsData[monthsIndex] / daysInMonth) * 100) / 100;
		for (programIndex = 0; programIndex < chartsData.programs.length; programIndex++) {
			chartsData.programs[programIndex].monthsData[monthsIndex] = Math.round((chartsData.programs[programIndex].monthsData[monthsIndex]) / daysInMonth * 100) / 100;
		}
	}

	//generateProgramsChartsContainers();

	// hide the spinner
	makeHidden($('#pageLoadSpinner'));
    // make the dashboard visible before generating the charts so that the charts can take the correct size
    makeVisibleBlock($('#dashboard'));
	if (downloadedYearlyData) {
		loadYearlyCharts();
	} else {
		loadWeeklyCharts();
	}
}


function setWaterSavedValueForDays(pastDays) {
	var startDay = Util.getDateWithDaysDiff(pastDays);
	var startDayIndex = Util.getDateIndex(startDay, chartsData.waterSaved.startDate);

	var nrDays = 0;
	var sum = 0;
	for (var i = startDayIndex; i < startDayIndex + pastDays; i++) {
		var v = chartsData.waterSaved.data[i];
		if (typeof v !== "undefined" && v !== null) {
			nrDays++;
			sum += v;
		}
	}

	if (nrDays > 0)
		chartsData.waterSaved.currentSeries = [ Math.round(sum / nrDays) ];
	else
		chartsData.waterSaved.currentSeries = [ 0 ];
}

/**
 * Generates the containers for the Program charts (no longer used, containers are now created in ui-programs.js)
 */
/*
function generateProgramsChartsContainers () {
	for (var programIndex = 0; programIndex < chartsData.programs.length; programIndex++) {
		var div = addTag($('#dashboard'), 'div');
		div.id = 'programChartContainer-' + programIndex;
		div.className = 'charts';
	}
}
*/

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

	//var sliceStart = -(chartsWeeklySlice  * (chartsWeeklyPeriod + 1)),
	//	sliceEnd = -(chartsWeeklySlice * chartsWeeklyPeriod);

	// We want 1 day in the past
	var sliceStart = -((chartsWeeklySlice + 1)  * (chartsWeeklyPeriod + 1)),
    	sliceEnd = -(chartsWeeklySlice  * chartsWeeklyPeriod);


	// if the slice end is 0 than we need to make it (-1 for the above day in the past)
	if (sliceEnd === 0) {
		sliceEnd = chartsData.days.length - 1;
	}

	// set the categories and series for all charts
	chartsData.currentAxisCategories = chartsData.days.slice(sliceStart, sliceEnd);
	//chartsData.waterNeedReal.currentSeries = chartsData.waterNeedReal.data.slice(sliceStart, sliceEnd);
	//chartsData.waterNeedSimulated.currentSeries = chartsData.waterNeedSimulated.data.slice(sliceStart, sliceEnd);
	chartsData.maxt.currentSeries = chartsData.maxt.data.slice(sliceStart, sliceEnd);
	chartsData.mint.currentSeries = chartsData.mint.data.slice(sliceStart, sliceEnd);
	chartsData.temperature.currentSeries = chartsData.temperature.data.slice(sliceStart, sliceEnd);
	chartsData.qpf.currentSeries = chartsData.qpf.data.slice(sliceStart, sliceEnd);
	chartsData.rain.currentSeries = chartsData.rain.data.slice(sliceStart, sliceEnd);

	for (var programIndex = 0; programIndex < chartsData.programs.length; programIndex++) {
		chartsData.programs[programIndex].currentSeries = chartsData.programs[programIndex].data.slice(sliceStart, sliceEnd);
		chartsData.programsFlags[programIndex].currentSeries = chartsData.programsFlags[programIndex].data.slice(sliceStart, sliceEnd);
	}

	// render all charts with the currentAxisCategories and currentSeries
	generateCharts();

	//For water gauge show only last week (today - 7)
	setWaterSavedValueForDays(7);
	generateWaterSavedGauge();
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
	//chartsData.waterNeedReal.currentSeries = chartsData.waterNeedReal.data.slice(sliceStart, sliceEnd);
	//chartsData.waterNeedSimulated.currentSeries = chartsData.waterNeedSimulated.data.slice(sliceStart, sliceEnd);
	chartsData.maxt.currentSeries = chartsData.maxt.data.slice(sliceStart, sliceEnd);
	chartsData.mint.currentSeries = chartsData.mint.data.slice(sliceStart, sliceEnd);
	chartsData.temperature.currentSeries = chartsData.temperature.data.slice(sliceStart, sliceEnd);
	chartsData.qpf.currentSeries = chartsData.qpf.data.slice(sliceStart, sliceEnd);
	chartsData.rain.currentSeries = chartsData.rain.data.slice(sliceStart, sliceEnd);

	for (var programIndex = 0; programIndex < chartsData.programs.length; programIndex++) {
		chartsData.programs[programIndex].currentSeries = chartsData.programs[programIndex].data.slice(sliceStart, sliceEnd);
		chartsData.programsFlags[programIndex].currentSeries = chartsData.programsFlags[programIndex].data.slice(sliceStart, sliceEnd);
	}

	// render all charts with the currentAxisCategories and currentSeries
	generateCharts();
	//For water gauge show only last month
    setWaterSavedValueForDays(30)
    generateWaterSavedGauge();
}

/**
 * Sets the chartsLevel to yearly, sets the categories and series for the charts and generates all the charts
 */
function loadYearlyCharts () {

	//TODO: Temporary. Downloads 365 days data when user clicks on year tab
	if (!downloadedYearlyData) {
		makeHidden($('#dashboard'));
		makeVisible($('#pageLoadSpinner'));
		loadCharts(true, YEARDAYS);
		downloadedYearlyData = true;
	}


	chartsCurrentLevel = chartsLevel.yearly;
	chartsDateFormat = '%b';

	// reset the charts weekly and monthly periods
	chartsWeeklyPeriod = 0;
	chartsMonthlyPeriod = 0;

	// set the categories and series for all charts
	chartsData.currentAxisCategories = chartsData.months;
	//chartsData.waterNeedReal.currentSeries = chartsData.waterNeedReal.monthsData;
	//chartsData.waterNeedSimulated.currentSeries = chartsData.waterNeedSimulated.monthsData;
	chartsData.maxt.currentSeries = chartsData.maxt.monthsData;
	chartsData.mint.currentSeries = chartsData.mint.monthsData;
	chartsData.temperature.currentSeries = chartsData.temperature.monthsData;
	chartsData.qpf.currentSeries = chartsData.qpf.monthsData;
	chartsData.rain.currentSeries = chartsData.rain.monthsData;

	for (var programIndex = 0; programIndex < chartsData.programs.length; programIndex++) {
		chartsData.programs[programIndex].currentSeries = chartsData.programs[programIndex].monthsData;
	}

	// render all charts with the currentAxisCategories and currentSeries
	generateCharts();
	//For water gauge show only last year
    setWaterSavedValueForDays(356);
    generateWaterSavedGauge();
}

/**
 * Generates all the charts: Water Need, Temperature, QPF and Programs
 */
function generateCharts () {
	//generateWaterNeedChart();
	generateTemperatureChart();
	generateQPFChart();
	generateDailyWeatherChart();
	generateProgramsChart();
	bindChartsSyncToolTipEvents();
}

/**
 * Generates the daily weather top row that will replace water need graph
 */

function generateDailyWeatherChart() {
	var containerDiv = $('#weatherChartDays');
	clearTag(containerDiv);

	var startDay = Util.getDateWithDaysDiff(1); //Top days weather chart show 1 day in the past total 7 days

	var startDayIndex = Util.getDateIndex(startDay, chartsData.condition.startDate);

	for (var i = startDayIndex; i < startDayIndex + 7; i ++) {
		var condition = chartsData.condition.data[i];
		var maxtemp = Util.convert.uiTemp(chartsData.maxt.data[i]);
		var mintemp = Util.convert.uiTemp(chartsData.mint.data[i]);
		var qpf = Util.convert.uiQuantity(chartsData.qpf.data[i]);
		var date = chartsData.condition.getDateAtIndex(i);

		var weatherTemplate = loadTemplate("day-weather-template");
		var weatherDateElem = $(weatherTemplate, '[rm-id="day-weather-date"]');
		var weatherIconElem = $(weatherTemplate, '[rm-id="day-weather-icon"]');
		var weatherTempElem = $(weatherTemplate, '[rm-id="day-weather-temp"]');
		var weatherQPFElem =  $(weatherTemplate, '[rm-id="day-weather-qpf"]');

		if (i == startDayIndex) {
			weatherDateElem.textContent = Util.monthNamesShort[date.getMonth()] + " " + date.getDate();
		} else {
			weatherDateElem.textContent = date.getDate();
		}

		if (i == startDayIndex + 1) { //today
			weatherTemplate.className += " today";
		}

		weatherIconElem.textContent = Util.conditionAsIcon(condition);

		if (mintemp !== null) {
			weatherTempElem.textContent = Math.round(mintemp);
		} else {
			weatherTempElem.textContent = "--";
		}
		weatherTempElem.textContent += "/";


		if (maxtemp !== null) {
			weatherTempElem.textContent += Math.round(maxtemp);
		} else {
			weatherTempElem.textContent += "--";
		}
		weatherTempElem.textContent +="\xB0";

		try {
			qpf = qpf.toFixed(1)
		} catch(e) {}

		if (qpf !== null) {
			weatherQPFElem.textContent = qpf;
		} else  {
			weatherQPFElem.textContent = "--";
		}

		containerDiv.appendChild(weatherTemplate);
	}
 }


/**
 * Generates the Water Saved gauge
 */
function generateWaterSavedGauge() {
	var waterSavedGaugeOptions = {
		chart: {
			type: 'solidgauge',
			margin: [5, 5, 5, 5],
			backgroundColor: 'transparent',
			renderTo: 'waterSavedGaugeContainer'
		},
		title: null,
		yAxis: {
			min: 0,
			max: 100,
			minColor: '#009CE8',
			maxColor: '#009CE8',
			lineWidth: 0,
			tickWidth: 0,
			minorTickLength: 0,
			minTickInterval: 500,
			labels: {
				enabled: false
			}
		},
		pane: {
			size: '97%',
			center: ['50%', '50%'],
			startAngle: 0,
			endAngle: 360,
			background: {
				borderWidth: 10,
				backgroundColor: '#e5f4ff',
				shape: 'circle',
				borderColor: '#e5f4ff',
				outerRadius: '100%',
				innerRadius: '80%'
			}
		},
		tooltip: {
			enabled: false
		},
		plotOptions: {
			solidgauge: {
				borderColor: '#3399cc',
				borderWidth: 15,
				radius: 90,
				innerRadius: '90%',
				dataLabels: {
 					y: 10,
 					borderWidth: 0,
 					useHTML: true
				}
			}
		},
		series: [{
			name: 'waterSaved',
			data: chartsData.waterSaved.currentSeries,
			dataLabels: {
				format: '<div style="margin-top:-30px;height:50px;vertical-align:middle;width: 170px;text-align:center"><span style="font-size:36px;color:#555;font-weight:normal;font-family: Arial, sans-serif;">{y} %</span></div>'
			}
		}],
		credits: {
			enabled: false
		}
	};

    // before generating the chart we must destroy the old one if it exists
    if (charts.waterSaved) {
    	charts.waterSaved.destroy();
    }

    // generate the chart
    charts.waterSaved = new Highcharts.Chart(waterSavedGaugeOptions);


	var div = $('#waterSavedGaugeContainer');
	var svg = div.getElementsByTagName('svg');
	if (svg.length > 0) {
		var path = svg[0].getElementsByTagName('path');
		if (path.length > 1) {
			// First path is gauge background
			path[0].setAttributeNS(null, 'stroke-linejoin', 'round');
			// Second path is gauge value
			path[1].setAttributeNS(null, 'stroke-linejoin', 'round');
		}
	}
}

/**
 * Generates the Water Need chart
 */

/*
function generateWaterNeedChart () {
	var waterNeedChartOptions = {
		chart: {
			type: 'column',
			renderTo: 'waterNeedChartContainer',
			spacingTop: 20,
			events: {
				redraw: function () {
					if (chartsWeeklyPeriod === 0) {
						highlightCurrentDayInChart(this);
					};
				}
			}
		},
		series: [{
			data: chartsData.waterNeedReal.currentSeries,
			dataLabels: {
				enabled: false,
				format: '{y}%',
				inside: true,
				verticalAlign: 'bottom'
			},
			name: 'Programs water need',
			color: 'rgba(230, 230, 230, 0.50)',
			visible: false,
			stack: 'wn'
			}, {
			data: chartsData.waterNeedSimulated.currentSeries,
			dataLabels: {
				enabled: true,
				format: '{y}%',
				inside: true,
				verticalAlign: 'bottom'
			},
			name: 'Water need',
			stack: 'wn'
		}],
		plotOptions: {
			column: {
				stacking: 'percent'
			}
		},
		title: {
			text: '<h1>Water need (%)</h1>',
			useHTML: true
		},
		tooltip: {
			shared: true
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

	// Hide labels for monthly charts
	if (chartsCurrentLevel === chartsLevel.monthly)  {
    		waterNeedChartOptions.series[1].dataLabels.enabled = false;
	}

	// before generating the chart we must destroy the old one if it exists
	if (charts.waterNeed) {
		charts.waterNeed.destroy();
	}

	// generate the chart
	charts.waterNeed = new Highcharts.Chart(waterNeedChartOptions, generateChartCallback);
}
*/

/**
 * Generates the Temperature chart
 */
function generateTemperatureChart () {
	var temperatureChartOptions = {
		chart: {
			renderTo: 'weatherChartTempMonthly',
			spacingTop: 20,
			events: {
				redraw: function () {
					if (chartsWeeklyPeriod === 0) {
						highlightCurrentDayInChart(this);
					};
				}
			}
		},
		//"
		tooltip: {
			hideDelay: 0,
			animation: false,
			formatter: function() {
				var date = Highcharts.dateFormat(chartsDateFormat, new Date(this.point.category));
				var s = '<span style="font-size: 14px;">' + date + ':';

				if (this.point.secondPoint) {
					s += " Low:"+ Util.convert.uiTemp(this.point.secondPoint.y) + Util.convert.uiTempStr();
				}

				s+= " High:" + Util.convert.uiTemp(this.point.y) + Util.convert.uiTempStr() + '</span>';
				return s;
			}
		},
		series: [{
			data: chartsData.maxt.currentSeries,
			showInLegend: false,
			name: 'Maximum Temperature',
			type: 'line'
		}, {
			data: chartsData.mint.currentSeries,
			showInLegend: false,
			name: 'Minimum Temperature',
			type: 'line'
		}],
		title: null,
		//title: {
		//	text: '<h1>Temperature (&deg;C)</h1>',
		//	useHTML: true
		//},
		xAxis: [{
			lineWidth: 0,
			minorGridLineWidth: 0,
			lineColor: 'transparent',
			minorTickLength: 0,
			tickLength: 0,
			offset: 10, // for spacing between column and bottom
			categories: chartsData.currentAxisCategories,
			crosshair: true,
			labels: {
				enabled: false
			}
			//labels: {
			//	formatter: function () {
			//		return '<span style="font-size: 12px;">' + Highcharts.dateFormat(chartsDateFormatSmall, new Date(this.value)) + '</span>';
			//	}
			//}
		}],
		yAxis: [{
			gridLineWidth: 1,
			gridLineColor:'#3399cc',
			gridLineDashStyle: 'dot',
			minorGridLineWidth: 0,
			labels: {
				enabled: false,
				format: '{value} ' + Util.convert.uiTempStr(),
			},
			title: false
		}],
		credits: {
			enabled: false
		}
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
			renderTo: 'weatherChartQPFMonthly',
			spacingTop: 20,
			events: {
				redraw: function () {
					if (chartsWeeklyPeriod === 0) {
						highlightCurrentDayInChart(this);
					};
				}
			}
		},
		plotOptions:{
			series: {
				borderRadius:0
			},
			column: {
				minPointLength: 1,
				stacking: 'normal'
			}
		},
		tooltip: {
			hideDelay: 0,
			animation: false,
			formatter: function () {
				var s = '<span style="font-size: 14px;">';
				s += "Forecast: " + Util.convert.uiQuantity(this.point.y) + Util.convert.uiQuantityStr();

				if (this.point.secondPoint && this.point.secondPoint.y !== null) {
					s += "<br>Measured:" + Util.convert.uiQuantity(this.point.secondPoint.y) + Util.convert.uiQuantityStr();
				}

				s += '</span>';
				return s;
			}
		},
		series: [{
			data: chartsData.qpf.currentSeries,
			showInLegend: false,
			dataLabels: {
				enabled: false,
				format: '{y}mm',
				inside: true,
				verticalAlign: 'bottom'
			},
			name: 'Rain Amount',
			tooltip: {
				headerFormat: ''
			},
			type: 'column'
		},
		{
			data: chartsData.rain.currentSeries,
			showInLegend: false,
			type: 'column'
		}
		],
		title: null,
		//title: {
		//	text: '<h1>QPF (mm)</h1>',
		//	useHTML: true
		//},
		xAxis: [{
			lineWidth: 0,
			minorGridLineWidth: 0,
			lineColor: 'transparent',
			minorTickLength: 0,
			tickLength: 0,
			offset: 10, // for spacing between column and bottom
			categories: chartsData.currentAxisCategories,
			crosshair: true,
			labels: {
				enabled: false
			}
			//labels: {
			//	formatter: function () {
			//		return '<span style="font-size: 10px;">' + Highcharts.dateFormat(chartsDateFormatSmall, new Date(this.value)) + '</span>';
			//	}
			//}
		}],
		yAxis: [{
			gridLineWidth: 1,
			gridLineColor:'#3399cc',
			gridLineDashStyle: 'dot',
			minorGridLineWidth: 0,
			labels: {
				enabled: false,
				format: '{value} ' + Util.convert.uiQuantityStr(),
			},
			title: false
		}],
		credits: {
			enabled: false
		}
	};

	// Hide labels from monthly charts
	if (chartsCurrentLevel !== chartsLevel.weekly)  {
		qpfChartOptions.series[0].dataLabels.enabled = false;
	}

	// before generating the chart we must destroy the old one if it exists
	if (charts.qpf) {
		charts.qpf.destroy();
	}

	charts.qpf = new Highcharts.Chart(qpfChartOptions, generateChartCallback);
}

/**
 * Generates all programs charts
 */
function generateProgramsChart() {
	//Walk by uid
    var uids = Object.keys(chartsData.programsMap);
	for (var i = 0; i < uids.length; i++) {
		var uid = +uids[i];
		var index = chartsData.programsMap[uid];
		generateProgramChart(uid, index);
	}
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
			renderTo: 'programChartContainer-' + programUid,
			spacing: [10, 0, 0, 0],
			events: {
				redraw: function () {
					if (chartsWeeklyPeriod === 0) {
                    	highlightCurrentDayInChart(this);
                    }
				}
			}
		},
		tooltip: {
			hideDelay: 0,
			animation: false,
		},
		legend: {
			enabled: false
		},
		plotOptions:{
			series: {
				borderRadius:5
			},
			column: {
				minPointLength: 1
			}
		},
		credits: {
			enabled: false
		},
		series: [{
			data: chartsData.programs[programIndex].currentSeries,
			dataLabels: {
				enabled: true,
				//format: '{y}%',
				formatter: function () {
					var flag = chartsData.programsFlags[programIndex].getAtDate(this.x);
					var flagText = "";

					//Icon only for weekly bars
					if (flag > 0 && chartsCurrentLevel === chartsLevel.weekly) {
						flagText = '<span style="font-family: RainMachine; font-size: 20px; color: red;">/</span><br>';
					}
					return flagText + '<span style="font-size: 10px;">' + Math.round(this.y) + '%</span>';
				},
				inside: true,
				verticalAlign: 'bottom'
			},
			//name: 'Program ' + programName,
			name: null,
			tooltip: {
				headerFormat: '',
				pointFormatter: function () {
					var flag = chartsData.programsFlags[programIndex].getAtDate(this.category);
					var flagText = "";

					//Tooltip for both weekly and monthly
					if (flag > 0 && chartsCurrentLevel !== chartsLevel.yearly) {
						flagText = window.ui.settings.waterLogReason[flag] + '<br>';
					}
					return '<span style="font-size: 14px;">' + Highcharts.dateFormat(chartsDateFormat, new Date(this.category))
						+ ": " + this.y + '%<br>' + flagText + '</span>';
				}
			},
			type: 'column'
		}],

		title: null,
		xAxis: [{
			lineWidth: 0,
			minorGridLineWidth: 0,
			lineColor: 'transparent',
			minorTickLength: 0,
			tickLength: 0,
			offset: 10, // for spacing between column and bottom
			categories: chartsData.currentAxisCategories,
			crosshair: true,
			labels: {
				enabled: false
			}
		}],
		yAxis: [{
			min: 0,
            max: 100,
			gridLineWidth: 1,
			gridLineColor:'#3399cc',
			gridLineDashStyle: 'dot',
			minorGridLineWidth: 0,
			labels: {
				enabled: false,
				format: '{value}%'
			},
			title: {
				text: null
			}
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

	console.log("Showing chart for program: ", programName);
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

    /*
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
	*/
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

	var oldHighlighter = $(chart.container, '[rm-id="dayHighlight"]');
	if (oldHighlighter) {
		oldHighlighter.parentNode.removeChild(oldHighlighter);
	}

	var highlighter = null,
		highlighterXStart = parseInt(chartsCurrentDayIndex, 10) - 0.5,
		highlighterXEnd = parseInt(chartsCurrentDayIndex, 10) + 0.49,
		x1 = chart.xAxis[0].toPixels(highlighterXStart, false),
		x2 = chart.xAxis[0].toPixels(highlighterXEnd, false),
		y1 = chart.yAxis[0].toPixels(chart.yAxis[0].getExtremes().min, false) + chart.xAxis[0].offset,
		y2 = chart.yAxis[0].toPixels(chart.yAxis[0].getExtremes().max, false) - chart.spacing[0];

	// if we have all the points needed
	if(!isNaN(x1) && !isNaN(x2) && !isNaN(y1) && !isNaN(y2)) {
		// draw the highlighter
		highlighter = chart.renderer.rect(x1, y2, x2 - x1, y1 - y2);

		// add properties to the highlighter
		highlighter.attr({
			fill: '#f6f6f6',
			//opacity: 0.2,
			'rm-id': 'dayHighlight'
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
function loadCharts(shouldRefreshData, pastDays) {
	if (shouldRefreshData) {
		getChartData(pastDays);
	}
}

function bindChartsSyncToolTipEvents() {
	syncCharts = [];

	if (chartsCurrentLevel !== chartsLevel.weekly) {
		syncCharts.push(charts.temperature);
		syncCharts.push(charts.qpf);
		charts.temperature.container.addEventListener("mousemove", onChartTooltip.bind(null, charts.temperature));
		charts.qpf.container.addEventListener("mousemove", onChartTooltip.bind(null, charts.qpf));
	}

	for (i = 0; i < charts.programs.length; i++ ) {
		syncCharts.push(charts.programs[i]);
		charts.programs[i].container.addEventListener("mousemove", onChartTooltip.bind(null, charts.programs[i]));
	}
}

/**
 * Synchronises the tooltips of certain charts to scroll together
 * This is a eventhandler for mouse move over charts containers
 * @param e - event
 */
function onChartTooltip(focusedChart, e) {
	var chart, point, pointDate = null, i, savedFrom, eChart;

	// find and save the point position for the hovered chart
	eChart = focusedChart.pointer.normalize(e); // Find coordinates within the chart
	point = focusedChart.series[0].searchPoint(eChart, true); // Get the hovered point

	if (point) {
		pointDate = point.category;
		savedFrom = focusedChart.renderTo.id;
	}

	for (i = 0; i < syncCharts.length; i++) {
		chart = syncCharts[i];
		eChart = chart.pointer.normalize(e); // Find coordinates within the chart
		point = chart.series[0].searchPoint(eChart, true); // Get the hovered point

		//For 2 graphs on same chart (we don't treat the case with more than 2). This is done because shared tooltip
		//mode doesn't work properly when we call mouseOver/drawCrosshair on sync charts
		if (point) {
			//Only show corresponding date tooltips as searchPoint() return closest available one
			if (pointDate !== null) {
				if (point.category != pointDate) {
					chart.tooltip.hide(); //hide any previous selected tooltips;
					continue;
				}
			}

			var secondPoint = null;
			if (chart.series.length > 1){
				secondPoint = chart.series[1].searchPoint(eChart, true);
			}

			point.onMouseOver(); // Show the hover marker
			chart.xAxis[0].drawCrosshair(eChart, point); // Show the crosshair
			point.secondPoint = secondPoint;
			chart.tooltip.refresh(point); // Show the tooltip
		}
	}
}

