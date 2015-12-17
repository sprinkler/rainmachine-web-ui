/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

var Storage  = (function(Storage) {

	Storage.saveItem = function(key, object)
	{
		if (localStorage && object !== null)
			localStorage.setItem(key, JSON.stringify(object));
	}

	Storage.restoreItem = function(key)
	{
		var object = null;

		if (localStorage)
			object = localStorage.getItem(key);

		if (object !== null)
			return JSON.parse(object);

		return null;
	}

	Storage.deleteItem = function(key)
	{
		if (localStorage)
			localStorage.removeItem(key);
	}

return Storage; } (Storage || {} ));
