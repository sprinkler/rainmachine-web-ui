
window.ui = window.ui || {};

(function(_programs) {

    var currentProgram = null;

    //--------------------------------------------------------------------------------------------
    //
    //
	function showPrograms()
	{
		var programData = API.getPrograms();
		var programListDiv = $('#programsList');
		clearTag(programListDiv);
		makeVisible('#programs');

		$('#settingsTitle').innerHTML = "Programs";

		for (var i = 0; i < programData.programs.length; i++)
		{
			var p = programData.programs[i];

			var template = loadTemplate("program-entry");

			var nameElem = template.querySelector('div[rm-id="program-name"]');
			var startElem = template.querySelector('button[rm-id="program-start"]');
			var editElem = template.querySelector('button[rm-id="program-edit"]');
			var zonesElem = template.querySelector('div[rm-id="program-zones-bullets"]');

			template.className = "listItem";
			template.id = "program-" + p.uid;

			template.data = p;
			editElem.data = p;

			nameElem.innerHTML = p.name;
			startElem.onclick = function() { alert("TODO"); };
			editElem.onclick = function() { showProgramSettings(this.data); };

			console.log("%o", p.wateringTimes);

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

		var div = addTag(programListDiv, 'div');
		div.className = "listItem";
		div.innerHTML = "Add new program";
		div.onclick = function() { console.log("Add new program"); };
	}

    //--------------------------------------------------------------------------------------------
    //
    //
	function showProgramSettings(program)
	{
        currentProgram = program;
        console.log(program);

        //---------------------------------------------------------------------------------------
        // Prepare some data.
        //
        var startTime = {hour: 0, min: 0};
        var delay = {min: 0, sec: 0};

        try {
            var chunks = program.startTime.split(":");
            startTime.hour = parseInt(chunks[0]);
            startTime.min = parseInt(chunks[1]);
        } catch(e) {}

        try {
            delay.min = parseInt(program.delay / 60);
            delay.sec = delay.min ? (program.delay % delay.min) : 0;
        } catch(e) {}

        //---------------------------------------------------------------------------------------
        // Get HTML elements.
        //
		var programSettingsDiv = $('#programsSettings');
		clearTag(programSettingsDiv);

		var programTemplate = loadTemplate("program-settings-template");

		var programNameElem = $(programTemplate, '[rm-id="program-name"]');
		var programActiveElem = $(programTemplate, '[rm-id="program-active"]');
		var programWeatherDataElem = $(programTemplate, '[rm-id="program-weather-data"]');
		var programStartTimeHourElem = $(programTemplate, '[rm-id="program-program-start-time-hour"]');
		var programStartTimeMinElem = $(programTemplate, '[rm-id="program-program-start-time-min"]');
		var programCyclesSoakElem = $(programTemplate, '[rm-id="program-cycle-soak"]');
		var programCyclesElem = $(programTemplate, '[rm-id="program-cycles"]');
        var programSoakElem = $(programTemplate, '[rm-id="program-soak-duration"]');
        var programDelayZonesMinElem = $(programTemplate, '[rm-id="program-delay-zones-min"]');
        var programDelayZonesSecElem = $(programTemplate, '[rm-id="program-delay-zones-sec"]');
        var programDelayZonesElem = $(programTemplate, '[rm-id="program-delay-zones"]');

        var programFrequencyDailyElem = $(programTemplate, '[rm-id="program-frequency-daily"]');
        var programFrequencyOddElem = $(programTemplate, '[rm-id="program-frequency-odd"]');
        var programFrequencyEvenElem = $(programTemplate, '[rm-id="program-frequency-even"]');
        var programFrequencyEveryElem = $(programTemplate, '[rm-id="program-frequency-every"]');
        var programFrequencySelectedElem = $(programTemplate, '[rm-id="program-frequency-selected"]');

        //---------------------------------------------------------------------------------------
        // Show program data.
        //
        programNameElem.value = program.name;
        programActiveElem.checked = program.active;
        programWeatherDataElem.checked = program.ignoreInternetWeather;

        programStartTimeHourElem.value = startTime.hour;
        programStartTimeMinElem.value = startTime.min;
        programCyclesSoakElem.checked = program.cs_on;
        programCyclesElem.value = program.cycles;
        programSoakElem.value = program.soak;
        programDelayZonesMinElem.value = delay.min;
        programDelayZonesSecElem.value = delay.sec;
        programDelayZonesElem.value = program.delay_on;

        if(program.frequency.type === 0) { // Daily
            programFrequencyDailyElem.checked = true;
        } else if(program.frequency.type === 1) { // Every N days
            programFrequencyEveryElem.checked = true;
        } else if(program.frequency.type === 2) { // Weekday
            programFrequencySelectedElem.checked = true;
        } else if(program.frequency.type === 4) { // Odd or Even
            var param = parseInt(program.frequency.param);
            if(param % 2 == 1) { // Odd
                programFrequencyOddElem.checked = true;
            } else {
                programFrequencyEvenElem.checked = true;
            }
        }

        //---------------------------------------------------------------------------------------
        // Show zones and watering times.
        //
		var zoneTable = $(programTemplate, '[rm-id="program-settings-zone-template-container"]');

        var wateringTimeList = program.wateringTimes;
        if(wateringTimeList) {
            for(var index = 0; index < wateringTimeList.length; index++) {
                var wateringTime = wateringTimeList[index];

                var zoneTemplate = loadTemplate("program-settings-zone-template");

                var zoneNameElem = $(zoneTemplate, '[rm-id="program-zone-name"]');
                var zoneDurationMinElem = $(zoneTemplate, '[rm-id="program-zone-duration-min"]');
                var zoneDurationSecElem = $(zoneTemplate, '[rm-id="program-zone-duration-sec"]');
                var zoneActiveElem = $(zoneTemplate, '[rm-id="program-zone-active"]');

                var durationMin = 0, durationSec = 0;

                try {
                    durationMin = parseInt(wateringTime.duration / 60);
                    durationSec = durationMin ? (wateringTime.duration % durationMin) : 0;
                } catch(e) {}

                if(durationMin == 0 && durationSec == 0) {
                    durationMin = durationSec = "";
                }

                zoneNameElem.textContent = wateringTime.name;
                zoneDurationMinElem.value = durationMin;
                zoneDurationSecElem.value = durationSec;
                zoneActiveElem.checked = wateringTime.active;

                zoneTable.appendChild(zoneTemplate);
            }
        }
		programSettingsDiv.appendChild(programTemplate);
	}

	//--------------------------------------------------------------------------------------------
	//
	//
	_programs.showPrograms = showPrograms;
	_programs.showProgramSettings = showProgramSettings;

} (window.ui.programs = window.ui.programs || {}));
