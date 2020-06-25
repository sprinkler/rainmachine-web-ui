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
							"Enabling Forecast Correction feature will automatically take this differences into account for next watering.",
		/* Zones edit help texts */
		"zoneWeatherSeasonalAdjustments": "If weather data is temporarily unreachable RainMachine will automatically fall back on Seasonal Adjustments until connectivity is restored. If both Weather and Seasonal Adjustments are turned off their data will be ignored when watering times are calculated for this zone.",
		"zoneDailySummerEPA": "Scheduled to run for a typical summer day and calculated based on Advanced Zone Settings properties. This time will be adjusted automatically to any program that use this zone.",
		"zoneFieldCapacityMain": "The maximum amount of water/moisture content held in the soil after excess water has drained away. Increase this value if the RainMachine starts too soon after a rain event.",
		"zoneMinimumRolloverThreshold": "When weather adjusted watering is less than the rollover threshold, RainMachine will roll over to next scheduled watering. This promotes deeper root penetration and also allows rotors to complete full rotation.",
		"zoneAvailableWater": "The current quantity of water/moisture in the soil, which is consumed by evapo-transpiration.",
		"zoneListImageHelp": "Use the RainMachine mobile app (iPhone or Android) to upload a picture of this zone. Uploading images through web app is not allowed.",
		"zoneListShowHideHelp": "Show or hide inactive zones.",
		"zoneAllowedDepletion": "The maximum percentage of the soil moisture/water that is allowed to be consume before " +
		"					being replenished by irrigation.",
		"zoneWaterSurplus":"The amount of water left in soil because of the past day rain events or evapotranspiration has been low and the water from previous irrigation is still in the soil.",
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
		"zoneRangeSliderThumb": "To manually start a zone, click and drag the timer to the desired amount, and then release it.",
		/*Watering History help texts */
		"waterSavedVolume": "For accurate results enter the correct precipitation rate, zone area or zone total flow in advanced zone settings.",
		/*Settings help texts */
		"settingsSensorsFlow": "For accurate results enter the correct flow clicks per gallons (cube meters) as described in the flow sensor manufacturer datasheet.",
		"settingsWateringHistoryTotalWaterUsed": "Total watered gallons (cube meters) per program is a number provided by the flow sensor (measured) or otherwise based on the sprinkler heads precipitation rate (estimated).",
		"settingsWateringHistoryTotalWaterUsed": "Total watered gallons (cube meters) per program is a number provided by the flow sensor (measured) or otherwise based on the sprinkler heads precipitation rate (estimated).",
		"weatherNetAtmoLogin": "After you enter the NetAtmo credentials click on the 'SAVE' button." +
					" Then click on 'REFRESH NOW' button." +
					" Wait for NetAtmo Weather Modules to be listed beneath so you can choose which one to use.",
		"weatherNetAtmoModules": "Copy the ID number of the modules you would like to use and paste it into the input field. If you want to use more than one module, separate the modules ID numbers by comma, check the box and then click the 'SAVE' button."

	};

return Help; } ( Help || {}));
