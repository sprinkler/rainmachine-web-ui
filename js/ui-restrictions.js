/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

window.ui = window.ui || {};

(function(_restrictions) {

	var uiElems = {};

	function showRestrictions()
	{
		//TODO: Move this out
		uiElems.extraWateringElem = $("#restrictionsExtraWatering");
		uiElems.maxWateringElem = $("#restrictionsMaxWatering");
		uiElems.freezeProtectElem = $("#restrictionsFreezeProtect");
		uiElems.freezeProtectTempElem = $("#restrictionsFreezeProtectTemp");
		uiElems.minWateringElem = $("#restrictionsMinWatering");
		uiElems.startHourElem = $("#restrictionHourlyStartHour");
		uiElems.startMinuteElem = $("#restrictionHourlyStartMinute");
		uiElems.durationElem = $("#restrictionHourlyDuration");
		uiElems.rainSensorElem = $("#restrictionsRainSensor");
		uiElems.rainSensorTypeElem = $("#restrictionsRainSensorType");

		uiElems.buttonExtraSet = $("#restrictionsHotDaysSet");
		uiElems.buttonFreezeSet = $("#restrictionFreezeSet");
		uiElems.buttonMonthsSet = $("#restrictionsMonthsSet");
		uiElems.buttonWeekDaysSet = $("#restrictionWeekDaysSet");
		uiElems.buttonHourlySet = $("#restrictionHourlyAdd");
		uiElems.buttonRainSensorSet = $("#restrictionsRainSensorSet");
		uiElems.buttonMinWateringSet = $("#restrictionsMinWateringSet");

		var rh = API.getRestrictionsHourly();
		var rg = API.getRestrictionsGlobal();
		rh = rh.hourlyRestrictions;

		uiElems.extraWateringElem.checked = rg.hotDaysExtraWatering;
		uiElems.freezeProtectElem.checked = rg.freezeProtectEnabled;
		uiElems.maxWateringElem.value = Data.provision.system.maxWateringCoef * 100;
		uiElems.minWateringElem.value = Data.provision.system.minWateringDurationThreshold;
		uiElems.rainSensorElem.checked = Data.provision.system.useRainSensor;
		uiElems.rainSensorTypeElem.checked = Data.provision.system.rainSensorIsNormallyClosed;

		setSelectOption(uiElems.freezeProtectTempElem, parseInt(rg.freezeProtectTemp), true);

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
			deleteElem.onclick = function() { API.deleteRestrictionsHourly(+this.uid); showRestrictions(); };

			containerHourly.appendChild(template);
		}

		//Button actions
		uiElems.buttonExtraSet.onclick = onSetExtraWatering;
		uiElems.buttonFreezeSet.onclick = onSetFreezeProtect;
		uiElems.buttonMonthsSet.onclick = onSetMonths;
		uiElems.buttonWeekDaysSet.onclick = onSetWeekDays;
		uiElems.buttonHourlySet.onclick = onSetHourly;
		uiElems.buttonMinWateringSet.onclick = onSetMinWatering;
		uiElems.buttonRainSensorSet.onclick = onSetRainSensor;
	}

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

		if (!hasRestrictions) {
			addCurrentRestriction("No current active restrictions", false);
		}
	}

	//Sets both extra watering restriction and max watering coef
	function onSetExtraWatering()
	{
		var data = { hotDaysExtraWatering: uiElems.extraWateringElem.checked };
		console.log("Extra Watering %o", data);
		API.setRestrictionsGlobal(data);

		var maxWaterValue = parseInt(uiElems.maxWateringElem.value) / 100;
		if (isNaN(maxWaterValue) || maxWaterValue < 1.0) maxWaterValue = 1.0;

		window.ui.system.changeSingleSystemProvisionValue("maxWateringCoef", maxWaterValue);
	}

	function onSetFreezeProtect()
	{
		var temp = parseInt(uiElems.freezeProtectTempElem.options[uiElems.freezeProtectTempElem.selectedIndex].value);

		var data = {
			freezeProtectEnabled: uiElems.freezeProtectElem.checked,
			freezeProtectTemp: temp
		};
		console.log("FreezeProtect %o", data);
		API.setRestrictionsGlobal(data);
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
		API.setRestrictionsGlobal(data);
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
		API.setRestrictionsGlobal(data);
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

		var hour = parseInt(uiElems.startHourElem.value) || 6;
		var minute = parseInt(uiElems.startMinuteElem.value) || 0;
		var dayMinuteStart = hour * 60 + minute;

		var data = {
			start: dayMinuteStart,
			duration: uiElems.durationElem.value,
			weekDays: bitstrWeekDays
		};

		console.log("Hourly Restriction %o", data);
		API.setRestrictionsHourly(data);
		showRestrictions(); //refresh
	}

	function onSetMinWatering() {
		window.ui.system.changeSingleSystemProvisionValue("minWateringDurationThreshold", uiElems.minWateringElem.value);
	}

	function onSetRainSensor() {
		window.ui.system.changeSingleSystemProvisionValue("useRainSensor", uiElems.rainSensorElem.checked);
		window.ui.system.changeSingleSystemProvisionValue("rainSensorIsNormallyClosed", uiElems.rainSensorTypeElem.checked);
	}

	//--------------------------------------------------------------------------------------------
	//
	//
	_restrictions.showRestrictions = showRestrictions;
	_restrictions.showCurrentRestrictions = showCurrentRestrictions;

} (window.ui.restrictions = window.ui.restrictions || {}));
