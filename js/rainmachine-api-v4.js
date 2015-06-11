var API  = (function(API) {

var host = "192.168.12.157";
//var host = "127.0.0.1";

var port = "8080";
//var port = "18080";

var apiUrl = "https://" + host + ":" + port + "/api/4";
//var apiUrl = "http://" + host + ":" + port + "/api/4";

var async = false;

var token = null;

function rest(type, apiCall, data, callback)
{
	var url;

	if (token !== null)
		url = apiUrl + apiCall + "?access_token=" + token;
	else
		url = apiUrl + apiCall;

	console.log("Doing API call: %s", url);
	r = new XMLHttpRequest();
	r.open(type, url, async);

	if (type === "POST")
	{
		r.setRequestHeader("Content-type","text/plain");
		r.send(JSON.stringify(data));
	}
	else
	{
		r.send(null);
	}

	return JSON.parse(r.responseText);
}

function post(apiCall, data, callback) { return rest("POST", apiCall, data, callback); }
function get(apiCall, callback) { return rest("GET", apiCall, null, callback); }

/* ------------------------------------------ API ROOT PATHS ----------------------------------------------*/
API.URL = Object.freeze({
	auth: "/auth",
	provision: "/provision",
	dailystats: "/dailystats",
	restrictions: "/restrictions",
	program: "/program",
	zone: "/zone",
	watering: "/watering",
	parser: "/parser",
	mixer: "/mixer",
	diag: "/diag",
	machine: "/machine",
	dev: "/dev"
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
		remember: remember
	};
	
	var reply = post(url, data, null); 
	token = reply.access_token;
	console.log(token);
}

/* ------------------------------------------ PROVISION API CALLS -----------------------------------------*/

/* ------------------------------------------ DAILY STATS API CALLS ---------------------------------------*/

/* ----------------------------------------- RESTRICTIONS API CALLS ---------------------------------------*/

API.getProvision = function()
{
	return get(API.URL.provision, null);
}

API.getProvisionWifi = function()
{
	var url = API.URL.provision + "/wifi";
	return get(url, null);
}

/* ----------------------------------------- PROGRAMS API CALLS -------------------------------------------*/
API.getPrograms = function(id)
{
	var url = API.URL.program;

	if (id !== undefined)
		url += "/" + id;

	return get(url, null);
}

/* ------------------------------------------ ZONES API CALLS --------------------------------------------*/
API.getZones = function(id)
{
	var url = API.URL.zone;

	if (id !== undefined)
		url += "/" + id;

	return get(url, null);
}

API.startZone = function(id, duration)
{
	if (id === undefined || id === null)
		return API.ERROR.InvalidRequest;

	if (duration === undefined || duration === null)
		return API.ERROR.InvalidRequest;

	var url = API.URL.zone + "/" + id + "/start";
	var data = { time: duration };

	return post(url, data, null);
}

API.stopZone = function(id)
{
	if (id === undefined || id === null)
		return API.ERROR.InvalidRequest;

	var url = API.URL.zone + "/" + id + "/stop";

	var data = { zid : id };

	return post(url, data, null);
}

API.getZonesProperties = function(id)
{
	var url = API.URL.zone;

	if (id !== undefined)
		url += "/" + id;

	url += "/properties";

	return get(url, null);
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

/* ------------------------------------------ PARSER API CALLS --------------------------------------------*/

/* ------------------------------------------ MIXER API CALLS ---------------------------------------------*/
API.getMixer = function(startDate, days)
{
	var url = API.URL.mixer;

	if (startDate !== undefined)
		url += "/" + startDate;

	if (days !== undefined)
		url += "/" + days;

	return get(url, null);
}

/* ------------------------------------------ DIAG API CALLS ------------------------------------------------*/
API.getDiag = function()
{
	return get(API.URL.diag, null)
}
/* ------------------------------------------ MACHINE API CALLS ---------------------------------------------*/

/* ------------------------------------------ DEV API CALLS -------------------------------------------------*/


return API; } (API || {} ));