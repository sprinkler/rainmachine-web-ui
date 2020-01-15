/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

window.ui = window.ui || {};

(function(_main) {

 	var loop = null;
	var loopSlowLastRun = Date.now();
	var loopMediumLastRun = Date.now();
	var loopHourlyLastRun = Date.now();

	var loopSeconds = 3.5 * 1000;
	var loopSlowSeconds = 20 * 1000;
	var loopMediumSeconds = 9 * 1000;
	var loopHourlySeconds = 60 * 60 * 1000;

    var uiLastWateringState = false;
	var zonesExpanded = false;
    var programsExpanded = false;
    var uiElems = {};

	/* Menus that appear on top, if an entry has a parent defined it means that it's container/menu will be in the parent
	 * container/menu. It's actually like a submenu but it's important enough to have its button placed on main menu.
	 */
	var mainMenus = [
		{ prefix: "dashboard",	parent: null, 			func: showDashboard, 							visibilityFunc: makeVisibleBlock },
		{ prefix: "programs",	parent: "dashboard",	func: function() { togglePrograms(false); },	visibilityFunc: makeVisibleBlock },
		{ prefix: "zones",		parent: "dashboard",	func: function() { toggleZones(false); },		visibilityFunc: makeVisibleBlock },
		{ prefix: "settings", 	parent: null,			func: window.ui.settings.showWaterLog,			visibilityFunc: makeVisible 	 },
	];

	var settingsSubmenus = [
		{ name: "Watering History", func: window.ui.settings.showWaterLog,			container: '#wateringHistory' },
		{ name: "Snooze",  			func: window.ui.settings.showRainDelay,			container: '#snooze' },
		{ name: "Restrictions",  	func: window.ui.restrictions.showRestrictions,	container: '#restrictions' },
		{ name: "Sensors",		  	func: window.ui.restrictions.showSensors,		container: '#sensors' },
		{ name: "Weather", 			func: window.ui.settings.showWeather,			container: '#weather' },
		{ name: "System Settings",  func: window.ui.system.showSettings,			container: '#systemSettings' },
		{ name: "About",  			func: window.ui.about.showAbout, 				container: '#about' }
		];

	var dashboardNavigation = [
		{ id: "chartsWeek",	 func: loadWeeklyCharts },
		{ id: "chartsMonth", func: loadMonthlyCharts },
		{ id: "chartsYear",	 func: loadYearlyCharts }
	];


	function showError(message)
	{
		 uiElems.error.innerHTML = message;
		 uiElems.error.style.display = "inline";
	}

	function buildNavigation(buttonList) {
		for (var i = 0; i < buttonList.length; i++) {
			var b = buttonList[i];
			var buttonElem = $("#" + b.id);
			buttonElem.func = b.func;
			buttonElem.onclick = function() {
				for (var t = 0; t < buttonList.length; t++)	{
					if (this.id === "chartsWeek") {
						$('#weatherChartQPFMonthsContainer').style.display = "none";
						$('#weatherChartTempMonthsContainer').style.display = "none";
						$('#weatherChartDaysContainer').style.display = "inline-block";
						window.ui.programs.onProgramsChartTypeChange(true);

					} else {
						$('#weatherChartDaysContainer').style.display = "none";
						$('#weatherChartQPFMonthsContainer').style.display = "inline-block";
						$('#weatherChartTempMonthsContainer').style.display = "inline-block";
						window.ui.programs.onProgramsChartTypeChange(false);
					}

					var c = buttonList[t];
					if (this.id === c.id) {
						this.setAttribute("selected", "on");
						//$("#" + c.idText).textContent = c.text;
						this.func();
					} else {
						$("#" + c.id).removeAttribute("selected");
					}
				}
			}
		}
	}

	function buildSubMenu(submenus, category, parentTag) {
		for (var i = 0; i < submenus.length; i++) {
			var div = addTag(parentTag, 'div');
			div.className = "submenu";
			div.id = category + i;
			div.name = div.innerHTML = submenus[i].name;
			div.func = submenus[i].func;
			div.onclick = function()
				{
					if (history.state.elem != this.id) {
						history.pushState({"elem": this.id }, null, null);
						console.log("Saved history for %s", this.id);
					}

					//Hide other containers and Show the selected container
					for (var t = 0; t < submenus.length; t++)
					{
						if (submenus[t].container === null)
							continue;

						var c = $(submenus[t].container);
						var b = "#" + category + t;

						if (this.name !== submenus[t].name)
						{
							$(b).removeAttribute("selected");
							makeHidden(c);
						}
						else
						{
							this.setAttribute("selected", true);
							makeVisible(c);
						}
					}
					//Call the button function
					this.func();
				}
		}
	}

	function getMenuElements(id) {
		var elements = {
			container: $("#" + id),
			button: $("#" + id + "Btn"),
			menu: $("#" + id + "Menu")
		};

		return elements;
	}

	function buildMenu() {
		for (var i = 0; i < mainMenus.length; i++) {
			var currentButton = $("#" + mainMenus[i].prefix  + "Btn");

			currentButton.onclick = (function(index) {
				return function() {
					if (history.state.elem != this.id) {
						history.pushState({"elem": this.id }, null, null);
						console.log("Saved history for %s", this.id);
					}

					var visibilityFunc = mainMenus[index].visibilityFunc;
					var currentElements = getMenuElements(mainMenus[index].prefix);
					var parent = mainMenus[index].parent;

					currentElements.button.setAttribute("selected", true);

					//For views that have a parent make visible parent container
					if (parent) {
						currentElements = getMenuElements(mainMenus[index].parent);
					}

					//Show current
					if (visibilityFunc) {
						visibilityFunc(currentElements.container);
						visibilityFunc(currentElements.menu);
					}

					//Hide others
					var otherMenus = mainMenus.slice(0);
					otherMenus.splice(index, 1);
					for (var j = 0; j < otherMenus.length; j++) {
						var otherElements = getMenuElements(otherMenus[j].prefix);

						//If we have a parent it will be handled at parent element index
						if (!otherMenus[j].parent && otherMenus[j].prefix !== parent) {
							makeHidden(otherElements.container);
							makeHidden(otherElements.menu);
						}

						otherElements.button.removeAttribute("selected");
					}

					if (mainMenus[index].func !== null)
						mainMenus[index].func();

					console.log("Main Menu Selected: %s", mainMenus[index].prefix);
				}
			})(i)
		}
	}


	//--------------------------------------------------------------------------------------------
	//
	//
	function uiStart() {
		if (Data.today === null) {
			APIAsync.getDateTime().then(
				function(o) {
					Util.parseDeviceDateTime(o);
					uiInitialDownload();
				});
		} else {
			uiInitialDownload();
		}
	}

	function uiInitialDownload() {
		chartsData = new ChartData();
		APIAsync.getProvision().then(
			function(o) {
				Data.provision.system = o.system;
				Data.provision.location = o.location;

				window.ui.about.getDeviceInfo();
				window.ui.programs.showPrograms();
				window.ui.zones.showZones();
				window.ui.settings.showParsers(true, false);
				loadCharts(true, 30); //generate charts forcing data refresh for 30 days in the past
				loop = setInterval(uiLoop, loopSeconds);
			});
	}

	function uiLoop() {
		var wqAsync = null;
		var rAsync = null;
		var runCall = false;
		// Entire Window/Tab not visible
		if (document.visibilityState === "hidden")
			return;

		if (isVisible(uiElems.dashboard) && isVisible(uiElems.zones)) {
			if (wqAsync == null || (wqAsync !== null && wqAsync.finished))
				runCall = true;

			//Check if watering and update programs/zones status
			if (runCall)
				wqAsync = APIAsync.getWateringQueue()
				.then(
					function(waterQueue) {
						if (waterQueue === undefined || !waterQueue || !waterQueue.queue) {
							return;
						}

						//If watering has been stopped do 1 more refresh
						if (waterQueue.queue.length == 0) {
							if (uiLastWateringState == true) {
								uiLastWateringState = false;
								//Hide STOP and PAUSE all button
								makeHidden(window.ui.zones.uiElems.stopAll);
								makeHidden(window.ui.zones.uiElems.pauseAll);
								//Stop flow sensor wheel
								window.ui.restrictions.setFlowSensorState(false);
							} else {
								return;
							}
						} else {
							uiLastWateringState = true;
							//Show STOP and PAUSE all button
							makeVisible(window.ui.zones.uiElems.stopAll);
							makeVisible(window.ui.zones.uiElems.pauseAll);
							if (waterQueue.queue[0].zid == 1005) {
								window.ui.zones.setPauseState(true);
								window.ui.restrictions.setFlowSensorState(false);
							} else {
								window.ui.zones.setPauseState(false);
								window.ui.restrictions.setFlowSensorState(true);
							}
						}
						refreshProgramAndZones(true);

						//Refresh queue information
						window.ui.zones.updateWateringQueue(waterQueue);
					}
				);
			//Refresh (without data download) parser box
			window.ui.settings.updateParsers(true);

			//Refresh on medium timer
			runCall = false;
			if (rAsync == null || (rAsync !== null && rAsync.finished))
				runCall = true;
			if (runCall)
				rAsync = refreshRestrictions(false);

			//Refresh on slower timer
			refreshProgramAndZones(false);

			// Refresh on hourly timer
			refreshHourly(false);

			//Refresh all data if there was a forced parser/mixer run from Settings->Weather
			if (_main.refreshGraphs) {
				console.log("Refreshing Graphs");
				chartsData = new ChartData();
				loadCharts(true, 30);
				_main.refreshGraphs = false;
			}
		}

		if (isVisible($("#settings")) && isVisible($("#snooze"))) {
			window.ui.settings.showRainDelay();
		}
	}

	function refreshProgramAndZones(forced) {
		if (forced || (Date.now() - loopSlowLastRun) > loopSlowSeconds) {
			loopSlowLastRun = Date.now();
			window.ui.programs.showPrograms();
			window.ui.zones.showZonesSimple();
		}
	}

	function refreshRestrictions(forced) {
		if (forced || (Date.now() - loopMediumLastRun) > loopMediumSeconds) {
			loopMediumLastRun = Date.now();
			return window.ui.restrictions.showCurrentRestrictions();
		}
		return null;
	}

	function refreshHourly(forced) {
		if (forced || (Date.now() - loopHourlyLastRun) > loopHourlySeconds) {
			loopHourlyLastRun = Date.now();
			window.ui.system.getDeviceDateTime();
		}
	}


	//--------------------------------------------------------------------------------------------
	//
	//
	function showDashboard() {
		makeVisibleBlock('#dashboard');
		window.ui.programs.onProgramsChartTypeChange(true);
		$('#weatherChartQPFMonthsContainer').style.display = "none";
		$('#weatherChartTempMonthsContainer').style.display = "none";
		$('#weatherChartDaysContainer').style.display = "inline-block";
		loadWeeklyCharts();
		togglePrograms(true);
		toggleZones(true);
	}

	function togglePrograms(forceState) {

		if (typeof forceState !== "undefined") {
			programsExpanded = forceState
		}

		if (!programsExpanded) {
			toggleZones(true);
			makeHidden(uiElems.homeLeft);
			makeHidden(uiElems.homeZones);
			uiElems.homeRight.className = 'homeRightExpanded';
			uiElems.homePrograms.style.display = "inline-block";
			programsExpanded = true;

		} else {
			uiElems.homeLeft.style.display = uiElems.homeZones.style.display = "inline-block";
			uiElems.homeRight.className = 'homeRightContracted';
			programsExpanded = false;
		}
	}

	function toggleZones(forceState) {

		if (typeof forceState !== "undefined") {
			zonesExpanded = forceState;
		}

		if (!zonesExpanded) {
			togglePrograms(true);
			makeHidden(uiElems.homeLeft);
			makeHidden(uiElems.homePrograms);
			makeHidden(uiElems.chartsTime);
			makeHidden(uiElems.chartsDays);

			uiElems.homeZones.style.display = "inline-block";
			uiElems.homeZones.className = 'homeZonesExpanded';
			zonesExpanded = true;
			window.ui.zones.toggleZonesDetails(zonesExpanded);
		} else {
			uiElems.homeLeft.style.display = uiElems.homeRight.style.display = "inline-block";
			uiElems.chartsTime.style.display = uiElems.chartsDays.style.display = "inline-block";
			uiElems.homePrograms.style.display = "inline-block";
			uiElems.homeZones.className = 'homeZonesContracted';
			zonesExpanded = false;
			window.ui.zones.toggleZonesDetails(zonesExpanded);
		}
	}

	function toggleWaterGaugeInfo(showSaved) {
		var bOn = $("#waterGaugeSaved");
		var bOff = $("#waterGaugeUsed");

		if (!showSaved) {
			bOn = $("#waterGaugeUsed");
			bOff = $("#waterGaugeSaved");
		}

		bOn.setAttribute("selected", "on");
		bOff.removeAttribute("selected");
		waterGaugeSaved = showSaved;
		setWaterSavedValueForDays(chartsCurrentDays);
		generateWaterSavedGauge();
	}

	//Static UI elements for main UI
	function buildUIElems() {
		uiElems.homeLeft = $('#homeScreenLeft');
        uiElems.homeRight = $('#homeScreenRight');
        uiElems.homeZones = $('#homeScreenZoneList');
        uiElems.homePrograms = $('#programsContainer');
        uiElems.chartsTime = $('#chartsTimeSpan');
        uiElems.chartsDays = $('#weatherChartsContainer');
        uiElems.error = $('#error');
		uiElems.error.onclick = function() { makeHidden(this); };
        uiElems.dashboard = $('#dashboard');
        uiElems.zones = $('#zonesList');
	}

	function setDefaultButtonActions() {
		//Dashboard / Home
		$('#dashboardBtn').setAttribute("selected", true);
		$('#settings0').setAttribute("selected", true);
		$('#'+ dashboardNavigation[0].id).setAttribute("selected", "on");

		//Logout
		$("#logoutBtn").onclick = ui.login.logout;

		//More button for water log details
		$("#waterlog-more").onclick = $('#waterSavedInfo').onclick = function() {
			$('#settingsBtn').onclick();
			$('#settings0').onclick();
		};

		//Edit button for dashboard weather data and click on top chart
		uiElems.chartsDays.onclick = function() {
			$('#settingsBtn').onclick();
			$('#settings4').onclick();
			$('#WeatherServicesComparisonTitle').scrollIntoView();
		};

		$("#weather-data-edit").onclick = function() {
			$('#settingsBtn').onclick();
			$('#settings4').onclick();
		};

		//Edit button for dashboard current restrictions
		$("#current-restrictions-edit").onclick = function() {
			$('#settingsBtn').onclick();
			$('#settings2').onclick();
		};

		//More button for dashboard device status
		$("#device-status-more").onclick = function() {
			$('#settingsBtn').onclick();
			$('#settings6').onclick();
		};

		$("#deviceImage").onclick = $('#dashboardBtn').onclick;

		$("#waterGaugeSaved").setAttribute("selected", "on");
		$("#waterGaugeSaved").onclick = function() { toggleWaterGaugeInfo(true); };
		$("#waterGaugeUsed").onclick = function() { toggleWaterGaugeInfo(false);	};
	}

	function setupHistoryState() {
		history.pushState({"elem": "dashboardBtn"}, null, null, null);
		window.addEventListener("popstate", function(e) {
			if (!e.state || !e.state.elem)
				return;

			var elem = $("#" + e.state.elem);
			if (elem.onclick && typeof elem.onclick === "function")
				elem.onclick();
		});
	}


	//--------------------------------------------------------------------------------------------
	//
	//
	function uiMain()
	{
		buildUIElems();
		buildMenu();
		buildSubMenu(settingsSubmenus, "settings", $('#settingsMenu'));
		buildNavigation(dashboardNavigation);
		Help.bindAll();
		window.ui.firebase.init();
		setDefaultButtonActions();
		setupHistoryState();

		//Load local settings
		Data.localSettings = Storage.restoreItem("localSettings") || Data.localSettings;

		ui.login.login(uiStart);
	}

	//--------------------------------------------------------------------------------------------
	//
	//
	_main.showError = showError;
	_main.uiMain = uiMain;
	_main.refreshGraphs = false;
} (window.ui.main = window.ui.main || {}));

window.addEventListener("load", window.ui.main.uiMain);
