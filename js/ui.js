/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

var mainMenus = [
		{ prefix: "dashboard",	func: null,								visibilityFunc: makeVisibleBlock },
		//{ prefix: "zones", 		func: window.ui.zones.showZones, 		visibilityFunc: makeVisible },
		//{ prefix: "programs", 	func: window.ui.programs.showPrograms,	visibilityFunc: makeVisible },
		{ prefix: "settings", 	func: window.ui.settings.showWaterLog,	visibilityFunc: makeVisible },
];

var settingsSubmenus = [
    	{ name: "Watering History", func: window.ui.settings.showWaterLog,			container: '#wateringHistory' },
    	{ name: "Snooze",  			func: window.ui.settings.showRainDelay,			container: '#snooze' },
    	{ name: "Restrictions",  	func: window.ui.restrictions.showRestrictions,	container: '#restrictions' },
    	{ name: "Weather", 			func: window.ui.settings.showWeather,			container: '#weather' },
    	{ name: "System Settings",  func: window.ui.system.showSettings,			container: '#systemSettings' },
    	{ name: "About",  			func: window.ui.about.showAbout, 				container: '#about' }
	];

var dashboardSubmenus = [
    	{ name: "Weekly", 		func: loadWeeklyCharts,		container: '#dummy' },
        { name: "Monthly", 		func: loadMonthlyCharts,	container: '#dummy' },
        { name: "Yearly",  		func: loadYearlyCharts,		container: '#dummy' }
      ];

var zonesSubmenus = [
		{ name: "Stop All",		func: window.ui.zones.stopAllWatering,		container: null }
];

var programsSubmenus = [
		{ name: "Stop All",		func: window.ui.programs.stopAllWatering,		container: null }
];

var loop = null;

function _genericSubMenu()
{
	console.log("SubMenu: %s : %s", this.id, this.name)
}

function showError(message)
{
	 var errorDiv = $('#error');
	 errorDiv.innerHTML = message;
	 errorDiv.style.display = "inline";
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

				//Show current
				visibilityFunc(currentElements.container);
				visibilityFunc(currentElements.menu);
				currentElements.button.setAttribute("selected", true);
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
				if (waterQueue === undefined || !waterQueue || !waterQueue.queue || !waterQueue.queue.length)
                	return;
                window.ui.zones.showZonesSimple();
			}
		);
	}
	else
	{
		console.log("Idle Loop");
        updateSnoozeTimer(); //update snooze timer

	}
}

function uiStart()
{
    buildMenu();
    buildSubMenu(settingsSubmenus, "settings", $('#settingsMenu'));
	$('#chartsWeek').onclick = loadWeeklyCharts;
	$('#chartsMonth').onclick = loadMonthlyCharts;
	$('#chartsYear').onclick = loadYearlyCharts;

    //buildSubMenu(dashboardSubmenus, "dashboard", $('#dashboardMenu'));
    //buildSubMenu(zonesSubmenus, "zones", $('#zonesMenu'));
    //buildSubMenu(programsSubmenus, "programs", $('#programsMenu'));

	//Set default button selections
	$('#dashboardBtn').setAttribute("selected", true);
	//$('#dashboard0').setAttribute("selected", true);
	$('#settings0').setAttribute("selected", true);


	$("#logoutBtn").onclick = function() {
		Storage.deleteItem("access_token");
		Util.redirectHome(location);
	}

	$("#weather-data-edit").onclick = function() {
		$('#settingsBtn').onclick();
		$('#settings3').onclick();
	}

	ui.login.login(function() {
		window.ui.about.getDeviceInfo();

		//TODO Show Programs
		window.ui.programs.showPrograms();

		//TODO Show zones
		window.ui.zones.showZones();

		//TODO Show parsers simple
		window.ui.settings.showParsers(true);

		//TODO Show waterlog simple

		var days = 7;
		var startDate = Util.getDateWithDaysDiff(days);
		APIAsync.getWateringLog(false, true, startDate, days).then(function(o) {Data.waterLogCustom = o; window.ui.settings.showWaterLogSimple();});


		loadCharts(true, 60); //generate charts forcing data refresh for 60 days in the past

		loop = setInterval(uiLoop, 2000);
	});
}

window.addEventListener("load", uiStart);
