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
	r.seconds = Math.floor(seconds % 60);

	return r;
};

Util.secondsToText = function(seconds, rounded)
{
	var r = Util.secondsToHuman(seconds);
	var text = "";

	if (rounded === undefined) {
		rounded = false;
	}

	if (r.days > 0)
		text = r.days + " days ";

	if (r.hours > 0)
		text += r.hours + " hours ";

	if (rounded && text.length > 0) {
		return text;
	}

	if (r.minutes > 0)
		text += r.minutes + " min ";

	if (rounded && text.length > 0) {
		return text;
	}

	if (r.seconds > 0)
		text += r.seconds + " sec ";

	if (text.length == 0)
		text = "0 min";

	return text;
};

Util.secondsToMMSS = function(seconds)
{
	seconds = seconds >> 0;
	var m = (seconds / 60) >> 0;
	var s = seconds % 60;
	var text = "";

	if (m < 10)
		text += "0";
	text += m + ":";

	if (s < 10)
		text += "0";

	text += s;

	return text;
}

//Convert date in format "YYYY-MM-DD" to a date object that takes local timezone in account
Util.dateStringToLocalDate = function(dateStr) {

	var dateObj = null;

	if (dateStr !== null) {
		var d = new Date(dateStr);
		dateObj = new Date(d.getTime() + d.getTimezoneOffset() * 60 * 1000);
	}

	return dateObj;
};

Util.sinceDateAsText = function(dateString)
{
	console.log(dateString);
	var text;
	var today = new Date();
	var d = new Date(dateString.split(" ")[0]);
	var s = d.getTime() / 1000;
	var sToday = (today.getTime() / 1000) >> 0;

	if (isNaN(s)) {
		return "";
	}
	var diff =  sToday - s;
	return Util.secondsToText(diff, true);
}

Util.weekDaysNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
Util.monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
Util.monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

