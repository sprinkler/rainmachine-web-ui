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
				elName.style.width = "250px";
				elName.style.float = "left";
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


	/* NetAtmo custom UI */
	function netatmoRender(parent, params) {
		clearTag(parent);
		var ui = loadTemplate("weather-sources-netatmo-ui");
		var user = $(ui, '[rm-id="weather-sources-netatmo-user"]');
		var pass = $(ui, '[rm-id="weather-sources-netatmo-pass"]');
		var modulesList = $(ui, '[rm-id="weather-sources-netatmo-modules"]');
		var customModules = $(ui, '[rm-id="weather-sources-netatmo-custommodules"]');
		var useCustom = $(ui, '[rm-id="weather-sources-netatmo-usecustom"]');
		var showPassword = $(ui, '[rm-id="weather-sources-netatmo-showpass"]');

		user.id = "weather-sources-netatmo-user";
		user.value = params.username;
		pass.id = "weather-sources-netatmo-pass";
		pass.value = params.password;

		if (params._availableModules.length > 0) {
			var deviceName = null;
			var deviceLoc = null;
			var lastDeviceName = "";

			for(var i = 0; i < params._availableModules.length; i++) {
				var name = params._availableModules[i][0];
				var id = params._availableModules[i][1];
				// Extra parameters in newer service version
				if (params._availableModules[i].length > 2) {
					deviceName = params._availableModules[i][2];
					deviceLoc = params._availableModules[i][3];
				}

				if (deviceName && lastDeviceName !== deviceName) {
					var elDeviceName = addTag(modulesList, "div");
					elDeviceName.textContent = deviceName;
					elDeviceName.style.textDecoration = 'underline';
					elDeviceName.title = deviceLoc;

					lastDeviceName = deviceName;
				}

				var elName = addTag(modulesList, "div");
				var elId = addTag(modulesList, "div");
				elName.style.width = "250px";
				elName.style.float = "left";
				elName.textContent = name;
				elId.textContent = id;
			}
		}

		useCustom.id = "weather-sources-netatmo-usecustom";
		useCustom.checked = params.useSpecifiedModules;

		customModules.id = "weather-sources-netatmo-custommodules";
		customModules.value = params.specificModules;

		showPassword.onclick = function() { togglePasswordDisplay(pass, showPassword); };


		parent.appendChild(ui);
	}

	// Returns new parameters if they are different from the old ones or null otherwise
	function netatmoSave(oldparams) {
		var apiKey = $("#weather-sources-wu-apikey");
		var customStations = $("#weather-sources-wu-customstations");
		var useCustom = $("#weather-sources-wu-usecustom");

		var user = $("#weather-sources-netatmo-user");
		var pass = $("#weather-sources-netatmo-pass");
		var useCustom = $("#weather-sources-netatmo-usecustom");
		var customModules = $("#weather-sources-netatmo-custommodules");

		var params = {};

		params.username = user.value;
		params.password = pass.value;
		params.useSpecifiedModules = useCustom.checked;
		params.specificModules = customModules.value;

		if (params.username == oldparams.username &&
			params.password == oldparams.password &&
			params.useSpecifiedModules == oldparams.useSpecifiedModules &&
			params.specificModules == oldparams.specificModules) {
			return null;
		}

		return params;
	}

	_weatherservices.custom = {
		"WUnderground Parser": {"render": wundergroundRender, "save": wundergroundSave },
		"Netatmo Parser": {"render": netatmoRender, "save": netatmoSave }
	};
} (window.ui.weatherservices = window.ui.weatherservices || {}));