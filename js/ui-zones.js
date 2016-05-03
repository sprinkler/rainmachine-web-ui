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
	};

	var zoneType = {
		masterValveStart: 1001,
		masterValveStop: 1002,
		zoneDelay: 1003,
		cycleDelay: 1004
	};

	var zoneTypeTitle = {
		1001: "Master Valve pre-open ",
		1002: "Master Valve post-open ",
		1003: "Delay Between cycles ",
		1004: "Soak time "
	};

	var uiElems = {};
	var maxZoneManualSeconds = 3600;
	var startedFromPrograms = true; //set default to true so we can set sliders positions at page load/refresh

	function showZones() {
		APIAsync.getZones().then(
			function(o) {
				Data.zoneData = o;
				APIAsync.getZonesProperties().then(function(o) { Data.zoneAdvData = o; updateZones();})
			}
		)
    }

	//Only uses API.getZones() as advanced properties doesn't change often
    function showZonesSimple() {
    	APIAsync.getZones().then(function(o) { Data.zoneData = o; updateZones();} );
    }


	function createZonesElems() {
		var zonesContainer = $('#zonesList');
		clearTag(zonesContainer);
		uiElems.zones = {};

		for (var i = 0; i < Data.zoneData.zones.length; i++)
		{
			var z = Data.zoneData.zones[i];
			var zoneElem = {};

			zoneElem.template = loadTemplate("zone-entry");
			zoneElem.nameElem = $(zoneElem.template, '[rm-id="zone-name"]');
			zoneElem.stopElem = $(zoneElem.template, '[rm-id="zone-stop"]');
			zoneElem.editElem = $(zoneElem.template, '[rm-id="zone-edit"]');
			zoneElem.typeElem = $(zoneElem.template,'[rm-id="zone-info"]');
			zoneElem.statusElem = $(zoneElem.template,'[rm-id="zone-status"]');
			zoneElem.timerElem = $(zoneElem.template, '[rm-id="zone-timer"]');

			zoneElem.template.id = "zone-" + z.uid;

			zonesContainer.appendChild(zoneElem.template);

			zoneElem.timerElem.id = "zone-timer-" + z.uid;
			zoneElem.timerElem.controller = new rangeSlider(zoneElem.timerElem, maxZoneManualSeconds, onZoneSlider.bind(null, z));
			uiElems.zones[z.uid] = zoneElem;
		}

		uiElems.editAll = $('#home-zones-edit');
		uiElems.editAll.onclick = function() { showZones(); onZonesEdit() };
		uiElems.editAll.isEditing = false;

		uiElems.stopAll = $('#home-zones-stopall');
        uiElems.stopAll.onclick = stopAllWatering;
    }

	function updateZones() {

		if (!uiElems.hasOwnProperty("zones"))
			createZonesElems();

		for (var i = 0; i < Data.zoneData.zones.length; i++)
		{
			var z = Data.zoneData.zones[i];
			var za = Data.zoneAdvData.zones[i];
			var elem = uiElems.zones[z.uid];

            elem.template.className="zone-line";
			elem.template.data = za;

			if (z.master)
			{
				elem.template.className += " master";
				makeHidden(elem.timerElem);
				elem.nameElem.textContent = "Master Valve";
				var b = Data.provision.system.masterValveBefore/60;
				var a = Data.provision.system.masterValveAfter/60;
				elem.typeElem.textContent = "Before: " + b + " min After: " + a + " min";
			}
			else
			{
				elem.nameElem.textContent = z.uid + ". " + z.name;
				elem.typeElem.textContent = zoneVegetationTypeToString(z.type);

				if (!z.active) {
					elem.template.className += " inactive";
					elem.nameElem.textContent += " (inactive)"
					makeHidden(elem.timerElem);
				} else {
					makeVisibleBlock(elem.timerElem);
				}
			}

			elem.stopElem.onclick = function() { stopZone(this.parentNode.parentNode.data.uid); };
			elem.editElem.onclick = function() { showZoneSettings(this.parentNode.parentNode.data); };

			setZoneState(z);
			updateZoneTimer(z);
		}
	}

	function updateWateringQueue(wateringQueue) {

		var container = $('#wateringQueueContainer');
		var template = loadTemplate("water-queue-template");
		clearTag(container);

		var queue = wateringQueue.queue;

		if (typeof queue === "undefined" || typeof queue[0] === "undefined") {
			console.error("Queue: Empty watering queue");
			return;
		}

		var zones = Data.zoneData.zones;
		if (zones === null) {
			console.error("Queue: No zones information");
			return;
		}

		var queueTop = queue[0];
		console.log("Queue top: %o", queueTop);

		var queueZone = $(template, '[rm-id="water-queue-zone"]');
		var queueTimer = $(template, '[rm-id="water-queue-timer"]');
		var queueIsProgram = $(template, '[rm-id="water-queue-is-program"]');
		var queueDetails = $(template, '[rm-id="water-queue-details"]');
		var realZoneId = queueTop.zid - 1;

		if (queueTop.zid == zoneType.masterValveStart || queueTop.zid == zoneType.masterValveStop) {
			realZoneId = 0; //Master valve always first zone
		}

		//Show proper names for Master Valve, Soak, Delay
		if (zoneTypeTitle.hasOwnProperty(queueTop.zid)) {
			queueZone.textContent = zoneTypeTitle[queueTop.zid];
		} else {
			queueZone.textContent = zones[realZoneId].name;
		}

		if (queueTop.manual) {
			queueIsProgram.textContent = "Z";
		} else {
			queueIsProgram.textContent = "P";
		}

		var programName;
		if (queueTop.pid !== null) {
			var tmp = getProgramById(queueTop.pid);
			if (tmp !== null)
				programName = tmp.name;
			else
				programName = queueTop.pid
		} else {
			programName = "Manual";
		}

		//Cycle information different for Soak delay
		var cycleText = "";

		if (queueTop.cycles > 1) {
			cycleText = "cycle " + queueTop.cycle + "/" + queueTop.cycles;
		}

		if (queueTop.zid != zoneType.cycleDelay) {
			queueDetails.textContent = cycleText;
		} else {
			queueZone.textContent += cycleText;
		}

		queueDetails.textContent += " program " + programName;

		// No timing information for soak/zone delay
		if (queueTop.zid == zoneType.cycleDelay || queueTop.zid == zoneType.zoneDelay) {
			queueTimer.textContent = "R";
			queueTimer.className = "right parserRefresh icon";
		} else {
			queueTimer.textContent = Util.secondsToMMSS(zones[realZoneId].remaining);
		}

		container.appendChild(template);
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
		var strType = zoneVegetationTypeToString(zone.type);
		setSelectOption(zoneVegetationElem, strType);

		$(zoneTemplate, '[rm-id="zone-cancel"]').onclick = function(){ closeZoneSettings(); };
		$(zoneTemplate, '[rm-id="zone-save"]').onclick = function(){ saveZone(zone.uid); };
		zoneSettingsDiv.appendChild(zoneTemplate);
	}

	function onZonesEdit() {

		if (uiElems.editAll.isEditing) {
			for (var id in uiElems.zones) {
				var elem = uiElems.zones[id];
				elem.editElem.style.display = "none";
                elem.timerElem.style.opacity = "inherit";
			}
			uiElems.editAll.textContent = "Edit";
			uiElems.editAll.isEditing = false;

		} else {
			for (var id in uiElems.zones) {
				var elem = uiElems.zones[id];
				elem.stopElem.style.display = "none";
				elem.editElem.style.display = "inherit";
				elem.timerElem.style.opacity = "0.3";
			}
			uiElems.editAll.textContent = "Done";
			uiElems.editAll.isEditing = true;
		}
	}

	function onZoneSlider(zone, value) {
		console.log("Zone: %s Stopped dragging at %s (%s)", zone.uid, value, Util.secondsToMMSS(value));
		if (value > 0)
			API.startZone(zone.uid, value);
		else
			API.stopZone(zone.uid);

		showZonesSimple();
	}

	function onProgramStart() {
		startedFromPrograms = true;
	}

	// Set zone running/pending/idle status
	function setZoneState(zone)
	{
		var elem = uiElems.zones[zone.uid];

		if (elem === undefined || elem === null)	{
			console.log("Zone State: Cannot find zone %d", zone.uid);
			return -2;
		}

		var state = zone.state;

		// API keeps state 2 pending but can have remaining 0 if it was stopped by user
		if (zone.remaining <= 0 && state == zoneState.pending)
			state = zoneState.idle;

		switch (state)
		{
			case zoneState.running:
				elem.statusElem.className = "zoneRunning";
				elem.stopElem.setAttribute("state", "running");
				makeVisible(elem.stopElem);
				break;
			case zoneState.pending:
				elem.statusElem.className = "zonePending";
				elem.stopElem.setAttribute("state", "pending");
				makeVisible(elem.stopElem);
				break;
			default: //idle
				elem.statusElem.className = "zoneIdle";
				elem.stopElem.setAttribute("state", "idle"); //TODO sets display:none same as makeHidden()
				makeHidden(elem.stopElem);
				break;
		}

		//Don't show buttons for master or inactive zones or when editing zones
		if (zone.master || !zone.active || uiElems.editAll.isEditing) {
			makeHidden(elem.stopElem);
		}
	}

	function updateZoneTimer(zone)
	{
		var elem = uiElems.zones[zone.uid];

		if (elem === undefined || elem === null) {
			console.log("Zone Timer: Cannot find zone %d", uid);
			return -2;
		}

		var seconds = 0; //Data.provision.system.zoneDuration[zone.uid - 1];

		if (zone.state == zoneState.running || (zone.state == zoneState.pending && zone.remaining > 0)) {
			seconds = zone.remaining
		}

		if (elem.timerElem && elem.timerElem.controller) {
			var controller = elem.timerElem.controller;

			//This will set the range of the slider so the zones will start from rightmost position
			if (startedFromPrograms) {
				if (seconds > 0) {
					controller.setMaxValue(seconds);
				}

				// We set all zones
				if (Data.provision.system && zone.uid == Data.provision.system.localValveCount)
				 	startedFromPrograms = false
			}

			//Don't update position/max value if user is dragging
			if (controller.isDragging())
				return;

			if (seconds > controller.getMaxValue())
				controller.setMaxValue(seconds);

			//Put the slider range to default
			if (seconds == 0)
				controller.setMaxValue(maxZoneManualSeconds);

			controller.setPosition(seconds);
		}
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
		window.ui.programs.showPrograms(); //Also refresh programs state
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

	function zoneVegetationTypeToString(type)
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
	_zones.onProgramStart = onProgramStart;
	_zones.updateWateringQueue = updateWateringQueue;
	_zones.uiElems = uiElems;

} (window.ui.zones = window.ui.zones || {}));