'use strict';

$(function()
{
    var $quickest_path = $('#quickest-path');

    var $quickest_path_link       = $('#quickest-path-link');
    var $quickest_path_station    = $('#quickest-path-station');
    var $quickest_path_saved_time = $('#quickest-path-saved-time');

    var alternative_starts_results = [];
    var requests = [];

    alternative_starts.forEach(function(start_id)
    {
        var url = routes.get_length
            .replace('from_id_placeholder', start_id)
            .replace('to_id_placeholder', route_infos.to_id)
            .replace('official_placeholder', route_infos.official)
            .replace('accessible_placeholder', route_infos.accessible);

        requests.push($.getJSON(url, function (result) {
            alternative_starts_results.push(result);
        }));
    });

    $.whenAll(requests).done(function ()
    {
        var quickest = null;
        var distance = route_infos.travel_time; // We want a travel time smaller than the current one from this route.

        alternative_starts_results.forEach(function (alternative)
        {
            if (alternative.travel_time < distance)
            {
                distance = alternative.travel_time;
                quickest = alternative;
            }
        });

        // No one was better.
        if (quickest == null)
            return;


        var saved_time = route_infos.travel_time - quickest.travel_time;

        // If the saved time is too low, it's not really a good option, as the time to go to the
        // main cities (and the loading time of the chunks) is not taken into account.
        if (saved_time < 30)
            return;


        // We generate the link to this new result.
        var options = (route_infos.raw_options.length > 0 ? route_infos.raw_options + '-' : '') + 'spawn';
        var quickest_route_url = routes.public_search_results
            .replace('from_placeholer', quickest.from_station.code_name)
            .replace('to_placeholder', quickest.to_station.code_name)
            .replace('options_placeholder', options);


        // We display the infos box
        $quickest_path_link.attr('href', quickest_route_url);
        $quickest_path_station.text(quickest.from_station.full_name);
        $quickest_path_saved_time.text(secondsToString(saved_time));

        $quickest_path.show();
    });
});
