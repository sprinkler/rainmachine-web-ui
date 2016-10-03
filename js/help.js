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
		"programPastValues": "The differences of EvapoTranspiration and Precipitation between the day best forecast " +
							"(seen on the left) and known forecast at the time of program run. " +
							"Big differences (more than 2mm) can be solved by enabling Correction for the Past in Settings.",
		"zonePrecipRate": "The quantitative precipitation that the sprinkler head can deposit per hour. This value can be " +
							"calculated either by a catch cup test or by zone water meter flow and area",
		"zoneAppEfficiency": "The ratio of the average water depth applied and the target water depth during an irrigation event.",
		"waterSavedVolume": "For accurate results make sure you enter the correct precipitation rate, zone area or zone total flow in advanced zone settings."
	};

return Help; } ( Help || {}));
