
function restrictionsSettingsUI()
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
	for (var i = 0; i < Util.weekDaysNames.length; i++)
	{
		var id = "#restrictions" + Util.weekDaysNames[i];
		var e = $(id);

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
		deleteElem.onclick = function() { API.deleteRestrictionsHourly(+this.uid); restrictionsSettingsUI(); };

		containerHourly.appendChild(template);
	}

	//Button actions
	buttonExtraSet.onclick = function() { restrictionsSetExtraWatering(); };
	buttonFreezeSet.onclick = function() { restrictionsSetFreezeProtect(); };
	buttonMonthsSet.onclick = function() { restrictionsSetMonths(); };
	buttonWeekDaysSet.onclick = function() { restrictionsSetWeekDays(); };
	buttonHourlySet.onclick = function() { restrictionsSetHourly(); };
}

function restrictionsSetExtraWatering()
{
	var extraWateringElem = $("#restrictionsExtraWatering");
    var data = { hotDaysExtraWatering: extraWateringElem.checked };

	console.log("Extra Watering %o", data);

	API.setRestrictionsGlobal(data);

}

function restrictionsSetFreezeProtect()
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

function restrictionsSetMonths()
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

function restrictionsSetWeekDays()
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

	var data = { noWaterInWeekDays: bitStringToWeekDays };
	console.log("WeekDays restrictions: %o", data);
	API.setRestrictionsGlobal(data);
}


function restrictionsSetHourly()
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

	var dayMinuteStart = parseInt(startHourElem.value) * 60 + parseInt(startMinuteElem.value);

	var data = {
		start: dayMinuteStart,
		duration: durationElem.value,
		weekDays: bitstrWeekDays
	}

	console.log("Hourly Restriction %o", data);
	API.setRestrictionsHourly(data);
	restrictionsSettingsUI(); //refresh
}