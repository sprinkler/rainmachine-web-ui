/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

var Util = (function(Util) {

Util.secondsToHuman = function(seconds)
{

	var r = {};
	r.days = Math.floor(seconds / 86400);
	r.hours = Math.floor((seconds % 86400) / 3600);
	r.minutes = Math.floor(((seconds % 86400) % 3600) / 60);
	r.seconds = ((seconds % 86400) % 3600) % 60;

	return r;
};

Util.secondsToText = function(seconds)
{
	var r = Util.secondsToHuman(seconds);
	var text = "";

	if (r.days > 0)
		text = r.days + " days ";

	if (r.hours > 0)
		text += r.hours + " hours ";

	if (r.minutes > 0)
		text += r.minutes + " minutes ";

	if (r.seconds > 0)
		text += r.seconds + " seconds ";

	if (text.length == 0)
		text = "No time";

	return text;
};


Util.weekDaysNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
Util.monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

Util.bitStringToWeekDays = function(bitstr)
{
	if (bitstr.length < 7 || bitstr.length > 7)
		return "Invalid WeekDays";

	var str = "";

	for (var i = 0; i < bitstr.length; i++)
		if (bitstr[i] == "1")
        	str += Util.weekDaysNames[i] + " ";

	return str;
}

//Returns date (YYYY-MM-DD) index in a 365 length array that starts with startDate
Util.getDateIndex = function(dateStr, startDate)
{
	var dateTokens = dateStr.split("-");
	var dayDate = new Date(dateTokens[0],dateTokens[1] - 1 , dateTokens[2]);
	var diff = dayDate - startDate;
	return ((diff/(60 * 60 * 24 * 1000) + 1) >> 0);
}


//Returns a date string ("YYYY-MM-DD") n days from fromDate if specified or from today if not
Util.getDateWithDaysDiff = function(days, fromDate)
{
	if (fromDate === undefined || fromDate == null)
		fromDate = new Date();

	fromDate.setDate(fromDate.getDate() - days);

	return fromDate.toISOString().split("T")[0];
}


Util.getTodayDateStr = function()
{
   var today = new Date();
   return today.toISOString().split("T")[0]
}

Util.isToday = function(dateStr)
{
	var today = Util.getTodayDateStr();

	return (dateStr === today);
}

Util.normalizeWaterNeed = function(user, real)
{
	var wn = 0;
	if (real <= 0 && user > 0)
		wn = 0;
	else if (real >= 0 && user == 0)
		wn = 100;
	else
		wn = Math.round((real / user) * 100);

	return wn;
}

Util.appDateToFields = function(appDateStr)
{
	var fields = {
		date: "",
		hour: "",
		minute: "",
		seconds: "",
	};

	if (appDateStr === undefined || !appDateStr || appDateStr.length < 19)
		return fields;

	var dt = appDateStr.split(" ");
	var t = dt[1].split(":");

	fields.date = dt[0];
	fields.hour = t[0];
	fields.minute = t[1];
	fields.seconds = t[2];

	return fields;
}


Util.saveMasterValve = function(enabled, before, after)
{
	var data = {};

	if (enabled != Data.provision.system.useMasterValve) {
		data.useMasterValve = enabled;
	}

	if (!isNaN(before)) {
		data.masterValveBefore = before;
	}

	if (!isNaN(after)) {
		data.masterValveAfter = after;
	}

	if (Object.keys(data).length == 0) {
		console.error("saveMasterValve: no changes needed");
		return false;
	}

	var r = API.setProvision(data, null);
	if (r === undefined || !r ||  r.statusCode != 0)
	{
		console.error("saveMasterValve: API call error or invalid values provided %o !", data);
		return false;
	}

	Data.provision.system.useMasterValve = enabled;
	Data.provision.system.masterValveBefore = before;
	Data.provision.system.masterValveAfter = after;

	return true;
}

Util.redirectHome = function(locationObj) {
	var re = "my.rainmachine.com";
	var host = locationObj.hostname;

	if (host.match(re)) {
		window.location.href = locationObj.origin
	} else {
		location.reload();
	}
}
Util.tagFromDataType = function(parent, data, label) {
	var div = addTag(parent, 'div');
	div.textContent = label;

	var input = addTag(div, 'input');
    input.type = "text"; //default type for null, object, number or string types

    if (typeof data == "boolean") {
    	input.type = "checkbox"
    	if (data) {
    		input.checked = true;
    	}
    } else {
    	input.value = data;
    	input.className = "typeText";
    }

    return div;
}

//filesObject is the object returned by files property of input type=file
Util.loadFileFromDisk =  function(filesObject, callback,  asBinary) {

	var status = {
		message: "",
		data: null,
		file: null,
		isError: false
	};

	if(!filesObject || filesObject.length == 0) {
		status.message = "No files selected";
		status.isError = true;
		callback(status);
		return;
	}

	var file = filesObject[0];
	var reader = new FileReader();

	reader.onprogress = function(e) {
		var progress =  Math.round((e.loaded/e.total) * 100);
		status.message = "Reading file " + progress + " %";
		setTimeout(callback(status), 0);
	};

	reader.onloadend = function() {
		if(!reader.result) {
			status.message = "Error reading file.";
			status.isError = true;
			setTimeout(callback(status), 0);
			return;
		}

		if (asBinary) {
			status.data = new Uint8Array(reader.result);
		} else {
			status.data = reader.result;
		}

		status.message = "Done reading file";
		status.file = file;
		callback(status);
	}

	if (asBinary) {
		reader.readAsArrayBuffer(file);
	} else {
		reader.readAsText(file);
	}
}

return Util; } ( Util || {}));
