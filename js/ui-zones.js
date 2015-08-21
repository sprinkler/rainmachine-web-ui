/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

window.ui = window.ui || {};

(function(_zones) {

	function showZones() {

		Data.zoneData = API.getZones();

		var zonesDiv = $('#zonesList');
		clearTag(zonesDiv);

		var zonesProperties = API.getZonesProperties();


		for (var i = 0; i < Data.zoneData.zones.length; i++)
		{
			var z = Data.zoneData.zones[i];
			var za = zonesProperties.zones[i];

			z.active = za.active;

			var template = loadTemplate("zone-entry");
			var nameElem = $(template, '[rm-id="zone-name"]');
			var startElem = $(template, '[rm-id="zone-start"]');
			var stopElem = $(template, '[rm-id="zone-stop"]');
			var editElem = $(template, '[rm-id="zone-edit"]');
			var typeElem = $(template,'[rm-id="zone-info"]');
			var timersElem = $(template, '[rm-id="zone-timers"]');

			template.id = "zone-" + z.uid;
			template.data = za;

			makeVisible(timersElem);

			if (z.master)
			{
				template.className += " master";
				makeHidden(timersElem);
				nameElem.textContent = "Master Valve";
				typeElem.textContent = "Before: " + Data.provision.system.masterValveBefore +
										" sec After: " + Data.provision.system.masterValveAfter + " sec";
			}
			else
			{
				nameElem.textContent = z.name;
				typeElem.textContent = zoneTypeToString(z.type);

				if (!za.active) {
					template.className += " inactive";
					nameElem.textContent += " (inactive)"
					makeHidden(timersElem);
				}
			}

			startElem.onclick = function() { startZone(this.parentNode.data.uid); };
			stopElem.onclick = function() { stopZone(this.parentNode.data.uid); };
			editElem.onclick = function() { showZoneSettings(this.parentNode.data); };

			zonesDiv.appendChild(template);

			setZoneState(z);

			var seconds = z.remaining;

			//Not running show default minutes
			if (z.state == 0) {
				try {
					seconds = Data.provision.system.zoneDuration[z.uid - 1];
				}
				catch(ex) {
					Data.provision = API.getProvision();
					seconds = Data.provision.system.zoneDuration[z.uid - 1];
				}
			}

			updateZoneTimer(z.uid, seconds);
		}
	}

	function refreshZone(zoneId, zone) {

		if(zone !== undefined && zone != null) {
			processZoneData(zone);
		}else {
			if( zoneId === undefined || !zoneId) {
				return;
			}
			API.getZones(zoneId, processZoneData);
		}
	}

	function processZoneData(z) {

		if( z.active != undefined) {
			processCompleteZone(z);
		}else {
			API.getZonesProperties(z.uid,
				function(za) {
					z.active = za.active;
					processCompleteZone(z);
				}
			);
		}
	}

	function processCompleteZone(z) {

		setZoneState(z);

		var seconds = z.remaining;

		//Not running show default minutes
		if (z.state == 0) {
			try {
				seconds = Data.provision.system.zoneDuration[z.uid - 1];
			}
			catch(ex) {
				Data.provision = API.getProvision();
				seconds = Data.provision.system.zoneDuration[z.uid - 1];
			}
		}

		updateZoneTimer(z.uid, seconds);
	}

	function showZoneSettings(zone)
	{
		var zoneSettingsDiv = $("#zonesSettings");
		clearTag(zoneSettingsDiv);
		makeHidden('#zonesList');

		var zoneTemplate = loadTemplate("zone-settings-template");

		var zoneMasterValveElem = $(zoneTemplate, '[rm-id="zone-master-valve"]');
		var zoneMasterValveContainerElem = $(zoneTemplate, '[rm-id="zone-master-valve-option"]');
		var zoneMasterTimerContainerElem = $(zoneTemplate, '[rm-id="zone-master-valve-timer"]');
		var zoneNameElem = $(zoneTemplate, '[rm-id="zone-name"]');
		var zoneActiveElem = $(zoneTemplate, '[rm-id="zone-active"]');
		var zoneVegetationElem = $(zoneTemplate, '[rm-id="zone-vegetation-type"]');
		var zoneForecastElem = $(zoneTemplate, '[rm-id="zone-forecast-data"]');
		var zoneHistoricalElem = $(zoneTemplate, '[rm-id="zone-historical-averages"]');


		if (zone.uid != 1){
			makeHidden(zoneMasterValveContainerElem);
			makeHidden(zoneMasterTimerContainerElem);
		}
		else{

		}
			zoneMasterValveElem.checked = zone.master;

		zoneTemplate.id = "zone-settings-" + zone.uid;
		zoneNameElem.value = zone.name;
		zoneActiveElem.checked = zone.active;
		zoneForecastElem.checked = zone.internet;
		zoneHistoricalElem.checked = zone.history;

		//Select the option in Vegetation select
		var strType = zoneTypeToString(zone.type);
		setSelectOption(zoneVegetationElem, strType);

		$(zoneTemplate, '[rm-id="zone-cancel"]').onclick = function(){ closeZoneSettings(); };
		$(zoneTemplate, '[rm-id="zone-save"]').onclick = function(){ saveZone(zone.uid); };
		zoneSettingsDiv.appendChild(zoneTemplate);
	}

	// Set zone running/pending/idle status

	function setZoneState(zone)
	{
		var zoneDiv = $("#zone-" + zone.uid);

		if (zoneDiv === undefined || zoneDiv === null)
		{
			console.log("Zone State: Cannot find zone %d", zone.uid);
			return -2;
		}

		var statusElem = $(zoneDiv, '[rm-id="zone-status"]');
		var startElem = $(zoneDiv, '[rm-id="zone-start"]');
		var stopElem = $(zoneDiv, '[rm-id="zone-stop"]');

		var state = zone.state;

		// API keeps state 2 pending but can have remaining 0 if it was stopped
		if (zone.remaining <= 0 && state == 2)
			var state = 0;

		switch (state)
		{
			case 1: //running
				statusElem.className = "zoneRunning";
				makeHidden(startElem)
				makeVisible(stopElem);
				break;
			case 2: //pending running
				statusElem.className = "zonePending";
				makeHidden(startElem)
				makeVisible(stopElem);
				break;
			default: //idle
				statusElem.className = "zoneIdle";
				makeHidden(stopElem);
				makeVisible(startElem);
				break;
		}

		//Don't show buttons for master or inactive zones
		if (zone.master || ! zone.active)
		{
			makeHidden(startElem);
			makeHidden(stopElem);
		}

	}

	function updateZoneTimer(uid, seconds)
	{
		var zoneDiv = $("#zone-" + uid);

		if (zoneDiv === undefined || zoneDiv === null)
		{
			console.log("Zone Timer: Cannot find zone %d", uid);
			return -2;
		}

		var minutesElem = $(zoneDiv, '[rm-id="zone-minutes"]');
		var secondsElem = $(zoneDiv, '[rm-id="zone-seconds"]');


		var m = (seconds / 60) >> 0;
		var s = (seconds % 60) >> 0;

		console.log("Seconds: %d - %d:%d", seconds, m, s);

		minutesElem.value = m;
		secondsElem.value = s;
	}

	function startZone(uid)
	{
		var zoneDiv = $("#zone-" + uid);

		if (zoneDiv === undefined || zoneDiv === null)
		{
			console.log("Zone Start: Cannot find zone %d", uid);
			return -2;
		}

		var minutesElem = $(zoneDiv, '[rm-id="zone-minutes"]');
		var secondsElem = $(zoneDiv, '[rm-id="zone-seconds"]');

		try {

			displayAjaxLoader();

			var duration = parseInt(minutesElem.value) * 60 + parseInt(secondsElem.value);
			API.startZone(uid, duration, function (){
				refreshZone(uid);
				hideAjaxLoader();
			});

		} catch(e) {
			console.log("Cannot start zone %d with duration %d", uid, duration);
		}
	}

	function stopZone(uid)
	{
		displayAjaxLoader();

		console.log("Stop zone %d", uid);
		API.stopZone(uid, function(response) {
			refreshZone(uid);
			hideAjaxLoader();
		});

	}

	function stopAllWatering()
	{
		console.log("Stop All Watering");
		API.stopAll();
		showZones();
	}

	function closeZoneSettings()
	{
		var zoneSettingsDiv = $('#zonesSettings');
		console.log("Closing zone settings");
		clearTag(zoneSettingsDiv);
		makeVisible('#zonesList');
	}

	function saveZone(uid)
	{
		var zoneSettingsDiv = $('#zone-settings-' + uid);
		var zoneProperties = {}
		var shouldSetMasterValve = false;

		if (zoneSettingsDiv === undefined || zoneSettingsDiv === null)
		{
			console.log("Cannot find zone settings div for zone %d", uid);
			return -2;
		}

		var zoneMasterValveElem = $(zoneSettingsDiv, '[rm-id="zone-master-valve"]');
		var zoneNameElem = $(zoneSettingsDiv, '[rm-id="zone-name"]');
		var zoneActiveElem = $(zoneSettingsDiv, '[rm-id="zone-active"]');
		var zoneVegetationElem = $(zoneSettingsDiv, '[rm-id="zone-vegetation-type"]');
		var zoneForecastElem = $(zoneSettingsDiv, '[rm-id="zone-forecast-data"]');
		var zoneHistoricalElem = $(zoneSettingsDiv, '[rm-id="zone-historical-averages"]');

		zoneProperties.uid = uid;
		zoneProperties.name = zoneNameElem.value;
		zoneProperties.active = zoneActiveElem.checked;
		zoneProperties.internet = zoneForecastElem.checked;
		zoneProperties.history = zoneHistoricalElem.checked;
		zoneProperties.type = parseInt(zoneVegetationElem.options[zoneVegetationElem.selectedIndex].value);

		if (uid == 1)
		{
			zoneProperties.master = zoneMasterValveElem.checked;
			if (zoneProperties.master != Data.provision.system.useMasterValve) {
				shouldSetMasterValve = true;
			}

			saveMasterValveTimer();
		}

		console.log("Saving zone %d with properties: %o", uid, zoneProperties);
		API.setZonesProperties(uid, zoneProperties, null);

		if (shouldSetMasterValve)
		{
			var data = { useMasterValve: zoneProperties.master };
			API.setProvision(data, null);
			Data.provision.system.useMasterValve = zoneProperties.master;
		}



		closeZoneSettings();
		refreshZone(uid);
	}

	function saveMasterValveTimer()
	{

		var masterValveBeforeElem = $("#zoneSettingMasterValveBefore");
		var masterValveAfterElem = $("#zoneSettingMasterValveAfter");

		var b = parseInt(masterValveBeforeElem.value) * 60;
		var a = parseInt(masterValveAfterElem.value) * 60;

		if(!isNaN(b) && !isNaN(a)) {
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

	}

	function zoneTypeToString(type)
	{
		switch (type)
		{
			case 2:
				return "Lawn";
			case 3:
				return "Fruit Trees";
			case 4:
				return "Flowers";
			case 5:
				return "Vegetables";
			case 6:
				return "Citrus";
			case 7:
				return "Trees and Bushes";
			default:
				return "Other"
		}
	}


	//--------------------------------------------------------------------------------------------
	//
	//
	_zones.showZones = showZones;
	_zones.showZoneSettings = showZoneSettings;
	_zones.stopAllWatering = stopAllWatering;
	_zones.refreshZone = refreshZone;

} (window.ui.zones = window.ui.zones || {}));