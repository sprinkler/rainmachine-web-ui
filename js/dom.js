/*
 *	Copyright (c) 2015 RainMachine, Green Electronics LLC
 *	All rights reserved.
 */

/* Generic DOM functions */

function defined(v) {
	return (typeof v !== "undefined" && v !== null)
}

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


function addSelectOption(e, name, value, selected) {
	if (selected === undefined || selected === null)
		selected = false;

	var o = addTag(e, 'option');
	o.value = value;
	o.textContent = name;
	o.selected = selected;
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

function getSelectValue(e) {
	if (e === null) {
		return null;
	}

	return e.options[e.selectedIndex].value
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

function makeVisibleBlock(tag, inline)
{
	var e;

	if (typeof(tag) === 'string') { e = $(tag); }
	else { e = tag; }

	if (typeof inline === "undefined" || inline == false) {
		e.style.display = "block";
	} else {
		e.style.display = "inline-block";
	}
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

function toggleAttr(elem, enable, attrName) {
	if (!elem) {
		return false;
	}

	if (typeof attrName === "undefined") {
		attrName = "enabled";
	}

	if (enable) {
		elem.setAttribute(attrName, true);
	} else {
		elem.removeAttribute(attrName);
	}
}

function loadTemplate(name) {
	var template = $("#" + name);
	template = template.cloneNode(true);
	template.removeAttribute("id");
	return template;
}

function percentageChooser(parent, min, max, start, step, onChange, relative) {
	var minusButton = addTag(parent, 'button');
	var outputDiv = addTag(parent, 'span');
	var plusButton = addTag(parent, 'button');

	minusButton.className = "zoneTimesCircleButton";
	minusButton.textContent = "-";

	plusButton.className = "zoneTimesCircleButton";
	plusButton.textContent = "+";

	outputDiv.className = "zoneTimesDetermined";

	this.value = start;

	this.updateOutput = function() {

		if (typeof relative !== "undefined" && relative) {
			outputDiv.textContent = (+this.value - 100) + "%";
		} else {
			outputDiv.textContent = this.value + "%";
		}

	};

	this.changeValue = function(step) {
		if (this.value + step > max) {
			this.value = max
		} else if (this.value + step < min) {
			this.value = min;
		} else {
			this.value += step;
		}

		this.updateOutput();

		if (onChange !== null){
			onChange(this.value);
		}
	};

	this.setValue = function(value) {
		if (value > max) {
			value = max;
		}

		if (value < min) {
			value = min;
		}

		this.value = value;
		this.updateOutput();
	};

	minusButton.onclick =  this.changeValue.bind(this, -step);
	plusButton.onclick = this.changeValue.bind(this, step);

	this.updateOutput();
}

function rangeSlider(slider, virtualMaxValue, onDragEnd) {

	var thumb = slider.children[0];
	var mouseDown = false;
	var thumbWidth = 46;
	var defaultSliderWidth = 362;
	var maxValue = virtualMaxValue;
	var sliderWidth;
    var sliderLeft;
	var ratio;

	calculateSizes();

	slider.addEventListener("mousedown", startMove);
	slider.addEventListener("touchstart", startMove);

	document.addEventListener("mousemove", updateSlider);
	document.addEventListener("touchmove", updateSlider);

	document.addEventListener("mouseup", endMove);
	document.addEventListener("touchend", endMove);


	function startMove(e) {
		//These are recalculated as they aren't ready on DOM creation
		sliderWidth = this.offsetWidth;
		sliderLeft = this.offsetLeft;
		ratio = maxValue / sliderWidth;
		mouseDown = true;
		updateSlider(e);
		return false;
	}

	function endMove(e) {
		if (mouseDown && typeof onDragEnd == "function") {
			var value = updateSlider(e);
			onDragEnd(value);
		}
		mouseDown = false;
	}

	function updateSlider(e) {
		var value = null;
		if (mouseDown) {
			if ("targetTouches" in e) {
				if (e.targetTouches.length > 0) {
					e.pageX = e.targetTouches[0].pageX; //touchmove
				} else {
					e.pageX = e.changedTouches[0].pageX; //touchend
				}
			}
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
		sliderWidth = slider.offsetWidth || defaultSliderWidth;
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
	};

	this.setPositionWithOffset = function(value) {
		var current = this.getPosition();
		this.setPosition(current + value * ratio);
	};

	this.getPosition = function() {
		return (thumb.offsetLeft - slider.offsetLeft + thumbWidth) * ratio;
	};

	this.setMaxValue = function(value) {
		var current = this.getPosition() / ratio;
		var oldMax = maxValue;
		maxValue = value;
		calculateSizes();
		//console.log("maxValue: %d(%d) Ratio after: %f", maxValue, oldMax, ratio);
		this.setPosition(current * ratio);
	};

	this.getMaxValue = function() {
		return maxValue;
	};

	this.isDragging = function() {
		return mouseDown;
	}
}


uiFeedback =  {
	sync: function(elem, func) {
		var params = [].slice.call(arguments, 2);

		elem.onclick = function() {
			uiFeedback.start(elem);
			var r = func.apply(elem, params);
			if (r) {
				uiFeedback.success(elem);
			} else {
				uiFeedback.error(elem);
			}
		}
	},

	start: function(elem) {
		delTag($("#feedback-" + elem.id));
		var n  = addTag(elem, "span");
		n.id = "feedback-" + elem.id;
		n.textContent = "\ue97b";
		n.className = "loading icon";
	},

	success: function(elem) {
		var e = $("#feedback-" + elem.id);
		if (e) {
			e.textContent = "\ue116";
			e.className = "success icon";
			setTimeout(function(){ delTag(e);}, 3600 )
		}
	},

	// Like success but without feedback
	done: function(elem) {
		var e = $("#feedback-" + elem.id);
		delTag(e);
	},

	error: function(elem) {
		var e = $("#feedback-" + elem.id);
		if (e) {
			e.textContent = "\ue629";
			e.className = "error icon red";
		}

		console.log("Error ! %s", elem.id);
		elem.style.color = "red";
		elem.style.background = "white";
	}
};


function getTagIndex(node, matchTag) {
	var index = 0;
	while ( (node = node.previousElementSibling) ) {
		if (defined(matchTag)) {
			if (node.tagName == matchTag.toUpperCase()) {
				index++;
				node.setAttribute("neworder", index);
			}
		} else {
			index++;
		}
	}
	return index;
}

function markTagOrder(parent, tag) {
	var nodes = parent.childNodes;
	var matchedNodes = 0;
	for(var i = 0; i < nodes.length; i++) {
		if (nodes[i].nodeName.toLowerCase() == tag) {
			matchedNodes++;
			nodes[i].setAttribute("order", matchedNodes);
		}
	}
}

function arrangeTagOrder(parent, tag) {
	var nodes = parent.childNodes;

	for(var i = 0; i < nodes.length; i++) {
		if (nodes[i].nodeName.toLowerCase() == tag) {
			var order = nodes[i].getAttribute("order");
			var node = nodes[i];
			var min = 999;
			var minNode = null;

			for(var j = 0; j < i; j++) {
				if (nodes[j].nodeName.toLowerCase() == tag) {
					var norder = nodes[j].getAttribute("order");
					if (order < norder) {
						if (norder < min) {
							min = norder;
							minNode = nodes[j];
						}
					}
				}
			}
			if (minNode !== null) {
				parent.insertBefore(node, minNode);
			}
		}
	}
}

var dragSource;

function isbefore(a, b) {
	if (a.parentNode == b.parentNode) {
		for (var cur = a; cur; cur = cur.previousSibling) {
			if (cur === b) {
				return true;
			}
		}
	}
	return false;
}

function dragenter(e) {
	var target = e.target;

	if (target.nodeName == "TD") {
		target = target.parentNode;
	}

	if (isbefore(dragSource,target)) {
		target.parentNode.insertBefore(dragSource, target);
	}
	else {
		target.parentNode.insertBefore(dragSource, target.nextSibling);
	}

	dragSource.style.visibility = "hidden";
}

function dragleave(e) {

}

function dragstart(e) {
	dragSource = e.target;
	dragSource.style.backgroundColor = "#ecf0f1";
	e.dataTransfer.setDragImage(this.firstElementChild, e.offsetX, e.offsetY);
	e.dataTransfer.effectAllowed = 'move';
}

function dragend(e) {
	e.target.style.backgroundColor = "";
	dragSource.style.visibility = "visible";
	markTagOrder($("#program-settings-zone-container"), "tr");
}