//Holds a 365 length array of a weather measurement
function ChartSeries(startDate)
{
	this.startDate = startDate;
	this.data = new Array(365);

	for (var i = 0; i < this.data.length; this.data[i] = 0, i++);
}

ChartSeries.prototype.insertAtDate = function(dateStr, value)
{
	var index = Util.getDateIndex(dateStr, this.startDate);

	if (index < 0 || index >= 365)
	{
		console.log("Invalid index %d for date %s", index, dateStr);
		return false;
	}

	this.data[index] = value;
	return true;
}

function ChartData()
{
    this.days = [];

    var end = new Date();
    end.setDate(end.getDate() + 7); //Forecast for 7 days in the future

	this.startDate = new Date(end);
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
	this.conditionMap = {};
	this.programs = [];

	console.log("Initialised ChartData from %s to %s",this.startDate.toDateString(), end.toDateString());
}

function normalizeWaterNeed(user, scheduled)
{
	var wn = 0;
	if (scheduled <= 0 && user > 0)
		wn = 100;
	else if (scheduled == 0 && user == 0)
		wn = 0;
	else
		wn = Math.round((user / scheduled) * 100);

	return wn;
}

// return the character from the TTF font containing weather icons
function conditionToGlyph(condition)
{
    return;
}

var chartData = new ChartData();

function generateCharts()
{
	Data.mixerData = API.getMixer();
	Data.dailyDetails = API.getDailyStats(null, true);

	var recent = Data.mixerData.mixerData[0].dailyValues;
	var daily = Data.dailyDetails.DailyStatsDetails;
	console.log("%o", daily);
	console.log("%o", Data.mixerData);

	for (var i = 0; i < recent.length; i++)
	{
		var day =  recent[i].day.split(' ')[0];
		chartData.qpf.insertAtDate(day, recent[i].qpf);
        chartData.maxt.insertAtDate(day, recent[i].maxTemp);
        chartData.mint.insertAtDate(day, recent[i].minTemp);
        chartData.condition.insertAtDate(day, recent[i].condition);
        chartData.conditionMap[day] = recent[i].condition;
	}

	//Total Water Need
	var maxWN = 100;
	for (var i = 0; i < daily.length; i++)
	{
		var totalDayUserWater = 0;
		var totalDayScheduledWater = 0;
		//programs for the day
		for (var p = 0; p < daily[i].programs.length; p++)
		{
			var cp = daily[i].programs[p];

			// Program index not in our struct ?
            if (p > chartData.programs.length - 1)
            	pIndex = chartData.programs.push(new ChartSeries(chartData.startDate)) - 1;
            else
            	pIndex = p;

			//zones for the programs
			for (var z = 0; z < cp.zones.length; z++)
			{
				totalDayUserWater += cp.zones[z].computedWateringTime;
				totalDayScheduledWater += cp.zones[z].scheduledWateringTime;
				//console.log("User: %d, Scheduled: %d", totalDayUserWater, totalDayScheduledWater);
			}

			programDayWN = normalizeWaterNeed(totalDayUserWater, totalDayScheduledWater);
			chartData.programs[pIndex].insertAtDate(daily[i].day, programDayWN);
		}

		var dailyWN = normalizeWaterNeed(totalDayUserWater, totalDayScheduledWater);
		if (dailyWN > maxWN)
			maxWN = dailyWN;

		chartData.waterNeed.insertAtDate(daily[i].day, dailyWN);
	}

	console.log("%o", chartData);

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
			categories: chartData.days,
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
			categories: chartData.days,
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
			max: maxWN,
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
			data: chartData.waterNeed.data
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
			categories: chartData.days,
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
			data: chartData.qpf.data
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
			categories: chartData.days,
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
			data: chartData.maxt.data
		},
		{
			name: 'Minimum Temperature',
			data: chartData.mint.data
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
					categories: chartData.days,
				}],

				yAxis: {
					title: {
						text: 'Water Need (%)'
					},
					min: 0,
					max: maxWN,
					plotLines: [{
						value: 0,
						width: 1,
						color: '#808080'
					}]
				},
				series: [{
					type: 'column',
					name: 'Program ' + c,
					data: chartData.programs[c].data
				}]
			});

		programsCharts.push(tmpChart);
	}

	makeVisible($("#dashboard"));
}
