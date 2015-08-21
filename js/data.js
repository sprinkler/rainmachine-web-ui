/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

function DataProperty()
{
	this.data = null;
	this.refreshInterval = 15;
	this.lastUpdate = null;
	this.forcedUpdate = false;
	this.apiCall = null;
	this.callback = null;
}

var Data  = (function(Data) {

Data.now = Date.now() / 1000 >> 0;

//Properties
Data.zoneData = null;
Data.zoneAdvData = null;
Data.parsers = null;
Data.programs = null;
Data.provision = null;
Data.diag = null;
Data.mixerData = null;
Data.dailyDetails = null;
Data.waterLog = null;
Data.waterLogCustom = null;
Data.waterLogSimulated = null;
Data.dateTime = null;
Data.uiVer = "0.10-beta";

_timeZoneDB = new DataProperty();
_timeZoneDB.refreshInterval = -1;
_timeZoneDB.apiCall = function() { return API.getTimeZoneDB(); }

Object.defineProperty(Data, "timeZoneDB", {
	get: function() { return genericPropertyGetter(_timeZoneDB); },
	set: function(d) { return genericPropertySetter(_timeZoneDB, d); }
});


_dummy = new DataProperty();
_dummy.refreshInterval = 20;

Object.defineProperty(Data, "dummy", {
    get: function() { return genericPropertyGetter(_dummy); },
    set: function(d) { return genericPropertySetter(_dummy, d); },
});

function genericPropertyGetter(p)
{
	if (p.data === null && p.apiCall !== null)
		p.data = p.apiCall();

	console.log("Get property: %o", p);
	return p.data;
}

function genericPropertySetter(p, d)
{
	p.data = d;
	console.log("Set property data %o", p.data);
}


return Data; } (Data || {} ));

console.log(Data.dummy);
Data.dummy = { test: " Setter " };
console.log(Data.dummy);
console.log(Data.dummy.test);