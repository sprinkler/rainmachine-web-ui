function generateCharts()
{
	var mixerData = API.getMixer();
	var dailyDetails = API.getDailyStats(null, true);

	var recent = mixerData.mixerData[0].dailyValues;
	var daily = dailyDetails.DailyStatsDetails;
	console.log("%o", daily);
	console.log("%o", mixerData);
	//console.log("%o", mixerData.mixerData[0].dailyValues);

	var chartData = {
		qpf : [],
		maxt: [],
		mint: [],
		condition: [],
		series: []
	};

	var waterNeed = {
		series: [],
		total : [],
		programs: [],
	};

	for (var i = 0; i < recent.length; i++)
	{
		chartData.qpf.push(recent[i].qpf);
		chartData.maxt.push(recent[i].maxTemp);
		chartData.mint.push(recent[i].minTemp);
		chartData.condition.push(recent[i].condition);
		chartData.series.push(recent[i].day.split(' ')[0]);
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
			//zones for the programs
			for (var z = 0; z < cp.zones.length; z++)
			{
				totalDayUserWater += cp.zones[z].computedWateringTime;
				totalDayScheduledWater += cp.zones[z].scheduledWateringTime;
				//console.log("User: %d, Scheduled: %d", totalDayUserWater, totalDayScheduledWater);
			}
		}

		var wn = 0;
		if (totalDayScheduledWater <= 0 && totalDayUserWater > 0)
			wn = 100;
		else if (totalDayScheduledWater == 0 && totalDayUserWater == 0)
			wn = 0;
		else
			wn = Math.round((totalDayUserWater / totalDayScheduledWater) * 100);

		if (wn > maxWN)
			maxWN = wn;

		waterNeed.series.push(daily[i].day);
		waterNeed.total.push(wn);
	}

	console.log("%o", waterNeed);

	var waterNeedChart = new Highcharts.Chart({
		chart: {
			renderTo: 'chartWaterNeed',
			marginRight: 0
		},
		title: {
			text: '',
			x: -20 //center
		},
		xAxis: [{
			offset: -310,
			tickWidth: 0,
			lineWidth: 0,
			categories: waterNeed.series,
			labels: {
				x: -10,
				useHTML: true,
				formatter: function () {
					return '<img src="http://highcharts.com/demo/gfx/sun.png">&nbsp;';
				}
			}
		}, {
			linkedTo: 0,
			categories: waterNeed.series
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
			name: 'Water Need',
			data: waterNeed.total
		},
		{
				name: 'Precipitation',
				data: chartData.qpf
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
			offset: -310,
			tickWidth: 0,
			lineWidth: 0,
			categories: chartData.series,
			labels: {
				x: -10,
				useHTML: true,
				formatter: function () {
					return '<img src="http://highcharts.com/demo/gfx/sun.png">&nbsp;';
				}
			}
		}, {
			linkedTo: 0,
			categories: chartData.series
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
			data: chartData.qpf
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
			categories: chartData.series,
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
			data: chartData.maxt
		},
		{
			name: 'Minimum Temperature',
			data: chartData.mint
		}]
	});
}
