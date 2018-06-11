/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

window.ui = window.ui || {};

(function(_weatherservices) {

	function wundergroundRender(parent, params) {
		clearTag(parent);
		var ui = loadTemplate("weather-sources-wu-ui");
		var apiKey = $(ui, '[rm-id="weather-sources-wu-apikey"]');
		var infoNoStations = $(ui, '[rm-id="weather-sources-wu-nostations"]');
		var stationsList = $(ui, '[rm-id="weather-sources-wu-stationslist"]');
		var customStations = $(ui, '[rm-id="weather-sources-wu-customstations"]');
		var useCustom = $(ui, '[rm-id="weather-sources-wu-usecustom"]');

		apiKey.id = "weather-sources-wu-apikey";
		apiKey.value = params.apiKey;

		if (params._nearbyStationsIDList.length > 0) {
			makeHidden(infoNoStations);
			for(var i = 0; i < params._nearbyStationsIDList.length; i++) {
				var tokens = params._nearbyStationsIDList[i].split("(");
				var name = tokens[0];
				var distance = tokens[1].split(";")[0];
				var elName = addTag(stationsList, "div");
				var elDistance = addTag(stationsList, "div");
				elName.textContent = name;
				elDistance.textContent = distance;
			}
		} else {
			makeVisible(infoNoStations);
		}

		useCustom.id = "weather-sources-wu-usecustom";
		useCustom.checked = params.useCustomStation;

		customStations.id = "weather-sources-wu-customstations";
		customStations.value = params.customStationName;
		parent.appendChild(ui);
	}

	// Returns new parameters if they are different from the old ones or null otherwise
	function wundergroundSave(oldparams) {
		var apiKey = $("#weather-sources-wu-apikey");
		var customStations = $("#weather-sources-wu-customstations");
		var useCustom = $("#weather-sources-wu-usecustom");

		var params = {};

		params.apiKey = apiKey.value;
		params.useCustomStation = useCustom.checked;
		params.customStationName = customStations.value;

		if (params.apiKey == oldparams.apiKey &&
			params.useCustomStation == oldparams.useCustomStation &&
			params.customStationName == oldparams.customStationName) {
			return null;
		}

		return params;
	}

	_weatherservices.custom = {
		"WUnderground Parser": {"render": wundergroundRender, "save": wundergroundSave }
	};
} (window.ui.weatherservices = window.ui.weatherservices || {}));