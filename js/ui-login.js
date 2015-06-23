
window.ui = window.ui || {};

(function(_login) {

    var fileSystem = null;
    var accessTokenFilename = "access_token.txt";

    var loginPasswordElem = null;
    var loginRemeberMeElem = null;
    var loginButtonElem = null;

    _login.login = function(callback) {

        loadLastAccessToken(function(accessToken) {

            if(accessToken && accessToken !== "") {
                API.setAccessToken(accessToken);
            }

            var provision = API.getProvision();
            if(provision && !provision.statusCode) {
                return callback();
            }

            if(!loginButtonElem) {
                loginPasswordElem = $("#loginPassword");
                loginRemeberMeElem = $("#loginRemeberMe");
                loginButtonElem = $("#loginButton");
            }

            loginButtonElem.onclick = function() {
                var info = {
                    pwd: loginPasswordElem.value,
                    remember: loginRemeberMeElem.checked
                };

                if(info.pwd != "") {
                    accessToken = API.auth(info.pwd, info.remember);
                    if(accessToken) {
                        document.body.className = "";
                        saveAccessToken(accessToken, callback);
                    }
                }
            };

            document.body.className = "login";

        });
    };

    function loadLastAccessToken(callback) {
        initFileSystem(function(fs) {
            if(!fs) {
                return callback(null);
            }

            fs.root.getFile(accessTokenFilename, {}, function(fileEntry) {

                // Get a File object representing the file,
                // then use FileReader to read its contents.
                fileEntry.file(function(file) {
                    var reader = new FileReader();

                    reader.onloadend = function(e) {
                        callback(this.result);
                    };

                    reader.readAsText(file);
                }, function(e) {
                    console.log('Open file: ' + e.toString());
                    callback();
                });

            }, function(e) {
                console.log('Get File: ' + e.toString());
                callback();
            });
        });
    }

    function saveAccessToken(accessToken, callback) {
        initFileSystem(function(fs) {
            if(!fs) {
                return callback();
            }

            fs.root.getFile(accessTokenFilename, {create: true}, function(fileEntry) {
                fileEntry.createWriter(function(fileWriter) {

                    fileWriter.onwriteend = function(e) {
                        callback();
                    };

                    fileWriter.onerror = function(e) {
                        console.log('Write failed: ' + e.toString());
                        callback();
                    };

                    // Create a new Blob and write it to log.txt.
                    var blob = new Blob([accessToken || ""], {type: 'text/plain'});
                    fileWriter.write(blob);

                }, function(e) {
                    console.log('Create Writer: ' + e.toString());
                    callback();
                });

            }, function(e) {
                console.log('Get File: ' + e.toString());
                callback();
            });
        });
    }

    function initFileSystem(callback) {
        if(fileSystem) {
            return callback(fileSystem);
        }

        navigator.webkitPersistentStorage.requestQuota(10 * 1024, function(grantedBytes) {
            window.webkitRequestFileSystem(PERSISTENT, grantedBytes,
                function(fs) {
                    fileSystem = fs;
                    callback(fs);
                },
                function(e) {
                    console.log('Error', e);
                    callback(null);
                }
            );
        }, function(e) {
            console.log('Error', e);
            callback(null);
        });
    }

} (window.ui.login = window.ui.login || {}));
