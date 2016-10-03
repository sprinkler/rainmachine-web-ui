/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

var Help = (function(Help) {
	Help.bindAll = function() {
		var allElems = document.querySelectorAll("[help]");
		for(var i = 0; i < allElems.length; i++) {
			var attrValue = allElems[i].getAttribute("help");
			allElems[i].setAttribute("zones-tooltip", Help.strings[attrValue]);
		}
	};

	Help.strings = {
		"programPastValues": "This is program past values help",
		"zonePrecipRate": "This is zone precipitation rate help",
		"zoneAppEfficiency": "Zone Application efficiency",
		"waterSavedVolume": "The volume of water saved. For accurate results make sure you enter the correct precipitation rate, zone area or zone total flow in advanced zone settings."
	};

return Help; } ( Help || {}));
