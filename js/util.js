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
	var r = Util.secondsToHuman(seconds);
	var text = "";

	if (r.days > 0)
		text = r.days + " days ";

	if (r.hours > 0)
		text += r.hours + " hours ";

	if (r.minutes > 0)
		text += r.minutes + " minutes ";

	if (r.seconds > 0)
		text += r.seconds + " seconds ";

	if (text.length == 0)
		text = "No time";

	return text;
};


Util.weekDaysNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
Util.monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

Util.bitStringToWeekDays = function(bitstr)
{
	if (bitstr.length < 7 || bitstr.length > 7)
		return "Invalid WeekDays";

	var str = "";

	for (var i = 0; i < bitstr.length; i++)
		if (bitstr[i])
        	str += Util.weekDaysNames[i] + " ";


	return str;
}

//Returns Date (YYYY-MM-DD) index in a 365 length array that starts with startDate
Util.getDateIndex = function(dateStr, startDate)
{
	var dayDate = new Date(dateStr.split("-"));
    var diff = dayDate - startDate;
    return ((diff/(60 * 60 * 24 * 1000) + 1) >> 0);
}

return Util; } ( Util || {}));
