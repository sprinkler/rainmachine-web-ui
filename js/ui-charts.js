//Object that holds a 365 length array of a single weather measurement
function ChartSeries(startDate)
{
	this.startDate = startDate;
	this.data = new Array(365);

	for (var i = 0; i < this.data.length; this.data[i] = null, i++);
}

ChartSeries.prototype.insertAtDate = function(dateStr, value)
{
	var index = Util.getDateIndex(dateStr, this.startDate);

	if (index < 0 || index >= 365)
	{
		console.log("Index %d for date %s outside needed range", index, dateStr);
		return false;
	}

	this.data[index] = value;
	return true;
}

//Object that holds entire weather/programs watering data
function ChartData()
{
    this.days = []; //array with dates ("YYYY-MM-DD")
    this.maxWN = 100; //maximum percentage of water need/used

    var end = new Date();
    end.setDate(end.getDate() + 7); //Forecast for 7 days in the future

	this.startDate = new Date(end);  //The start date in the past for this chart data
	this.startDate.setFullYear(end.getFullYear() - 1);

	//Fill a 356 array with dates
    var _start = new Date(this.startDate);
	while (_start < end)
	{
		var isoDate = _start.toISOString().split("T")[0];
		this.days.push(isoDate);
		_start.setDate(_start.getDate() + 1);
	}

	this.qpf = new ChartSeries(this.startDate);
    this.maxt= new ChartSeries(this.startDate);
    this.mint= new ChartSeries(this.startDate);
    this.waterNeed = new ChartSeries(this.startDate);
	this.condition = new ChartSeries(this.startDate);
	this.conditionMap = {}; //TODO day to icon map obsolete, refactor
	this.programs = []; // Array that holds programs water used arrays //TODO: this is constructed on below loop

	console.log("Initialised ChartData from %s to %s",this.startDate.toDateString(), end.toDateString());
}

var chartData = new ChartData();

function fillChartData(pastDays)
{
	Data.mixerData = API.getMixer(); //for weather measurements
	Data.dailyDetails = API.getDailyStats(null, true); //for water need in the future
	Data.waterLog = API.getWateringLog(false, true,  Util.getDateWithDaysDiff(pastDays), pastDays); //for used water

	//Get all available days in mixer TODO: Can be quite long (365 days)
	for (var i = 0; i < Data.mixerData.mixerData.length; i++)
	{
		var recent = Data.mixerData.mixerData[i].dailyValues;
		for (var j = 0; j < recent.length; j++)
    	{
    		var day =  recent[j].day.split(' ')[0];
    		chartData.qpf.insertAtDate(day, recent[j].qpf);
            chartData.maxt.insertAtDate(day, recent[j].maxTemp);
            chartData.mint.insertAtDate(day, recent[j].minTemp);
            chartData.condition.insertAtDate(day, recent[j].condition);
            chartData.conditionMap[day] = recent[j].condition;
    	}
	}

	//Total Water Need future days
	var daily = Data.dailyDetails.DailyStatsDetails;

	for (var i = 0; i < daily.length; i++)
	{
		var totalDayUserWater = 0;
		var totalDayScheduledWater = 0;
		//programs for the day
		for (var p = 0; p < daily[i].programs.length; p++)
		{
			var program = daily[i].programs[p];

			// Program index not in our struct ?
            if (p > chartData.programs.length - 1)
            	pIndex = chartData.programs.push(new ChartSeries(chartData.startDate)) - 1;
            else
            	pIndex = p;

			//zones for the programs
			for (var z = 0; z < program.zones.length; z++)
			{
				totalDayUserWater += program.zones[z].computedWateringTime;
				totalDayScheduledWater += program.zones[z].scheduledWateringTime;
				//console.log("User: %d, Scheduled: %d", totalDayUserWater, totalDayScheduledWater);
			}

			var programDayWN = Util.normalizeWaterNeed(totalDayUserWater, totalDayScheduledWater);
			chartData.programs[pIndex].insertAtDate(daily[i].day, programDayWN);
		}

		var dailyWN = Util.normalizeWaterNeed(totalDayUserWater, totalDayScheduledWater);
		if (dailyWN > chartData.maxWN)
			chartData.maxWN = dailyWN;

		chartData.waterNeed.insertAtDate(daily[i].day, dailyWN);
	}

	//Used "water need"
	for (var i = Data.waterLog.waterLog.days.length - 1; i >= 0 ; i--)
    {
    	var day =  Data.waterLog.waterLog.days[i];
    	var totalDayUserWater = 0;
        var totalDayScheduledWater = 0;

    	for (var p = 0; p < day.programs.length; p++)
    	{
    		var program = day.programs[p];

    		// Program index not in our struct ?
			if (p > chartData.programs.length - 1)
				pIndex = chartData.programs.push(new ChartSeries(chartData.startDate)) - 1;
			else
				pIndex = p;

    		for (var z = 0; z < program.zones.length; z++)
    		{
    			var zone = program.zones[z];
    			var zoneDurations = { machine: 0, user: 0, real: 0 };
    			for (var c = 0; c < zone.cycles.length; c++)
    			{
    				var cycle = zone.cycles[c];
    				totalDayScheduledWater += cycle.realDuration;
    				totalDayUserWater += cycle.userDuration;
    			}

    			var programDayWN = Util.normalizeWaterNeed(totalDayUserWater, totalDayScheduledWater);
                chartData.programs[pIndex].insertAtDate(day.date, programDayWN);
    		}
    	}

    	var dailyWN = Util.normalizeWaterNeed(totalDayUserWater, totalDayScheduledWater);
        if (dailyWN > chartData.maxWN)
        	chartData.maxWN = dailyWN;

		chartData.waterNeed.insertAtDate(day.date, dailyWN);
    }
}

