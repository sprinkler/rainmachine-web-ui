/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

window.ui = window.ui || {};

(function(_system) {

	var systemSettingsView = null;

	function loadView() {
		systemSettingsView= {
			CloudEnable: $("#systemSettingsCloudEnable"),
			Email: $("#systemSettingsEmail"),
			CloudSet: $("#systemSettingsCloudSet"),

			MasterValveBefore: $("#systemSettingsMasterValveBefore"),
			MasterValveAfter: $("#systemSettingsMasterValveAfter"),
			MasterValveSet: $("#systemSettingsMasterValveSet"),

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

			//Advanced Settings
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
			ValvesSet: $("#systemSettingsValvesSet"),
			Valves: $("#systemSettingsValves"),
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
    	};

	function showSettings()
	{
		if (! systemSettingsView)
			loadView();

		systemSettingsView.CloudEnable.checked = Data.provision.cloud.enabled;
		systemSettingsView.Email.value = Data.provision.cloud.email;

		systemSettingsView.MasterValveBefore.value = Data.provision.system.masterValveBefore;
		systemSettingsView.MasterValveAfter.value = Data.provision.system.masterValveAfter;


		systemSettingsView.DeviceName.value = Data.provision.system.netName;

		systemSettingsView.LocationFull.textContent = Data.provision.location.name + " (" +
													Data.provision.location.latitude + ", " +
													Data.provision.location.longitude + ")";

		systemSettingsView.LocationLat.value = Data.provision.location.latitude;
		systemSettingsView.LocationLon.value = Data.provision.location.longitude;
		systemSettingsView.LocationElev.value = Data.provision.location.elevation;


		Data.timeDate = API.getDateTime();
		var fields = Util.appDateToFields(Data.timeDate.appDate);

		systemSettingsView.Date.value = fields.date;
		systemSettingsView.Hour.value = fields.hour;
		systemSettingsView.Minute.value = fields.minute;
		systemSettingsView.Seconds.value = fields.seconds;

		buildTimeZoneSelect(systemSettingsView.TimeZoneSelect);

		var units = Storage.restoreItem("units") || false;
		systemSettingsView.UnitsUS.checked = !units;
		systemSettingsView.UnitsMetric.checked = units;

		systemSettingsView.MasterValveSet.onclick = function() {systemSettingsChangeMasterValve(); };
		systemSettingsView.DeviceNameSet.onclick = function() {
			changeSingleSystemProvisionValue("netName", systemSettingsView.DeviceName.value);
			window.ui.about.showDeviceInfo(); //refresh
		};
		systemSettingsView.LocationSet.onclick = function() { systemSettingsChangeLocation(); };
		systemSettingsView.TimeZoneSet.onclick = function() { systemSettingsChangeTimeZone(); };
		systemSettingsView.UnitsSet.onclick = function() { systemSettingsChangeUnits(); };
		systemSettingsView.PasswordSet.onclick = function() { systemSettingsChangePassword(); };
		systemSettingsView.ResetDefaultSet.onclick = function() { systemSettingsReset(); };

		//Advanced Settings
		systemSettingsView.MixerHistory.value = Data.provision.system.mixerHistorySize;
		systemSettingsView.SimulatorHistory.value = Data.provision.system.simulatorHistorySize;
		systemSettingsView.WaterHistory.value = Data.provision.system.waterLogHistorySize;
		systemSettingsView.ParserHistory.value = Data.provision.system.parserHistorySize;
		systemSettingsView.ParserDays.value = Data.provision.system.parserDataSizeInDays;
		systemSettingsView.MinWatering.value = Data.provision.system.minWateringDurationThreshold;
		systemSettingsView.Valves.value = Data.provision.system.localValveCount;
		systemSettingsView.CorrectionPast.checked = Data.provision.system.useCorrectionForPast;
		systemSettingsView.MaxWater.value = Data.provision.system.maxWateringCoef * 100;

		systemSettingsView.SSHSet.onclick = function() { systemSettingsChangeSSH(); };
		systemSettingsView.LogSet.onclick = function() { systemSettingsChangeLog(); }

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
		systemSettingsView.ValvesSet.onclick = function() {
			changeSingleSystemProvisionValue("localValveCount", systemSettingsView.Valves.value);
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
		var b = parseInt(systemSettingsView.MasterValveBefore.value) * 60;
		var a = parseInt(systemSettingsView.MasterValveAfter.value) * 60;

		var data = {
			masterValveBefore: b,
			masterValveAfter: a
		};

		var r = API.setProvision(data, null);
		console.log(r);

		if (r === undefined || !r ||  r.statusCode != 0)
		{
			console.log("Can't set Master Valve");
			return;
		}

		Data.provision.system.masterValveBefore = b;
		Data.provision.system.masterValveAfter = a;
	}

	function systemSettingsChangeUnits()
	{
		Storage.saveItem("units", systemSettingsView.UnitsMetric.checked);
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
	}

	function systemSettingsChangeSSH()
	{
		var isEnabled = systemSettingsView.SSH.checked;
		API.setSSH(isEnabled);
	}

	function systemSettingsChangeLog()
	{
		var level = systemSettingsView.Log.options[systemSettingsView.Log.selectedIndex].value;
		API.setLogLevel(level);
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

	//--------------------------------------------------------------------------------------------
	//
	//
	_system.showSettings = showSettings;
	_system.systemSettingsView = systemSettingsView;

} (window.ui.system = window.ui.system || {}));