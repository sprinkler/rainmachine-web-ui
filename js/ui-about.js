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

		// Wi-Fi
		if (Data.provision.wifi.mode === "ap") {
			$("#aboutWiFiState").textContent = "Not configured or in Access-Point mode"
			makeHidden($("#aboutWiFi"));
		} else {
			$("#aboutLink").textContent = Data.provision.wifi.hasClientLink;
			$("#aboutIP").textContent = Data.provision.wifi.ipAddress;
			$("#aboutGateway").textContent = Data.diag.gatewayAddress;
			$("#aboutMAC").textContent = Data.provision.wifi.macAddress;
			$("#aboutAP").textContent = Data.provision.wifi.ssid;

			// This info is not available for RainMachine HD
			if (Data.provision.api.hwVer == 3) {
				makeHidden($("#aboutLink").parentElement.parentElement);
				makeHidden($("#aboutAP").parentElement.parentElement);
			}
		}

		// Ethernet (SPK5 only)
		if (Data.provision.api.hwVer == 5) {
			if (Data.provision.ethernet.hasClientLink) {
				$("#aboutEthLink").textContent = Data.provision.ethernet.hasClientLink;
				$("#aboutEthIP").textContent = Data.provision.ethernet.ipAddress;
				$("#aboutEthGateway").textContent = Data.diag.gatewayAddress;
				$("#aboutEthMAC").textContent = Data.provision.ethernet.macAddress;
			} else {
				$("#aboutEthernetState").textContent = "No cable detected";
				makeHidden($("#aboutEthernet"));
			}
		} else {
			$("#aboutEthernetState").textContent = "Not available";
			makeHidden($("#aboutEthernet"));
		}

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
		var logBody = logWin.document.body;
		var header = addTag(logBody, 'h2');
		var logData = addTag(logBody, 'pre');
		header.textContent = 'Retrieving log from device ...';
		APIAsync.getDiagLog().then(function(o) { makeHidden(header); logData.textContent = o.log; });
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
		var p = Data.provision;

		if (p.wifi === null || p.system === null ||	p.api === null || Data.diag === null) {
			return false;
		}

		var deviceImgDiv = $('#deviceImage');
		var deviceNameDiv = $('#deviceName');
		var deviceNetDiv = $('#deviceNetwork');
		var footerInfoDiv = $('#footerInfo');

		deviceNameDiv.textContent = p.system.netName;
		deviceNetDiv.textContent = p.location.name;

		if (p.api.hwVer == 3)
			deviceImgDiv.className = "spk3";

		if (p.api.hwVer == 5)
			deviceImgDiv.className = "spk5";

		$("#homeVersion").textContent = p.api.swVer;
        $("#homeCloud").textContent = cloudStatus[Data.diag.cloudStatus];
        $("#homeCPU").textContent = Data.diag.cpuUsage.toFixed(2) + " %";
		$("#homeUptime").textContent = Data.diag.uptime;

		if (p.api.hwVer == 5 && p.ethernet && p.ethernet.hasClientLink) {
			$("#homeIP").textContent = p.ethernet.ipAddress;
		} else {
			$("#homeIP").textContent = p.wifi.ipAddress;
		}

		return true;
	}

	function getDeviceInfo()
    {

		APIAsync.getApiVer().then(
			function(o) {
				Data.provision.api = o;
				if (Data.provision.api.hwVer == 5) {
					APIAsync.getProvisionEthernet().then(
						function(o) {
							Data.provision.ethernet = o;
							showDeviceInfo()
						}
					);
				} else {
					showDeviceInfo();
				}
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