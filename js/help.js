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
		"programPastValues": "EvapoTranspiration and Precipitation known at the Program run time." +
							"For programs that don't run daily this is a sum since last day that the program ran (multiple days). " +
							"Using Correction For Past will automatically take this differences into account for next watering.",
		/* Zones edit help texts */
		"zoneWeatherSeasonalAdjustments": "If weather data is temporarily unreachable RainMachine will automatically fall back on Seasonal Adjustments until connectivity is restored. If both Weather and Seasonal Adjustments are turned off their data will be ignored when watering times are calculated for this zone.",
		"zoneDailySummerEPA": "Scheduled to run for a typical summer day and calculated based on Advanced Zone Settings properties. This time will be adjusted automatically to any program that use this zone.",
		"zoneFieldCapacityMain": "The amount of water content held in the soil after excess water has drained away. Increase this value if the RainMachine starts too soon after a rain event.",
		"zoneZoneAvailableWater": "add text",
		"zoneListImageHelp": "Use the RainMachine mobile app (iPhone or Android) to upload a picture of this zone. Uploading images through web app is not allowed.",
		"zoneAllowedDepletion": "The maximum percentage of the soil moisture/water that is allowed to be consume before " +
		"					being replenished by irrigation.",
		"zoneRootDepth": "The root depth of the plant from which it extracts the most of the needed water.",
		"zoneWiltingPoint": "The minimum percentage of soil moisure/water before the plants will wilt and fail to recover.",
		"zoneTallPlant": "Taller plants usually lose more water with transpiration versus shorter plants.",
		"zoneCropCoef": "For Multiple monthly values, is a list of evapotranspiration percentage from the total evaporation " +
						"plant potential depending on growing patterns. For Single yearly value, it's an average of yearly values.",
		"zoneIntakeRate": "The rate at which soil is able to absorb rainfall or irrigation, if this value is below the " +
							"sprinkler head precipitation rate, RainMachine will automatically split the watering in cycles " +
							"to prevent runoff.",
		"zoneFieldCapacity": "The percentage of water remaining in the soil after the soil has been saturated (100%) and allowed to drain away.",
		"zonePrecipRate": "The quantitative precipitation that the sprinkler head can deposit per hour. This value can be " +
							"calculated either by a catch cup test or by zone water meter flow and area.",
		"zoneAppEfficiency": "The ratio of the average water depth applied and the target water depth during an irrigation event.",
		"zoneSurfaceAccumulation": "The maximum height of water that is allowed to accumulate over the soil surface before runoff occurs.",
		/*Watering History help texts */
		"waterSavedVolume": "For accurate results make sure you enter the correct precipitation rate, zone area or zone total flow in advanced zone settings."

	};

return Help; } ( Help || {}));
