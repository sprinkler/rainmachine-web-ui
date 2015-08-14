/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

window.ui = window.ui || {};

(function(_about) {

	function showAbout()
	{
		$("#aboutName").textContent = Data.provision.system.netName;
		$("#aboutVersion").textContent = Data.provision.api.swVer;
		$("#aboutHardware").textContent = Data.provision.api.hwVer;
		$("#aboutAPI").textContent = Data.provision.api.apiVer;
		$("#aboutIP").textContent = Data.provision.wifi.ipAddress;
		$("#aboutNetmask").textContent = Data.provision.wifi.netmaskAddress;
		$("#aboutGateway").textContent = Data.diag.gatewayAddress;
		$("#aboutMAC").textContent = Data.provision.wifi.macAddress;
		$("#aboutAP").textContent = Data.provision.wifi.ssid;
		$("#aboutMemory").textContent = Data.diag.memUsage + " Kb";
		$("#aboutCPU").textContent = Data.diag.cpuUsage.toFixed(2) + " %";
		$("#aboutUptime").textContent = Data.diag.uptime;
		$("#aboutUpdate").onclick = function() { API.startUpdate(); showAbout(); };
		$("#aboutDiagSend").onclick = function() { API.sendDiag(); showAbout(); };
		//$("#aboutDiagViewLog").onclick = function() { var logText = API.getDiagLog(); var logWin = window.open(); logWin.document.write("<pre>" + logText.log + "</pre>");};

		API.checkUpdate();
		var updateStatus = API.getUpdate();
		showUpdateStatus(updateStatus);

		var uploadStatus = API.getDiagUpload();
		showDiagUploadStatus(uploadStatus);
	}

	function showUpdateStatus(updateStatus)
	{
		var newVerElem = $("#aboutNewVersion");
		var startUpdateElem = $("#aboutUpdate");

		if (updateStatus.update)
		{
			newVerElem.textContent = "(New version available)";
			makeVisible(startUpdateElem);
		}
		else
		{
			newVerElem.textContent = "(No updates)";
			makeHidden(startUpdateElem);
		}
	}

	function showDiagUploadStatus(uploadStatus)
	{
		var statusElem = $("#aboutDiagStatus");
		var startUploadElem = $("#aboutDiagSend");

		if (uploadStatus.status)
		{
			statusElem.textContent = "Uploading log files in progress ...";
			makeHidden(startUploadElem);
		}
		else
		{
			statusElem.textContent = "";
			makeVisible(startUploadElem);
		}
	}

	function showDeviceInfo()
    {
    	Data.diag = API.getDiag();
        Data.provision = API.getProvision();
        Data.provision.wifi = API.getProvisionWifi();
        Data.provision.api = API.getApiVer();
    	Data.provision.cloud = API.getProvisionCloud();

        var deviceImgDiv = $('#deviceImage');
        var deviceNameDiv = $('#deviceName');
        var deviceNetDiv = $('#deviceNetwork');
        var footerInfoDiv = $('#footerInfo');

        deviceNameDiv.textContent = Data.provision.system.netName;
        deviceNetDiv.textContent = Data.provision.location.name + "  (" + Data.provision.wifi.ipAddress + ")";
		deviceNetDiv.textContent += " - UI Version: " + Data.uiVer;

        if (Data.provision.api.hwVer == 3)
        	deviceImgDiv.className = "spk3";

    	footerInfoDiv.textContent = "Rainmachine " + Data.provision.api.swVer + "  Uptime: " + Data.diag.uptime + " CPU Usage " + Data.diag.cpuUsage.toFixed(2) + " %";
    }

	//--------------------------------------------------------------------------------------------
	//
	//
	_about.showAbout = showAbout;
	_about.showDeviceInfo = showDeviceInfo;

} (window.ui.about = window.ui.about || {}));