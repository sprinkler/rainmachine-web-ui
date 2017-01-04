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

    _login.login = function(callback) {

        var accessToken = Storage.restoreItem("access_token");

        if(accessToken && accessToken !== "") {
            console.log("Login: Using saved access token.");
            API.setAccessToken(accessToken);
            APIAsync.setAccessToken(accessToken);
        }

        var provision = API.getProvision();
        if(provision && !provision.statusCode) {
            return callback();
        }

        if(!loginButtonElem) {
            loginPasswordElem = $("#loginPassword");
            loginRememberMeElem = $("#loginRememberMe");
            loginButtonElem = $("#loginButton");
            errorContainerElem = $("#loginError");
        }

        //Added for demo
        var host = window.location.hostname;
        if (host == "192.168.12.174" || host == "demo.labs.rainmachine.com") {
            accessToken = API.auth("", true);
            if(accessToken) {
                document.body.className = "";
                Storage.saveItem("access_token", accessToken);
                API.setAccessToken(accessToken);
                APIAsync.setAccessToken(accessToken);
                return callback();
            }
        }

        loginButtonElem.onclick = function() {

            makeHidden(errorContainerElem);

            var info = {
                pwd: loginPasswordElem.value,
                remember: loginRememberMeElem.checked
            };

            accessToken = API.auth(info.pwd, info.remember);
            if(accessToken) {
                document.body.className = "";
                Storage.saveItem("access_token", accessToken);
                API.setAccessToken(accessToken);
                APIAsync.setAccessToken(accessToken);
                setTimeout(callback, 0);
            }else {
                makeVisible(errorContainerElem);
                errorContainerElem.innerHTML = "Invalid password";
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
        Util.redirectHome(location);
    }

} (window.ui.login = window.ui.login || {}));
