/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

window.ui = window.ui || {};

(function(_zones) {

	var zoneState = {
		idle: 0,
		running: 1,
		pending: 2
	}

	var maxZoneManualSeconds = 36000;

	function showZones() {
		APIAsync.getZones().then(
			function(o) {
				Data.zoneData = o;
				APIAsync.getZonesProperties().then(function(o) { Data.zoneAdvData = o; renderZones();})
			}
		)
    }

	//Only uses API.getZones() as advanced properties doesn't change often
    function showZonesSimple() {
    	APIAsync.getZones().then(function(o) { Data.zoneData = o; renderZones();} );
    }

	function renderZones() {
		var zonesDiv = $('#zonesList');
		clearTag(zonesDiv);

		for (var i = 0; i < Data.zoneData.zones.length; i++)
		{
			var z = Data.zoneData.zones[i];
			var za;

			if (Data.zoneAdvData !== undefined)
				za = Data.zoneAdvData.zones[i];
			else
				za.active = true;

			z.active = za.active;

			var template = loadTemplate("zone-entry");
			var nameElem = $(template, '[rm-id="zone-name"]');
			var startElem = $(template, '[rm-id="zone-start"]');
			var stopElem = $(template, '[rm-id="zone-stop"]');
			var editElem = $(template, '[rm-id="zone-edit"]');
			var typeElem = $(template,'[rm-id="zone-info"]');
			var timersElem = $(template, '[rm-id="zone-timers"]');
			var timerElem = $(template, '[rm-id="zone-timer"]');

			template.id = "zone-" + z.uid;
			template.data = za;

			makeVisible(timersElem);

			if (z.master)
			{
				template.className += " master";
				makeHidden(timersElem);
				nameElem.textContent = "Master Valve";
				var b = Data.provision.system.masterValveBefore/60;
				var a = Data.provision.system.masterValveAfter/60;
				typeElem.textContent = "Before: " + b + " min After: " + a + " min";
			}
			else
			{
				nameElem.textContent = z.uid + ". " + z.name;
				typeElem.textContent = zoneTypeToString(z.type);

				if (!za.active) {
					template.className += " inactive";
					nameElem.textContent += " (inactive)"
					makeHidden(timersElem);
				}
			}

			startElem.onclick = function() { startZone(this.parentNode.parentNode.data.uid); };
			stopElem.onclick = function() { stopZone(this.parentNode.parentNode.data.uid); };
			editElem.onclick = function() { showZoneSettings(this.parentNode.parentNode.data); };
			zonesDiv.appendChild(template);

			timerElem.id = "zone-timer-" + z.uid;
			timerElem.controller = new rangeSlider(timerElem, maxZoneManualSeconds, function(value) {console.log("Stopped dragging at %s (%s)", value, Util.secondsToMMSS(value));});
			setZoneState(z);
			updateZoneTimer(z);
		}
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


		if (zone.uid == 1) {
			zoneMasterValveElem.checked = Data.provision.system.useMasterValve;

			var masterValveBeforeElem = $(zoneTemplate, '[rm-id="zone-master-valve-before"]');
            var masterValveAfterElem = $(zoneTemplate, '[rm-id="zone-master-valve-after"]');

            var b = Data.provision.system.masterValveBefore/60;
            var a = Data.provision.system.masterValveAfter/60;

            masterValveBeforeElem.value = b;
            masterValveAfterElem.value = a;

		} else {
			makeHidden(zoneMasterValveContainerElem);
        	makeHidden(zoneMasterTimerContainerElem);
		}

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

		if (zoneDiv === undefined || zoneDiv === null)	{
			console.log("Zone State: Cannot find zone %d", zone.uid);
			return -2;
		}

		var statusElem = $(zoneDiv, '[rm-id="zone-status"]');
		var startElem = $(zoneDiv, '[rm-id="zone-start"]');
		var stopElem = $(zoneDiv, '[rm-id="zone-stop"]');

		var state = zone.state;

		// API keeps state 2 pending but can have remaining 0 if it was stopped by user
		if (zone.remaining <= 0 && state == zoneState.pending)
			state = zoneState.idle;

		switch (state)
		{
			case zoneState.running:
				statusElem.className = "zoneRunning";
				makeHidden(startElem)
				makeVisible(stopElem);
				break;
			case zoneState.pending:
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
		if (zone.master || !zone.active) {
			makeHidden(startElem);
			makeHidden(stopElem);
		}
	}

	function updateZoneTimer(zone)
	{
		var zoneDiv = $("#zone-" + zone.uid);

		if (zoneDiv === undefined || zoneDiv === null || zoneDiv === document.activeElement) {
			console.log("Zone Timer: Cannot find zone %d", uid);
			return -2;
		}

		var seconds;

		if (zone.state == zoneState.running) {
			seconds = zone.remaining
		} else {
			seconds = Data.provision.system.zoneDuration[zone.uid - 1];
		}

		var minutesElem = $(zoneDiv, '[rm-id="zone-minutes"]');
		var secondsElem = $(zoneDiv, '[rm-id="zone-seconds"]');

		var m = (seconds / 60) >> 0;
		var s = (seconds % 60) >> 0;

		minutesElem.value = m;
       	secondsElem.value = s;

		if( zone.state == zoneState.running) {
			minutesElem.setAttribute('disabled', "");
			secondsElem.setAttribute('disabled', "");
        } else {
			minutesElem.removeAttribute('disabled');
			secondsElem.removeAttribute('disabled');
		}
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
			var duration = parseInt(minutesElem.value) * 60 + parseInt(secondsElem.value);
			API.startZone(uid, duration);
		} catch(e) {
			console.log("Cannot start zone %d with duration %d", uid, duration);
		}

		showZones();
	}

	function stopZone(uid)
	{
		console.log("Stop zone %d", uid);
		API.stopZone(uid);
		showZones();
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

			var masterValveBeforeElem = $(zoneSettingsDiv, '[rm-id="zone-master-valve-before"]');
            var masterValveAfterElem = $(zoneSettingsDiv, '[rm-id="zone-master-valve-after"]');

            var b = parseInt(masterValveBeforeElem.value) * 60;
            var a = parseInt(masterValveAfterElem.value) * 60;

     		Util.saveMasterValve(zoneProperties.master, b, a);
		}

		console.log("Saving zone %d with properties: %o", uid, zoneProperties);
		API.setZonesProperties(uid, zoneProperties, null);

		closeZoneSettings();
		showZones();
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
	_zones.showZonesSimple = showZonesSimple;
	_zones.showZoneSettings = showZoneSettings;
	_zones.stopAllWatering = stopAllWatering;

} (window.ui.zones = window.ui.zones || {}));