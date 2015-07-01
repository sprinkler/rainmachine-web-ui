window.ui = window.ui || {};

(function(_login) {

    var loginPasswordElem = null;
    var loginRememberMeElem = null;
    var loginButtonElem = null;

    _login.login = function(callback) {

        var accessToken = Storage.restoreItem("access_token");

        if(accessToken && accessToken !== "") {
            API.setAccessToken(accessToken);
        }

        var provision = API.getProvision();
        if(provision && !provision.statusCode) {
            return callback();
        }

        if(!loginButtonElem) {
            loginPasswordElem = $("#loginPassword");
            loginRememberMeElem = $("#loginRememberMe");
            loginButtonElem = $("#loginButton");
        }

        loginButtonElem.onclick = function() {
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
                }
            }
        };

        document.body.className = "login";
    };

} (window.ui.login = window.ui.login || {}));
