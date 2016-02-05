/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

window.ui = window.ui || {};

(function(_restrictions) {

	function showRestrictions()
	{
		var rh = API.getRestrictionsHourly();
		var rg = API.getRestrictionsGlobal();
		rh = rh.hourlyRestrictions;

		var extraWateringElem = $("#restrictionsExtraWatering");
		var freezeProtectElem = $("#restrictionsFreezeProtect");
		var freezeProtectTempElem = $("#restrictionsFreezeProtectTemp");

		var buttonExtraSet = $("#restrictionsHotDaysSet");
		var buttonFreezeSet = $("#restrictionFreezeSet");
		var buttonMonthsSet = $("#restrictionsMonthsSet");
		var buttonWeekDaysSet = $("#restrictionWeekDaysSet");
		var buttonHourlySet = $("#restrictionHourlyAdd");

		extraWateringElem.checked = rg.hotDaysExtraWatering;
		freezeProtectElem.checked = rg.freezeProtectEnabled;
		setSelectOption(freezeProtectTempElem, parseInt(rg.freezeProtectTemp), true);

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
		buttonExtraSet.onclick = onSetExtraWatering;
		buttonFreezeSet.onclick =  onSetFreezeProtect;
		buttonMonthsSet.onclick =  onSetMonths;
		buttonWeekDaysSet.onclick = onSetWeekDays;
		buttonHourlySet.onclick =  onSetHourly;
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
			if (active) statusElem.textContent = "Active";

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
			addCurrentRestriction("No current active restrictions");
		}
	}

	function onSetExtraWatering()
	{
		var extraWateringElem = $("#restrictionsExtraWatering");
		var data = { hotDaysExtraWatering: extraWateringElem.checked };

		console.log("Extra Watering %o", data);

		API.setRestrictionsGlobal(data);
	}

	function onSetFreezeProtect()
	{
		var freezeProtectElem = $("#restrictionsFreezeProtect");
		var freezeProtectTempElem = $("#restrictionsFreezeProtectTemp");

		var temp = parseInt(freezeProtectTempElem.options[freezeProtectTempElem.selectedIndex].value);

		var data = {
			freezeProtectEnabled: freezeProtectElem.checked,
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
		var startHourElem = $("#restrictionHourlyStartHour");
		var startMinuteElem = $("#restrictionHourlyStartMinute");
		var durationElem = $("#restrictionHourlyDuration");

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

		var hour = parseInt(startHourElem.value) || 6;
		var minute = parseInt(startMinuteElem.value) || 0;
		var dayMinuteStart = hour * 60 + minute;

		var data = {
			start: dayMinuteStart,
			duration: durationElem.value,
			weekDays: bitstrWeekDays
		}

		console.log("Hourly Restriction %o", data);
		API.setRestrictionsHourly(data);
		showRestrictions(); //refresh
	}

	//--------------------------------------------------------------------------------------------
	//
	//
	_restrictions.showRestrictions = showRestrictions;
	_restrictions.showCurrentRestrictions = showCurrentRestrictions;

} (window.ui.restrictions = window.ui.restrictions || {}));
