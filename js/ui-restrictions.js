/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

window.ui = window.ui || {};

(function(_restrictions) {

	var uiElems = null;
    

	function createRestrictionsElems() {
		uiElems = {};
		uiElems.extraWateringElem = $("#restrictionsExtraWatering");
		uiElems.maxWateringElem = $("#restrictionsMaxWatering");
		uiElems.maxWateringContainer = $("#greyoutMaxWatering");

		uiElems.freezeProtectElem = $("#restrictionsFreezeProtect");
		uiElems.freezeProtectTempElem = $("#restrictionsFreezeProtectTemp");
		uiElems.freezeProtectContainer = $("#greyoutFreezeProtect");

		uiElems.carryOverElem = $("#restrictionCarryOver");

		uiElems.startHourElem = $("#restrictionHourlyStartHour");
		uiElems.startMinuteElem = $("#restrictionHourlyStartMinute");
		uiElems.durationElem = $("#restrictionHourlyDuration");
		uiElems.rainSensorElem = $("#restrictionsRainSensor");
		uiElems.rainSensorTypeElem = $("#restrictionsRainSensorType");
		uiElems.rainSensorSnoozeElem = $("#restrictionsRainSensorSnooze");
		uiElems.rainSensorLastEvent = $("#restrictionsRainSensorLastEvent");

		uiElems.buttonExtraSet = $("#restrictionsHotDaysSet");
		uiElems.buttonFreezeSet = $("#restrictionFreezeSet");
		uiElems.buttonCarryOverSet = $("#restrictionCarryOverSet");
		uiElems.buttonMonthsSet = $("#restrictionsMonthsSet");
		uiElems.buttonWeekDaysSet = $("#restrictionWeekDaysSet");
		uiElems.buttonHourlySet = $("#restrictionHourlyAdd");
		uiElems.buttonRainSensorSet = $("#restrictionsRainSensorSet");

		//RainMachine PRO SPK5 and SPK3
		uiElems.flowSensorSet = $("#sensorsFlowSensorSet");
		uiElems.flowSensor = $("#sensorsFlowSensorEnable");
		uiElems.flowSensorClicks = $("#sensorsFlowSensorClicks");
		uiElems.flowSensorUnits = $("#sensorsFlowSensorUnits");
		uiElems.flowSensorStartIndex = $("#sensorsFlowSensorStartIndex");
		uiElems.flowSensorReset = $("#sensorsFlowSensorReset");
		uiElems.flowSensorResetConsumption = $("#sensorsFlowSensorResetConsumption");
		uiElems.flowSensorLastLeakDetected = $("#sensorsLastLeakDetected");
		uiElems.flowSensorTotalWatering = $("#sensorFlowTotalWatering");
		uiElems.flowSensorTotalLeak = $("#sensorFlowTotalLeak");
		uiElems.flowSensorTotalWateringUnit = $("#sensorFlowTotalWaterUnit");
		uiElems.flowSensorTotalLeakUnit = $("#sensorFlowTotalLeakUnit");
		uiElems.flowSensorCounterUnit = $("#flowSensorCounterUnit");
		uiElems.flowSensorDayWater = $("#sensorFlowDayWater");
		uiElems.flowSensorWeekWater = $("#sensorFlowWeekWater");
		uiElems.flowSensorMonthWater = $("#sensorFlowMonthWater");
		uiElems.flowSensorCounterContainer = $("#flowSensorCounterContainer");
		uiElems.flowSensorCounterWheel = $("#sensorFlowCounterWheel");
	}
    
	function showRestrictions()
	{
		if (uiElems === null)
			createRestrictionsElems();

		var rh = API.getRestrictionsHourly();
		var rg = API.getRestrictionsGlobal();
		rh = rh.hourlyRestrictions;

		uiElems.extraWateringElem.checked = rg.hotDaysExtraWatering;
		uiElems.freezeProtectElem.checked = rg.freezeProtectEnabled;
//		uiElems.rainSensorElem.checked = Data.provision.system.useRainSensor;
//		uiElems.rainSensorTypeElem.checked = Data.provision.system.rainSensorIsNormallyClosed;
//
//		var rainSnooze = +Data.provision.system.rainSensorSnoozeDuration;
//		setSelectOption(uiElems.rainSensorSnoozeElem, +rainSnooze, true);
//
//		var rainStart = Data.provision.system.rainSensorRainStart;
//		if ( rainStart !== null) {
//			uiElems.rainSensorLastEvent.textContent = (new Date(rainStart * 1000)).toDateString();
//		} else {
//			uiElems.rainSensorLastEvent.textContent = "No recent events";
//		}
//
		uiElems.maxWateringElem.value = Data.provision.system.maxWateringCoef * 100;

		setSelectOption(uiElems.freezeProtectTempElem, +rg.freezeProtectTemp, true);

		//Set the months restrictions
		for (var i = 0; i < Util.monthNames.length; i++)
		{
			var id = "#restrictions" + Util.monthNames[i];
			var e = $(id);

			if (rg.noWaterInMonths[i] == "1")
				e.checked = true;
			else
				e.checked = false;
		}

		//Set the WeekDays restrictions
		for (i = 0; i < Util.weekDaysNames.length; i++)
		{
			id = "#restrictions" + Util.weekDaysNames[i];
			e = $(id);

			if (rg.noWaterInWeekDays[i] == "1")
				e.checked = true;
			else
				e.checked = false;
		}

		//List the Hourly Restrictions
		var containerHourly = $("#restrictionsHourly");
		clearTag(containerHourly);

		for (var i = 0; i < rh.length; i++)
		{
			var r = rh[i];
			var template = loadTemplate('restriction-hourly-template');
			var nameElem = $(template, '[rm-id="restriction-hourly-name"]');
			var intervalElem = $(template, '[rm-id="restriction-hourly-interval"]');
			var weekDaysElem = $(template, '[rm-id="restriction-hourly-weekdays"]');
			var deleteElem = $(template, '[rm-id="restriction-hourly-delete"]');

			nameElem.textContent = "Restriction " + r.uid;
			intervalElem.textContent = r.interval;
			weekDaysElem.textContent = Util.bitStringToWeekDays(r.weekDays);

			deleteElem.uid = r.uid;

			uiFeedback.sync(deleteElem, function() {
				var r = API.deleteRestrictionsHourly(+this.uid);
				if (r) showRestrictions();
				return r;
			});

			containerHourly.appendChild(template);
		}

		//Button actions
		uiFeedback.sync(uiElems.buttonExtraSet, onSetExtraWatering);
		uiFeedback.sync(uiElems.buttonFreezeSet, onSetFreezeProtect);
		uiFeedback.sync(uiElems.buttonCarryOverSet, onSetCarryOver);
		uiFeedback.sync(uiElems.buttonMonthsSet, onSetMonths);
		uiFeedback.sync(uiElems.buttonWeekDaysSet, onSetWeekDays);
		uiFeedback.sync(uiElems.buttonHourlySet, onSetHourly);
//		uiFeedback.sync(uiElems.buttonRainSensorSet, onSetRainSensor);

		uiElems.extraWateringElem.onclick = showMaxWatering;
		uiElems.freezeProtectElem.onclick = showFreezeProtect;
//		uiElems.rainSensorElem.onclick = showRainSensorOptions;

		//Set current state
		showMaxWatering();
		showFreezeProtect();
//		showRainSensorOptions();
	}
    
//    -----------

	function showCurrentRestrictions() {
		APIAsync.getRestrictionsCurrently().then(function(o) { Data.restrictionsCurrent = o; updateCurrentRestrictions()})
	}

	
    
    function updateCurrentRestrictions() {
		var container = $("#currentRestrictionsList");
		var hasRestrictions = false;

		clearTag(container);

		function addCurrentRestriction(name, active) {
			var template = loadTemplate("current-restrictions-template");
			var nameElem = $(template, '[rm-id="current-restriction-name"]');
			var statusElem = $(template, '[rm-id="current-restriction-status"]');

			if (typeof active === "undefined") active = true;

			nameElem.textContent = name;
			if (active) {
				if (name == "Rain Sensor")
					statusElem.textContent = "Rain Detected";
				else
					statusElem.textContent = "Active";
			}

			container.appendChild(template);
			hasRestrictions = true;
		}

		if (Data.restrictionsCurrent.hourly) {
			addCurrentRestriction("Hourly");
		}

		if (Data.restrictionsCurrent.freeze) {
			addCurrentRestriction("Freeze Protect");
		}

		if (Data.restrictionsCurrent.month) {
			addCurrentRestriction("Monthly");
		}

		if (Data.restrictionsCurrent.weekDay) {
			addCurrentRestriction("Week Day");
		}

		if (Data.restrictionsCurrent.rainDelay) {
			addCurrentRestriction("Snooze");
		}

		if (Data.restrictionsCurrent.rainSensor) {
			addCurrentRestriction("Rain Sensor");
		}

		if (Data.restrictionsCurrent.lastLeakDetected) {
			addCurrentRestriction("Leak Detected");
		}

		if (!hasRestrictions) {
			addCurrentRestriction("No current active restrictions", false);
		}
	}

	//Sets both extra watering restriction and max watering coef
	function onSetExtraWatering()
	{
		var data = {
			hotDaysExtraWatering: uiElems.extraWateringElem.checked
		};

		console.log("Extra Watering %o", data);
		var r = API.setRestrictionsGlobal(data);

		if (r !== null && data.hotDaysExtraWatering) {
			var maxWaterValue = parseInt(uiElems.maxWateringElem.value) / 100;
			if (isNaN(maxWaterValue) || maxWaterValue < 1.0) maxWaterValue = 1.0;

			r = window.ui.system.changeSingleSystemProvisionValue("maxWateringCoef", maxWaterValue);
			window.ui.main.refreshGraphs = true;
		}

		return r;
	}

	function onSetFreezeProtect()
	{
		var temp = parseInt(uiElems.freezeProtectTempElem.options[uiElems.freezeProtectTempElem.selectedIndex].value);

		var data = {
			freezeProtectEnabled: uiElems.freezeProtectElem.checked,
			freezeProtectTemp: temp
		};
		console.log("FreezeProtect %o", data);

		var r = API.setRestrictionsGlobal(data);
		if (r) window.ui.main.refreshGraphs = true;

		return r;
	}

	function onSetCarryOver()
	{
		console.log("Carry Over in restrictions %o",  uiElems.carryOverElem.checked);
		return window.ui.system.changeSingleSystemProvisionValue("carryOverInRestriction", uiElems.carryOverElem.checked);
	}


	function onSetMonths()
	{
		//Read the months restrictions
		var bitstrMonths = "";
		for (var i = 0; i < Util.monthNames.length; i++)
		{
			var id = "#restrictions" + Util.monthNames[i];
			var e = $(id);
			if (e.checked)
				bitstrMonths += "1";
			else
				bitstrMonths += "0";
		}

		var data = { noWaterInMonths: bitstrMonths };
		console.log("Months restrictions: %o", data);

		var r = API.setRestrictionsGlobal(data);
		if (r) window.ui.main.refreshGraphs = true;

		return r;
	}

	function onSetWeekDays()
	{
		//Read the WeekDays restrictions
		var bitstrWeekDays = "";
		for (var i = 0; i < Util.weekDaysNames.length; i++)
		{
			var id = "#restrictions" + Util.weekDaysNames[i];
			var e = $(id);
			if (e.checked)
				bitstrWeekDays += "1";
			else
				bitstrWeekDays += "0";
		}

		var data = { noWaterInWeekDays: bitstrWeekDays };
		console.log("WeekDays restrictions: %o", data);
		var r = API.setRestrictionsGlobal(data);
		if (r) window.ui.main.refreshGraphs = true;

		return r;
	}

	function onSetHourly()
	{
		//Read the WeekDays restrictions
		var bitstrWeekDays = "";
		for (var i = 0; i < Util.weekDaysNames.length; i++)
		{
			var id = "#restrictionHourly" + Util.weekDaysNames[i];
			var e = $(id);
			if (e.checked)
				bitstrWeekDays += "1";
			else
				bitstrWeekDays += "0";
		}

		var hour = parseInt(uiElems.startHourElem.value) || 0;
		var minute = parseInt(uiElems.startMinuteElem.value) || 0;
		var dayMinuteStart = hour * 60 + minute;

		var data = {
			start: dayMinuteStart,
			duration: uiElems.durationElem.value,
			weekDays: bitstrWeekDays
		};

		console.log("Hourly Restriction %o", data);
		var r = API.setRestrictionsHourly(data);
		if (r) showRestrictions(); //refresh

		return r;
	}
    
//---------------------------------------------------------------------------------------------------------------------

	function showSensors() {
		showRainSensor();
		if (Data.provision.api.hwVer == 5 || Data.provision.api.hwVer === "simulator")
			showFlowSensor();
		}

    function showRainSensor() {
        if (uiElems === null)
			createRestrictionsElems();
        
        uiElems.rainSensorElem.checked = Data.provision.system.useRainSensor;
		uiElems.rainSensorTypeElem.checked = Data.provision.system.rainSensorIsNormallyClosed;

		var rainSnooze = +Data.provision.system.rainSensorSnoozeDuration;
		setSelectOption(uiElems.rainSensorSnoozeElem, +rainSnooze, true);

		var rainStart = Data.provision.system.rainSensorRainStart;
		if ( rainStart !== null) {
			uiElems.rainSensorLastEvent.textContent = Util.timestampToLocalDateString(rainStart);
		} else {
			uiElems.rainSensorLastEvent.textContent = "No recent events";
		}

        uiFeedback.sync(uiElems.buttonRainSensorSet, onSetRainSensor);
        uiElems.rainSensorElem.onclick = showRainSensorOptions;
        showRainSensorOptions();
    }

	function showFlowSensor() {
		uiElems.flowSensor.checked = Data.provision.system.useFlowSensor || false;
		uiElems.flowSensorClicks.value = Util.convert.uiFlowClicks(Data.provision.system.flowSensorClicksPerCubicMeter) || 0;

		if (uiElems.flowSensor.checked)
			makeVisibleBlock('#sensorsFlowInfo');
		else
			makeHidden('#sensorsFlowInfo');
		makeVisibleBlock('#flowsensor');

		var wateringVolume = Util.convert.uiFlowClicksToVolume(Data.provision.system.flowSensorWateringClicks) || 0;
		var leakVolume = Util.convert.uiFlowClicksToVolume(Data.provision.system.flowSensorLeakClicks) || 0;
		var startIndex = +Data.provision.system.flowSensorStartIndex || 0;

		uiElems.flowSensorTotalWatering.textContent = wateringVolume;
		uiElems.flowSensorTotalLeak.textContent = leakVolume;
		uiElems.flowSensorStartIndex.value = startIndex;

		uiElems.flowSensorUnits.textContent =
			uiElems.flowSensorTotalWateringUnit.textContent =
			uiElems.flowSensorCounterUnit.textContent =
			uiElems.flowSensorTotalLeakUnit.textContent = Util.convert.uiFlowClicksStr();

		var lastLeakDetected = Data.provision.system.lastLeakDetected || 0;

		if (lastLeakDetected)
			uiElems.flowSensorLastLeakDetected.textContent = Util.timestampToLocalDateString(lastLeakDetected);
		else
			uiElems.flowSensorLastLeakDetected.textContent = "No leaks detected";

		//Draw meter digits
		var totalVolume = wateringVolume + leakVolume + startIndex;
		var maxDigits = 8;

		var totalVolumeStr = Math.round(totalVolume).toString();
		var nrDigits = totalVolumeStr.length;

		clearTag(uiElems.flowSensorCounterContainer);
		for (var i = maxDigits; i > 0; i--) {
			var val = 0;
			if (i <= nrDigits) val = totalVolumeStr[nrDigits - i];

			var d = addTag(uiElems.flowSensorCounterContainer, 'div');
			d.className = "flowSensorDigit";
			d.textContent = val;
		}

		var daysFlowVolume = window.ui.settings.getDailyFlowVolume();
		var weekly = 0;
		var monthly = 0;
		for (var i = 0; i < daysFlowVolume.length; i++) {
			if (i < 8) weekly += daysFlowVolume[i];
			else if (i < 31) monthly += daysFlowVolume[i];
			else break;
		}

		uiElems.flowSensorDayWater.textContent = daysFlowVolume[0];
		uiElems.flowSensorWeekWater.textContent = weekly;
		uiElems.flowSensorMonthWater.textContent = monthly;

		uiFeedback.sync(uiElems.flowSensorSet, onSetFlowSensor);
		uiFeedback.sync(uiElems.flowSensorResetConsumption, onResetFlowSensorConsumption);
		uiFeedback.sync(uiElems.flowSensorReset, onResetFlowSensor);

		uiElems.flowSensor.onclick = showFlowSensorOptions;
		showFlowSensorOptions();
	}
    
	function onSetRainSensor() {

		var useRainSensor = uiElems.rainSensorElem.checked;
		var normallyClosed = uiElems.rainSensorTypeElem.checked;
		var snoozeDuration = +getSelectValue(uiElems.rainSensorSnoozeElem);

		var data = {
			useRainSensor: useRainSensor,
			rainSensorIsNormallyClosed: normallyClosed,
			rainSensorSnoozeDuration: snoozeDuration
		};

		var r = API.setProvision(data, null);

		if (r === undefined || !r || r.statusCode != 0)
		{
			console.log("Can't set Rain Sensor !");
			useRainSensor = Data.provision.system.useRainSensor;
			normallyClosed = Data.provision.system.rainSensorIsNormallyClosed;
			snoozeDuration = Data.provision.system.rainSensorSnoozeDuration;
			r = null;
		}

		Data.provision.system.useRainSensor = useRainSensor;
		Data.provision.system.rainSensorIsNormallyClosed = normallyClosed;
		Data.provision.system.rainSensorSnoozeDuration = snoozeDuration;

		// On SPK3 only Rain and Flow can't be used at the same time this is also taken care of in the API automatically
		// There is no need to set useFlowSensor with API since it's disabled automatically when Rain is enabled
		if (Data.provision.api.hwVer === 3) {
			Data.provision.system.useFlowSensor = !useRainSensor;
			showFlowSensor();
		}

		return r;
	}

	function onResetFlowSensorConsumption() {
		var data = {
			flowSensorWateringClicks: 0
		};

		var r = API.setProvision(data, null);

		if (r === undefined || !r || r.statusCode != 0) {
			console.log("Can't reset Flow Sensor Consumption !");
		}
		else {
			Data.provision.system.flowSensorWateringClicks = 0;
			showFlowSensor();
		}
		return r;
	}

	function onResetFlowSensor() {
		var data = {
			lastLeakDetected: 0,
			flowSensorLeakClicks:0
		};

		var r = API.setProvision(data, null);

		if (r === undefined || !r || r.statusCode != 0) {
			console.log("Can't reset Flow Sensor !");
		}
		else {
			Data.provision.system.lastLeakDetected = 0;
			showFlowSensor();
		}

		return r;
	}

	function onSetFlowSensor() {
		var flowSensorClicks = Util.convert.uiFlowClicksInMetric(uiElems.flowSensorClicks.value);
		var flowSensorStartIndex = uiElems.flowSensorStartIndex.value;
		var useFlowSensor = uiElems.flowSensor.checked;
		var data = {
			useFlowSensor:  useFlowSensor,
			flowSensorClicksPerCubicMeter: flowSensorClicks,
			flowSensorStartIndex: flowSensorStartIndex
		};

		var r = API.setProvision(data, null);

		if (r === undefined || !r || r.statusCode != 0)
		{
			console.log("Can't set Flow Sensor !");
			useFlowSensor = Data.provision.system.useFlowSensor;
			flowSensorClicks = Data.provision.system.flowSensorClicksPerCubicMeter;
			flowSensorStartIndex = Data.provision.system.flowSensorStartIndex;
			r = null;
		}

		Data.provision.system.useFlowSensor = useFlowSensor;
		Data.provision.system.flowSensorClicksPerCubicMeter = flowSensorClicks;
		Data.provision.system.flowSensorStartIndex = flowSensorStartIndex;

		showFlowSensor();

		// On SPK3 only Rain and Flow can't be used at the same time this is also taken care of in the API automatically
		// There is no need to set useFlowSensor with API since it's disabled automatically when Rain is enabled
		if (Data.provision.api.hwVer === 3) {
			Data.provision.system.useRainSensor = !useFlowSensor;
			showRainSensor();
		}

		return r;
	}


	function showMaxWatering() {
		toggleAttr(uiElems.maxWateringContainer, uiElems.extraWateringElem.checked);
	}

	function showFreezeProtect() {
		toggleAttr(uiElems.freezeProtectContainer, uiElems.freezeProtectElem.checked);
	}

	function showRainSensorOptions() {
		toggleAttr($('#greyoutRainSensorType'), uiElems.rainSensorElem.checked);
		toggleAttr($('#greyoutRainSensorSnooze'), uiElems.rainSensorElem.checked);
	}

	function showFlowSensorOptions(status) {
		toggleAttr($('#greyoutFlowSensorType'), uiElems.flowSensor.checked);
	}


	//--------------------------------------------------------------------------------------------
	//
	//
	_restrictions.showRestrictions = showRestrictions;
	_restrictions.showCurrentRestrictions = showCurrentRestrictions;
    _restrictions.showSensors = showSensors;

} (window.ui.restrictions = window.ui.restrictions || {}));
