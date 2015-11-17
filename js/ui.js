/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

var mainMenus = [
		{ prefix: "dashboard",	func: function() {togglePrograms(true); toggleZones(true);}, visibilityFunc: makeVisibleBlock },
		{ prefix: "settings", 	func: window.ui.settings.showWaterLog,		visibilityFunc: makeVisible },
];

var settingsSubmenus = [
    	{ name: "Watering History", func: window.ui.settings.showWaterLog,			container: '#wateringHistory' },
    	{ name: "Snooze",  			func: window.ui.settings.showRainDelay,			container: '#snooze' },
    	{ name: "Restrictions",  	func: window.ui.restrictions.showRestrictions,	container: '#restrictions' },
    	{ name: "Weather", 			func: window.ui.settings.showWeather,			container: '#weather' },
    	{ name: "System Settings",  func: window.ui.system.showSettings,			container: '#systemSettings' },
    	{ name: "About",  			func: window.ui.about.showAbout, 				container: '#about' }
	];

var dashboardNavigation = [
	{ id: "chartsWeek",	idText: "waterSavedTitle",	text: "Water saved this week", 	func: loadWeeklyCharts },
	{ id: "chartsMonth",idText: "waterSavedTitle",	text: "Water saved this month", func: loadMonthlyCharts },
	{ id: "chartsYear",	idText: "waterSavedTitle",	text: "Water saved this year",	func: loadYearlyCharts }
];

var loop = null;
var uiLastWateringState = false;
var programsExpanded = false;
var zonesExpanded = false;

function showError(message)
{
	 var errorDiv = $('#error');
	 errorDiv.innerHTML = message;
	 errorDiv.style.display = "inline";
}

function buildNavigation(buttonList) {
	for (var i = 0; i < buttonList.length; i++) {
		var b = buttonList[i];
		var buttonElem = $("#" + b.id);
		buttonElem.func = b.func;
		buttonElem.onclick = function() {
			for (var t = 0; t < buttonList.length; t++)	{
				var c = buttonList[t];
				if (this.id === c.id) {
					this.setAttribute("selected", "on");
					$("#" + c.idText).textContent = c.text;
					this.func();
				} else {
					$("#" + c.id).removeAttribute("selected");
				}

				if (this.id === "chartsWeek") {
					$('#weatherChartQPFMonthsContainer').style.display = "none";
					$('#weatherChartTempMonthsContainer').style.display = "none";
					$('#weatherChartDaysContainer').style.display = "inline-block";
				} else {
					$('#weatherChartDaysContainer').style.display = "none";
					$('#weatherChartQPFMonthsContainer').style.display = "inline-block";
					$('#weatherChartTempMonthsContainer').style.display = "inline-block";

				}
			}
		}
	}
}

function buildSubMenu(submenus, category, parentTag)
{
	for (var i = 0; i < submenus.length; i++)
	{
		var div = addTag(parentTag, 'div')
		div.className = "submenu";
		div.id = category + i;
		div.name = div.innerHTML = submenus[i].name;
		div.func = submenus[i].func;
		div.onclick = function()
			{
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
		var id = mainMenus[i].prefix;
		var currentButton = $("#" + id + "Btn");

		currentButton.onclick = (function(index) {
			return function() {
			    var visibilityFunc = mainMenus[index].visibilityFunc;
			    var currentElements = getMenuElements(mainMenus[index].prefix);

                currentElements.button.setAttribute("selected", true);

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
					makeHidden(otherElements.container);
					makeHidden(otherElements.menu);
					otherElements.button.removeAttribute("selected");
				}

                if (mainMenus[index].func !== null)
                	mainMenus[index].func();

                console.log("Main Menu Selected: %s", mainMenus[index].prefix);
			}
		})(i)
	}
}

function updateSnoozeTimer() {

	var onDiv = $("#snoozeCurrentContent");
	
	if(isVisible(onDiv)){
		var raindelay = API.getRestrictionsRainDelay();
		var rd = +raindelay.delayCounter;

		if(rd > 0) {
			var v = Util.secondsToHuman(rd);
			var vdiv = $("#snoozeCurrentValue");
			vdiv.textContent = v.days + " days " + v.hours + " hours " + v.minutes + " mins ";
		}
	}
}


