/**
 * Created by Nicu Pavel on 11/28/16.
 */

window.ui = window.ui || {};

(function(_firebase) {

	function init() {
		_firebase.firebase = {};
		_firebase.firebase.isLogged = false;
		_firebase.firebase.loaded = false;

		try {
			var config = {
				apiKey: "AIzaSyDLzlRQUuOBV5p9xqsMN4HJu5dKRfJeylo",
				authDomain: "rainmachine-aa702.firebaseapp.com",
				databaseURL: "https://rainmachine-aa702.firebaseio.com",
				storageBucket: "rainmachine-aa702.appspot.com",
				messagingSenderId: "906819096221",
			};
			firebase.initializeApp(config);

			_firebase.firebase.enter = firebase["\x61\x75\x74\x68"]();
			_firebase.firebase.storageRef = firebase.storage().ref();
			_firebase.firebase.loaded = true;
		} catch (e) {
			console.error("Firebase cannot be loaded. Zone images unavailable")
		}
	}

	function enter() {
		if (window.ui.firebase.firebase.loaded) {
			_firebase.firebase.enter.onAuthStateChanged(function(user) {
				if (user) {
					_firebase.firebase.isLogged = true;
					getZonesImages();
				} else {
					_firebase.firebase.enter["\x73\x69\x67\x6E\x49\x6E\x57\x69\x74\x68\x45\x6D\x61\x69\x6C\x41\x6E\x64\x50\x61\x73\x73\x77\x6F\x72\x64"]
					($('#mode').dataset.f + $('#domain').dataset.f, "\x72\x21\x65\x40\x23\x24\x79\x64\x73\x23\x70\x71\x6C").catch(function(error) {
						console.log(error);
					});
				}
			});
		}
	}

	function getZonesImages() {
		if (window.ui.firebase.firebase.isLogged) {
			if (Data.provision.wifi === null || Data.provision.system === null) {
				setTimeout(window.ui.firebase.firebaseGetZonesImages, 2000);
				return;
			}
			try {
				var mac = Data.provision.wifi.macAddress;
				if (mac === null || mac.split(":").length != 6) {
					console.error("Invalid device MAC address");
					return;
				}
				var valves = +Data.provision.system.localValveCount;
				var storagePath = "devices/" + mac + "/images/";
				Data.zonesImages = {};

				for (var i = 1; i <= valves; i++) {
					var name = "zone" + i + ".jpg";
					var currentImage = storagePath + name;
					var imageRef = window.ui.firebase.firebase.storageRef.child(currentImage);
					imageRef.getDownloadURL().then(
						function(id, url) {
							Data.zonesImages[id] = url;
							window.ui.zones.updateZoneImage(id); //Force a zone image refresh
						}.bind(null, i)
					);
				}
			} catch (e) {
				console.error(e);
			}
		} else {
			console.log("No auth to retrieve zone images");
		}
	}

	_firebase.init= init;
	_firebase.enter = enter;

} (window.ui.firebase = window.ui.firebase || {}));