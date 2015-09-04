/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

var API  = (function(API) {

//var host = "private-bd9e-rainmachine.apiary-mock.com";
//var host = "127.0.0.1";
//var host = "192.168.12.174";
var host = window.location.hostname;
//var host = "5.2.191.144";

//var port = "443";
//var port = "18080";
//var port = "8080";
var port = parseInt(window.location.port);
//var port = "8888";

var protocol = location.protocol;

var apiUrl = protocol + "//" + host + ( port > 0 ? ":" + port.toString() : "") + "/api/4";

var token = null;

function rest(type, apiCall, data, callback, async)
{
	var url;

	if(async == undefined || !async){
		async = false;
	}

	if (token !== null)
		url = apiUrl + apiCall + "?access_token=" + token;
	else
		url = apiUrl + apiCall;

	console.log("Doing API call: %s", url);
	try {
		r = new XMLHttpRequest();

		if(async == true ||(callback !== undefined && typeof callback === 'function')) {
			r.onreadystatechange = function () {
				if (r.readyState == 4 && r.status == 200) {
					callback(JSON.parse(r.responseText));
				}
			};
		}

		r.open(type, url, async);

		if (type === "POST")
		{
			r.setRequestHeader("Content-type","application/json");
			r.send(JSON.stringify(data));
		}
		else
		{
			r.send();
		}

		if(async == false) {
			return JSON.parse(r.responseText);
		}

	} catch(e) { }

	return null;
}

function post(apiCall, data, callback, async) { return rest("POST", apiCall, data, callback, async); }
function get(apiCall, callback, async) { return rest("GET", apiCall, null, callback, async); }

/* ------------------------------------------ API ROOT PATHS ----------------------------------------------*/
API.URL = Object.freeze({
	auth			: "/auth",
	provision		: "/provision",
	dailystats		: "/dailystats",
	restrictions	: "/restrictions",
	program			: "/program",
	zone			: "/zone",
	watering		: "/watering",
	parser			: "/parser",
	mixer			: "/mixer",
	diag			: "/diag",
	machine			: "/machine",
	dev				: "/dev"
});

/* ------------------------------------------ API ERROR CODES ----------------------------------------------*/
API.ERROR = {
    Success                 : '{ "statusCode":  0,  "message": "OK"                         }',
    ExceptionOccurred       : '{ "statusCode":  1,  "message": "Exception occurred !"       }',
    NotAuthenticated        : '{ "statusCode":  2,  "message": "Not Authenticated !"        }',
    InvalidRequest          : '{ "statusCode":  3,  "message": "Invalid request !"          }',
    NotImplemented          : '{ "statusCode":  4,  "message": "Not implemented yet !"      }',
    NotFound                : '{ "statusCode":  5,  "message": "Not found !"                }',
    DBError                 : '{ "statusCode":  6,  "message": "DB Error !"                 }',
    ProvisionFailed         : '{ "statusCode":  7,  "message": "Cannot provision unit"      }',
    PasswordNotChanged      : '{ "statusCode":  8,  "message": "Cannot change password"     }',
    ProgramValidationFailed : '{ "statusCode":  9,  "message": "Invalid program constraints"}'
};


/* ------------------------------------------ VER API CALLS -----------------------------------------------*/

API.getApiVer = function()
{
	var url = "/apiVer";
	return get(url, null);
}

/* ------------------------------------------ AUTH API CALLS ----------------------------------------------*/

API.auth = function(password, remember)
{
	var url = API.URL.auth + "/login";
	
	var data = 
	{
		pwd: password,
		remember: +!!remember
	};
	
	var reply = post(url, data, null);
	console.log(JSON.stringify(reply, null, "  "));
	token = reply.access_token;
	return token;
};

API.authChange = function(oldPass, newPass)
{
    var url = API.URL.auth + "/change";

    var data =
    {
    	newPass: newPass,
    	oldPass: oldPass
    }

    return post(url, data, null);
}

API.setAccessToken = function(accessToken) {
	token = accessToken;
}

/* ------------------------------------------ PROVISION API CALLS -----------------------------------------*/

API.getProvision = function()
{
	return get(API.URL.provision, null);
}

API.getProvisionWifi = function()
{
	var url = API.URL.provision + "/wifi";
	return get(url, null);
}

API.getProvisionCloud = function()
{
	var url = API.URL.provision + "/cloud";
	return get(url, null);
}

API.setProvision = function(systemObj, locationObj)
{
	var url = API.URL.provision;
	var data = {};

	if (systemObj !== undefined && systemObj !== null)
		data.system = systemObj;

	if (locationObj !== undefined && locationObj !== null)
    	data.location = locationObj;

    if (Object.keys(data).length == 0)
    	return API.ERROR.InvalidRequest;

    return post(url, data, null);
}

API.setProvisionName = function(name)
{
	var url = API.URL.provision +  "/name";
	var data = { netName: name };

	return post(url, data,  null);
}

API.setProvisionCloud = function(cloudObj)
{
	var url = API.URL.provision +  "/cloud";
	var data = cloudObj;

	return(url, data, null);
}

API.setProvisionCloudEnable = function(isEnabled)
{
	var url = API.URL.provision +  "/cloud/enable";
	var data = { enable: isEnabled };

	return post(url, data, null);
}

API.setProvisionCloudReset = function()
{
	var url = API.URL.provision +  "/cloud/reset";
	var data = { };

	return post(url, data, null);
}

API.setProvisionReset = function(withRestart)
{
	var url = API.URL.provision;
	var data = { restart: withRestart };

	return post(url, data, null);
}

/* ------------------------------------------ DAILY STATS API CALLS ---------------------------------------*/

API.getDailyStats = function(dayDate, withDetails, callback)
{
	var url = API.URL.dailystats;

	if (dayDate !== undefined && dayDate !== null) // current API doesn't support daily stats details with specified day
	{
		url += "/" + dayDate;
		return get(url, null);
	}

	if (withDetails !== undefined && withDetails)
		url += "/details";

	if (callback === undefined) {
		callback = null;
	}

	return get(url, callback, false);
}

/* ----------------------------------------- RESTRICTIONS API CALLS ---------------------------------------*/

API.getRestrictionsRainDelay = function()
{
	var url = API.URL.restrictions + "/raindelay";
	return get(url, null);
}

API.getRestrictionsGlobal = function()
{
	var url = API.URL.restrictions + "/global";
	return get(url, null);
}

API.getRestrictionsHourly = function()
{
	var url = API.URL.restrictions + "/hourly";
	return get(url, null);
}

API.setRestrictionsRainDelay = function(days)
{
	var url = API.URL.restrictions + "/raindelay";
	var data = { rainDelay: days };

	return post(url, data, null);
}

API.setRestrictionsGlobal = function(globalRestrictionObj)
{
	var url = API.URL.restrictions + "/global";
	var data = globalRestrictionObj;

	return post(url, data, null);
}

API.setRestrictionsHourly = function(hourlyRestrictionObj)
{
	var url = API.URL.restrictions + "/hourly";
	var data = hourlyRestrictionObj;

	return post(url, data, null);
}

API.deleteRestrictionsHourly = function(id)
{
    var url = API.URL.restrictions + "/hourly/" + id + "/delete";
    var data = {};

    return post(url, data, null);
}

/* ----------------------------------------- PROGRAMS API CALLS -------------------------------------------*/
API.getPrograms = function(id)
{
	var url = API.URL.program;

	if (id !== undefined)
		url += "/" + id;

	return get(url, null);
}

API.getProgramsNextRun = function()
{
	var url = API.URL.program + "/nextrun";

	return get(url, null);
}

API.setProgram = function(id, programProperties)
{
	var url = API.URL.program + "/" + id;
	var data = programProperties;

	return post(url, data, null);
}

API.newProgram = function(programProperties)
{
	var url = API.URL.program;
	var data = programProperties;

	return post(url, data, null);
}

API.deleteProgram = function(id)
{
	var url = API.URL.program + "/" + id + "/delete";
    var data = { pid: id };

    return post(url, data, null);
}

API.startProgram = function(id)
{
	var url = API.URL.program + "/" + id + "/start";
    var data = { pid: id };

    return post(url, data, null);
}

API.stopProgram = function(id)
{
	var url = API.URL.program + "/" + id + "/stop";
    var data = { pid: id };

    return post(url, data, null);
}

/* ------------------------------------------ ZONES API CALLS --------------------------------------------*/
API.getZones = function(id, callback)
{
	var url = API.URL.zone;

	if (id !== undefined && id != null){
		url += "/" + id;
	}

	if(callback !== undefined ){
		return get(url, callback, true);
	}else {
		return get(url, null);
	}

}

API.startZone = function(id, duration, callback)
{
	if (id === undefined || id === null)
		return API.ERROR.InvalidRequest;

	if (duration === undefined || duration === null)
		return API.ERROR.InvalidRequest;

	var url = API.URL.zone + "/" + id + "/start";
	var data = { time: duration };

	if(callback !== undefined && callback !=null) {
		return post(url, data, callback, true);
	}else{
		return post(url, data, null);
	}
}

API.stopZone = function(id, callback)
{
	if (id === undefined || id === null)
		return API.ERROR.InvalidRequest;

	var url = API.URL.zone + "/" + id + "/stop";

	var data = { zid : id };

	if(callback !== undefined && callback !=null) {
		return post(url, data, callback, true);
	}else{
		return post(url, data, null);
	}
}

API.getZonesProperties = function(id, callback)
{
	var url = API.URL.zone;

	if (id !== undefined && id != null)
		url += "/" + id;

	url += "/properties";

	if( callback !== undefined && callback != null) {
		return get(url, callback, true);
	}else {
		return get(url, null);
	}
}

API.setZonesProperties = function(id, properties, advancedProperties)
{
	var url = API.URL.zone;

	if (id === undefined)
		return API.ERROR.InvalidRequest;

	if (properties === undefined || properties === null)
		return API.ERROR.InvalidRequest;


	url += "/" + id + "/properties";

	var data = properties;

	if (advancedProperties !== undefined && advancedProperties !== null)
		data.advanced = advancedProperties;

	return post(url, data, null);
}

/* ----------------------------------------- WATERING API CALLS -------------------------------------------*/

API.getWateringLog = function(simulated, details, startDate, days, callback)
{
	var url = API.URL.watering + "/log" + (simulated ? "/simulated" : "") + (details ? "/details" : "");

	//start date format YYYY-DD-MM
	if (startDate !== null && startDate.length > 9)
		url += "/" + startDate;

	if (days !== null && days > 0)
		url += "/" + days;

	if (callback === undefined) {
		callback = null;
	}

	return get(url, callback, false);
}

API.getWateringQueue = function(callback)
{
	var url = API.URL.watering + "/queue";

	if(callback !== undefined && callback != null) {
		return get(url, callback, true);
	}else {
		return get(url, null);
	}


}

API.stopAll = function()
{
	var url = API.URL.watering + "/stopall";
	var data = { all: true };

	return post(url, data, null);
}

/* ------------------------------------------ PARSER API CALLS --------------------------------------------*/
API.getParsers = function(id)
{
	var url = API.URL.parser;

	if (id !== undefined)
		url += "/" + id;

	return get(url, null);
}

API.setParserEnable = function(id, enable)
{
	var url = API.URL.parser;

	if (id === undefined || id === null)
		return API.ERROR.InvalidRequest;

	url += "/" + id + "/activate";

	var data = { activate: enable };

	return post(url, data, null);
}

/* ------------------------------------------ MIXER API CALLS ---------------------------------------------*/
API.getMixer = function(startDate, days, callback)
{
	var url = API.URL.mixer;

	if (startDate !== undefined && startDate !== null)
		url += "/" + startDate;

	if (days !== undefined && startDate !== null)
		url += "/" + days;

	if (callback === undefined) {
		callback = null;
	}

	return get(url, callback, false);
}

/* ------------------------------------------ DIAG API CALLS ------------------------------------------------*/
API.getDiag = function()
{
	return get(API.URL.diag, null)
}

API.getDiagUpload = function()
{
	var url = API.URL.diag + "/upload";
	return get(url, null);
}

API.getDiagLog = function()
{
	var url = API.URL.diag + "/log";
	return get(url, null);
}

API.sendDiag = function()
{
    var url = API.URL.diag + "/upload";
    return post(url, {}, null);
}

API.setLogLevel = function(level)
{
	var url = API.URL.diag + "/log/level";
	var data  = { level: level };
	return post(url, data, null);
}

/* ------------------------------------------ MACHINE API CALLS ---------------------------------------------*/

API.checkUpdate = function()
{
	var url = API.URL.machine + "/update/check";
	return post(url, {}, null);
}

API.getUpdate = function()
{
	var url = API.URL.machine + "/update";
	return get(url, null);
}

API.startUpdate = function()
{
	var url = API.URL.machine + "/update";
	return post(url, {}, null);
}

API.getDateTime = function()
{
	var url = API.URL.machine + "/time";
	return get(url, null);
}

API.setDateTime = function(dateStr) //dateStr: '%Y-%m-%d %H:%M'
{
	var url = API.URL.machine + "/time";
	var data = { appDate: dateStr };
	return post(url, data, null);
}

API.setSSH = function(isEnabled)
{
	var url = API.URL.machine + "/ssh";
	var data = { enabled: isEnabled };

	return post(url, data, null);
}

API.setTouch = function(isEnabled)
{
	var url = API.URL.machine + "/touch";
	var data = { enabled: isEnabled };

	return post(url, data, null);
}

API.setLeds = function(isOn)
{
	var url = API.URL.machine + "/lightleds";
	var data = { enabled: isEnabled };

	return post(url, data, null);
}

/* ------------------------------------------ DEV API CALLS -------------------------------------------------*/

API.getTimeZoneDB = function()
{
	var url = API.URL.dev + "/timezonedb.json";

	return get(url, null);
}
/*
{
	var r = new XMLHttpRequest();
	r.onreadystatechange = function() {
		if ((r.readyState == 4)&& (r.status == 200))
			Data.timeZoneDB = JSON.parse(r.responseText);
	};
	r.open("GET", "/api/4/dev/timezonedb.json", true)
	r.send();
}
*/


return API; } (API || {} ));