function uiLoop()
{
	if (isVisible("#dashboard") && isVisible("#zonesList"))
	{
		APIAsync.getWateringQueue()
		.then(
			function(waterQueue) {

				if (waterQueue === undefined || !waterQueue || !waterQueue.queue) {
				    return;
				}

				//If watering has been stopped do 1 more refresh
				if (waterQueue.queue.length == 0) {
					if (uiLastWateringState == true) {
						uiLastWateringState = false;
					} else {
						return;
					}
				} else {
					uiLastWateringState = true;
				}

				window.ui.zones.showZonesSimple();
				window.ui.programs.showPrograms();
			}
		);
	}
	else
	{
		console.log("Idle Loop");
        updateSnoozeTimer(); //update snooze timer

	}
}

function togglePrograms(forceState) {

	if (typeof forceState !== "undefined") {
		programsExpanded = forceState
	}

	var homeLeft = $('#homeScreenLeft');
	var homeRight = $('#homeScreenRight');
	var homeZones = $('#homeScreenZoneList');
	var homePrograms = $('#programsContainer');

	if (!programsExpanded) {
		toggleZones(true);
		console.log('expanding programs');
		homeLeft.style.display = "none";
		homeZones.style.display = "none";
		homeRight.style.width = '1280px';
		homePrograms.style.display = "inline-block";
		programsExpanded = true;

	} else {
		console.log('shrinking programs');
		homeLeft.style.display = "inline-block";
		homeZones.style.display = "inline-block";
		homeRight.style.width = '';
		programsExpanded = false;

	}
}

function toggleZones(forceState) {

	if (typeof forceState !== "undefined") {
		zonesExpanded = forceState;
	}

	var homeLeft = $('#homeScreenLeft');
	var homeRight = $('#homeScreenRight');
	var homeZones = $('#homeScreenZoneList');
	var homePrograms = $('#programsContainer');
	var chartsTime = $('#chartsTimeSpan');
    var chartsDays = $('#weatherChartsContainer');

	if (!zonesExpanded) {
		togglePrograms(true);
		console.log('expanding zones');
		homeLeft.style.display = "none";
		homePrograms.style.display = "none";
		homeZones.style.display = "inline-block";
		chartsTime.style.display = "none";
		chartsDays.style.display = "none";
		homeZones.style.width = '1280px';
		zonesExpanded = true;
	} else {
		console.log('shrinking zones');
		homeLeft.style.display = "inline-block";
		homeRight.style.display = "inline-block";
		chartsTime.style.display = "inline-block";
		chartsDays.style.display = "inline-block";
		homePrograms.style.display = "inline-block";
		homeZones.style.width = '';
		zonesExpanded = false;
	}
}

function uiStart()
{
    buildMenu();
    buildSubMenu(settingsSubmenus, "settings", $('#settingsMenu'));
	buildNavigation(dashboardNavigation);

	//Set default button selections
	$('#dashboardBtn').setAttribute("selected", true);
	$('#settings0').setAttribute("selected", true);
	$('#'+ dashboardNavigation[0].id).setAttribute("selected", "on");

	$("#logoutBtn").onclick = function() {
		Storage.deleteItem("access_token");
		Util.redirectHome(location);
	};

	$("#weather-data-edit").onclick = function() {
		$('#settingsBtn').onclick();
		$('#settings3').onclick();
	};

	//1001 modifications
	$('#programsBtn').onclick = function() { togglePrograms(); };
	$('#zonesBtn').onclick = function() { toggleZones(); };

	ui.login.login(function() {
		window.ui.about.getDeviceInfo();

		//TODO Show Programs
		window.ui.programs.showPrograms();

		//TODO Show zones
		window.ui.zones.showZones();

		//TODO Show parsers simple
		window.ui.settings.showParsers(true);

		loadCharts(true, 60); //generate charts forcing data refresh for 60 days in the past

		//TODO Show waterlog simple
		var days = 7;
		var startDate = Util.getDateWithDaysDiff(days);
		APIAsync.getWateringLog(false, true, startDate, days).then(function(o) {Data.waterLogCustom = o; window.ui.settings.showWaterLogSimple();});


		loop = setInterval(uiLoop, 2000);
	});
}

window.addEventListener("load", uiStart);
