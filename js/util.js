var Util = (function(Util) {

Util.secondsToHuman = function(seconds)
{

	var r = {};
	r.days = Math.floor(seconds / 86400);
	r.hours = Math.floor((seconds % 86400) / 3600);
	r.minutes = Math.floor(((seconds % 86400) % 3600) / 60);
	r.seconds = ((seconds % 86400) % 3600) % 60;

	return r;
};

Util.secondsToText = function(seconds)
{
	var r = Util.secondsToHuman(seconds)
	var text = "";

	if (r.days > 0)
		text = r.days + " days ";

	if (r.hours > 0)
		text += r.hours + " hours ";

	if (r.minutes > 0)
		text += r.minutes + " minutes ";

	if (r.seconds > 0)
		text += r.seconds + " seconds ";

	return text;
};

return Util; } ( Util || {}));
