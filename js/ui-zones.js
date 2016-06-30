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

	var uiElems = {}; //Current editing zone settings elements
	var uiElemsAll = {}; //All zones elements without settings elements
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
		uiElemsAll.zones = {};

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
			uiElemsAll.zones[z.uid] = zoneElem;
		}

		uiElemsAll.editAll = $('#home-zones-edit');
		uiElemsAll.editAll.onclick = function() { showZones(); onZonesEdit() };
		uiElemsAll.editAll.isEditing = false;

		uiElemsAll.stopAll = $('#home-zones-stopall');
        uiElemsAll.stopAll.onclick = stopAllWatering;
    }

	function updateZones() {

		if (!uiElemsAll.hasOwnProperty("zones"))
			createZonesElems();

		for (var i = 0; i < Data.zoneData.zones.length; i++)
		{
			var z = Data.zoneData.zones[i];
			var za = Data.zoneAdvData.zones[i];
			var elem = uiElemsAll.zones[z.uid];

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
					elem.nameElem.textContent += " (inactive)";
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
		//console.log("Queue top: %o", queueTop);

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

		if (typeof queueTop.remaining === "undefined") {
			queueTimer.textContent = "R";
			queueTimer.className = "right parserRefresh icon";
		} else {
			queueTimer.textContent = Util.secondsToMMSS(queueTop.remaining);
		}

		container.appendChild(template);
	}

	function loadZoneTemplate() {

		var templateInfo = {};

		templateInfo.zoneTemplateElem = loadTemplate("zone-settings-template");

		// Master Valve elements
		templateInfo.masterValveTitleElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-master-valve-title"]');
		templateInfo.masterValveContainerElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-master-valve-option"]');
		templateInfo.masterTimerContainerElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-master-valve-timer"]');
		templateInfo.masterValveElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-master-valve"]');
		templateInfo.masterValveBeforeElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-master-valve-before"]');
		templateInfo.masterValveBeforeSecElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-master-valve-before-sec"]');
		templateInfo.masterValveAfterElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-master-valve-after"]');
		templateInfo.masterValveAfterSecElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-master-valve-after-sec"]');

		// Basic properties
		templateInfo.nameElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-name"]');
		templateInfo.activeElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-active"]');
		templateInfo.forecastElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-forecast-data"]');
		templateInfo.historicalElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-historical-averages"]');

		// Advanced properties
		templateInfo.vegetationElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-vegetation-type"]');
		templateInfo.soilElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-soil-type"]');
		templateInfo.sprinklerElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-sprinkler-type"]');
		templateInfo.exposureElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-exposure-type"]');
		templateInfo.slopeElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-slope-type"]');
		templateInfo.monthsCoefElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-months-coef-enable"]');

		// Watersense properties
		templateInfo.advVegElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-vegetation-advanced"]');
		templateInfo.advVegCropElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-vegetation-cropcoef"]');
		templateInfo.advDepletionElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-vegetation-depletion"]');
		templateInfo.advRootDepthElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-vegetation-rootdepth"]');
		templateInfo.advTallElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-vegetation-tall"]');
		templateInfo.advPermWiltingElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-vegetation-permwilting"]');

		templateInfo.advSoilElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-soil-advanced"]');
		templateInfo.advIntakeRateElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-soil-intakerate"]');
		templateInfo.advFieldCapElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-soil-fieldcapacity"]');

		templateInfo.advSlopeElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-slope-advanced"]');
		templateInfo.advSurfAccElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-surface-acc"]');

		templateInfo.advSprinkerElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-sprinkler-advanced"]');
		templateInfo.advPrecipRateElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-sprinkler-preciprate"]');
		templateInfo.advAppEffElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-sprinkler-appefficiency"]');

		templateInfo.advExposureElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-exposure-advanced"]');
		templateInfo.advExposureCoefElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-exposure-coef"]');

		// Watersense crop coef for each month
		templateInfo.advMonthsCoefElem = $(templateInfo.zoneTemplateElem, '[rm-id="zone-months-coef-advanced"]');
		templateInfo.advMonthsCoef = [];
		for (var z = 0; z < 12; z++) {
			var rmid = '[rm-id="zone-months-coef' + z + '"]';
			var elem = $(templateInfo.zoneTemplateElem, rmid);
			templateInfo.advMonthsCoef.push(elem);
		}

		// Buttons
		templateInfo.cancel = $(templateInfo.zoneTemplateElem, '[rm-id="zone-cancel"]');
		templateInfo.save = $(templateInfo.zoneTemplateElem, '[rm-id="zone-save"]');

		return templateInfo;
	}

	function showZoneSettings(zone)
	{
		console.log(zone);
		var zoneSettingsDiv = $("#zonesSettings");
		clearTag(zoneSettingsDiv);
		makeHidden('#zonesList');

		uiElems = loadZoneTemplate();

		if (zone.uid == 1) {
			uiElems.masterValveElem.checked = Data.provision.system.useMasterValve;
			if (Data.provision.system.useMasterValve) {
				var beforeTimer = Util.secondsToHuman(Data.provision.system.masterValveBefore);
				var afterTimer = Util.secondsToHuman(Data.provision.system.masterValveAfter);

				uiElems.masterValveBeforeElem.value = beforeTimer.minutes;
				uiElems.masterValveBeforeSecElem.value = beforeTimer.seconds;
				uiElems.masterValveAfterElem.value = afterTimer.minutes;
				uiElems.masterValveAfterSecElem.value = afterTimer.seconds;
			} else {
				onMasterValveChange();
			}


		} else {
			makeHidden(uiElems.masterValveTitleElem);
			makeHidden(uiElems.masterValveContainerElem);
			makeHidden(uiElems.masterTimerContainerElem);
		}

		uiElems.id = uiElems.zoneTemplateElem.id = "zone-settings-" + zone.uid;
		uiElems.nameElem.value = zone.name;
		uiElems.activeElem.checked = zone.active;
		uiElems.forecastElem.checked = zone.internet;
		uiElems.historicalElem.checked = zone.history;

		//Select the option in Vegetation select
		//var strType = zoneVegetationTypeToString(zone.type);
		//setSelectOption(zoneVegetationElem, strType);
		setSelectOption(uiElems.vegetationElem, zone.type, true);
		setSelectOption(uiElems.soilElem, zone.soil, true);
		setSelectOption(uiElems.sprinklerElem, zone.group_id, true);
		setSelectOption(uiElems.exposureElem, zone.sun, true);
		setSelectOption(uiElems.slopeElem, zone.slope, true);

		// Change events
		uiElems.vegetationElem.onchange = onVegetationChange;
		uiElems.soilElem.onchange = onSoilChange;
		uiElems.sprinklerElem.onchange = onSprinklerChange;
		uiElems.exposureElem.onchange = onExposureChange;
		uiElems.slopeElem.onchange = onSlopeChange;
		uiElems.monthsCoefElem.onclick = onMonthsCoefChange;
		onVegetationChange();
		onSoilChange();
		onSprinklerChange();
		onExposureChange();
		onSlopeChange();
		onMonthsCoefChange();

		// Advanced Custom values
		uiElems.advAppEffElem.value = zone.waterSense.appEfficiency;
		uiElems.advDepletionElem.value = zone.waterSense.maxAllowedDepletion;
		uiElems.advExposureCoefElem.value = -1; //TODO not on API/DB
		uiElems.advFieldCapElem.value = zone.waterSense.fieldCapacity;
		uiElems.advIntakeRateElem.value = zone.waterSense.soilIntakeRate;
		uiElems.advPermWiltingElem.value = zone.waterSense.permWilting;
		uiElems.advPrecipRateElem.value = zone.waterSense.precipitationRate;
		uiElems.advRootDepthElem.value = zone.waterSense.rootDepth;
		uiElems.advSurfAccElem.value = zone.waterSense.allowedSurfaceAcc;
		uiElems.advTallElem.checked = zone.waterSense.isTallPlant; //TODO redundant
		uiElems.advVegCropElem.value = -1; //TODO not on API/DB

		var monthsCoef = zone.waterSense.detailedMonthsKc;
		for (z = 0; z < monthsCoef.length; z++) {
			uiElems.advMonthsCoef[z].value = monthsCoef[z];
		}

		uiElems.cancel.onclick = function(){ closeZoneSettings(); };
		uiElems.save.onclick = function(){ saveZone(zone.uid); };
		uiElems.masterValveElem.onclick = onMasterValveChange;

		zoneSettingsDiv.appendChild(uiElems.zoneTemplateElem);
	}

	function onZonesEdit() {
		if (uiElemsAll.editAll.isEditing) {
			for (var id in uiElemsAll.zones) {
				var elem = uiElemsAll.zones[id];
				elem.editElem.style.display = "none";
                elem.timerElem.style.opacity = "inherit";
			}
			uiElemsAll.editAll.textContent = "Edit";
			uiElemsAll.editAll.isEditing = false;

		} else {
			for (var id in uiElemsAll.zones) {
				var elem = uiElemsAll.zones[id];
				elem.stopElem.style.display = "none";
				elem.editElem.style.display = "inherit";
				elem.timerElem.style.opacity = "0.3";
			}
			uiElemsAll.editAll.textContent = "Done";
			uiElemsAll.editAll.isEditing = true;
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
		var elem = uiElemsAll.zones[zone.uid];

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
		if (zone.master || !zone.active || uiElemsAll.editAll.isEditing) {
			makeHidden(elem.stopElem);
		}
	}

	function updateZoneTimer(zone)
	{
		var elem = uiElemsAll.zones[zone.uid];

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
		var zoneProperties = {};
		var zoneAdvProperties = {};
		var shouldSetMasterValve = false;

		if (!uiElems || !uiElems.hasOwnProperty("id") || !uiElems.id === uid) {
			console.log("Cannot find uiElems for zone %d", uid);
			return -2;
		}

		zoneProperties.uid = uid;
		zoneProperties.name = uiElems.nameElem.value;
		zoneProperties.active = uiElems.activeElem.checked;
		zoneProperties.internet = uiElems.forecastElem.checked;
		zoneProperties.history = uiElems.historicalElem.checked;
		zoneProperties.type = parseInt(getSelectValue(uiElems.vegetationElem));
		zoneProperties.soil = parseInt(getSelectValue(uiElems.soilElem));
		zoneProperties.group_id = parseInt(getSelectValue(uiElems.sprinklerElem));
		zoneProperties.sun = parseInt(getSelectValue(uiElems.exposureElem));
		zoneProperties.slope = parseInt(getSelectValue(uiElems.slopeElem));

		zoneAdvProperties.appEfficiency = uiElems.advAppEffElem.value;
		zoneAdvProperties.maxAllowedDepletion = uiElems.advDepletionElem.value;
		//uiElems.advExposureCoefElem.value = -1; //TODO not on API/DB
		zoneAdvProperties.fieldCapacity = uiElems.advFieldCapElem.value;
		zoneAdvProperties.soilIntakeRate = uiElems.advIntakeRateElem.value;
		zoneAdvProperties.permWilting = uiElems.advPermWiltingElem.value;
		zoneAdvProperties.precipitationRate = uiElems.advPrecipRateElem.value
		zoneAdvProperties.rootDepth = uiElems.advRootDepthElem.value;
		zoneAdvProperties.allowedSurfaceAcc = uiElems.advSurfAccElem.value;
		zoneAdvProperties.isTallPlant = uiElems.advTallElem.checked;
		//uiElems.advVegCropElem.value = -1; //TODO not on API/DB
		zoneAdvProperties.detailedMonthsKc = [];

		for (var z = 0; z < 12; z++) {
			zoneAdvProperties.detailedMonthsKc.push(uiElems.advMonthsCoef[z].value);
		}

		if (uid == 1)
		{
			zoneProperties.master = uiElems.masterValveElem.checked;

			var beforeTimer = { minutes: 0, seconds: 0};
			var afterTimer = { minutes: 0, seconds:0};

			beforeTimer.minutes = parseInt(uiElems.masterValveBeforeElem.value) || 0;
			beforeTimer.seconds = parseInt(uiElems.masterValveBeforeSecElem.value) || 0;

			afterTimer.minutes = parseInt(uiElems.masterValveAfterElem.value) || 0;
			afterTimer.seconds = parseInt(uiElems.masterValveAfterSecElem.value) || 0;

			var b =  beforeTimer.minutes * 60 + beforeTimer.seconds;
			var a = afterTimer.minutes * 60 + afterTimer.seconds;

			Util.saveMasterValve(zoneProperties.master, b, a);
		}

		console.log("Saving zone %d with properties: %o and %o", uid, zoneProperties, zoneAdvProperties);
		API.setZonesProperties(uid, zoneProperties, zoneAdvProperties);


		closeZoneSettings();
		showZones();
	}

	function onMasterValveChange() {
		if (!uiElems.masterValveElem.checked) {
			makeHidden(uiElems.masterTimerContainerElem);
		} else {
			makeVisible(uiElems.masterTimerContainerElem);
		}
	}

	function onMonthsCoefChange() {
		if (!uiElems.monthsCoefElem.checked) {
			makeHidden(uiElems.advMonthsCoefElem);
		} else {
			makeVisible(uiElems.advMonthsCoefElem);
		}
	}

	function onVegetationChange() {
		toggleOtherOptions(uiElems.vegetationElem, uiElems.advVegElem);
	}

	function onSoilChange() {
		toggleOtherOptions(uiElems.soilElem, uiElems.advSoilElem);
	}

	function onSprinklerChange() {
		toggleOtherOptions(uiElems.sprinklerElem, uiElems.advSprinkerElem);
	}

	function onExposureChange() {
		toggleOtherOptions(uiElems.exposureElem, uiElems.advExposureElem);
	}

	function onSlopeChange(){
		toggleOtherOptions(uiElems.slopeElem, uiElems.advSlopeElem);
	}

	function toggleOtherOptions(selectElem, advContainer) {
		var v = parseInt(getSelectValue(selectElem));
		// API rule a type of 99 means Other/Custom settings
		if (v == 99) {
			makeVisible(advContainer);
		} else {
			makeHidden(advContainer);
		}
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
	_zones.uiElems = uiElemsAll;

} (window.ui.zones = window.ui.zones || {}));