
window.ui = window.ui || {};

(function(_programs) {

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

	function showProgramSettings(data)
	{
		var programSettingsDiv = $('#programsSettings');
		clearTag(programSettingsDiv);

		var programTemplate = loadTemplate("program-settings-template");

		var programNameElem = programTemplate.querySelector('[rm-id="program-name"]');
		var programActiveElem = programTemplate.querySelector('[rm-id="program-active"]');
		var programWeatherDataElem = programTemplate.querySelector('[rm-id="program-weather-data"]');

		var zoneTable = programTemplate.querySelector('[rm-id="program-settings-zone-template-container"]');

		for (var s in data)
		{
			//var div = addTag(programTemplate, 'div');
			//div.innerHTML = s + ": " + JSON.stringify(data[s]);

			if(s === "wateringTimes") {
				var wateringTimeList = data[s];
				for(var index = 0; index < wateringTimeList.length; index++) {
					var wateringTime = wateringTimeList[index];

					var zoneTemplate = loadTemplate("program-settings-zone-template");

					var zoneNameElem = zoneTemplate.querySelector('[rm-id="program-zone-name"]');
					var zoneDurationMinElem = zoneTemplate.querySelector('[rm-id="program-zone-duration-min"]');
					var zoneDurationSecElem = zoneTemplate.querySelector('[rm-id="program-zone-duration-sec"]');
					var zoneActiveElem = zoneTemplate.querySelector('[rm-id="program-zone-active"]');

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
		}
		console.log(zoneTable);
		programSettingsDiv.appendChild(programTemplate);
	}

	//--------------------------------------------------------------------------------------------
	//
	//
	_programs.showPrograms = showPrograms;
	_programs.showProgramSettings = showProgramSettings;

} (window.ui.programs = window.ui.programs || {}));