Util.isLeapYear = function(year)
{
	return ((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0);
};

Util.getYearDays = function(year)
{
	if (Util.isLeapYear(year))
		return 366;

	return 365;
};

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

Util.isFloat = function(value) {
	if(/^(\-|\+)?([0-9]+(\.[0-9]+)?|Infinity)$/.test(value)) {
		return true;
	}

	return false;
}

/**
 * Generates a div with a label and an input tag depending on data type
 * @param parent - parent element for the newly created div
 * @param data - data
 * @param label - label for the data
 * @returns the newly created div
 */
Util.generateTagFromDataType = function(parent, data, label) {
	var div = addTag(parent, 'div');
	div.className = "generatedTag";

	var isReadOnly = label.startsWith("_");

	if (! isReadOnly) {
		div.textContent = label;
		var input = addTag(div, 'input');
		input.id = "generated-" + label;
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
	} else {
		div.textContent = label.substr(1);
		var input = addTag(div, 'div');

		if (data instanceof Array) {
			for (var d in data) {
				input.innerHTML += data[d] + "<br>";
			}
		} else {
			input.textContent = data;
		}
	}

    return div;
}

/**
 * Generates a div with a label and an input tag depending on data type
 * @param parent - parent element for the newly created div
 * @param data - data
 * @param label - label for the data
 * @returns {array} - in form [label, value]
 */

Util.readGeneratedTagValue = function(label) {
	var id = "#generated-" + label;
	var tag = $(id);

	if (!tag) {
		console.error("No generated tag with id %s found", id);
		return [];
	}

	if (tag.type == "checkbox") {
		console.log("Checkbox input detected label: %s value: %s", label, tag.checked);
		return [label, tag.checked];
	} else {
		console.log("Generic input detected label: %s value: %s", label, tag.value);

		var n;

		// We don't want 123ab to be parsed as float 123
		if (Util.isFloat(tag.value)) {
			n = parseFloat(tag.value)
		} else {
			n = tag.value;
		}

		return [label, n];
	}
}

//Get geolocation coordinates start
Util.getGeoLocation = function(latitudeTag, longitudeTag) {

	if (!navigator.geolocation){
		console.error("Geolocation is not supported by your browser");
		return;
	}

	function success(position) {
		$(latitudeTag).value  = position.coords.latitude;
		$(longitudeTag).value = position.coords.longitude;
	};

	function error() {
		console.error("Geolocation: Unable to retrieve your location");
	};

	navigator.geolocation.getCurrentPosition(success, error);
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

Util.recurseObject = function(obj, keys) {
	var str = "";
	if (keys === undefined) {
		console.log("Undefined key");
		keys = {};
	}

	for (var key in obj) {
		if (obj.hasOwnProperty(key)) {
			child = obj[key];
			if (child !== null && typeof child === "object") {
                str += "\n" + Util.recurseObject(child, keys);
			} else {
				str += obj[key] + ", ";
				keys[key] = null;
			}
		}
	}

	return str;
}

Util.json2csv = function(array, title) {


}

Util.conditionAsIcon = function(condition) {
	var conditionValue;

	if (condition === undefined || condition === null) {
		conditionValue = String.fromCharCode(122);
	} else {
		conditionValue = String.fromCharCode(97 + condition);
	}

	return conditionValue;
}

Util.convert = {

	knotsToMS: function(knots) {
		return Math.round((+knots * 0.514444) * 10) / 10;
	},

	msToKnots: function(ms) {
		return Math.round((+ms / 0.51444) * 10) / 10;

	},

	fahrenheitToCelsius: function(temp) {
		return Math.round((+temp - 32) * 5.0/9.0 * 10) / 10;
	},

	celsiusToFahrenheit: function(temp) {
		return Math.round((+temp * (9 / 5) + 32) * 10) / 10;

	},

	inchesToMM: function(inches) {
		return Math.round((+inches * 25.4) * 100) / 100;
	},

	mmToInches: function(mm) {
		return Math.round((+mm / 25.4) * 100) / 100;
	},

	// functions to deal with UI user preferences knowing that data stored on Rainmachine is always metric
	uiTemp: function(temp) {
		if (!Data.localSettings.units) {
			return Util.convert.celsiusToFahrenheit(temp);
		} else {
			return temp;
		}
	},

	uiTempStr: function() {
		if (!Data.localSettings.units) {
			return  "\xB0F";
		} else {
			return "\xB0C";
		}
	},

	uiQuantity: function(q) {
		if (!Data.localSettings.units) {
			return Util.convert.mmToInches(q);
		} else {
			return q;
		}
	},
	uiQuantityStr: function() {
		if (!Data.localSettings.units) {
			return " in";
		} else {
			return " mm";
		}
	},
	withType: function(type, value) {
		switch (type) {
			case 'temperature':
			case 'maxTemperature':
			case 'minTemperature':
			case 'maxt':
			case 'mint':
			case 'dewPoint':
				return Util.convert.uiTemp(value);
			case 'et0':
			case 'qpf':
			case 'rain':
				return Util.convert.uiQuantity(value);
			case 'pressure':
			case 'rh':
			case 'maxRh':
			case 'minRh':
			case 'solarRad':
			case 'wind':
			default:
				return value;
		}
	},
	getUnits: function(type) {
		switch (type) {
			case 'temperature':
			case 'maxTemperature':
			case 'minTemperature':
			case 'maxt':
			case 'mint':
			case 'dewPoint':
				return Util.convert.uiTempStr();
			case 'et0':
			case 'qpf':
			case 'rain':
				return Util.convert.uiQuantityStr();
			case 'wind':
				return 'm/s';
			case 'rh':
			case 'maxRh':
			case 'minRh':
				return '%';
			case 'pressure':
				return 'kPa';
			case 'solarRad':
			default:
				return '';
		}
	}


};

Util.validateEmail = function(email){
	var re = /\S+@\S+/;
	return re.test(email);
};

return Util; } ( Util || {}));
