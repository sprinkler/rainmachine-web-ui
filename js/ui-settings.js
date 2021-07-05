/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

window.ui = window.ui || {};

(function(_settings) {

    var uiElems = {};

    var waterLogReason = {
        0: "",
        1: "Stopped by user",
        2: "Minimum watering time",
        3: "Freeze protect",
        4: "Day restriction",
        5: "Watering time reaches next day",
        6: "Water surplus",
        7: "Rain detected by sensor",
        8: "Software rain sensor restriction",
        9: "Month Restricted",
        10: "Snooze set by user",
        11: "Program Rain Restriction",
        12: "Adaptive Frequency Skip",
        13: "Paused watering"
    };

    // keeps mapping of id -> name some programs might only exists on waterlog and not in programs
    var waterLogPrograms = {};



    function showRainDelay() {

        if (!uiElems.hasOwnProperty("snooze")) {
            uiElems.snooze = {};
            uiElems.snooze.enabledContainer = $("#snoozeCurrentContent");
            uiElems.snooze.disabledContainer = $("#snoozeSetContent");

            uiElems.snooze.enabledContent = $("#snoozeCurrentValue");
            uiElems.snooze.daysInput = $('#snoozeDays');
            uiElems.snooze.hoursInput = $('#snoozeHours');
            uiElems.snooze.minutesInput = $('#snoozeMinutes');

            uiElems.snooze.stop = $("#snoozeStop");
            uiElems.snooze.set = $("#snoozeSet");

            uiFeedback.sync(uiElems.snooze.stop, onSetSnooze, 0);
            uiFeedback.sync(uiElems.snooze.set, function() {
                var seconds = 0;
                try {
                    seconds += +uiElems.snooze.daysInput.value * 86400;
                    seconds += +uiElems.snooze.hoursInput.value * 3600;
                    seconds += +uiElems.snooze.minutesInput.value * 60;
                    return onSetSnooze(seconds);
                } catch (e) {
                    console.log("Invalid Snooze parameters");
                    return null;
                }
            });
        }

        APIAsync.getRestrictionsRainDelay().then(function(o) {
            Data.rainDelay = o;
            updateRainDelay();
        });
    }

    function updateRainDelay() {

        var rd = +Data.rainDelay.delayCounter;

        //Are we already in Snooze
        if (rd > 0) {
            makeHidden(uiElems.snooze.disabledContainer);
            makeVisible(uiElems.snooze.enabledContainer);
            var v = Util.secondsToHuman(rd);
            uiElems.snooze.enabledContent.textContent = v.days + " days " + v.hours + " hours " + v.minutes + " mins ";
        } else {
            makeHidden(uiElems.snooze.enabledContainer);
            makeVisible(uiElems.snooze.disabledContainer);
        }
    }

    function onSetSnooze(seconds) {

        var params = {
            rainDelayStartTime: Math.floor(Date.now() / 1000),
            rainDelayDuration: seconds
        };

        //var r = API.setRestrictionsRainDelay(days);
        var r = API.setRestrictionsGlobal(params);

        showRainDelay();
        return r;
    }

    function onWaterLogFetch() {
        var startDate = $("#waterHistoryStartDate").value;
        var days = parseInt($("#waterHistoryDays").value) || 30;
        console.log("Getting water log starting from %s for %d days...", startDate, days);

        APIAsync.getWateringLog(false, true, startDate, days)
            .start(uiFeedback.start, $("#waterHistoryFetch"))
            .then(function(o) {
                Data.waterLogCustom = o;
                showWaterLog();
                uiFeedback.success($("#waterHistoryFetch"));
            })
            .error(uiFeedback.error, $("#waterHistoryFetch"));
    }

    function onPastProgramValuesFetch() {
        var startDate = $("#waterHistoryStartDate").value;
        var days = parseInt($("#waterHistoryDays").value) || 30;
        console.log("Getting programs past values starting from %s for %d days...", startDate, days);

        APIAsync.getWateringPast(startDate, days).then(
            function(o) {
                Data.programsPastValues = o;
                showWaterLog();
            }
        );
    }

    function showWaterLog() {

        var days = 30;
        var startDate = Util.getDateWithDaysDiff(days - 1); // We want including today

        if (!uiElems.hasOwnProperty("waterlog")) {
            uiElems.waterlog = {};
            uiElems.waterlog.filterProgram = $("#waterHistoryFilterProgram");
            uiElems.waterlog.filterZone = $("#waterHistoryFilterZone");

            uiElems.waterlog.filterProgram.onchange = function() {
                setSelectOption(uiElems.waterlog.filterZone, -1, true);
                showWaterLog();
            };

            uiElems.waterlog.filterZone.onchange = function() {
                setSelectOption(uiElems.waterlog.filterProgram, -1, true);
                showWaterLog();
            };

            addSelectOption(uiElems.waterlog.filterProgram, "All", -1);
            addSelectOption(uiElems.waterlog.filterZone, "All", -1);
            if (Data.zoneData) {
                for (var i = 0; i < Data.zoneData.zones.length; i++)
                    addSelectOption(uiElems.waterlog.filterZone, Data.zoneData.zones[i].name, Data.zoneData.zones[i].uid);
            }
        }


        var container = $("#wateringHistoryContent");
        var startDateElem = $("#waterHistoryStartDate");
        var daysElem = $("#waterHistoryDays");
        var buttonElem = $("#waterHistoryFetch");
        var filterProgramId = getSelectValue(uiElems.waterlog.filterProgram);
        var filterZoneId = getSelectValue(uiElems.waterlog.filterZone);
        //Water Consume Graph: get Water Consume container name
        var waterConsume = $("#waterConsume");

        console.log("Filtering program id: %s zone id: %s", filterProgramId, filterZoneId);

        buttonElem.onclick = function() {
            onWaterLogFetch();
            onPastProgramValuesFetch()
        };
        clearTag(container);

        var dedicatedMasterValve = Data.provision.system.dedicatedMasterValve || false;

        //First time on this page view 7 past days
        if (!startDateElem.value || !daysElem.value) {
            startDateElem.value = startDate;
            daysElem.value = days;
        }

        if (Data.waterLogCustom === null) {
            onWaterLogFetch();
            return;
        }

        if (Data.programsPastValues === null) {
            onPastProgramValuesFetch();
            return;
        }

        var waterLog = Data.waterLogCustom;
        var pastValues = Data.programsPastValues.pastValues;

        //Water Consume Graph: prepare structure to collect data for water consume graph
        var waterConsumeData = {
            frontGraphSeries: [],
            drillDownSeries: []
        };

        //Process past values for programs that contain used ET and QPF at the time of program run
        var pastValuesByDay = {};
        for (var i = 0; i < pastValues.length; i++) {
            var key = pastValues[i].dateTime.split(" ")[0];
            var pid = pastValues[i].pid;

            if (!(key in pastValuesByDay)) {
                pastValuesByDay[key] = {};
            }
            pastValuesByDay[key][pid] = {
                et: Math.round(+pastValues[i].et0 * 100) / 100,
                qpf: Math.round(+pastValues[i].qpf * 100) / 100
            };
        }

        for (i = waterLog.waterLog.days.length - 1; i >= 0; i--) {
            var day = waterLog.waterLog.days[i];
            var dayDurations = { machine: 0, user: 0, real: 0, usedVolume: 0, volume: 0 };

            var dayTemplate = loadTemplate("watering-history-day-template");
            var dayNameElem = $(dayTemplate, '[rm-id="wateringLogDayName"]');
            var dayConditionElem = $(dayTemplate, '[rm-id="wateringLogDayWeatherIcon"]');
            var dayTempMaxElem = $(dayTemplate, '[rm-id="wateringLogDayWeatherMaxTemp"]');
            var dayTempMinElem = $(dayTemplate, '[rm-id="wateringLogDayWeatherMinTemp"]');
            var dayQpfElem = $(dayTemplate, '[rm-id="wateringLogDayWeatherQpf"]');
            var dayETElem = $(dayTemplate, '[rm-id="wateringLogDayWeatherET"]');
            var dayUserDurationElem = $(dayTemplate, '[rm-id="wateringLogDayUser"]');
            var dayRealDurationElem = $(dayTemplate, '[rm-id="wateringLogDayReal"]');
            var dayWaterUsedElem = $(dayTemplate, '[rm-id="wateringLogDayWaterUsed"]');
            var dayContainerElem = $(dayTemplate, '[rm-id="wateringLogProgramsContainer"]');

            var dayConditionStr;
            var dayMinTempStr;
            var dayMaxTempStr;
            var dayQpfStr;
            var dayETStr;
            //Actual values will be used for past program values differences below
            var dayQpf;
            var dayET;
            var dayHasPrograms = false;

            try {
                dayConditionStr = Util.conditionAsIcon(chartsData.condition.getAtDate(day.date));

                dayMinTempStr = Util.convert.uiTemp(chartsData.mint.getAtDate(day.date));
                if (dayMinTempStr !== null) {
                    dayMinTempStr += Util.convert.uiTempStr();
                } else {
                    dayMinTempStr = "--";
                }

                dayMaxTempStr = Util.convert.uiTemp(chartsData.maxt.getAtDate(day.date));
                if (dayMaxTempStr !== null) {
                    dayMaxTempStr += Util.convert.uiTempStr();
                } else {
                    dayMaxTempStr = "--";
                }

                dayQpf = chartsData.qpf.getAtDate(day.date);
                dayQpfStr = Util.convert.uiQuantity(dayQpf);
                if (dayQpfStr !== null) {
                    dayQpfStr += Util.convert.uiQuantityStr();
                } else {
                    dayQpfStr = "--";
                }

                dayET = chartsData.et0.getAtDate(day.date);
                dayETStr = Util.convert.uiQuantity(dayET);
                if (dayETStr !== null) {
                    dayETStr += Util.convert.uiQuantityStr();
                } else {
                    dayETStr = "--";
                }
            } catch (e) {
                console.error("Missing mixer data for day %s", day.date);
            }

            //console.log("Day: %s Temp: %s/%s QPF: %s", day.date, dayMinTempStr, dayMaxTempStr, dayQpfStr);

            var d = Util.deviceDateStrToDate(day.date);

            if (d) {
                dayNameElem.textContent = d.toDateString();
            } else {
                dayNameElem.textContent = "";
            }

            dayConditionElem.textContent = dayConditionStr;
            dayTempMaxElem.textContent = dayMaxTempStr;
            dayTempMinElem.textContent = dayMinTempStr;
            dayQpfElem.textContent = dayQpfStr;
            dayETElem.textContent = dayETStr;

            //Water Consume Graph: declare local variable in for days routine
            var ZonesConsumedData = [];

            for (var j = 0; j < day.programs.length; j++) {
                var program = day.programs[j];
                var programDurations = { machine: 0, user: 0, real: 0, usedVolume: 0, volume: 0 };
                var programHasZones = false;
                var name;

                if (waterLogPrograms.hasOwnProperty(program.id)) {
                    name = waterLogPrograms[program.id];
                } else {
                    if (program.id == 0) {
                        name = "Manual Watering";
                    } else {
                        var p = getProgramById(program.id); //TODO make sure we have Data.programs
                        if (p !== null)
                            name = p.name;
                        else
                            name = "Program " + program.id
                    }
                    waterLogPrograms[program.id] = name;
                    addSelectOption(uiElems.waterlog.filterProgram, name, program.id);
                }

                if (filterProgramId != -1 && program.id != filterProgramId)
                    continue;

                var programTemplate = loadTemplate("watering-history-day-programs-template");
                var programNameElem = $(programTemplate, '[rm-id="wateringLogProgramName"]');
                var programPastETElem = $(programTemplate, '[rm-id="wateringLogProgramPastET"]');
                var programPastQPFElem = $(programTemplate, '[rm-id="wateringLogProgramPastQPF"]');
                var programPastETIconElem = $(programTemplate, '[rm-id="wateringLogProgramPastETIcon"]');
                var programPastQPFIconElem = $(programTemplate, '[rm-id="wateringLogProgramPastQPFIcon"]');
                var programPastHelpElem = $(programTemplate, '[rm-id="wateringLogProgramPastHelp"]');
                var programContainerElem = $(programTemplate, '[rm-id="wateringLogZonesContainer"]');

                programNameElem.textContent = name;

                try {
                    var pastET = pastValuesByDay[day.date][program.id].et;
                    var pastQPF = pastValuesByDay[day.date][program.id].qpf;

                    // Only show big differences
                    /*
                    var diffET = dayET - pastET;
                    var diffQpf = dayQpf - pastQPF;

                    var diffMax = 0.5;

                    if (Math.abs(diffET) > diffMax) {
                    	programPastETElem.textContent += (diffET > 0 ? "+":"") + Util.convert.uiQuantity(diffET) +  Util.convert.uiQuantityStr() + " ";
                    	makeVisible(programPastETIconElem);
                    	makeVisibleBlock(programPastHelpElem, true);
                    }

                    if (Math.abs(diffQpf) > diffMax) {
                    	programPastQPFElem.textContent += (diffQpf > 0 ? "+":"") + Util.convert.uiQuantity(diffQpf) + Util.convert.uiQuantityStr() + " ";
                    	makeVisible(programPastQPFIconElem);
                    	makeVisibleBlock(programPastHelpElem, true);
                    }
                    */
                    //Show actual values

                    programPastETElem.textContent += Util.convert.uiQuantity(pastET) + Util.convert.uiQuantityStr() + " ET since last run. ";
                    programPastQPFElem.textContent += Util.convert.uiQuantity(pastQPF) + Util.convert.uiQuantityStr() + " Rain since last run.";

                    makeVisible(programPastQPFIconElem);
                    makeVisible(programPastETIconElem);
                    makeVisibleBlock(programPastHelpElem, true);

                } catch (e) {
                    //console.log("No past values for day %s program %s (%s)", day.date, name, e);
                }

                //console.log("\t%s", name);

                //Convert between program/zones/cycles to program/cycles/zones
                cycles = {};
                var maxCycles = 0;
                var zoneidx;
                var zoneName;

                for (var k = 0; k < program.zones.length; k++) {
                    var zone = program.zones[k];
                    var zoneDurations = { machine: 0, user: 0, real: 0, usedVolume: 0, volume: 0, flowclicks: 0 };
                    var nameIndex = zone.uid;
                    if (dedicatedMasterValve) nameIndex = zone.uid - 1;

                    if (filterZoneId != -1 && nameIndex != filterZoneId)
                        continue;

                    programHasZones = true;
                    if (zone.cycles.length > maxCycles) {
                        maxCycles = zone.cycles.length;
                    }

                    //Calculate cycles total per zones and also create per cycle structure
                    for (var c = 0; c < zone.cycles.length; c++) {
                        var cycle = zone.cycles[c];
                        if (!(c in cycles)) {
                            cycles[c] = { machine: 0, user: 0, real: 0, id: c };
                            cycles[c].zones = {};
                            cycles[c].start = cycle.startTime.split(" ")[1];
                        }

                        cycles[c].machine += cycle.machineDuration;
                        cycles[c].real += cycle.realDuration;
                        cycles[c].user += cycle.userDuration;

                        cycles[c].zones[k] = {};

                        //Per cycle durations
                        cycles[c].zones[k].machine = cycle.machineDuration;
                        cycles[c].zones[k].real = cycle.realDuration;
                        cycles[c].zones[k].user = cycle.userDuration;
                        cycles[c].zones[k].start = cycle.startTime.split(" ")[1];
                        cycles[c].zones[k].flowclicks = cycle.flowclicks || 0;

                        //Cycle Totals
                        zoneDurations.machine += cycle.machineDuration;
                        zoneDurations.real += cycle.realDuration;
                        zoneDurations.user += cycle.userDuration;
                        zoneDurations.flowclicks += cycle.flowclicks || 0;

                        zoneidx = zone.uid - 1;

                        if (Data.zoneData !== null && Data.zoneData.zones[zoneidx] && Data.zoneData.zones[zoneidx].name) {
                            cycles[c].zones[k].name = Data.zoneData.zones[zoneidx].name;
                        } else {
                            cycles[c].zones[k].name = "Zone " + nameIndex;
                        }

                        cycles[c].zones[k].flag = zone.flag;
                    }

                    zoneidx = zone.uid - 1;

                    if (Data.zoneData.zones[zoneidx] && Data.zoneData.zones[zoneidx].name) {
                        zoneName = Data.zoneData.zones[zoneidx].name;
                    } else {
                        zoneName = "Zone " + nameIndex;
                    }

                    if (Data.provision.system.useFlowSensor) {
                        zoneDurations.usedVolume = Util.convert.uiFlowClicksToVolume(zoneDurations.flowclicks);
                    } else {
                        zoneDurations.usedVolume = window.ui.zones.zoneComputeWaterVolume(zoneidx, zoneDurations.real);
                    }

                    zoneDurations.volume = window.ui.zones.zoneComputeWaterVolume(zoneidx, zoneDurations.user);

                    var zoneStartTime = "";
                    try {
                        zoneStartTime = zone.cycles[0].startTime.split(" ")[1];
                    } catch (e) {}

                    //Show default view without cycles detailed information
                    var zoneListTemplate = createZoneWateringHistoryElems(
                        zoneName,
                        zoneDurations.user,
                        zoneDurations.real,
                        zoneDurations.usedVolume,
                        zoneDurations.volume,
                        zone.flag,
                        zoneStartTime
                    );

                    //Program Totals
                    programDurations.machine += zoneDurations.machine;
                    programDurations.real += zoneDurations.real;
                    programDurations.user += zoneDurations.user;
                    programDurations.volume += zoneDurations.volume;
                    programDurations.usedVolume += zoneDurations.usedVolume;

                    if (programHasZones) {
                        programContainerElem.appendChild(zoneListTemplate);
                        dayHasPrograms = true;
                    }

                    //console.log("\t\tZone %d Durations: Scheduled: %f Watered: %f Saved: %d %", zone.uid, zoneDurations.user, zoneDurations.real,  100 - parseInt((zoneDurations.real/zoneDurations.user) * 100));

                    //Water Consume Graph: add local data from programs routine to structure from day routine --> consumption per day, per zone, per program to array
                    ZonesConsumedData.push( [zoneName, Util.convert.uiWaterVolume(zoneDurations.usedVolume)])

                }
                //Water Consume Graph: map structure with local data in day routine --> water consume per zone per day for graphing
                var oneDayDrillDown = {
                    name: dayNameElem.textContent,
                    id: dayNameElem.textContent,
                    data: ZonesConsumedData
                };

                //Create Program totals elements
                var programTotalsTemplate = createZoneWateringHistoryElems(
                    "Program total: ",
                    programDurations.user,
                    programDurations.real,
                    programDurations.usedVolume,
                    programDurations.volume,
                    0,
                    "",
                    "historyZoneCycles"
                );

                //Day totals
                dayDurations.machine += programDurations.machine;
                dayDurations.real += programDurations.real;
                dayDurations.user += programDurations.user;
                dayDurations.volume += programDurations.volume;
                dayDurations.usedVolume += programDurations.usedVolume;


                //Show cycles detailed information if more than 1 cycle
                if (maxCycles > 1) {
                    var cycleParentContainer = insertTag(programContainerElem, "div", null);
                    var cycleExpanderButton = addTag(cycleParentContainer, "span");

                    cycleParentContainer.className = "cyclesExpanded";

                    cycleExpanderButton.textContent = "watering cycles";
                    cycleExpanderButton.className = "displayCyclesContract";
                    cycleExpanderButton.onclick = function() {
                        var targetElem = this.parentNode.lastChild;
                        if (isVisible(targetElem)) {
                            makeHidden(targetElem);
                            this.className = "displayCyclesContract";
                        } else {
                            makeVisible(targetElem);
                            this.className = "displayCyclesExpand";
                        }
                    };

                    var cycleDetailsContainer = addTag(cycleParentContainer, "div");
                    cycleDetailsContainer.style.width = "100%";
                    makeHidden(cycleDetailsContainer);

                    //Append detailed per cycle information
                    for (c in cycles) {
                        var cycleTitle = "Cycle " + (+c + 1) + " / " + maxCycles;
                        zoneListTemplate = createZoneWateringHistoryElems(
                            cycleTitle,
                            cycles[c].user,
                            cycles[c].real,
                            0,
                            0,
                            0,
                            cycles[c].start,
                            "historyZoneCycles"
                        );
                        cycleDetailsContainer.appendChild(zoneListTemplate);

                        for (k in cycles[c].zones) {
                            zoneListTemplate = createZoneWateringHistoryElems(
                                cycles[c].zones[k].name,
                                cycles[c].zones[k].user,
                                cycles[c].zones[k].real,
                                0,
                                0,
                                cycles[c].zones[k].flag,
                                cycles[c].zones[k].start
                            );

                            cycleDetailsContainer.appendChild(zoneListTemplate);
                        }
                    }
                }

                //console.log(JSON.stringify(cycles, null, 4));
                if (programHasZones) {
                    dayContainerElem.appendChild(programTemplate);
                    //Program Totals
                    programContainerElem.appendChild(programTotalsTemplate);
                }
            }

            //Show day totals
            dayUserDurationElem.textContent = Util.secondsToText(dayDurations.user);
            dayRealDurationElem.textContent = Util.secondsToText(dayDurations.real);
            if (dayDurations.usedVolume !== null) {
                dayWaterUsedElem.textContent = "(" + Util.convert.uiWaterVolume(dayDurations.usedVolume) +
                    Util.convert.uiWaterVolumeStr() + ")";
            }
            //Water Consume Graph:  append daily consume from day routine to full structure
            var frontGraphLabel = d.getDate() + " " + d.toLocaleString('en-us', { month: 'short' })
            var oneDayConsumeData = {name: frontGraphLabel, y: Util.convert.uiWaterVolume(dayDurations.usedVolume), drilldown: dayNameElem.textContent};
            waterConsumeData.frontGraphSeries.push(oneDayConsumeData);
            waterConsumeData.drillDownSeries.push(oneDayDrillDown);

            LoadWaterConsumeGraph(waterConsume, waterConsumeData, Util.convert.uiWaterVolumeStr());

            //Append daily watering info to template
            if (dayHasPrograms)
                container.appendChild(dayTemplate);
        }
    }

    // This is rendered on Home Page
    function showWaterLogSimple() {
        var container = $("#wateringHistorySimpleContent");
        var waterLog = Data.waterLog;
        var daysToShow = 7;

        clearTag(container);

        var dedicatedMasterValve = Data.provision.system.dedicatedMasterValve || false;

        for (var i = waterLog.waterLog.days.length - 1; i >= 0; i--) {
            var day = waterLog.waterLog.days[i];
            var dayDurations = { scheduled: 0, watered: 0 };

            var dayTemplate = loadTemplate("watering-history-day-simple-template");
            var dayNameElem = $(dayTemplate, '[rm-id="wateringLogDayName"]');
            var dayScheduledElem = $(dayTemplate, '[rm-id="wateringLogDayScheduled"]');
            var dayWateredElem = $(dayTemplate, '[rm-id="wateringLogDayWatered"]');
            var dayContainerElem = $(dayTemplate, '[rm-id="wateringLogProgramsContainer"]');

            //console.log("Day: %s", day.date);
            var d = Util.deviceDateStrToDate(day.date);
            if (d) {
                dayNameElem.textContent = Util.monthNamesShort[d.getMonth()] + " " + d.getDate();
            }

            for (var j = 0; j < day.programs.length; j++) {
                var program = day.programs[j];

                if (program.id == 0) {
                    var name = "Manual Watering";
                } else {
                    var p = getProgramById(program.id); //TODO make sure we have Data.programs
                    if (p !== null)
                        var name = p.name;
                    else
                        var name = "Program " + program.id;
                }

                var programTemplate = loadTemplate("watering-history-day-programs-simple-template");
                var programNameElem = $(programTemplate, '[rm-id="wateringLogProgramName"]');
                var programStartElem = $(programTemplate, '[rm-id="wateringLogProgramStart"]');
                var programContainerElem = $(programTemplate, '[rm-id="wateringLogZonesContainer"]');
                var programStart = null;

                programNameElem.textContent = name;

                //console.log("\t%s", name);

                for (var k = 0; k < program.zones.length; k++) {
                    var zone = program.zones[k];
                    var zoneDurations = { machine: 0, user: 0, real: 0 };
                    for (var c = 0; c < zone.cycles.length; c++) {
                        var cycle = zone.cycles[c];
                        zoneDurations.machine += cycle.machineDuration;
                        zoneDurations.real += cycle.realDuration;
                        zoneDurations.user += cycle.userDuration;
                        if (programStart === null)
                            programStart = cycle.startTime;

                    }

                    var zoneListTemplate = loadTemplate("watering-history-day-programs-zone-simple-template");

                    var zoneNameElem = $(zoneListTemplate, '[rm-id="wateringLogZoneName"]');
                    var zoneSchedElem = $(zoneListTemplate, '[rm-id="wateringLogZoneSchedTime"]');
                    var zoneWateredElem = $(zoneListTemplate, '[rm-id="wateringLogZoneRealTime"]');

                    var zoneid = zone.uid - 1;
                    var nameIndex = zone.uid;
                    if (dedicatedMasterValve) nameIndex = zone.uid - 1;

                    if (Data.zoneData !== null && Data.zoneData.zones[zoneid] && Data.zoneData.zones[zoneid].name) {
                        zoneNameElem.textContent = Data.zoneData.zones[zoneid].name;
                    } else {
                        zoneNameElem.textContent = "Zone " + nameIndex;
                    }
                    zoneSchedElem.textContent = Util.secondsToMMSS(zoneDurations.user);
                    zoneWateredElem.textContent = Util.secondsToMMSS(zoneDurations.real);

                    dayDurations.scheduled += zoneDurations.user;
                    dayDurations.watered += zoneDurations.real;

                    programStartElem.textContent = "start time: " + programStart.split(" ")[1].substr(0, 5); //Get only HH:MM
                    programContainerElem.appendChild(zoneListTemplate);

                    //console.log("\t\tZone %d Durations: Scheduled: %f Watered: %f Saved: %d %", zone.uid, zoneDurations.user, zoneDurations.real,  100 - parseInt((zoneDurations.real/zoneDurations.user) * 100));
                }
                dayContainerElem.appendChild(programTemplate);
            }

            dayScheduledElem.textContent = ((dayDurations.scheduled / 60) >> 0) + " min";
            dayWateredElem.textContent = ((dayDurations.watered / 60) >> 0) + " min";

            dayTemplate.onclick = function() {
                var tag = this.children[1];
                if (isVisible(tag)) {
                    makeHidden(tag);
                    this.removeAttribute("selected");
                } else {
                    makeVisible(tag);
                    this.setAttribute("selected", true);
                }
            };

            container.appendChild(dayTemplate);

            // Stop if more than daysToShow
            if (--daysToShow <= 0) {
                break;
            }
        }
    }

    function createZoneWateringHistoryElems(name, sched, watered, usedVolume, volume, flag, startTime, cssClass) {
        var zoneListTemplate = loadTemplate("watering-history-day-programs-zone-template");

        var zoneNameElem = $(zoneListTemplate, '[rm-id="wateringLogZoneName"]');
        var zoneSchedElem = $(zoneListTemplate, '[rm-id="wateringLogZoneSchedTime"]');
        var zoneWateredElem = $(zoneListTemplate, '[rm-id="wateringLogZoneRealTime"]');
        var zoneFlowRateElem = $(zoneListTemplate, '[rm-id="wateringLogZoneFlowRate"]');
        var zoneSavedElem = $(zoneListTemplate, '[rm-id="wateringLogZoneSaved"]');
        var zoneReasonElem = $(zoneListTemplate, '[rm-id="wateringLogZoneSavedReason"]');
        var zoneStartTimeElem = $(zoneListTemplate, '[rm-id="wateringLogZoneStartTime"]');

        zoneNameElem.textContent = name;
        zoneSchedElem.textContent = Util.secondsToText(sched);
        zoneWateredElem.textContent = Util.secondsToText(watered);

        if (usedVolume !== null && usedVolume > 0) {
            zoneFlowRateElem.textContent = "(" + Util.convert.uiWaterVolume(usedVolume) +
                Util.convert.uiWaterVolumeStr() + ")";
        }

        zoneReasonElem.textContent = waterLogReason[flag];

        if (startTime !== "") {
            zoneStartTimeElem.textContent = startTime;
        }

        if (flag != 0 && flag != 6) {
            zoneReasonElem.style.color = "red";
        }

        var saved = (100 - parseInt((watered / sched) * 100));
        if (saved < 0) saved = 0;
        if (saved > 100) saved = 100;
        zoneSavedElem.textContent = saved + " %";

        if (typeof cssClass !== "undefined" && cssClass != null) {
            zoneListTemplate.className = cssClass;
        }

        return zoneListTemplate
    }

    function getDailyFlowVolume() {
        var daysFlowVolume = [];
        for (var i = 0; i < Data.waterLog.waterLog.days.length; i++) {
            var day = Data.waterLog.waterLog.days[i];
            var dayUsedVolume = 0;

            for (var j = 0; j < day.programs.length; j++) {
                var program = day.programs[j];
                var pUsedVolume = 0;

                //Convert between program/zones/cycles to program/cycles/zones
                cycles = {};
                var maxCycles = 0;

                for (var k = 0; k < program.zones.length; k++) {
                    var zone = program.zones[k];
                    var zFlowclicks = 0;

                    if (zone.cycles.length > maxCycles) {
                        maxCycles = zone.cycles.length;
                    }

                    //Calculate cycles total per zones and also create per cycle structure
                    for (var c = 0; c < zone.cycles.length; c++) {
                        var cycle = zone.cycles[c];
                        //Cycle Totals
                        zFlowclicks += cycle.flowclicks || 0;
                    }

                    zUsedVolume = Util.convert.uiFlowClicksToVolume(zFlowclicks);
                    pUsedVolume += zUsedVolume;
                }
                //Day totals
                dayUsedVolume += pUsedVolume;
            }
            daysFlowVolume.push(dayUsedVolume);
        }
        return daysFlowVolume;
    }

    //--------------------------------------------------------------------------------------------
    //
    //
    _settings.showWaterLog = showWaterLog;
    _settings.showWaterLogSimple = showWaterLogSimple;
    _settings.showRainDelay = showRainDelay;
    _settings.getDailyFlowVolume = getDailyFlowVolume;
    _settings.waterLogReason = waterLogReason;
}(window.ui.settings = window.ui.settings || {}));