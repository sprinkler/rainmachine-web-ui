/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

window.ui = window.ui || {};

(function(_login) {

    var loginPasswordElem = null;
    var loginRememberMeElem = null;
    var loginButtonElem = null;
    var errorContainerElem = null;

    var headerAccessToken = " x-rainmachine-cloud-access-token";
    var headerLogoutUrl = "x-rainmachine-cloud-logout-url";

    var logoutUrl = null;


    _login.login = function(callback) {

        var accessToken = Storage.restoreItem("access_token");
        logoutUrl = Storage.restoreItem("logoutUrl");

        if(!accessToken || accessToken === "") {
            //Added for demo.labs.rainmachine.com
            if (window.location.hostname == "demo.labs.rainmachine.com") {
                accessToken = API.auth("", true); //request an access token that will be used for session management
                if(accessToken) {
                    document.body.className = "";
                    Storage.saveItem("access_token", accessToken);
                }
            } else {
                //Try to retrieve access token from header set by my.rainmachine.com
                try {
                    var r = new XMLHttpRequest();
                    r.open("HEAD", "", false);
                    r.send(null);
                    accessToken = r.getResponseHeader(headerAccessToken);
                    logoutUrl = r.getResponseHeader(headerLogoutUrl);
                    Storage.saveItem("logoutUrl", logoutUrl);
                } catch (e) {
                    console.error("No access set in header.");
                }
                //console.log("Header RainMachine token: %s", accessToken);
                //console.log("Header RainMachine logout URL: %s", logoutUrl);
            }
        }

        API.setAccessToken(accessToken);
        APIAsync.setAccessToken(accessToken);

        var deviceDate = API.getDateTime();
        if(deviceDate && !deviceDate.statusCode) {
            Util.parseDeviceDateTime(deviceDate);
            return callback();
        }

        if(!loginButtonElem) {
            loginPasswordElem = $("#loginPassword");
            loginRememberMeElem = $("#loginRememberMe");
            loginButtonElem = $("#loginButton");
            errorContainerElem = $("#loginError");
        }

        loginButtonElem.onclick = function() {

            makeHidden(errorContainerElem);

            var info = {
                pwd: loginPasswordElem.value,
                remember: loginRememberMeElem.checked
            };

            accessToken = API.auth(info.pwd, info.remember);
            if (accessToken) {
                document.body.className = "";
                Storage.saveItem("access_token", accessToken);
                API.setAccessToken(accessToken);
                APIAsync.setAccessToken(accessToken);
                setTimeout(callback, 0);
            } else {
                makeVisible(errorContainerElem);
                errorContainerElem.innerHTML = "Error authenticating !";
            }
        };

        loginPasswordElem.onkeypress = function(event) {
            if(event.keyCode == 13) {
                loginButtonElem.click();
            }
        };

        document.body.className = "login";
    };

    _login.logout = function() {
        // The logout function should delete access_token from Storage and set it to null in API
        // but to work around the httponly cookie sent by server we save an invalid access_token so
        // we force a login
        var accessToken = "invalid";
        Storage.saveItem("access_token", accessToken);
        API.setAccessToken(accessToken);
        APIAsync.setAccessToken(accessToken);

        var re = "my.rainmachine.com";
        var host = location.hostname;


        //Refresh page
        if (host.match(re)) {
            if (logoutUrl) {
                location = logoutUrl;
            } else {
                location = location.origin
            }
        } else {
            location.reload();
        }
    };

} (window.ui.login = window.ui.login || {}));
