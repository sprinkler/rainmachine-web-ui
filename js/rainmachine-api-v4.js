var API  = (function(API) {

var host = "192.168.12.157"
var port = "8080"
var apiUrl = "https://" + host + ":" + port + "/api/4";

var async = false;

var token = null;

function rest(type, apiCall, data, callback)
{
	var url;

	if (token !== null)
		url = apiUrl + apiCall + "?access_token=" + token;
	else
		url = apiUrl + apiCall;

	console.log("Doing API call %s", url);
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

API.auth = function(password, remember)
{
	var url = "/auth/login";
	
	var data = 
	{
		pwd: password,
		remember: remember
	};
	
	var reply = post(url, data, null); 
	token = reply.access_token;
	console.log(token);
}

API.getMixer = function()
{
	var url = "/mixer";
	return get(url, null);
}

API.getZones = function()
{
	var url = "/zone"

	return get(url, null);
}

return API; } (API || {} ));