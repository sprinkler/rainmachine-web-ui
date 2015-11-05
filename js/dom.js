/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

/* Generic DOM functions */

function $(elem, selector)
{
	if(arguments.length == 1) {
		selector = elem;
		elem = document;
	}
	if(!elem) {
		elem = document;
	}
	return elem.querySelector(selector);
}

//can be called with a selector string or a element object directly
//return pointer to the newly created tag
function addTag(parent, tag)
{
	var e;
	var t = document.createElement(tag);

	if (typeof(parent) === 'string') { e = $(parent); }
	else {e = parent;}

	if (e !== null)
		e.appendChild(t);

	return t;
}

//insert a tag before a child element if child is null is placed at the end of node list
function insertTag(parent, tag, child)
{
	var e, c;
	var t = document.createElement(tag);

	if (typeof(parent) === 'string') { e = $(parent); }
	else { e = parent; }

	if (typeof(child) === 'string') { c = $(child); }
	else { c = child; }


	if (e !== null)
		e.insertBefore(t, c);

	return t;
}

//remove a DOM tag
function delTag(tag)
{
	var e;

	if (typeof(tag) === 'string') { e = $(tag); }
    else { e = tag; }

	if (e && e.parentNode)
		e.parentNode.removeChild(e);
}

//remove all children of a tag
function clearTag(tag)
{
	var e;

	if (typeof(tag) === 'string') {	e = $(tag); }
	else {e = tag;}

	while (e && e.hasChildNodes())
    	e.removeChild(e.lastChild);
}

//Returns tag position
function getPosition(tag)
{
    var r = {};

    if (isVisible(tag))
    {
        r = $(tag).getBoundingClientRect();
    }
    else
    {
        makeVisible(tag);
        r = $(tag).getBoundingClientRect();
        makeHidden(tag);
    }

    return r;
}
//set current option of a select element by matching string in option text or value
function setSelectOption(e, str, matchValue)
{
	if (matchValue === undefined || matchValue === null)
		matchValue = false;

	var o = e.options;
	for (var i = 0; i < o.length; i++)
	{
		o[i].selected = false; //deselect option
		if (matchValue)
		{
			if (o[i].value != str) { continue; } //don't check type
		}
		else
		{
			if (str.trim() !== o[i].text.trim()) { continue; }
		}

		o[i].selected = true;
		//e.onchange(); //Call the onchange() function
		return true;
	}
	return false;
}

function isVisible(tag)
{
	var e;

	if (typeof(tag) === 'string') { e = $(tag); }
    else { e = tag; }

	var v = e.style.display;

	if (v != "" && v != "none")
		return true;

	return false;
}

function makeVisible(tag)
{
	var e;

	if (typeof(tag) === 'string') { e = $(tag); }
    else { e = tag; }

	e.style.display = "inline";
	//e.focus();
}

function makeVisibleBlock(tag)
{
	var e;

	if (typeof(tag) === 'string') { e = $(tag); }
	else { e = tag; }

	e.style.display = "block";
	//e.focus();
}

function makeHidden(tag)
{
	var e;

	if (typeof(tag) === 'string') { e = $(tag); }
    else { e = tag; }

	e.style.display = "none";

	//e.focus() //focus back the game canvas
}

function addStyleSheet(name)
{
	var ss = document.createElement("link");
	ss.setAttribute("rel", "stylesheet");
	ss.setAttribute("type", "text/css");
	ss.setAttribute("href", "css/" + name);
	if (!ss || typeof ss === "undefined")
		return false;
	document.getElementsByTagName("head")[0].appendChild(ss);
	return true;
}

function loadTemplate(name) {
	var template = $("#" + name);
	template = template.cloneNode(true);
	template.removeAttribute("id");
	return template;
}

function rangeSlider(slider, virtualMaxValue, onDragEnd) {

	var thumb = slider.children[0];
	var mouseDown = false;
	var thumbWidth = 46;
	var maxValue = virtualMaxValue;
	var sliderWidth = slider.offsetWidth || 362;
    var sliderLeft = slider.offsetLeft;
	var ratio = maxValue / sliderWidth;

	slider.addEventListener("mousedown", function(e) {
		//These are recalculated as they aren't ready on DOM creation
		sliderWidth = this.offsetWidth;
		sliderLeft = this.offsetLeft;
		ratio = maxValue / sliderWidth;
		mouseDown = true;
		updateSlider(e);
		return false;
	});

	document.addEventListener("mousemove", function(e) {
		updateSlider(e);
	});

	document.addEventListener("mouseup", function(e) {
		if (mouseDown && typeof onDragEnd == "function") {
			var value = updateSlider(e);
			onDragEnd(value);
		}
		mouseDown = false;
	});

	function updateSlider(e) {
		var value = null;
		if (mouseDown) {
			if (e.pageX >= sliderLeft && e.pageX <= (sliderLeft + sliderWidth)) {
        		thumb.style.left = e.pageX - sliderLeft - thumbWidth + 'px';
        		value = (e.pageX - sliderLeft) * ratio;
        	} else if (e.pageX < sliderLeft) {
        		value = 0;
        	} else {
        		value = maxValue;
        	}
        	setThumbInfo(value);
		}
		return value
	}

	function calculateSizes() {
		sliderWidth = slider.offsetWidth;
        sliderLeft = slider.offsetLeft;
    	ratio = maxValue / sliderWidth;
    	//console.log("Slider width: %d, left: %d, max: %d, ratio: %f", sliderWidth, sliderLeft, maxValue, ratio);
	}

	function setThumbInfo(value) {
			thumb.textContent = Util.secondsToMMSS(value);
	}

	this.setPosition = function(value) {
		var v = (value / ratio - thumbWidth); // left position is relative to sliderLeft
		thumb.style.left = v + 'px';
		setThumbInfo(value);
		calculateSizes();
	}

	this.setPositionWithOffset = function(value) {
		var current = this.getPosition();
		this.setPosition(current + value * ratio);
	}

	this.getPosition = function() {
		return (thumb.offsetLeft - slider.offsetLeft + thumbWidth) * ratio;
	}

	this.setMaxValue = function(value) {
		var current = this.getPosition() / ratio;
		var oldMax = maxValue;
		maxValue = value;
		calculateSizes();
		console.log("maxValue: %d(%d) Ratio after: %f", maxValue, oldMax, ratio);
		this.setPosition(current * ratio);
	}

	this.getMaxValue = function() {
		return maxValue;
	}


}
