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
		$("#aboutDiagViewLog").onclick = function() { API.getDiagLog(); };

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

	//--------------------------------------------------------------------------------------------
	//
	//
	_about.showAbout = showAbout;

} (window.ui.about = window.ui.about || {}));