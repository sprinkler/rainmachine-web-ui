var systemSettingsView = {};

function systemSettingsUI()
{
	systemSettingsView = {
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
	systemSettingsView.DeviceNameSet.onclick = function() { systemSettingsChangeDeviceName(); };
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

	systemSettingsView.MixerHistorySet.onclick = function() { systemSettingsChangeMixerHistory(); };
	systemSettingsView.SimulatorHistorySet.onclick = function() { systemSettingsChangeSimulatorHistory(); };
	systemSettingsView.WaterHistorySet.onclick = function() { systemSettingsChangeWaterHistory(); };
	systemSettingsView.ParserHistorySet.onclick = function() { systemSettingsChangeParserHistory(); };
	systemSettingsView.ParserDaysSet.onclick = function() { systemSettingsChangeParserDays(); };
	systemSettingsView.MinWateringSet.onclick = function() { systemSettingsChangeMinWatering(); };
	systemSettingsView.ValvesSet.onclick = function() { systemSettingsChangeValves(); };
	systemSettingsView.CorrectionPastSet.onclick = function() { systemSettingsChangeCorrectionPast(); };
	systemSettingsView.MaxWaterSet.onclick = function() { systemSettingsChangeMaxWater(); };


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

function systemSettingsChangeDeviceName()
{
	var n = systemSettingsView.DeviceName.value;

	var data = {
		netName: n
	};

	var r = API.setProvision(data, null);

	if (r === undefined || !r || r.statusCode != 0)
	{
		console.log("Can't set Device Name");
		return;
	}

	Data.provision.system.netName = n;
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


function systemSettingsChangeMixerHistory() {}
function systemSettingsChangeSimulatorHistory(){}
function systemSettingsChangeWaterHistory(){}
function systemSettingsChangeParserHistory(){}
function systemSettingsChangeParserDays(){}
function systemSettingsChangeMinWatering(){}
function systemSettingsChangeValves(){}
function systemSettingsChangeCorrectionPast(){}
function systemSettingsChangeMaxWater(){}


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
