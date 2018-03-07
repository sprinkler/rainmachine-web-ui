/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

window.ui = window.ui || {};

(function(_about) {

	var cloudStatus = {
		"-1": "Not running",
		0: "Connected",
    	1: "Disabled",

    	2: "Starting",
    	3: "Waiting for rainmachine application to start",
    	4: "Waiting for factory setup to finish",
    	5: "Waiting for device watchdog",

    	10: "Authenticating",
    	11: "Connecting",
    	12: "DNS failed",
    	13: "Authentication refused by proxy server",
    	14: "No response from proxy server",

    	20: "SSL certificate missing",
    	21: "Identity file missing",

    	30: "Exited"
	};

	function showAbout()
	{
		$("#aboutName").textContent = Data.provision.system.netName;
		$("#aboutVersion").textContent = Data.provision.api.swVer;
		$("#aboutWebUI").textContent = Data.uiVer;
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
		$("#aboutDiagViewLog").onclick = function() { showLog(); };

		APIAsync.checkUpdate().then(function(o) {
			showUpdateStatus(null);
			setTimeout(function () {
				APIAsync.getUpdate().then(function (o) {
					showUpdateStatus(o);
				})
			}, 3000)
		});
		APIAsync.getDiagUpload().then(function(o) { showDiagUploadStatus(o);});
	}

	function showLog(log) {
		var logWin = window.open();
		logWin.document.write("<h2>Retrieving log from device ...</h2>");
		APIAsync.getDiagLog().then(function(o) { logWin.document.write("<pre>" + o.log + "</pre>"); })
	}

	function showUpdateStatus(updateStatus)
	{
		var newVerElem = $("#aboutNewVersion");
		var startUpdateElem = $("#aboutUpdate");

		if (updateStatus === null) {
			newVerElem.textContent = "(Checking ...)";
			makeHidden(startUpdateElem);
			return;
		}

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

	function showDeviceInfo() {
		if (Data.provision.wifi === null || Data.provision.system === null ||
			Data.provision.api === null || Data.diag === null) {
			return false;
		}

		var deviceImgDiv = $('#deviceImage');
		var deviceNameDiv = $('#deviceName');
		var deviceNetDiv = $('#deviceNetwork');
		var footerInfoDiv = $('#footerInfo');

		deviceNameDiv.textContent = Data.provision.system.netName;
		deviceNetDiv.textContent = Data.provision.location.name;

		if (Data.provision.api.hwVer == 3)
			deviceImgDiv.className = "spk3";

		$("#homeVersion").textContent = Data.provision.api.swVer;
        $("#homeCloud").textContent = cloudStatus[Data.diag.cloudStatus];
        $("#homeCPU").textContent = Data.diag.cpuUsage.toFixed(2) + " %";
        $("#homeUptime").textContent = Data.diag.uptime;
		$("#homeIP").textContent = Data.provision.wifi.ipAddress;

		return true;
	}

	function getDeviceInfo()
    {
    	APIAsync.getProvision().then(
		   function(o) {
				Data.provision.system = o.system;
				Data.provision.location = o.location;
				showDeviceInfo();
			});

		APIAsync.getApiVer().then(
			function(o) {
				Data.provision.api = o;
				showDeviceInfo();
			});

    	APIAsync.getProvisionWifi().then(
			function(o) {
				Data.provision.wifi = o;
				showDeviceInfo();
			});

		APIAsync.getProvisionCloud().then(
			function(o) {
				Data.provision.cloud = o;
				showDeviceInfo();
			});

		APIAsync.getDiag().then(
			function(o) {
				Data.diag = o;
				showDeviceInfo();
			});
    }

	//--------------------------------------------------------------------------------------------
	//
	//
	_about.showAbout = showAbout;
	_about.getDeviceInfo = getDeviceInfo;
	_about.showDeviceInfo = showDeviceInfo;

} (window.ui.about = window.ui.about || {}));