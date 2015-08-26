/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

function Async() {
	this.queue = [];
	this.ready = false;
	this.result;
	this.debug = false;
};

Async.prototype.then = function(callback) {
	if (typeof callback === "function") {
        if (this.ready) {
        	this.debug && console.log("ASYNC: then() callback()");
        	callback.call(this, result);
        } else {
            this.queue.push(callback);
            this.debug && console.log("ASYNC: then() NOT ready queue(%d): %o", this.queue.length, this.queue);
        }
    }
    return this;
};

Async.prototype.resolve = function() {
    var instance = this;
    var callbackArgs = arguments;

    if (! this.ready) {
		this.ready = true;
        this.queue.forEach(function (value, index, ar) {
        	instance.debug && console.log("ASYNC: function: %o, args(%d): %o", value, callbackArgs.length, callbackArgs);
            value.apply(instance, callbackArgs);
        });

        this.queue = undefined;
    }
    else {
		console.log("ASYNC: resolve() messed up !");
    }
};

Async.prototype.reject = function() {
    console.log("ASYNC: Error detected aborting queue(%d): %o", this.queue.length, this.queue);
    this.ready = false;
    this.queue = undefined;
};