function generateCharts(shouldRefreshData, pastDays, daysSlice)
{
	if (shouldRefreshData)
		fillChartData(pastDays);

	makeVisibleBlock($("#dashboard"));

	var waterNeedChart = new Highcharts.Chart({
		chart: {
			renderTo: 'chartWaterNeed',
			margin: [90, 70, 90, 70]
		},
		title: {
			text: '',
			x: -20 //center
		},
		xAxis: [{
			offset: -310,
			tickWidth: 0,
			lineWidth: 0,
			categories: chartData.days.slice(daysSlice),
			labels: {
				x: -10,
				useHTML: true,
				style: {"font-family": "RainMachine", "font-size": "42px"},
				formatter: function () {
					//Our condition mapping in TTF front
					var condition = chartData.conditionMap[this.value];
					if (condition === undefined)
						return String.fromCharCode(122);

					return String.fromCharCode(97 + condition);
				}
			},
		}, {
			linkedTo: 0,
			categories: chartData.days.slice(daysSlice),
		}],

		yAxis: {
			title: {
				text: 'Water Need (%)'
			},
			stackLabels: {
				style: {
                	"color": "black",
                	"font-size": "14px",
                },
				formatter: function () {
					return this.total + " %";
				},
                enabled: false
            },
			min: 0,
			max: chartData.maxWN,
			plotLines: [{
				value: 0,
				width: 1,
				color: '#808080'
			}]
		},
		plotOptions: {
			column: {
				stacking: 'normal',
				dataLabels: {
					formatter: function () {
						return this.total + " %";
					},
					enabled: true
				}
			}
		},

		series: [{
			type: 'column',
			name: 'Water Need',
			data: chartData.waterNeed.data.slice(daysSlice)
		}]
	});

	var qpfChart = new Highcharts.Chart({
		chart: {
			renderTo: 'chartQpf',
			marginRight: 0
		},
		title: {
			text: '',
			x: -20 //center
		},
		xAxis: [{
			categories: chartData.days.slice(daysSlice),
		}],

		yAxis: {
			title: {
				text: 'QPF (mm)'
			},
			plotLines: [{
				value: 0,
				width: 1,
				color: '#808080'
			}]
		},

		series: [{
			type: 'column',
			name: 'Rain Amount',
			data: chartData.qpf.data.slice(daysSlice)
		}]
	});

	var tempChart = new Highcharts.Chart({
		chart: {
			renderTo: 'chartTemperature',
			marginRight: 0
		},
		title: {
			text: '',
			x: -20 //center
		},
		xAxis: [{
			categories: chartData.days.slice(daysSlice),
		}],

		yAxis: {
			title: {
				text: 'Temperature  (C)'
			},
			plotLines: [{
				value: 0,
				width: 1,
				color: '#808080'
			}]
		},

		series: [{
			name: 'Maximum Temperature',
			data: chartData.maxt.data.slice(daysSlice)
		},
		{
			name: 'Minimum Temperature',
			data: chartData.mint.data.slice(daysSlice)
		}]
	});

	//Per Program chart
	var programsCharts = [];
	for (var c = 0; c < chartData.programs.length; c++)
	{
		var div = addTag($('#dashboard'), 'div');
		div.id = "programChart-" + c;
		div.className = "charts";

		var tmpChart = new Highcharts.Chart(
			{
				chart: {
					renderTo: div.id,
					marginRight: 0
				},
				title: {
					text: 'Program ' + c + " Water Need",
					x: -20 //center
				},
				xAxis: [{
					categories: chartData.days.slice(daysSlice),
				}],

				yAxis: {
					title: {
						text: 'Water Need (%)'
					},
					min: 0,
					max: chartData.maxWN,
					plotLines: [{
						value: 0,
						width: 1,
						color: '#808080'
					}]
				},
				series: [{
					type: 'column',
					name: 'Program ' + c,
					data: chartData.programs[c].data.slice(daysSlice)
				}]
			});

		programsCharts.push(tmpChart);
	}
}
