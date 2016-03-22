"use strict";

function secondsToString(seconds)
{
    function numberEnding(number)
    {
        return (number > 1) ? 's' : '';
    }

    var representation = "";
    var has_previous = false;

    var years = Math.floor(seconds / 31536000);
    if (years)
    {
        representation += years + ' an' + numberEnding(years);
        has_previous = true;
    }

    var days = Math.floor((seconds %= 31536000) / 86400);
    if (days)
    {
        representation += (has_previous ? (seconds % 86400 > 0 ? ', ' : ' et ') : '') + days + ' jour' + numberEnding(days);
        has_previous = true;
    }

    var hours = Math.floor((seconds %= 86400) / 3600);
    if (hours)
    {
        representation += (has_previous ? (seconds % 3600 > 0 ? ', ' : ' et ') : '') + hours + ' heure' + numberEnding(hours);
        has_previous = true;
    }

    var minutes = Math.floor((seconds %= 3600) / 60);
    if (minutes)
    {
        representation += (has_previous ? (seconds % 60 > 0 ? ', ' : ' et ') : '') + minutes + ' minute' + numberEnding(minutes);
        has_previous = true;
    }

    seconds = seconds % 60;
    if (seconds)
    {
        representation += (has_previous ? ' et ' : '') + seconds + ' seconde' + numberEnding(seconds);
    }

    return representation.trim();
}
