/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

var Util = (function(Util) {


Util.parseDeviceDateTime = function(json) {
	try {
		deviceDate = json.appDate; //Format: YYYY-MM-DD HH:MM:SS
		//Data.today = new Date(json.appDate.replace(/-/g, "/"));
		Data.today = Util.deviceDateStrToDate(deviceDate);
		console.log("DEVICE DATE: %o", Data.today);
	} catch(e) {
		console.log("DEVICE DATE: Invalid !")
	}
};

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
		text += r.hours + "hrs ";

	if (rounded && text.length > 0) {
		return text;
	}

	if (r.minutes > 0)
		text += r.minutes + "min ";

	if (rounded && text.length > 0) {
		return text;
	}

	if (r.seconds > 0)
		text += r.seconds + "sec ";

	if (text.length == 0)
		text = "0min";

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
};

Util.sinceDateAsText = function(dateString)
{
	var text;
	var today = Util.today();
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
Util.weekDaysNamesShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
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
	var dayDate =  Util.deviceDateStrToDate(dateStr);
	var diff = dayDate - startDate;
	return ((diff/(60 * 60 * 24 * 1000) + 1) >> 0);
}


//Returns a date string ("YYYY-MM-DD") n days from fromDate if specified or from today if not
Util.getDateWithDaysDiff = function(days, fromDate)
{
	if (fromDate === undefined || fromDate == null)
		fromDate = Util.today();


	fromDate.setDate(fromDate.getDate() - days);

	return Util.getDateStr(fromDate);
};


Util.today = function() {

	if (Data.today !== null) {
		return new Date(Data.today)
	}

	return new Date(null);
};

//Returns today date in YYYY-MM-DD in current TZ offset (toISOString sets 0 UTC offset)
Util.getDateStr = function(d)
{
	var year = 1900 + +d.getYear();
	var month = +d.getMonth() + 1;
	var day = d.getDate();

	if (month < 10) month = "0" + month;
	if (day < 10) day = "0" + day;

	return year + "-" + month + "-" + day
};

Util.getTodayDateStr = function()
{
	return Util.getDateStr(Util.today());
};

//Adds timezone offset to a Date object
Util.dateWithTimezone = function(d) {

	if (d === undefined) {
		d = new Date();
	}

	return new Date(d.getTime() + d.getTimezoneOffset() * 60 * 1000);
};

//Convert date in format "YYYY-MM-DD" to a date object that takes local timezone in account
Util.dateStringToLocalDate = function(dateStr) {
	if (dateStr !== null) {
		return new Date(dateStr);
	}

	return null;
};

//Converts date informat "YYYY-MM-DD HH:MM:SS" to a javascript date
Util.deviceDateStrToDate = function(datetimeStr) {
	var datetimeArr = datetimeStr.split(" ");

	var dateArr = datetimeArr[0].split("-");
	var day = dateArr[2];
	var month = dateArr[1];
	var year = dateArr[0];

	var h = 0;
	var m = 0;
	var s = 0;

	if (datetimeArr.length > 1) {
		var timeArr = datetimeArr[1].split(":");
		h = timeArr[0];
		m = timeArr[1];
		s = timeArr[2];
	}

	var d = new Date();
	d.setDate(day);
	d.setMonth(month-1);
	d.setFullYear(year);

	d.setHours(h);
	d.setMinutes(m);
	d.setSeconds(s);

	return d;
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
	var divElem = addTag(parent, 'div');
	var labelElem = addTag(divElem, 'label');
	var inputElem;

	var id = "generated-" + label;
	var isReadOnly = label.startsWith("_");
	var dataFromJSON = null;

	divElem.className = "generatedTag";

	//Check if we got a string with json data
	try {
		dataFromJSON = JSON.parse(data);
	} catch(e) {}

	if (!isReadOnly) {
		labelElem.htmlFor = id;
		labelElem.textContent = label;

		if (data === null || (typeof data == "string" && dataFromJSON === null) || typeof data == "number" || typeof data == "boolean") {
			inputElem = addTag(divElem, 'input');
			inputElem.id = id;
			inputElem.type = "text"; //default type for null, object, number or string types
			if (typeof data == "boolean") {
				inputElem.type = "checkbox";
				if (data) {
					inputElem.checked = true;
				}
			} else {
				inputElem.value = data;
				inputElem.className = "typeText";
			}
		} else {
			inputElem = addTag(divElem, 'textarea');
			if (typeof data == "object") {
				inputElem.value = JSON.stringify(data, null, 4);
				console.log("%s: JS Object detected", label);
			} else if (dataFromJSON !== null) { // Check if we received JSON data as string
				inputElem.value = JSON.stringify(dataFromJSON, null, 4);
				//For now activate only for rules  field from Weather Rules parser
				if (label === "rules") {
					inputElem.id = id;
				}
				console.log("%s: JSON data as string detected", label);
			}
		}
	} else {
		divElem.textContent = label.substr(1);
		var inputElem = addTag(divElem, 'div');

		if (data instanceof Array) {
			for (var d in data) {
				inputElem.innerHTML += data[d] + "<br>";
			}
		} else if (data !== null && typeof data == "object") {
			inputElem.textContent = JSON.stringify(data, null, 4);
		} else {
			inputElem.textContent = data;
		}
	}

    return divElem;
};

/**
 * Reads the value of a generated tag with Util.generateTagFromDataType
 * @param label - the label string of the tag which is used to construct the tag id
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
	rateToCubicMeters: function(rate, area, seconds) { // converts from mm/h rate on a m^2 are for n seconds to m^3
		return Math.round((((rate * area)  * +seconds/3600) / 1000.0) * 1000) / 1000;
	},
	rateToGPM: function(rate, area, seconds) {
		inchRate = Util.convert.mmToInches(rate);
		feetArea = Util.convert.areaMetersToFeet(area);
		return Math.round(((((inchRate * feetArea) / 96.25) * +seconds/60) * 1000) / 1000);  // 96.25 Converts GPM to inches per hour
	},
	areaMetersToFeet: function(m) {
		return Math.round((m * 10.7639) * 100) / 100;
	},
	areaFeetToMeters: function(f) {
		return Math.round((f * 0.092903) * 100) / 100;
	},
	volumeMetersHourToGPM: function(v) {
		return Math.round((v * 4.40287) * 100) / 100;
	},
	volumeGPMToMetersHour: function(v) {
		return Math.round((v * 0.227125) * 100) /100;
	},
	volumeMetersToGal: function(v) {
		return Math.round((v * 264.172) * 10) /10;
	},
	// functions to deal with UI user preferences knowing that data stored on Rainmachine is always metric
	uiTemp: function(temp) {
		if (!Data.localSettings.units) {
			return Util.convert.celsiusToFahrenheit(temp);
		} else {
			return  Math.round(temp * 100) /100;
		}
	},

	uiTempStr: function() {
		if (!Data.localSettings.units) {
			return  "\xB0F";
		} else {
			return "\xB0C";
		}
	},

	uiQuantity: function(v) {
		if (!Data.localSettings.units) {
			return Util.convert.mmToInches(v);
		} else {
			return  Math.round(v * 100) /100;
		}
	},
	uiQuantityStr: function() {
		if (!Data.localSettings.units) {
			return " inch";
		} else {
			return " mm";
		}
	},
	uiQuantityToMM: function(v) {
		if (!Data.localSettings.units) {
			return Util.convert.inchesToMM(v);
		} else {
			return  Math.round(v * 100) /100;
		}
	},
	uiFlowVolume: function(flow) {
		var f;
		if (!Data.localSettings.units) {
			f = Util.convert.volumeMetersHourToGPM(flow);
		} else {
			f = Math.round(flow * 100) /100;
		}

		if (f < 0) f = null;

		return f;
	},
	uiFlowVolumeToMeters: function(flow) {
		if (!Data.localSettings.units) {
			return Util.convert.volumeGPMToMetersHour(flow);
		} else {
			return Math.round(flow * 100) /100
		}
	},
	uiFlowCompute: function(rate, area, seconds) {
		if (!Data.localSettings.units) {
			return Util.convert.rateToGPM(rate, area, seconds);
		} else {
			return Util.convert.rateToCubicMeters(rate, area, seconds);
		}
	},
	uiFlowVolumeStr: function() {
		if (!Data.localSettings.units) {
			return " gpm";
		} else {
			return " m\xB3/h";
		}
	},
	uiWaterVolume: function(v) {
		if (!Data.localSettings.units) {
			return Util.convert.volumeMetersToGal(v);
		} else {
			return Math.round(v * 100)/ 100;
		}
	},
	uiWaterVolumeStr: function() {
		if (!Data.localSettings.units) {
			return " gal";
		} else {
			return " m\xB3";
		}
	},
	uiWaterVolumeStrLong: function() {
		if (!Data.localSettings.units) {
			return " gallons";
		} else {
			return " m\xB3";
		}
	},
	uiArea: function(area) {
		var a;
		if (!Data.localSettings.units) {
			a = Util.convert.areaMetersToFeet(area);
		} else {
			a = area;
		}
		if (a < 0) a = null;
		return a;
	},
	uiAreaStr: function() {
		if (!Data.localSettings.units) {
			return " ft\xB2";
		} else {
			return " m\xB2";
		}
	},
	uiAreaToMeters: function(a) {
		if (!Data.localSettings.units) {
			return Util.convert.areaFeetToMeters(a);
		} else {
			return +a;
		}
	},
	uiRate: function(v) { // Flow rate mm/h
		return Util.convert.uiQuantity(v);
	},
	uiRateStr:function() {
		if (!Data.localSettings.units) {
			return " in/h";
		} else {
			return " mm/h";
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

// Show a number in binary representation
Util.showBin = function(n) {
	var octets = 1;

	if (n != 0) {
		octets =  Math.ceil((Math.floor(Math.log2(n) + 1)) / 8); // Multiple of 8 bits
	}

	var padding = new Array(octets * 8).join(0);
	var s = n.toString(2);
	return padding.substr(s.length) + s;
};

return Util; } ( Util || {}));
