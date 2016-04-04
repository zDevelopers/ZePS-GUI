'use strict';

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

function add_station(name, location, color, is_intersection, is_terminus, is_main)
{
    var label_classes = [];
    if (is_intersection || is_terminus || is_main)
        label_classes.push('major_station');
    if (is_terminus)
        label_classes.push('terminus_station');
    if (is_main)
        label_classes.push('main_station');


    return L.circleMarker(coords2latlng(location), {
        color: is_terminus ? 'black' : color,
        fillColor: is_intersection ? 'white' : (is_terminus ? 'black' : color),

        opacity: 0.76,
        fillOpacity: 1,

        className: 'network-map-station major_station'
    }).bindLabel('<div class="station-label' + (is_intersection || is_main ? ' station-label-intersection' : '') + '">' + name + '</div>', {
        noHide: true,
        className: label_classes.join(' ')
    });
}

function add_line(from, to, color)
{
    return L.polyline([coords2latlng(from), coords2latlng(to)], {
        color: color,
        opacity: 1,
        clickable: false,

        className: 'network-map-line'
    });
}

function link_stations(lines, network, station_base, direction, color)
{
    if (station_base.network[direction])
    {
        var station_other = network[station_base.network[direction]];

        if (station_other)
            lines.push(add_line([station_base.x, station_base.y], [station_other.x, station_other.y], color));
    }
}


/**
 * Graceful adaptation to the zoom level.
 *
 * 12+:   all content displayed
 * 10-12: all dots, but labels of the main stations (intersections & main cities) only.
 * 10-:   only dots & labels of the main stations.
 *
 * @param map The Leaflet map object
 * @param layer_others The layer containing the dots of the less useful stations, hidden at low zooms.
 */
function adapt_zoom(map, layer_others)
{
    var zoom_level = map.getZoom();

    var $labels          = $('.leaflet-label');
    var $labels_major    = $('.leaflet-label.major_station');
    var $labels_terminus = $('.leaflet-label.terminus_station');

    if (zoom_level >= 11)
    {
        $labels.show();

        if (!map.hasLayer(layer_others))
            map.addLayer(layer_others);
    }
    else if (zoom_level == 10)
    {
        $labels.hide();
        $labels_major.show();

        if (!map.hasLayer(layer_others))
            map.addLayer(layer_others);
    }
    else if (zoom_level == 9)
    {
        $labels.hide();
        $labels_major.show();
        $labels_terminus.hide();

        map.removeLayer(layer_others);
    }
}



// --------------------



$(function ()
{
    var $network_map = $('#network_map');
    var $still_nothing_loader = $('#still_nothing_loader');

    $network_map.show();
    $still_nothing_loader.hide();

    // Displays the secondary loader a few seconds later, when the map should be loaded.
    setTimeout(function () { $still_nothing_loader.show(); },4000);


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


        // Creates list of markers (will become layers later)
        var markers_main          = [];
        var markers_intersections = [];
        var markers_terminus      = [];
        var markers_others        = [];

        var lines                 = [];


        // Creates the stations, and the lines between them
        network.forEach(function(station)
        {
            if (station.is_visible)
            {
                var neighborhood = get_neighborhood_infos(station);
                var is_main_station = main_stations.indexOf(station.code_name) > -1;

                var marker_station = add_station(
                    station.full_name, [station.x, station.y], stations_color_dot,
                    neighborhood.is_intersection, neighborhood.is_terminus, is_main_station
                );

                if      (is_main_station)              markers_main.push(marker_station);
                else if (neighborhood.is_intersection) markers_intersections.push(marker_station);
                else if (neighborhood.is_terminus)     markers_terminus.push(marker_station);
                else                                   markers_others.push(marker_station);
            }

            if (station.network)
            {
                link_stations(lines, network_by_id, station, 'east', stations_color_lines);
                link_stations(lines, network_by_id, station, 'north', stations_color_lines);
                link_stations(lines, network_by_id, station, 'south', stations_color_lines);
                link_stations(lines, network_by_id, station, 'west', stations_color_lines);
            }
        });


        // Creates the layers, and display them on the map
        var layer_main          = L.layerGroup(markers_main);
        var layer_intersections = L.layerGroup(markers_intersections);
        var layer_terminus      = L.layerGroup(markers_terminus);
        var layer_others        = L.layerGroup(markers_others);
        var layer_lines         = L.layerGroup(lines);


        // Removes the loader
        $network_map.empty();


        // Loads the map
        var map = L.map('network_map', {
            center: [0, 0],
            zoom: 10,

            minZoom: 9,
            maxZoom: 14,

            // Layers are added by inverted order of importance—the last will be displayed on top.
            layers: [
                layer_lines,

                layer_others,
                layer_terminus,
                layer_intersections,
                layer_main
            ]
        });

        map.attributionControl.addAttribution('Plan du Netherrail <a href="https://zcraft.fr">Zcraftien</a> | Données aggrégées par <a href="https://github.com/FlorianCassayre/ZePS-Core">Florian Cassayre</a>');


        // Ensures the zoom is handled correctly
        adapt_zoom(map, layer_others);
        map.on('zoomend', function() { adapt_zoom(map, layer_others); });
    });
});
