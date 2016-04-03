'use strict';

// Thanks to http://stackoverflow.com/a/31104813/5599794
L.Path.prototype.setZIndex = function (index)
{
    var obj = $(this._container || this._path);
    if (!obj.length) return; // not supported on canvas
    var parent = obj.parent();
    obj.data('order', index).detach();

    var lower = parent.children().filter(function ()
    {
        var order = $(this).data('order');
        if (order == undefined) return false;
        return order <= index;
    });

    if (lower.length)
    {
        lower.last().after(obj);
    }
    else
    {
        parent.prepend(obj);
    }
};


/**
 * Converts Minecraft coordinates to lat/long used by Leaflet.
 *
 * The coordinates are divided by 1000, to be able to display points with Z>100, and inverted,
 * as the Minecraft coordinate system is different from the lat/long one.
 *
 * @param coordinates The coordinates, in a two-sized array [x, z].
 * @returns {*[]} The lat/long, in a two-sized array.
 */
function coords2latlng(coordinates)
{
    return [-coordinates[1] / 1000, coordinates[0] / 1000];
}


/**
 * Checks if the given station is an intersection or a terminus.
 *
 * @param station The station.
 * @returns {{is_intersection: boolean, is_terminus: boolean}}
 */
function get_neighborhood_infos(station)
{
    var relations_count = Object.keys(station.network).length;

    return {
        is_intersection: relations_count > 2,
        is_terminus: relations_count <= 1
    };
}

function add_station(map, name, location, color, is_intersection, is_terminus)
{
    L.circleMarker(coords2latlng(location), {
        color: is_terminus ? 'black' : color,
        fillColor: is_intersection ? 'white' : (is_terminus ? 'black' : color),

        opacity: 0.76,
        fillOpacity: 1,

        className: 'network-map-station'
    }).bindLabel('<div class="station-label' + (is_intersection ? ' station-label-intersection' : '') + '">' + name + '</div>', {
        noHide: true
    }).addTo(map);
}

function add_line(map, from, to, color)
{
    var line = L.polyline([coords2latlng(from), coords2latlng(to)], {
        color: color,
        opacity: 1,
        clickable: false,

        className: 'network-map-line'
    }).addTo(map);

    // Lines need to be always under the stations dots
    line.setZIndex(-9001);
}

function link_stations(map, network, station_base, direction, color)
{
    if (station_base.network[direction])
    {
        var station_other = network[station_base.network[direction]];

        if (station_other)
            add_line(map, [station_base.x, station_base.y], [station_other.x, station_other.y], color);
    }
}

$(function ()
{
    var $network_map = $('#network_map');

    var stations_color_dot = 'purple';
    var stations_color_lines = 'purple';


    $.getJSON(routes.stations_network, function(network)
    {
        // Constructs a map by ID
        var network_by_id = {};
        network.forEach(function(station)
        {
            network_by_id[station.id] = station;
        });


        // Removes the loader
        $network_map.empty();


        // Loads the map
        var map = L.map('network_map').setView([0, 0], 10);

        map.attributionControl.addAttribution('Plan du Netherrail <a href="https://zcraft.fr">Zcraftien</a> | Données aggrégées par <a href="https://github.com/FlorianCassayre/ZePS-Core">Florian Cassayre</a>');


        // Adds the stations
        network.forEach(function(station)
        {
            if (station.is_visible)
            {
                var neighborhood = get_neighborhood_infos(station);
                add_station(map, station.full_name, [station.x, station.y], stations_color_dot, neighborhood.is_intersection, neighborhood.is_terminus);
            }

            if (station.network)
            {
                link_stations(map, network_by_id, station, 'east', stations_color_lines);
                link_stations(map, network_by_id, station, 'north', stations_color_lines);
                link_stations(map, network_by_id, station, 'south', stations_color_lines);
                link_stations(map, network_by_id, station, 'west', stations_color_lines);
            }
        });
    });
});
