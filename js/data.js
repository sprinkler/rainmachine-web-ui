function DataProperty()
{
	this.data = null;
	this.refreshInterval = 15;
	this.lastUpdate = null;
	this.forcedUpdate = false;
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


_dummy = new DataProperty();
_dummy.refreshInterval = 20;

Object.defineProperty(Data, "dummy", {
    get: function() { return genericPropertyGetter(_dummy); },
    set: function(d) { return genericPropertySetter(_dummy, d); },
});

function genericPropertyGetter(p)
{
	console.log("Get property refreshInterval: %o", p.refreshInterval);
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