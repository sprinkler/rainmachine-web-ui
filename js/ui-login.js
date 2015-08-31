/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

window.ui = window.ui || {};

(function(_login) {

    var loginPasswordElem = null;
    var loginRememberMeElem = null;
    var loginButtonElem = null;
    var logoutButtonElem = null;
    var errorContainerElem = null;

    _login.login = function(callback) {

        var accessToken = Storage.restoreItem("access_token");

        if(accessToken && accessToken !== "") {
            API.setAccessToken(accessToken);
            APIAsync.setAccessToken(accessToken);
        }

        var provision = API.getProvision();
        if(provision && !provision.statusCode) {

            logoutButtonElem = $("#logoutBtn");

            logoutButtonElem.onclick = function() {

                Storage.deleteItem("access_token");
                location.reload();
            }

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

            if(info.pwd != "") {
                accessToken = API.auth(info.pwd, info.remember);
                if(accessToken) {
                    document.body.className = "";
                    Storage.saveItem("access_token", accessToken);
                    setTimeout(callback, 0);
                }else {
                    makeVisible(errorContainerElem);
                    errorContainerElem.innerHTML = "Invalid password";
                }
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

} (window.ui.login = window.ui.login || {}));
