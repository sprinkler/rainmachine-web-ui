/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

window.ui = window.ui || {};

(function(_system) {

	var systemSettingsView = null;
	var deviceDateTime = null;
	var deviceDateTimeTimer = null;

	function loadView() {
		systemSettingsView= {
			CloudEnable: $("#systemSettingsCloudEnable"),
			Email: $("#systemSettingsEmail"),
			PendingEmail: $("#systemSettingsPendingEmail"),
			CloudSet: $("#systemSettingsCloudSet"),

			MasterValveBefore: $("#systemSettingsMasterValveBefore"),
			MasterValveAfter: $("#systemSettingsMasterValveAfter"),
			MasterValveSet: $("#systemSettingsMasterValveSet"),
			enableMasterValveInput: $("#systemSettingsEnableMasterValve"),

			DeviceName: $("#systemSettingsDeviceName"),
			DeviceNameSet: $("#systemSettingsDeviceNameSet"),

			LocationFull: $("#systemSettingsLocationFull"),
			LocationLat: $("#systemSettingsLocationLat"),
			LocationLon: $("#systemSettingsLocationLon"),
			LocationElev: $("#systemSettingsLocationElev"),
			LocationSet: $("#systemSettingsLocationSet"),

			Date: $("#systemSettingsDate"),
			Hour: $("#systemSettingsHour"),
			Minute: $("#systemSettingsMinute"),
			Seconds: $("#systemSettingsSeconds"),
			TimeZoneSelect: $("#systemSettingsTimeZoneSelect"),
			TimeZoneSet: $("#systemSettingsTimeZoneSet"),

			UnitsUS: $("#systemSettingsUnitsUS"),
			UnitsMetric: $("#systemSettingsUnitsMetric"),
			UnitsSet: $("#systemSettingsUnitsSet"),

			PasswordOld: $("#systemSettingsPasswordOld"),
			Password: $("#systemSettingsPassword"),
			PasswordSet: $("#systemSettingsPasswordSet"),

			ResetDefaultSet: $("#systemSettingsResetDefaultSet"),
			RebootSet: $("#systemSettingsRebootSet"),

			//Advanced Settings
			AlexaSet: $("#systemSettingsAlexaSet"),
			Alexa: $("#systemSettingsAlexa"),
			SSHSet: $("#systemSettingsSSHSet"),
			SSH: $("#systemSettingsSSH"),
			LogSet: $("#systemSettingsLogSet"),
			Log: $("#systemSettingsLog"),
			MixerHistorySet: $("#systemSettingsMixerHistorySet"),
			MixerHistory: $("#systemSettingsMixerHistory"),
			SimulatorHistorySet: $("#systemSettingsSimulatorHistorySet"),
			SimulatorHistory: $("#systemSettingsSimulatorHistory"),
			WaterHistorySet: $("#systemSettingsWaterHistorySet"),
			WaterHistory: $("#systemSettingsWaterHistory"),
			ParserHistorySet: $("#systemSettingsParserHistorySet"),
			ParserHistory: $("#systemSettingsParserHistory"),
			ParserDaysSet: $("#systemSettingsParserDaysSet"),
			ParserDays: $("#systemSettingsParserDays"),
			MinWateringSet: $("#systemSettingsMinWateringSet"),
			MinWatering: $("#systemSettingsMinWatering"),
			CorrectionPastSet: $("#systemSettingsCorrectionPastSet"),
			CorrectionPast: $("#systemSettingsCorrectionPast"),
			MaxWaterSet: $("#systemSettingsMaxWaterSet"),
			MaxWater: $("#systemSettingsMaxWater"),

			//Advanced Settings Mini-8 SPK2
			TouchSet: $("#systemSettingsTouchSet"),
			Touch: $("#systemSettingsTouch"),
			LedsSet: $("#systemSettingsLedsSet"),
			Leds: $("#systemSettingsLeds"),
			MaxLedSet: $("#systemSettingsMaxLedSet"),
			MaxLed: $("#systemSettingsMaxLed"),
			MinLedSet: $("#systemSettingsMixLedSet"),
			MinLed: $("#systemSettingsMinLed"),
			SensorSet: $("#systemSettingsSensorSet"),
			Sensor: $("#systemSettingsSensor"),
			TouchTimeoutSet: $("#systemSettingsTouchTimeoutSet"),
			TouchTimeout: $("#systemSettingsTouchTimeout"),
			TouchAdvSet: $("#systemSettingsTouchAdvSet"),
			TouchAdv: $("#systemSettingsTouchAdv"),
			TouchPressTimeoutSet: $("#systemSettingsTouchPressTimeoutSet"),
			TouchPressTimeout: $("#systemSettingsTouchPressTimeout"),
			TouchAuthSet: $("#systemSettingsTouchAuthSet"),
			TouchAuth: $("#systemSettingsTouchAuth"),
			TouchProgSet: $("#systemSettingsTouchProgSet"),
			TouchProg: $("#systemSettingsTouchProg"),
			};
    	}

	function showSettings()
	{
		if (! systemSettingsView)
			loadView();

		systemSettingsView.CloudEnable.checked = Data.provision.cloud.enabled;

		//Show the pending email if no email is yet confirmed
		var currentEmail = Data.provision.cloud.email;
		var currentPendingEmail = Data.provision.cloud.pendingEmail;
		var pendingEmailText = "";

		if (currentPendingEmail && currentPendingEmail !== "") {
			 pendingEmailText = "Unconfirmed email " + currentPendingEmail;
		}

		if (pendingEmailText !== "" && currentEmail == "") {
			currentEmail = currentPendingEmail;
		}

		systemSettingsView.PendingEmail.textContent = pendingEmailText;
		systemSettingsView.Email.value = currentEmail;

		systemSettingsView.MasterValveBefore.value = Data.provision.system.masterValveBefore/60;
		systemSettingsView.MasterValveAfter.value = Data.provision.system.masterValveAfter/60;
		systemSettingsView.enableMasterValveInput.checked = Data.provision.system.useMasterValve;


		systemSettingsView.DeviceName.value = Data.provision.system.netName;

		systemSettingsView.LocationFull.textContent = Data.provision.location.name + " (" +
													Data.provision.location.latitude + ", " +
													Data.provision.location.longitude + ")";

		systemSettingsView.LocationLat.value = Data.provision.location.latitude;
		systemSettingsView.LocationLon.value = Data.provision.location.longitude;
		systemSettingsView.LocationElev.value = Data.provision.location.elevation;


		Data.timeDate = API.getDateTime();
		deviceDateTime = new Date(Data.timeDate.appDate);
		clearInterval(deviceDateTimeTimer);
		deviceDateTimeTimer = setInterval(showDeviceDateTime, 1000);

		buildTimeZoneSelect(systemSettingsView.TimeZoneSelect);

		systemSettingsView.UnitsUS.checked = !Data.localSettings.units;
		systemSettingsView.UnitsMetric.checked = Data.localSettings.units;

		systemSettingsView.MasterValveSet.onclick = function() {systemSettingsChangeMasterValve(); };
		systemSettingsView.DeviceNameSet.onclick = function() {
			changeSingleSystemProvisionValue("netName", systemSettingsView.DeviceName.value);
			window.ui.about.getDeviceInfo(); //refresh
		};
		systemSettingsView.LocationSet.onclick = function() { systemSettingsChangeLocation(); };
		systemSettingsView.TimeZoneSet.onclick = function() { systemSettingsChangeTimeZone(); };
		systemSettingsView.UnitsSet.onclick = function() { systemSettingsChangeUnits(); };
		systemSettingsView.PasswordSet.onclick = function() { systemSettingsChangePassword(); };
		systemSettingsView.ResetDefaultSet.onclick = function() { systemSettingsReset(); };
		systemSettingsView.RebootSet.onclick = function() { systemSettingsReboot(); };

		//Advanced Settings
		systemSettingsView.Alexa.checked = Data.provision.system.allowAlexaDiscovery;
		systemSettingsView.MixerHistory.value = Data.provision.system.mixerHistorySize;
		systemSettingsView.SimulatorHistory.value = Data.provision.system.simulatorHistorySize;
		systemSettingsView.WaterHistory.value = Data.provision.system.waterLogHistorySize;
		systemSettingsView.ParserHistory.value = Data.provision.system.parserHistorySize;
		systemSettingsView.ParserDays.value = Data.provision.system.parserDataSizeInDays;
		systemSettingsView.MinWatering.value = Data.provision.system.minWateringDurationThreshold;
		systemSettingsView.CorrectionPast.checked = Data.provision.system.useCorrectionForPast;
		systemSettingsView.MaxWater.value = Data.provision.system.maxWateringCoef * 100;

		systemSettingsView.SSHSet.onclick = function() { systemSettingsChangeSSH(); };
		systemSettingsView.LogSet.onclick = function() { systemSettingsChangeLog(); };
		systemSettingsView.CloudSet.onclick = function() { systemSettingsChangeCloud(); };

		systemSettingsView.AlexaSet.onclick = function() {
			changeSingleSystemProvisionValue("allowAlexaDiscovery", systemSettingsView.Alexa.checked);
		};

		systemSettingsView.MixerHistorySet.onclick = function()	{
			changeSingleSystemProvisionValue("mixerHistorySize", systemSettingsView.MixerHistory.value);
		};
		systemSettingsView.SimulatorHistorySet.onclick = function() {
			changeSingleSystemProvisionValue("simulatorHistorySize", systemSettingsView.SimulatorHistory.value);
		};
		systemSettingsView.WaterHistorySet.onclick = function() {
			changeSingleSystemProvisionValue("waterLogHistorySize", systemSettingsView.WaterHistory.value);
		};
		systemSettingsView.ParserHistorySet.onclick = function() {
			changeSingleSystemProvisionValue("parserHistorySize", systemSettingsView.ParserHistory.value);
		};
		systemSettingsView.ParserDaysSet.onclick = function() {
			changeSingleSystemProvisionValue("parserDataSizeInDays", systemSettingsView.ParserDays.value);
		};
		systemSettingsView.MinWateringSet.onclick = function() {
			changeSingleSystemProvisionValue("minWateringDurationThreshold", systemSettingsView.MinWatering.value);
		};
		systemSettingsView.CorrectionPastSet.onclick = function() {
			changeSingleSystemProvisionValue("useCorrectionForPast", systemSettingsView.CorrectionPast.checked);
		};
		systemSettingsView.MaxWaterSet.onclick = function() {
			changeSingleSystemProvisionValue("maxWateringCoef", parseInt(systemSettingsView.MaxWater.value) / 100);
		};
	}

	function changeSingleSystemProvisionValue(provisionKey, value)
	{
		var data = {};
		data[provisionKey] = value;

		var r = API.setProvision(data, null);

		if (r === undefined || !r || r.statusCode != 0)
		{
			console.log("Can't set %s", provisionKey);
			return;
		}

		Data.provision.system[provisionKey] = value;

	}

	function systemSettingsChangeMasterValve()
	{
		var enabled = systemSettingsView.enableMasterValveInput.checked;
		var b = parseInt(systemSettingsView.MasterValveBefore.value) * 60;
        var a =  parseInt(systemSettingsView.MasterValveAfter.value) * 60;

		return Util.saveMasterValve(enabled, b, a);
	}

	function systemSettingsChangeUnits()
	{
		Data.localSettings.units = systemSettingsView.UnitsMetric.checked;
		Storage.saveItem("localSettings", Data.localSettings);
	}

	function systemSettingsChangePassword()
	{
		var o = systemSettingsView.PasswordOld.value;
		var n = systemSettingsView.Password.value;

		var r = API.authChange(o, n);

		console.log(r);
		if (r === undefined || !r || r.statusCode != 0)
		{
			console.log("Can't change password");
			return;
		}
	}

	function systemSettingsReset()
	{
		API.setProvisionReset(true);
		getProvision();
	}

	function systemSettingsReboot()
	{
		API.reboot();
	}

	function systemSettingsChangeSSH()
	{
		var isEnabled = systemSettingsView.SSH.checked;
		API.setSSH(isEnabled);
	}

	function systemSettingsChangeCloud()
	{
		var isEnabled = systemSettingsView.CloudEnable.checked;
		var email = systemSettingsView.Email.value;
		var currentEmail = Data.provision.cloud.email;
		var data = null;

		if (email && Util.validateEmail(email) && email != currentEmail) {
			data = {};
			data.email = "";
			data.pendingEmail = email;
			data.enable = isEnabled;
		}

		if (data) {
			API.setProvisionCloud(data);
			getProvisionCloud();
		} else {
			console.error("Invalid or unchanged email for remote access");
		}
	}

	function systemSettingsChangeLog()
	{
		var level = systemSettingsView.Log.options[systemSettingsView.Log.selectedIndex].value;
		API.setLogLevel(level);
	}

	function showDeviceDateTime()
	{
		//Month/Day should have a leading 0
		var dateString = deviceDateTime.getFullYear() + "-" +
		 				('0' + (deviceDateTime.getMonth() + 1)).slice(-2) + '-' +
						('0' + deviceDateTime.getDate()).slice(-2)

		systemSettingsView.Date.value = dateString;
		systemSettingsView.Hour.value = deviceDateTime.getHours();
		systemSettingsView.Minute.value = deviceDateTime.getMinutes();
		systemSettingsView.Seconds.value = deviceDateTime.getSeconds();

		deviceDateTime.setSeconds(deviceDateTime.getSeconds() + 1);
	}

	function buildTimeZoneSelect(container)
	{
		var sortedData = [];

		for (var z in Data.timeZoneDB)
			sortedData.push(z);

		sortedData.sort();

		for (var i = 0; i < sortedData.length; i++)
		{
			var o = addTag(container, 'option');
			o.value = o.textContent = sortedData[i];
			if (sortedData[i] == Data.provision.location.timezone)
				o.selected = true;
		}
	}

	function getProvisionCloud() {
		APIAsync.getProvisionCloud().then(
			function(o) {
				Data.provision.cloud = o;
				showSettings();
			});
	}

	function getProvision() {
		APIAsync.getProvision().then(
			function(o) {
				Data.provision.system = o.system;
				Data.provision.location = o.location;
				showSettings();
			});
	}

	//--------------------------------------------------------------------------------------------
	//
	//
	_system.showSettings = showSettings;
	//_system.systemSettingsView = systemSettingsView;

} (window.ui.system = window.ui.system || {}));