/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

window.ui = window.ui || {};

(function(_programs) {

    var selectedProgram = null;
    var uiElems = {}; //current program UI elements
	var uiElemsAll = {}; //all program UI elements
    var isEditing = false;

    var FrequencyType = {
        Daily: 0,
        EveryN: 1,
        Weekday: 2,
        OddEven: 4 // Odd is param is 1, Even is param is 0
    };

    var FrequencyParam = {
        Odd: 1,
        Even: 0,
        EveryNFormat: 2,            // The number of days
        WeekdayFormat: "SSFTWTM0"   // Format
    };

    var ProgramStatus = {
        NotRunning: 0,
        Running: 1,
        Pending: 2
    };

	var CyclesType = {
		Off: 0,
		Auto: 1,
		Manual: 2
	};

	var ZoneDurationType = CyclesType;

	var DelayType = {
		Off: 0,
		Manual: 1
	};

    var WeekdaysOrder = ["sunday", "saturday", "friday", "thursday", "wednesday", "tuesday", "monday"]; // See FrequencyParam.WeekdayFormat

    //--------------------------------------------------------------------------------------------
    //
    //

	function showPrograms() {
		APIAsync.getPrograms().then(function(o) { Data.programs = o; updatePrograms(); })
	}

	function createProgramsElems() {
		var programListDiv = $('#programsList');
		clearTag(programListDiv);
		makeVisible('#programs');

		uiElemsAll.programs = {};

		for (var i = 0; i < Data.programs.programs.length; i++) {
			var p = Data.programs.programs[i];
			createProgramElems(p)
		}

		uiElemsAll.add = $('#home-programs-add');
		uiElemsAll.edit = $('#home-programs-edit');
		uiElemsAll.add.onclick = function() { showProgramSettings(null); };
		uiElemsAll.edit.onclick = function() { showPrograms(); onProgramsEdit(); }
	}

	function updatePrograms() {
		if (!uiElemsAll.hasOwnProperty("programs"))
			createProgramsElems();

		var foundPrograms = {};

		for (var i = 0; i < Data.programs.programs.length; i++) {
			var p = Data.programs.programs[i];
			var programElem = uiElemsAll.programs[p.uid];

			//create
			if (typeof programElem === "undefined" || programElem === null) {
				createProgramElems(p);
			}

			//update
			updateProgram(p);
			foundPrograms[p.uid] = true;
		}

		//remove programs that no longer exists
		for (var id in uiElemsAll.programs) {
			if (typeof foundPrograms[id] === "undefined" || foundPrograms[id] === null) {
				console.info("Cannot find program id %s in uiElemsAll list will remove from DOM", id);
				removeProgramElems(id);
			}
		}
	}

	function createProgramElems(p) {

		var programListDiv = $('#programsList');
		var programElem = {};

		programElem.template = loadTemplate("program-entry");

		programElem.nameElem = $(programElem.template, '[rm-id="program-name"]');
		programElem.startElem = $(programElem.template, '[rm-id="program-start"]');
		programElem.editElem = $(programElem.template, '[rm-id="program-edit"]');
		programElem.zonesElem = $(programElem.template, '[rm-id="program-zones-bullets"]');
		programElem.infoElem = $(programElem.template, '[rm-id="program-info"]');
		programElem.graphElem = $(programElem.template, '[rm-id="program-graph"]');

		programElem.template.className = "program-line";
		programElem.template.id = "program-" + p.uid;
		programElem.editElem.id = "program-edit-" + p.uid;
		programElem.startElem.id = "program-start-" + p.uid;

		programElem.startElem.start = true;
		programElem.startElem.onclick = onStart;
		programElem.graphElem.id = "programChartContainer-" + p.uid;
		programElem.editElem.onclick = function() { showProgramSettings(this.data); };

		programListDiv.appendChild(programElem.template);
		uiElemsAll.programs[p.uid] = programElem;
	}

	function removeProgramElems(id) {
		var programElem = uiElemsAll.programs[id];

		if (typeof programElem === "undefined" || programElem === null) {
			console.error("Cannot find program id %d in uiElemsAll list", p.uid);
			return;
		}

		var domElem = $('#' + programElem.template.id);

		if (typeof domElem === "undefined" || domElem === null) {
			console.error("Cannot find DOM element for program id %d", p.uid);
			return;
		}

		clearTag(domElem);
		delTag(domElem);

		delete uiElemsAll.programs[id];
	}

	function updateProgram(p) {
		var programElem = uiElemsAll.programs[p.uid];

		if (typeof programElem === "undefined" || programElem === null) {
			console.error("Cannot find program id %d in uiElemsAll list", p.uid);
			return;
		}

		programElem.template.data = p;
		programElem.editElem.data = p;
		programElem.startElem.data = p;

		programElem.startElem.start = true;
		programElem.template.className = "program-line";
		programElem.startElem.removeAttribute("state");

		if (p.active) {
			programElem.template.className += " programActive";
		} else {
			programElem.template.className += " programInactive";
		}

		if (p.status == ProgramStatus.Running) {
			programElem.startElem.textContent = "W";
			programElem.startElem.start = false;
			programElem.startElem.setAttribute("state", "running");
		} else if (p.status == ProgramStatus.Pending) {
			programElem.startElem.textContent = "W";
			programElem.startElem.start = false;
			programElem.startElem.setAttribute("state", "pending");
		} else if (p.status == ProgramStatus.NotRunning) {
			programElem.startElem.textContent = "Q";
			programElem.startElem.start = true;
			programElem.startElem.setAttribute("state", "idle-programs");
		}

		programElem.nameElem.innerHTML = p.name;
		programElem.infoElem.innerHTML = programTypeToText(p);

		// update small zones circles
		clearTag(programElem.zonesElem);
		var zoneDetails = getProgramZonesNextDetails(p);
		for (var zi = 0; zi < p.wateringTimes.length; zi++) {
			if (p.wateringTimes[zi].active) {
				var div = addTag(programElem.zonesElem, 'div');
				var zid = p.wateringTimes[zi].id;
				div.className = "zoneCircle";
				div.textContent = zid;

				if (zoneDetails) {
					var zoneInfo = "Inactive";
					if (zoneDetails[zid]) {
						zoneInfo = "Will water " + Util.secondsToText(zoneDetails[zid].computedWateringTime);
					}

					div.setAttribute("zones-tooltip", zoneInfo);
				}

				//Check if zone is actually running now in this program and animate the small circle
				if (p.status == ProgramStatus.Running && Data.zoneData && Data.zoneData.zones !== null) {
				    var zones = Data.zoneData.zones;
				    for (var zd = 0; zd < zones.length; zd++ ) {
				        if (zones[zd].uid == p.wateringTimes[zi].id && zones[zd].state == 1) {
				            div.setAttribute("state", "running");
				        }
				    }
				}
			}
		}
	}

    //--------------------------------------------------------------------------------------------
    //
    //
    function onProgramsEdit() {

        for (var i = 0; i < Data.programs.programs.length; i++) {
            var p = Data.programs.programs[i];

            var editElem = $("#program-edit-" + p.uid);
            var startElem = $("#program-start-" + p.uid);
            var progGraph = $("#programChartContainer-" + p.uid);

            if (isEditing) {
                editElem.style.display = "none";
                startElem.style.display = "inherit";
                progGraph.style.opacity = "inherit";
            } else {
                editElem.style.display = "inherit";
                startElem.style.display = "none";
                progGraph.style.opacity = "0.3";
            }
        }

        if (isEditing) {
            $('#home-programs-edit').textContent = "Edit";
            isEditing = false;
        } else {
            $('#home-programs-edit').textContent = "Done";
            isEditing = true;
        }
    }

    //--------------------------------------------------------------------------------------------
    //
    //
	function showProgramSettings(program)
	{
        selectedProgram = program;
        //console.log(JSON.stringify(program, null, "  "));

        var programSettingsDiv = $('#programsSettings');
        clearTag(programSettingsDiv);
        makeHidden('#programsList');

        uiElems = loadProgramTemplate();

        uiElems.activeElem.checked = true;
        uiElems.weatherDataElem.checked = true;
        uiElems.nextRun.textContent = "";
		uiElems.nextRunSettable.value = null;

        makeHidden(uiElems.frequencyWeekdaysContainerElem);
        for(var weekday in uiElems.frequencyWeekdaysElemCollection) {
            if(uiElems.frequencyWeekdaysElemCollection.hasOwnProperty(weekday)) {
                var elem = uiElems.frequencyWeekdaysElemCollection[weekday];
                elem.checked = false;
            }
        }

		// Fill the Auto watering times even if it's a new program being created
		fillProgramTimers(null);

        if(program) {
            //---------------------------------------------------------------------------------------
            // Prepare some data.
            //
            var startTime = {hour: 0, min: 0};
            var delay = {min: 0, sec: 0};
            var soakMins = 0;

            try {
                var chunks = program.startTime.split(":");
                startTime.hour = parseInt(chunks[0]);
                startTime.min = parseInt(chunks[1]);
            } catch (e) {
            }

            try {
                delay.min = parseInt(program.delay / 60);
                delay.sec = delay.min ? (program.delay % delay.min) : program.delay;
            } catch (e) {
            }

            try {
                soakMins = parseInt(program.soak / 60);
            } catch (e) {
            }

            if (startTime.min == 0 && startTime.hour == 0) {
                startTime.min = startTime.hour = "";
            }

            if (delay.min == 0 && delay.sec == 0) {
                delay.min = delay.sec = "";
            }


            //---------------------------------------------------------------------------------------
            // Show program data.
            //
            uiElems.nameElem.value = program.name;
            uiElems.activeElem.checked = program.active;
            uiElems.weatherDataElem.checked = !program.ignoreInternetWeather;

            uiElems.startTimeHourElem.value = startTime.hour;
            uiElems.startTimeMinElem.value = startTime.min;

            uiElems.nextRun.textContent = getProgramNextRunAsString(program.nextRun);
			uiElems.nextRunSettable.value = program.nextRun;

			var cyclesType = CyclesType.Off;
			if (program.cs_on) {
				if (program.cycles < 0) {
					cyclesType = CyclesType.Auto;
				} else {
					cyclesType = CyclesType.Manual;
				}
			}
			uiElems.cyclesElem.value = program.cycles;
            uiElems.soakElem.value = soakMins;
			setSelectOption(uiElems.cyclesTypeElem, cyclesType, true);
			onCycleAndSoakTypeChange();

			var delayType = program.delay_on ? DelayType.Manual:DelayType.Off;
			uiElems.delayZonesMinElem.value = delay.min;
            uiElems.delayZonesSecElem.value = delay.sec;
			setSelectOption(uiElems.delayTypeElem, delayType, true);
			onDelayZonesTypeChange();

			setSelectOption(uiElems.restrictionQPF, program.futureField1, true);

            if (program.frequency.type === FrequencyType.Daily) { // Daily
                uiElems.frequencyDailyElem.checked = true;
            } else if (program.frequency.type === FrequencyType.EveryN) { // Every N days
                uiElems.frequencyEveryElem.checked = true;
                uiElems.frequencyEveryParamElem.value = program.frequency.param;
            } else if (program.frequency.type === FrequencyType.Weekday) { // Weekday
                fillWeekdaysFromParam(program.frequency.param);
                uiElems.frequencyWeekdaysElem.checked = true;
				makeVisibleBlock(uiElems.frequencyWeekdaysContainerElem);
            } else if (program.frequency.type === FrequencyType.OddEven) { // Odd or Even
                var param = parseInt(program.frequency.param);
                if (param % 2 === FrequencyParam.Odd) { // Odd
                    uiElems.frequencyOddElem.checked = true;
                } else {
                    uiElems.frequencyEvenElem.checked = true;
                }
            }

			// TODO This is done twice because on a already setup program that is being edited  timers must match selected freq
			fillProgramTimers(null);


			//Fixed day or sunrise/sunset start time new in API 4.1
			if (program.hasOwnProperty("startTimeParams")) {
				if (program.startTimeParams.type == 0) {
					uiElems.startTimeFixedElem.checked = true;
				} else {
					uiElems.startTimeSunElem.checked = true;
					var minutes = program.startTimeParams.offsetMinutes;

					//uiElems.startTimeSunHourElem.value = parseInt(minutes / 60);
					uiElems.startTimeSunMinElem.value = minutes;
					uiElems.startTimeSunOptionElem.value = program.startTimeParams.type;
					uiElems.startTimeSunOffsetOptionElem.value = program.startTimeParams.offsetSign;
				}
			}

            //---------------------------------------------------------------------------------------
            // Show zones and watering times.
            //
            var wateringTimeList = program.wateringTimes;
            console.log(program);
			fillProgramTimers(wateringTimeList);
        }

		//Show settable or plain next run information
		changeNextRunType();

        //---------------------------------------------------------------------------------------
        // Add listeners and elements.
		uiElems.activeElem.onclick = changeNextRunType;
        uiElems.frequencyDailyElem.onchange = onFrequencyChanged;
        uiElems.frequencyEveryElem.onchange = onFrequencyChanged;
        uiElems.frequencyWeekdaysElem.onchange = onFrequencyChanged;
        uiElems.frequencyOddElem.onchange = onFrequencyChanged;
        uiElems.frequencyEvenElem.onchange = onFrequencyChanged;
		uiElems.frequencyEveryParamElem.onchange = onFrequencyChanged;

        $(uiElems.programTemplateElem, '[rm-id="program-cancel"]').addEventListener("click", onCancel);
        $(uiElems.programTemplateElem, '[rm-id="program-delete"]').addEventListener("click", onDelete);
        $(uiElems.programTemplateElem, '[rm-id="program-save"]').addEventListener("click", onSave);

		programSettingsDiv.appendChild(uiElems.programTemplateElem);
	}


	//--------------------------------------------------------------------------------------------
	//
	// Will load 2 templates, one for showing and one for setting

	function loadZoneTemplates() {

		//Elements for the zone settings popup
		var zoneTemplateSettings = loadTemplate("program-settings-zone-timer-template");

		var zoneNameElem = $(zoneTemplateSettings, '[rm-id="program-settings-zone-timer-name"]');

		var zoneZoneIsDefaultElem = $(zoneTemplateSettings, '[rm-id="program-settings-zone-timer-isdefault"]');
		var zoneAutoDurationElem = $(zoneTemplateSettings, '[rm-id="program-settings-zone-timer-autoduration"]');
		var zoneDurationMinElem = $(zoneTemplateSettings, '[rm-id="program-settings-zone-timer-min"]');
		var zoneDurationSecElem = $(zoneTemplateSettings, '[rm-id="program-settings-zone-timer-sec"]');
		var zonePercentageElem = $(zoneTemplateSettings, '[rm-id="program-settings-zone-timer-percentage"]');

		var zoneAutoElem = $(zoneTemplateSettings, '[rm-id="program-settings-zone-timer-auto"]');
		var zoneCustomElem = $(zoneTemplateSettings, '[rm-id="program-settings-zone-timer-custom"]');
		var zoneSkipElem = $(zoneTemplateSettings, '[rm-id="program-settings-zone-timer-skip"]');

		var zoneSaveElem = $(zoneTemplateSettings, '[rm-id="program-settings-zone-timer-save"]');
		var zoneCancelElem = $(zoneTemplateSettings, '[rm-id="program-settings-zone-timer-cancel"]');

		//Elements used to display zone on program settings
		var zoneTemplateDisplay = loadTemplate("program-settings-zone-template");

		var zoneNameDisplayElem = $(zoneTemplateDisplay, '[rm-id="program-zone-name"]');
		var zoneDurationElem = $(zoneTemplateDisplay, '[rm-id="program-zone-duration"]');
		var zoneDurationPercentElem = $(zoneTemplateDisplay, '[rm-id="program-zone-duration-percent"]');

		var zoneElements = {
			templateSettingElem: zoneTemplateSettings,
			templateDisplayElem: zoneTemplateDisplay,
			zoneIsDefaultElem: zoneZoneIsDefaultElem,
			percentageElem: zonePercentageElem,
			nameElem: zoneNameElem,
			nameDisplayElem: zoneNameDisplayElem,
			durationElem: zoneDurationElem,
			durationAutoElem: zoneAutoDurationElem,
			durationPercentElem: zoneDurationPercentElem,
			durationMinElem: zoneDurationMinElem,
			durationSecElem: zoneDurationSecElem,
			autoTypeElem: zoneAutoElem,
			customTypeElem: zoneCustomElem,
			skipTypeElem: zoneSkipElem,
			saveElem: zoneSaveElem,
			cancelElem: zoneCancelElem
		};

		return zoneElements;
	}
	//--------------------------------------------------------------------------------------------
	//
	//
    function loadProgramTemplate () {
        var templateInfo = {};

        templateInfo.programTemplateElem = loadTemplate("program-settings-template");

        templateInfo.nameElem = $(templateInfo.programTemplateElem, '[rm-id="program-name"]');
        templateInfo.activeElem = $(templateInfo.programTemplateElem, '[rm-id="program-active"]');
        templateInfo.weatherDataElem = $(templateInfo.programTemplateElem, '[rm-id="program-weather-data"]');

		//fixed start time (hh:mm)
		templateInfo.startTimeFixedElem = $(templateInfo.programTemplateElem, '[rm-id="program-start-time-fixed"]');
		templateInfo.startTimeHourElem = $(templateInfo.programTemplateElem, '[rm-id="program-start-time-hour"]');
		templateInfo.startTimeMinElem = $(templateInfo.programTemplateElem, '[rm-id="program-start-time-min"]');

		//dynamic start time (sunset/sunrise +/- offset)
		templateInfo.startTimeSunElem = $(templateInfo.programTemplateElem, '[rm-id="program-start-time-sun"]');
		templateInfo.startTimeSunOptionElem = $(templateInfo.programTemplateElem, '[rm-id="program-start-time-sun-option"]');
		//templateInfo.startTimeSunHourElem = $(templateInfo.programTemplateElem, '[rm-id="program-start-time-sun-hour"]');
		templateInfo.startTimeSunMinElem = $(templateInfo.programTemplateElem, '[rm-id="program-start-time-sun-min"]');
		templateInfo.startTimeSunOffsetOptionElem = $(templateInfo.programTemplateElem, '[rm-id="program-start-time-sun-offset-option"]');

        templateInfo.nextRun = $(templateInfo.programTemplateElem, '[rm-id="program-next-run"]');
		templateInfo.nextRunSettable = $(templateInfo.programTemplateElem, '[rm-id="program-next-run-settable"]');

		templateInfo.cyclesTypeElem = $(templateInfo.programTemplateElem, '[rm-id="program-cycles-type"]');
		templateInfo.cyclesManualElem = $(templateInfo.programTemplateElem, '[rm-id="program-cycles-manual"]');
        templateInfo.cyclesElem = $(templateInfo.programTemplateElem, '[rm-id="program-cycles"]');
        templateInfo.soakElem = $(templateInfo.programTemplateElem, '[rm-id="program-soak-duration"]');

		templateInfo.delayTypeElem = $(templateInfo.programTemplateElem, '[rm-id="program-delay-zones-type"]');
		templateInfo.delayZonesElem = $(templateInfo.programTemplateElem, '[rm-id="program-delay-zones-manual"]');
        templateInfo.delayZonesMinElem = $(templateInfo.programTemplateElem, '[rm-id="program-delay-zones-min"]');
        templateInfo.delayZonesSecElem = $(templateInfo.programTemplateElem, '[rm-id="program-delay-zones-sec"]');

        templateInfo.frequencyDailyElem = $(templateInfo.programTemplateElem, '[rm-id="program-frequency-daily"]');
        templateInfo.frequencyOddElem = $(templateInfo.programTemplateElem, '[rm-id="program-frequency-odd"]');
        templateInfo.frequencyEvenElem = $(templateInfo.programTemplateElem, '[rm-id="program-frequency-even"]');
        templateInfo.frequencyEveryElem = $(templateInfo.programTemplateElem, '[rm-id="program-frequency-every"]');
        templateInfo.frequencyWeekdaysElem = $(templateInfo.programTemplateElem, '[rm-id="program-frequency-weekdays"]');

        templateInfo.frequencyEveryParamElem = $(templateInfo.programTemplateElem, '[rm-id="program-frequency-every-param"]');

        templateInfo.frequencyWeekdaysContainerElem = $(templateInfo.programTemplateElem, '[rm-id="program-frequency-weekdays-container"]');
        templateInfo.frequencyWeekdaysElemCollection = {
            sunday: $(templateInfo.frequencyWeekdaysContainerElem, '[rm-id="weekday-sunday"]'),
            saturday: $(templateInfo.frequencyWeekdaysContainerElem, '[rm-id="weekday-saturday"]'),
            friday: $(templateInfo.frequencyWeekdaysContainerElem, '[rm-id="weekday-friday"]'),
            thursday: $(templateInfo.frequencyWeekdaysContainerElem, '[rm-id="weekday-thursday"]'),
            wednesday: $(templateInfo.frequencyWeekdaysContainerElem, '[rm-id="weekday-wednesday"]'),
            tuesday: $(templateInfo.frequencyWeekdaysContainerElem, '[rm-id="weekday-tuesday"]'),
            monday: $(templateInfo.frequencyWeekdaysContainerElem, '[rm-id="weekday-monday"]')
        };

		templateInfo.cyclesTypeElem.onchange = onCycleAndSoakTypeChange;
		templateInfo.delayTypeElem.onchange = onDelayZonesTypeChange;

		templateInfo.restrictionQPF = $(templateInfo.programTemplateElem, '[rm-id="program-restriction-qpf"]');

		templateInfo.zonesTotalTime = $(templateInfo.programTemplateElem, '[rm-id="program-settings-zone-totaltime"]');
        templateInfo.zoneTableElem = $(templateInfo.programTemplateElem, '[rm-id="program-settings-zone-template-container"]');
        templateInfo.zoneElems = {};

        for (var index = 0; index < Data.provision.system.localValveCount; index++) {
            var zoneId = index + 1;
			var zoneData = Data.zoneData.zones[index];

			var zoneElems = loadZoneTemplates();
			templateInfo.zoneElems[zoneId] = zoneElems;

			//Set Custom to checked if these fields change
			zoneElems.durationMinElem.oninput = (function(id) { return function() { onZoneCustomDurationChange(id); } })(zoneId);
			zoneElems.durationSecElem.oninput = (function(id) { return function() { onZoneCustomDurationChange(id); } })(zoneId);

			//Show zone timer settings on click
			zoneElems.templateDisplayElem.onclick =  (function(id) { return function() { onZoneTimerClick(id); } })(zoneId);

			//Don't show zone 1 when master valve is enabled
			if (Data.provision.system.useMasterValve && index == 0) {
				zoneElems.templateDisplayElem.style.display = "none";
			}

			if (zoneData) {
				zoneElems.nameElem.textContent = zoneElems.nameDisplayElem.textContent = zoneId + ". " + zoneData.name;
				//Don't show inactive zones
				if (!zoneData.active) {
					zoneElems.templateDisplayElem.style.display = "none";
				}
			} else {
				zoneElems.nameElem.textContent = zoneElems.nameDisplayElem.textContent = "Zone " + zoneId;
			}

			//Add Auto percentage chooser
			//Create percentageChooser with current value, it will change zone.saving that holds the FC percent as int
			zoneElems.zonePercentage = new percentageChooser(
				zoneElems.percentageElem, 10, 200, 100, 5,
				function(v) {
					fillProgramTimers(null);
				}
			);

			//Make zone timer settings window radio input have same name groups
			zoneElems.autoTypeElem.name = zoneElems.customTypeElem.name = zoneElems.skipTypeElem.name = "zone-timer-type" + zoneId;

			templateInfo.zoneTableElem.appendChild(zoneElems.templateDisplayElem);
			templateInfo.zoneTableElem.appendChild(zoneElems.templateSettingElem);
        }

        return templateInfo;
    }

	//--------------------------------------------------------------------------------------------
	//
	//
    function collectData () {
        var program = {};

        var startTime = {hour: 0, min: 0}; //start time with fixed hh:mm
		var startTimeParams = {type: 1, offsetSign: 1, offsetMinutes: 0 }; //start time params needed for sunrise/sunset
        var delay = {min: 0, sec: 0};

        delay.min = parseInt(uiElems.delayZonesMinElem.value) || 0;
        delay.sec = parseInt(uiElems.delayZonesSecElem.value) || 0;
        soakMins =  parseInt(uiElems.soakElem.value)  || 0;

        if (selectedProgram) {
            program.uid = selectedProgram.uid;
        }

        program.name = uiElems.nameElem.value;
        program.active = uiElems.activeElem.checked;
        program.ignoreInternetWeather = !uiElems.weatherDataElem.checked;

		if (uiElems.startTimeSunElem.checked) {
			console.log("Sunset/Sunrise time selected");

			var minutes = parseInt(uiElems.startTimeSunMinElem.value) || 0;

			startTimeParams.type = uiElems.startTimeSunOptionElem.value;
			startTimeParams.offsetSign = parseInt(uiElems.startTimeSunOffsetOptionElem.value);
			startTimeParams.offsetMinutes = minutes;
			program.startTimeParams = startTimeParams;
			console.log(program.startTimeParams);
		} else { // default to fixed start of day
			console.log("Default fixed start time with selections: %s", uiElems.startTimeFixedElem.checked);
			startTime.hour = parseInt(uiElems.startTimeHourElem.value) || 0;
			startTime.min = parseInt(uiElems.startTimeMinElem.value) || 0;
			program.startTime = startTime.hour + ":" + startTime.min;
		}

		var cyclesType = parseInt(getSelectValue(uiElems.cyclesTypeElem) || 0);
        program.cs_on = cyclesType > CyclesType.Off ? true:false;
		program.cycles = cyclesType == CyclesType.Auto ?  -1 : parseInt(uiElems.cyclesElem.value || 0);
        program.soak = soakMins * 60;

		var delayType = parseInt(getSelectValue(uiElems.delayTypeElem) || 0);
        program.delay_on = delayType == DelayType.Manual ? true:false;
        program.delay = delay.min * 60 + delay.sec;

		//---------------------------------------------------------------------------------------
		// API 4.3 Program QPF restriction
		//
		program.futureField1 = getSelectValue(uiElems.restrictionQPF) || 0;

        //---------------------------------------------------------------------------------------
        // Collect frequency.
        //
        program.frequency = parseProgramFrequency();


		//---------------------------------------------------------------------------------------
		// Collect settable next run
		//
		var customNextRun = uiElems.nextRunSettable.value;
		if (settableNextRun() && customNextRun !== "") {
			program.nextRun = customNextRun;
			console.log("Setting program next run to: %s", customNextRun);
		}

        //---------------------------------------------------------------------------------------
        // Collect watering times.
        //
        program.wateringTimes = [];

        for(var zoneId in uiElems.zoneElems) {
			var duration = {min: 0, sec: 0};
			var durationType = ZoneDurationType.Off;
			var wateringTime = {};

            if (!uiElems.zoneElems.hasOwnProperty(zoneId)) {
                continue;
            }

			var zoneElems = uiElems.zoneElems[zoneId];

			if (zoneElems.autoTypeElem.checked) {
				durationType = ZoneDurationType.Auto;
			} else if (zoneElems.customTypeElem.checked) {
				durationType = ZoneDurationType.Manual;
			}  else {
				durationType = ZoneDurationType.Off;
			}

            wateringTime.id = parseInt(zoneId);
            wateringTime.active = durationType > 0 ? true:false;
			wateringTime.userPercentage = zoneElems.zonePercentage.value / 100.0;

			if (durationType == ZoneDurationType.Auto) {
				wateringTime.duration = 0;
			} else {
				duration.min = parseInt(zoneElems.durationMinElem.value) || 0;
				duration.sec = parseInt(zoneElems.durationSecElem.value) || 0;
				wateringTime.duration = duration.min * 60 + duration.sec;
			}

            program.wateringTimes.push(wateringTime);
        }

        return program;
    }

	//--------------------------------------------------------------------------------------------
	//
	//
    function fillWeekdaysFromParam(param) {
        if(!param) {
            return;
        }

        param = param.substr(param.length - WeekdaysOrder.length - 1);

        for(var index = 0; index < param.length; index++) {
            if(WeekdaysOrder.length <= index) {
                continue;
            }

            var elem = uiElems.frequencyWeekdaysElemCollection[WeekdaysOrder[index]];
            elem.checked = (param.charAt(index) != "0");
        }
    }

    function weekdaysToParam() {
        var param = ""; // See FrequencyParam.WeekdayFormat ("SSFTWTM0")
        for(var index = 0; index < WeekdaysOrder.length; index++) {
            var elem = uiElems.frequencyWeekdaysElemCollection[WeekdaysOrder[index]];
            param += (elem.checked ? "1" : "0");
        }
        param += "0";

        return param;
    }


    function programTypeToText(program) {
        var infoText = "";
        var type = program.frequency.type;

		if (program.frequency.type === FrequencyType.Daily) { // Daily
			infoText = "Daily";
		} else if (program.frequency.type === FrequencyType.EveryN) { // Every N days
		    var param = parseInt(program.frequency.param);
			infoText = "Every " + param +  " days";
		} else if (program.frequency.type === FrequencyType.Weekday) { // Weekday
			var param = program.frequency.param;
			param = param.substr(param.length - WeekdaysOrder.length - 1);
			for(var index = 0; index < param.length; index++)
            	infoText += (param[index] === "1" ? WeekdaysOrder[index].substr(0,3).toUpperCase() : "") + " ";
		} else if (program.frequency.type === FrequencyType.OddEven) { // Odd or Even
			var param = parseInt(program.frequency.param);
			if (param % 2 === FrequencyParam.Odd) { // Odd
				infoText = "Odd days";
			} else {
				infoText = "Even days";
			}
		}

		infoText += " at " + program.startTime;
		infoText += "<br>Next run on " + getProgramNextRunAsString(program.nextRun) + "";
		return infoText;
    }

	//--------------------------------------------------------------------------------------------
	// Even/Action handlers
	//
    function onFrequencyChanged (e) {
        var showWeekdays = uiElems.frequencyWeekdaysElem.checked;
        uiElems.frequencyWeekdaysContainerElem.style.display = (showWeekdays ? "block" : "none");
		changeNextRunType();
		fillProgramTimers(null); // Timers will change with the program frequency
    }

	function closeProgramSettings()
	{
		var programSettingsDiv = $('#programsSettings');
		clearTag(programSettingsDiv);
		makeVisible('#programsList');
		selectedProgram = null;
		uiElems = {};
	}

    function onCancel() {
    	closeProgramSettings();
    }

    function onDelete() {
        if (selectedProgram) {
            console.log("delete program ", selectedProgram.uid);
            API.deleteProgram(selectedProgram.uid);
        }
        closeProgramSettings();
        showPrograms();
    }

    function onSave() {
        var data = collectData();
		console.log(data);
		var r;

        if (data.uid) {
            r = API.setProgram(data.uid, data);
        } else {
            r = API.newProgram(data);
        }

		if (r === undefined || !r || r.statusCode != 0)
		{
			console.error("Can't save program %s", r);
			return;
		}

        closeProgramSettings();
        showPrograms();
		window.ui.main.refreshGraphs = true;
    }

    function onStart() {
        var program = this.data;

		if (this.start) {
			API.startProgram(program.uid);
			window.ui.zones.onProgramStart();
		} else {
			API.stopProgram(program.uid);
		}
		showPrograms();

		//TODO now we have to refresh zones too (dashboard), as the ui loop won't see the change (as the queue could be empty)
		window.ui.zones.showZonesSimple();
    }

    function onProgramsChartTypeChange(isWeekly) {
        for (var id in uiElemsAll.programs) {
            var graphElem = uiElemsAll.programs[id].graphElem;
             if (isWeekly) {
                graphElem.setAttribute("state", "weekly");
             } else {
                graphElem.removeAttribute("state");
             }
             //console.log(graphElem.getAttribute("state"));
        }
    }

	//Show zone template for setting timers this function is used to save old values and restore on cancel
	function onZoneTimerClick(id) {
		var zoneElems = uiElems.zoneElems[id];
		var oldValues = {
			id: id,
			isAuto: zoneElems.autoTypeElem.checked,
			isCustom: zoneElems.customTypeElem.checked,
			isSkip: zoneElems.skipTypeElem.checked,
			autoPercentage: zoneElems.zonePercentage.value,
			min: zoneElems.durationMinElem.value,
			sec: zoneElems.durationSecElem.value
		};

		zoneElems.cancelElem.onclick = function() { onZoneTimerSettingsCancel(oldValues) };
		zoneElems.saveElem.onclick = function() { fillProgramTimers(null); makeHidden(zoneElems.templateSettingElem); };

		makeVisible(zoneElems.templateSettingElem);
	}

	function onZoneTimerSettingsCancel(oldValues) {
		console.log(oldValues);
		var zoneElems = uiElems.zoneElems[oldValues.id];

		zoneElems.autoTypeElem.checked = oldValues.isAuto;
		zoneElems.customTypeElem.checked = oldValues.isCustom;
		zoneElems.skipTypeElem.checked = oldValues.isSkip;
		zoneElems.durationMinElem.value = oldValues.min;
		zoneElems.durationSecElem.value = oldValues.sec;
		zoneElems.zonePercentage.setValue(oldValues.autoPercentage);
		fillProgramTimers(null);

		makeHidden(zoneElems.templateSettingElem);
	}

	// Automatically put checked on Custom if duration is changed by user on input fields
	function onZoneCustomDurationChange(id) {
		var zoneElems = uiElems.zoneElems;

		if (!zoneElems.hasOwnProperty(id)) {
			return;
		}

		zoneElems = uiElems.zoneElems[id];
		var min = parseInt(zoneElems.durationMinElem.value) || 0;
		var sec = parseInt(zoneElems.durationSecElem.value) || 0;

		if (min !== 0  || sec !== 0) {
			zoneElems.customTypeElem.checked = true;
		} else {
			zoneElems.customTypeElem.checked = false;
		}
	}

	function onCycleAndSoakTypeChange() {
		var cyclesType = parseInt(getSelectValue(uiElems.cyclesTypeElem) || 0);
		var soak = parseInt(uiElems.soakElem.value) || 0;
		var cycles = parseInt(uiElems.cyclesElem.value) || 0;

		switch (cyclesType) {
			case CyclesType.Off:
			case CyclesType.Auto:
				makeHidden(uiElems.cyclesManualElem);
				break;
			case CyclesType.Manual:
				makeVisible(uiElems.cyclesManualElem);

				// Put minimum manual cycles to 2 since Auto changes this to -1
				if (uiElems.cyclesElem.value == -1) {
					uiElems.cyclesElem.value = 2;
				}
				break;
		}

		console.log("Soak: %s", soak);
		console.log("Cycles: %s", cycles);
	}

	function onDelayZonesTypeChange() {
		var delayType = parseInt(getSelectValue(uiElems.delayTypeElem) || 0);

		if (delayType == DelayType.Manual) {
			makeVisible(uiElems.delayZonesElem);
		} else {
			makeHidden(uiElems.delayZonesElem);
		}
	}


	//--------------------------------------------------------------------------------------------
	// Utility functions
	//

	//Converts program next run a a nicer string
	function getProgramNextRunAsString(programNextRun) {

		var nextRun = Util.dateStringToLocalDate(programNextRun);

		if(nextRun === null || isNaN(nextRun.getTime()))	 {
			nextRun = "Unknown";
		} else {
			nextRun = nextRun.toDateString();
		}

		return nextRun;
	}

	function fillProgramTimers(wateringTimeList) {
		var zones = null;

		if (Data.zoneAdvData && Data.zoneAdvData.zones) {
			zones = Data.zoneAdvData.zones;
		}

		var programMultiplier = getProgramFutureMultiplier();
		var skipTimerText = "No time set";
		var totalTimes = 0;

		for (var index = 0; index < Data.provision.system.localValveCount; index++) {
			var autoTimer = 0;
			var autoCoef = 1;
			var customTimer = 0;
			var timerText = "";
			var timerColor;
			var zoneId = index + 1;
			var zoneElems = uiElems.zoneElems[zoneId];
			var durationType = ZoneDurationType.Off; // Skip watering
			var duration = {min: 0, sec: 0};

			//Fill the suggested auto timer
			if (zones) {
				autoTimer = parseInt(zones[index].waterSense.referenceTime || 0) * programMultiplier;
			}

			//If called with wateringTimes fill from program data
			if (wateringTimeList) {
				var wateringTime = wateringTimeList[index];

				customTimer = wateringTime.duration;

				try {
					duration.min = parseInt(wateringTime.duration / 60);
					duration.sec = duration.min > 0 ? (wateringTime.duration % 60) : wateringTime.duration;
				} catch (e) {
				}

				if (duration.min == 0 && duration.sec == 0) {
					duration.min = duration.sec = "";
				}

				zoneElems.durationMinElem.value = duration.min;
				zoneElems.durationSecElem.value = duration.sec;

				if (wateringTime.active) {
					if (wateringTime.duration > 0) {
						durationType = ZoneDurationType.Manual; // Manual timer
						zoneElems.customTypeElem.checked = true;
					} else {
						durationType = ZoneDurationType.Auto; // Auto timer
						zoneElems.autoTypeElem.checked = true;
					}
				} else {
					durationType = ZoneDurationType.Off; // Don't water
					zoneElems.skipTypeElem.checked = true;
				}

				//Specified auto timer user percentage
				zoneElems.zonePercentage.setValue(parseInt(wateringTime.userPercentage * 100) || 1);
			} else {

				duration.min = parseInt(zoneElems.durationMinElem.value) || 0;
				duration.sec = parseInt(zoneElems.durationSecElem.value) || 0;
				customTimer = duration.min * 60 + duration.sec;

				if (zoneElems.autoTypeElem.checked) {
					durationType = ZoneDurationType.Auto;
				} else if (zoneElems.customTypeElem.checked) {
					durationType = ZoneDurationType.Manual;
				}  else {
					durationType = ZoneDurationType.Off;
				}
			}

			//Add auto coef
			autoCoef = zoneElems.zonePercentage.value / 100.0;
			autoTimer *= autoCoef;

			//Check what duration we should display on Program Zones List
			if (durationType == ZoneDurationType.Auto) {
				timerText = Util.secondsToText(autoTimer);
				totalTimes += autoTimer;
				timerColor = "#3399cc";
			} else if (durationType == ZoneDurationType.Manual) {
				timerText = Util.secondsToText(customTimer);
				totalTimes += customTimer;
				timerColor = "#555";
			} else {
				timerText = skipTimerText;
				timerColor = "#bbb";
			}

			zoneElems.durationAutoElem.textContent = Util.secondsToText(autoTimer);
			zoneElems.durationElem.textContent = timerText;
			zoneElems.durationElem.style.color = timerColor;
		}

		uiElems.zonesTotalTime.textContent = Util.secondsToText(totalTimes);
	}

	function getProgramFutureMultiplier() {
		var frequency = parseProgramFrequency();

		if (frequency === null) {
			return 1;
		}

		switch(frequency.type) {
			case FrequencyType.Daily:
				return 1;
			case FrequencyType.OddEven:
				return 2;
			case FrequencyType.EveryN:
				return frequency.param;
			case FrequencyType.Weekday:
				return 3; // TODO calculate weekdays freq average
		}
		return 1;
	}

	function parseProgramFrequency() {
		var frequency = null;

		if(uiElems.frequencyDailyElem.checked) {
			frequency = {
				type: FrequencyType.Daily,
				param: "0"
			};
		} else if(uiElems.frequencyEveryElem.checked) {
			frequency = {
				type: FrequencyType.EveryN,
				param: (parseInt(uiElems.frequencyEveryParamElem.value) || 0).toString()
			};
		} else if(uiElems.frequencyWeekdaysElem.checked) {
			frequency = {
				type: FrequencyType.Weekday,
				param: weekdaysToParam()
			};
		} else if(uiElems.frequencyOddElem.checked) {
			frequency = {
				type: FrequencyType.OddEven,
				param: FrequencyParam.Odd.toString()
			};
		} else if(uiElems.frequencyEvenElem.checked) {
			frequency = {
				type: FrequencyType.OddEven,
				param: FrequencyParam.Even.toString()
			};
		}

		return frequency;
	}

	//Returns the zone watering durations at the next run of the program. Requires Data.dailyDetails to be fetched
	function getProgramZonesNextDetails(p) {
		if (Data.dailyDetails == null || Data.dailyDetails.DailyStatsDetails === null){
			console.error("Programs: No daily stats to show zones runtimes");
			return null;
		}

		var daysStats = Data.dailyDetails.DailyStatsDetails;

		if (p === null) {
			console.error("Programs: Invalid program");
			return null;
		}

		var dayPrograms = null;
		for (i = 0; i < daysStats.length; i++) {
			if (daysStats[i].day == p.nextRun) {
				dayPrograms = daysStats[i].programs;
				break;
			}
		}

		if (dayPrograms === null) {
			//console.error("Programs: Cannot find nextRun day %s in days stats", p.nextRun);
			return null;
		}

		var programZones = null;
		for (i = 0; i < dayPrograms.length; i++) {
		   if (dayPrograms[i].id == p.uid) {
			   programZones = dayPrograms[i].zones;
			   break;
		   }
		}

		if (programZones === null) {
			//console.error("Programs: Can't find program %s zones", p.uid);
			return null;
		}

		var zones = {};
		for (i = 0; i < programZones.length; i++) {
			var zid = programZones[i].id;
			zones[zid] = programZones[i];
		}

		return zones;
	}


	//If next run field is user settable or not
	function settableNextRun() {
		return uiElems.frequencyEveryElem.checked && uiElems.activeElem.checked;
	}

	//If we should display the simple next run text or a settable next run
	function changeNextRunType() {
		if (settableNextRun()) {
			makeVisible(uiElems.nextRunSettable);
			makeHidden(uiElems.nextRun);
		} else {
			makeHidden(uiElems.nextRunSettable);
			makeVisible(uiElems.nextRun);
		}
	}

	//--------------------------------------------------------------------------------------------
	//
	//
	_programs.showPrograms = showPrograms;
	_programs.showProgramSettings = showProgramSettings;
	_programs.onProgramsChartTypeChange = onProgramsChartTypeChange;
} (window.ui.programs = window.ui.programs || {}));
