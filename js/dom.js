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