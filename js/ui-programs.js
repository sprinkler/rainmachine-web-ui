/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

window.ui = window.ui || {};

(function(_programs) {

    var selectedProgram = null;
    var uiElems = {};

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

    var WeekdaysOrder = ["sunday", "saturday", "friday", "thursday", "wednesday", "tuesday", "monday"]; // See FrequencyParam.WeekdayFormat

    //--------------------------------------------------------------------------------------------
    //
    //
	function showPrograms()
	{
		Data.programs = API.getPrograms();
		var programListDiv = $('#programsList');
		clearTag(programListDiv);
		makeVisible('#programs');

        console.log(Data.programs);

		for (var i = 0; i < Data.programs.programs.length; i++)
		{
			var p = Data.programs.programs[i];

			var template = loadTemplate("program-entry");

			var nameElem = $(template, '[rm-id="program-name"]');
			var startElem = $(template, '[rm-id="program-start"]');
			var editElem = $(template, '[rm-id="program-edit"]');
			var zonesElem = $(template, '[rm-id="program-zones-bullets"]');
			var infoElem = $(template, '[rm-id="program-info"]');

			template.className = "listItem";
			template.id = "program-" + p.uid;

			template.data = p;
			editElem.data = p;

            startElem.data = p;
            startElem.start = true;

            if(p.active) {
                template.className += " programActive";
                if(p.status == ProgramStatus.Running) {
                    template.className += " programRunning";
                    startElem.innerText = "Stop";
                    startElem.start = false;
                    startElem.className += " label-red";
                } else if(p.status == ProgramStatus.Pending) {
                    template.className += " programPending";
                    startElem.innerText = "Stop";
                    startElem.start = false;
                    startElem.className += " label-red";
                }
            } else {
                template.className += " programInactive";
            }

			nameElem.innerHTML = p.name;
			startElem.onclick = onStart;
			editElem.onclick = function() { showProgramSettings(this.data); };

			console.log("%o", p.wateringTimes);

			infoElem.innerHTML = programTypeToText(p);

			/* Show small zones circles */
			for (var zi = 0; zi < p.wateringTimes.length; zi++)
			{
				if (p.wateringTimes[zi].active)
				{
					var div = addTag(zonesElem, 'div');
					div.className = "zoneCircle";
					div.innerHTML = p.wateringTimes[zi].id;
					console.log("Added zone circle %d", p.wateringTimes[zi].id)
				}
			}
			programListDiv.appendChild(template);
		}

		// The Add program button
		var div = addTag(programListDiv, 'div');
		var button = addTag(div, 'button');

		div.className = "listItem";
		button.className = "addNew";
		button.textContent = ">";
		button.onclick = div.onclick = function() { showProgramSettings(null); };

	}

    //--------------------------------------------------------------------------------------------
    //
    //
	function showProgramSettings(program)
	{
        selectedProgram = program;
        console.log(JSON.stringify(program, null, "  "));

        var programSettingsDiv = $('#programsSettings');
        clearTag(programSettingsDiv);
        makeHidden('#programsList');

        uiElems = loadProgramTemplate();

        uiElems.activeElem.checked = true;
        uiElems.weatherDataElem.checked = true;
        uiElems.nextRun.innerText = "";

        uiElems.frequencyWeekdaysContainerElem.display = "none";
        for(var weekday in uiElems.frequencyWeekdaysElemCollection) {
            if(uiElems.frequencyWeekdaysElemCollection.hasOwnProperty(weekday)) {
                var elem = uiElems.frequencyWeekdaysElemCollection[weekday];
                elem.checked = false;
            }
        }

        if(program) {
            //---------------------------------------------------------------------------------------
            // Prepare some data.
            //
            var startTime = {hour: 0, min: 0};
            var delay = {min: 0, sec: 0};
            var nextRun = new Date(program.nextRun);
            if(isNaN(nextRun.getTime())) {
                nextRun = "";
            } else {
                nextRun = nextRun.toDateString();
            }

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

            uiElems.nextRun.innerText = nextRun;

            uiElems.cyclesSoakElem.checked = program.cs_on;
            uiElems.cyclesElem.value = program.cycles;
            uiElems.soakElem.value = program.soak;
            uiElems.delayZonesMinElem.value = delay.min;
            uiElems.delayZonesSecElem.value = delay.sec;
            uiElems.delayZonesElem.checked = program.delay_on;

            if (program.frequency.type === FrequencyType.Daily) { // Daily
                uiElems.frequencyDailyElem.checked = true;
            } else if (program.frequency.type === FrequencyType.EveryN) { // Every N days
                uiElems.frequencyEveryElem.checked = true;
                uiElems.frequencyEveryParamElem.value = program.frequency.param;
            } else if (program.frequency.type === FrequencyType.Weekday) { // Weekday
                fillWeekdaysFromParam(program.frequency.param);
                uiElems.frequencyWeekdaysElem.checked = true;
                uiElems.frequencyWeekdaysContainerElem.style.display = "block";
            } else if (program.frequency.type === FrequencyType.OddEven) { // Odd or Even
                var param = parseInt(program.frequency.param);
                if (param % 2 === FrequencyParam.Odd) { // Odd
                    uiElems.frequencyOddElem.checked = true;
                } else {
                    uiElems.frequencyEvenElem.checked = true;
                }
            }

            //---------------------------------------------------------------------------------------
            // Show zones and watering times.
            //
            var wateringTimeList = program.wateringTimes;
            if (wateringTimeList) {
                for (var index = 0; index < wateringTimeList.length; index++) {
                    var wateringTime = wateringTimeList[index];

                    var zoneTemplateElem = uiElems.zoneElems[wateringTime.id];
                    var duration = {min: 0, sec: 0};

                    try {
                        duration.min = parseInt(wateringTime.duration / 60);
                        duration.sec = duration.min ? (wateringTime.duration % duration.min) : wateringTime.duration;
                    } catch (e) {
                    }

                    if (duration.min == 0 && duration.sec == 0) {
                        duration.min = duration.sec = "";
                    }

                    zoneTemplateElem.nameElem.textContent = wateringTime.name;
                    zoneTemplateElem.durationMinElem.value = duration.min;
                    zoneTemplateElem.durationSecElem.value = duration.sec;
                    zoneTemplateElem.activeElem.checked = wateringTime.active;
                }
            }
        }

        //---------------------------------------------------------------------------------------
        // Add listeners and elements.
        uiElems.frequencyDailyElem.onchange = onFrequencyChanged;
        uiElems.frequencyEveryElem.onchange = onFrequencyChanged;
        uiElems.frequencyWeekdaysElem.onchange = onFrequencyChanged;
        uiElems.frequencyOddElem.onchange = onFrequencyChanged;
        uiElems.frequencyEvenElem.onchange = onFrequencyChanged;

        $(uiElems.programTemplateElem, '[rm-id="program-cancel"]').addEventListener("click", onCancel);
        $(uiElems.programTemplateElem, '[rm-id="program-delete"]').addEventListener("click", onDelete);
        $(uiElems.programTemplateElem, '[rm-id="program-save"]').addEventListener("click", onSave);

        console.log(uiElems);
		programSettingsDiv.appendChild(uiElems.programTemplateElem);
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
        templateInfo.startTimeHourElem = $(templateInfo.programTemplateElem, '[rm-id="program-program-start-time-hour"]');
        templateInfo.startTimeMinElem = $(templateInfo.programTemplateElem, '[rm-id="program-program-start-time-min"]');
        templateInfo.nextRun = $(templateInfo.programTemplateElem, '[rm-id="program-next-run"]');
        templateInfo.cyclesSoakElem = $(templateInfo.programTemplateElem, '[rm-id="program-cycle-soak"]');
        templateInfo.cyclesElem = $(templateInfo.programTemplateElem, '[rm-id="program-cycles"]');
        templateInfo.soakElem = $(templateInfo.programTemplateElem, '[rm-id="program-soak-duration"]');
        templateInfo.delayZonesMinElem = $(templateInfo.programTemplateElem, '[rm-id="program-delay-zones-min"]');
        templateInfo.delayZonesSecElem = $(templateInfo.programTemplateElem, '[rm-id="program-delay-zones-sec"]');
        templateInfo.delayZonesElem = $(templateInfo.programTemplateElem, '[rm-id="program-delay-zones"]');

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

        templateInfo.zoneTableElem = $(templateInfo.programTemplateElem, '[rm-id="program-settings-zone-template-container"]');
        templateInfo.zoneElems = {};

        for (var index = 0; index < Data.provision.system.localValveCount; index++) {
            var zoneId = index + 1;
            var zoneTemplate = loadTemplate("program-settings-zone-template");

            var zoneNameElem = $(zoneTemplate, '[rm-id="program-zone-name"]');
            var zoneDurationMinElem = $(zoneTemplate, '[rm-id="program-zone-duration-min"]');
            var zoneDurationSecElem = $(zoneTemplate, '[rm-id="program-zone-duration-sec"]');
            var zoneActiveElem = $(zoneTemplate, '[rm-id="program-zone-active"]');

            zoneNameElem.innerText = "Zone " + zoneId;
            zoneTemplate.setAttribute("rm-zone-id", zoneId);

            templateInfo.zoneElems[zoneId] = {
                templateElem: zoneTemplate,
                nameElem: zoneNameElem,
                durationMinElem: zoneDurationMinElem,
                durationSecElem: zoneDurationSecElem,
                activeElem: zoneActiveElem
            };
            templateInfo.zoneTableElem.appendChild(zoneTemplate);
        }

        return templateInfo;
    }

	//--------------------------------------------------------------------------------------------
	//
	//
    function collectData () {
        var program = {};

        var startTime = {hour: 0, min: 0};
        var delay = {min: 0, sec: 0};

        startTime.hour = parseInt(uiElems.startTimeHourElem.value) || 0;
        startTime.min = parseInt(uiElems.startTimeMinElem.value) || 0;
        delay.min = parseInt(uiElems.delayZonesMinElem.value) || 0;
        delay.sec = parseInt(uiElems.delayZonesSecElem.value) || 0;

        if(selectedProgram) {
            program.uid = selectedProgram.uid;
        }

        program.name = uiElems.nameElem.value;
        program.active = uiElems.activeElem.checked;
        program.ignoreInternetWeather = !uiElems.weatherDataElem.checked;

        program.startTime = startTime.hour + ":" + startTime.min;

        program.cs_on = uiElems.cyclesSoakElem.checked;
        program.cycles = parseInt(uiElems.cyclesElem.value || 0);
        program.soak = parseInt(uiElems.soakElem.value) || 0;
        program.delay_on = uiElems.delayZonesElem.checked;
        program.delay = delay.min * 60 + delay.sec;

        //---------------------------------------------------------------------------------------
        // Collect frequency.
        //
        program.frequency = null;
        if(uiElems.frequencyDailyElem.checked) {
            program.frequency = {
                type: FrequencyType.Daily,
                param: 0
            };
        } else if(uiElems.frequencyEveryElem.checked) {
            program.frequency = {
                type: FrequencyType.EveryN,
                param: parseInt(uiElems.frequencyEveryParamElem.value) || 0
            };
        } else if(uiElems.frequencyWeekdaysElem.checked) {
            program.frequency = {
                type: FrequencyType.Weekday,
                param: weekdaysToParam()
            };

            console.log(program.frequency);
        } else if(uiElems.frequencyOddElem.checked) {
            program.frequency = {
                type: FrequencyType.OddEven,
                param: FrequencyParam.Odd
            };
        } else if(uiElems.frequencyEvenElem.checked) {
            program.frequency = {
                type: FrequencyType.OddEven,
                param: FrequencyParam.Even
            };
        }

        //---------------------------------------------------------------------------------------
        // Collect watering times.
        //
        program.wateringTimes = [];

        var zoneElems = uiElems.zoneElems;
        for(var zoneId in zoneElems) {

            if(!zoneElems.hasOwnProperty(zoneId)) {
                continue;
            }

            var zoneTemplateElem = uiElems.zoneElems[zoneId];

            var duration = {min: 0, sec: 0};
            duration.min = parseInt(zoneTemplateElem.durationMinElem.value) || 0;
            duration.sec = parseInt(zoneTemplateElem.durationSecElem.value) || 0;

            var wateringTime = {};


            wateringTime.id = parseInt(zoneId);
            wateringTime.active = zoneTemplateElem.activeElem.checked;
            wateringTime.duration = duration.min * 60 + duration.sec;

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

        var nextRun = new Date(program.nextRun);

        if(isNaN(nextRun.getTime())) {
           nextRun = "";
        } else {
           nextRun = nextRun.toDateString();
        }
		infoText += "<br><strong>Next run on " + nextRun + "</strong>";
		return infoText;
    }

	//--------------------------------------------------------------------------------------------
	//
	//
    function onFrequencyChanged (e) {
        var showWeekdays = uiElems.frequencyWeekdaysElem.checked;
        uiElems.frequencyWeekdaysContainerElem.style.display = (showWeekdays ? "block" : "none");
    }
	//--------------------------------------------------------------------------------------------
	//
	//

	function closeProgramSettings()
	{
		var programSettingsDiv = $('#programsSettings');
		clearTag(programSettingsDiv);
		makeVisible('#programsList');
		selectedProgram = null;
		uiElems = {};
	}

	function stopAllWatering()
    {
		console.log("Stop All Watering (programs)");
		API.stopAll();
		showPrograms();
	}

    function onCancel() {
    	closeProgramSettings();
    }

    function onDelete() {
        if(selectedProgram) {
            console.log("TODO: delete program ", selectedProgram.uid);
            API.deleteProgram(selectedProgram.uid);
        }
        closeProgramSettings();
        showPrograms();
    }

    function onSave() {
        var data = collectData();
        console.log("TODO: save: ", data);

        if(data.uid) {
            API.setProgram(data.uid, data);
        } else {
            API.newProgram(data);
        }

        closeProgramSettings();
        showPrograms();
    }

    function onStart() {
        var program = this.data;
        console.log("TODO: start stop: ", program);

        if(program.active) {
            if (this.start) {
                API.startProgram(program.uid);
            } else {
                API.stopProgram(program.uid);
            }
            showPrograms();
        }
    }

	//--------------------------------------------------------------------------------------------
	//
	//
	_programs.showPrograms = showPrograms;
	_programs.showProgramSettings = showProgramSettings;
	_programs.stopAllWatering = stopAllWatering;

} (window.ui.programs = window.ui.programs || {}));
