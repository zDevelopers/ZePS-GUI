(function(window) {
    'use strict';

    var NetworkMap =
    {
        // The Leaflet map object
        map: undefined,

        // The container ID
        map_container_id: undefined,

        // The layers displayed on the map
        layer_main: undefined,
        layer_intersections: undefined,
        layer_terminus: undefined,
        layer_others: undefined,
        layer_lines: undefined,

        // The stations colors
        stations_color_dot: 'purple',
        stations_color_dot_intersection: 'white',
        stations_color_dot_terminus: 'black',
        stations_color_dot_main: '#cd0000',
        stations_color_lines: 'purple',

        // The main stations (array)
        main_stations: [],

        // The API to call to retrieve the JSON network
        network_api: undefined,

        // The raw network object returned by the API but indexed by station ID.
        network: {},


        /**
         * Converts Minecraft coordinates to lat/long used by Leaflet.
         *
         * The coordinates are divided by 1000, to be able to display points with Z>100, and inverted,
         * as the Minecraft coordinate system is different from the lat/long one.
         *
         * @param coordinates The coordinates, in a two-sized array [x, z].
         * @returns {*[]} The lat/long, in a two-sized array.
         * @private
         */
        _coords_to_latlng: function (coordinates)
        {
            return [-coordinates[1] / 1000, coordinates[0] / 1000];
        },

        /**
         * Checks if the given station is an intersection or a terminus.
         *
         * @param station The station.
         * @returns {{is_intersection: boolean, is_terminus: boolean}}
         * @private
         */
        _get_neighborhood_infos: function(station)
        {
            var relations_count = Object.keys(station.network).length;

            return {
                is_intersection: relations_count > 2,
                is_terminus: relations_count <= 1
            };
        },

        /**
         * Creates a station.
         *
         * @param name The station's display name.
         * @param location The station's location (array: first key is X, other is Z coordinate in Minecraft system).
         * @param color The station's color. May be overwritten if the station is a special one (see below).
         * @param is_intersection True if this station is an intersection.
         * @param is_terminus True if this station is a terminus.
         * @param is_main True if this station is a main station.
         * @returns {*} A Leaflet circleMarker object.
         * @private
         */
        _create_station: function(name, location, color, is_intersection, is_terminus, is_main)
        {
            var label_classes = [];
            if (is_intersection || is_terminus || is_main)
                label_classes.push('major_station');
            if (is_terminus)
                label_classes.push('terminus_station');
            if (is_main)
                label_classes.push('main_station');

            var outlineColor = NetworkMap.stations_color_dot;
            var insideColor  = NetworkMap.stations_color_dot;

            if (is_main)
            {
                insideColor = NetworkMap.stations_color_dot_main;
            }
            else if (is_intersection)
            {
                insideColor = NetworkMap.stations_color_dot_intersection;
            }
            else if (is_terminus)
            {
                insideColor = NetworkMap.stations_color_dot_terminus;
                outlineColor = NetworkMap.stations_color_dot_terminus;
            }


            return L.circleMarker(NetworkMap._coords_to_latlng(location), {
                color: outlineColor,
                fillColor: insideColor,

                opacity: 0.76,
                fillOpacity: 1,

                weight: is_main ? 5 : 2,
                stroke: is_main || is_intersection,

                className: 'network-map-station'
            }).bindLabel('<div class="station-label' + (is_intersection || is_main ? ' station-label-intersection' : '') + (is_main ? ' station-label-main' : '') + '">' + name + '</div>', {
                noHide: true,
                className: label_classes.join(' ')
            });
        },

        /**
         * Creates a line.
         *
         * @param from The line's first point (array: first key is X, other is Z coordinate in Minecraft system).
         * @param to The line's last point.
         * @param color The line's color.
         * @return {*} A Leaflet polyline object.
         * @private
         */
        _create_line: function(from, to, color)
        {
            return L.polyline([NetworkMap._coords_to_latlng(from), NetworkMap._coords_to_latlng(to)], {
                color: color,
                opacity: 1,
                clickable: false,

                className: 'network-map-line'
            });
        },

        /**
         * Links two stations with a line, if possible.
         *
         * @param lines The line will be added to this object, if it can be created.
         * @param station_base The base station.
         * @param direction The direction to use to find the other station. If a station is defined in this direction,
         *                  a link will be created.
         * @param color The line color.
         * @private
         */
        _link_stations: function(lines, station_base, direction, color)
        {
            if (station_base.network[direction])
            {
                var station_other = NetworkMap.network[station_base.network[direction]];

                if (station_other)
                    lines.push(NetworkMap._create_line(
                        [station_base.x, station_base.y], [station_other.x, station_other.y],
                        color
                    ));
            }
        },

        /**
         * Adds a layer to the map, if not previously added.
         *
         * @param layer The layer to add.
         * @private
         */
        _add_layer: function(layer)
        {
            if (!NetworkMap.map.hasLayer(layer))
                NetworkMap.map.addLayer(layer);
        },

        /**
         * Graceful adaptation to the zoom level.
         *
         * 12+:   all content displayed
         * 10-12: all dots, but labels of the main stations (intersections & main cities) only.
         * 10-:   only dots & labels of the main stations.
         *
         * @private
         */
        _adapt_zoom: function()
        {
            var zoom_level = NetworkMap.map.getZoom();

            var $labels = $('.leaflet-label');
            var $labels_major = $('.leaflet-label.major_station');
            var $label_main = $('.leaflet-label.main_station');

            if (zoom_level >= 11)
            {
                $labels.show();

                NetworkMap._add_layer(NetworkMap.layer_others);
                NetworkMap._add_layer(NetworkMap.layer_terminus);
            }
            else if (zoom_level == 10)
            {
                $labels.hide();
                $labels_major.show();

                NetworkMap._add_layer(NetworkMap.layer_others);
                NetworkMap._add_layer(NetworkMap.layer_terminus);
            }
            else if (zoom_level == 9)
            {
                $labels.hide();
                $label_main.show();

                NetworkMap.map.removeLayer(NetworkMap.layer_others);
                NetworkMap.map.removeLayer(NetworkMap.layer_terminus);
            }
        },


        // --------------------


        /**
         * Initializes the map.
         */
        init: function($still_nothing_loader, callback)
        {
            var $network_map = $('#' + NetworkMap.map_container_id);
            $network_map.show();


            if ($still_nothing_loader)
            {
                $still_nothing_loader.hide();

                // Displays the secondary loader a few seconds later, when the map should be loaded.
                setTimeout(function () {
                    $still_nothing_loader.show();
                }, 4000);
            }


            if (!NetworkMap.network_api)
            {
                console.error('NetworkMap: network API not configured.');
                return;
            }

            if (!NetworkMap.map_container_id)
            {
                console.error('NetworkMap: container ID not configured.');
                return;
            }


            $.getJSON(NetworkMap.network_api, function (network_array)
            {
                // Constructs a map by ID
                network_array.forEach(function (station) {
                    NetworkMap.network[station.id] = station;
                });


                // Creates list of markers (will become layers later)
                var markers_main = [];
                var markers_intersections = [];
                var markers_terminus = [];
                var markers_others = [];

                var lines = [];


                // Creates the stations, and the lines between them
                network_array.forEach(function (station)
                {
                    if (station.is_visible)
                    {
                        var neighborhood = NetworkMap._get_neighborhood_infos(station);
                        var is_main_station = NetworkMap.main_stations.indexOf(station.code_name) > -1;

                        var marker_station = NetworkMap._create_station(
                            station.full_name, [station.x, station.y], NetworkMap.stations_color_dot,
                            neighborhood.is_intersection, neighborhood.is_terminus, is_main_station
                        );

                        if (is_main_station)              markers_main.push(marker_station);
                        else if (neighborhood.is_intersection) markers_intersections.push(marker_station);
                        else if (neighborhood.is_terminus)     markers_terminus.push(marker_station);
                        else                                   markers_others.push(marker_station);
                    }

                    if (station.network)
                    {
                        NetworkMap._link_stations(lines, station, 'east',  NetworkMap.stations_color_lines);
                        NetworkMap._link_stations(lines, station, 'north', NetworkMap.stations_color_lines);
                        NetworkMap._link_stations(lines, station, 'south', NetworkMap.stations_color_lines);
                        NetworkMap._link_stations(lines, station, 'west',  NetworkMap.stations_color_lines);
                    }
                });


                // Creates the layers, and display them on the map
                NetworkMap.layer_main          = L.layerGroup(markers_main);
                NetworkMap.layer_intersections = L.layerGroup(markers_intersections);
                NetworkMap.layer_terminus      = L.layerGroup(markers_terminus);
                NetworkMap.layer_others        = L.layerGroup(markers_others);
                NetworkMap.layer_lines         = L.layerGroup(lines);


                // Removes the loader
                $network_map.empty();


                // Loads the map
                NetworkMap.map = L.map(NetworkMap.map_container_id, {
                    center: [0, 0],
                    zoom: 10,

                    minZoom: 9,
                    maxZoom: 14,

                    // Layers are added by inverted order of importance—the last will be displayed on top.
                    layers: [
                        NetworkMap.layer_lines,

                        NetworkMap.layer_others,
                        NetworkMap.layer_terminus,
                        NetworkMap.layer_intersections,
                        NetworkMap.layer_main
                    ]
                });

                NetworkMap.map.attributionControl.addAttribution(
                    'Plan du Netherrail <a href="https://zcraft.fr">Zcraftien</a> | Données aggrégées par <a href="https://github.com/FlorianCassayre/ZePS-Core">Florian Cassayre</a>'
                );


                // Ensures the zoom is handled correctly
                NetworkMap._adapt_zoom();
                NetworkMap.map.on('zoomend', function () { NetworkMap._adapt_zoom(); });


                // Adds display of the labels on hover, if not already displayed
                var mouse_in = function(e)
                {
                    var $label = $(e.target.getLabel()._container);

                    if (!$label.is(":visible"))
                    {
                        $label.fadeIn(200);

                        $label.data('zeps-network-map-previously-hidden', true);
                        $label.data('zeps-network-map-previous-container-style', e.target.options);

                        e.target.setStyle({
                            stroke: true,
                            weight: 5
                        });
                    }
                };
                var mouse_out = function(e)
                {
                    var $label = $(e.target.getLabel()._container);

                    if ($label.data('zeps-network-map-previously-hidden'))
                    {
                        $label.fadeOut(200);
                        e.target.setStyle($label.data('zeps-network-map-previous-container-style'));

                        $label.removeData('zeps-network-map-previously-hidden');
                        $label.removeData('zeps-network-map-previous-container-style');
                    }
                };

                var groups = [
                    NetworkMap.layer_others, NetworkMap.layer_terminus,
                    NetworkMap.layer_intersections, NetworkMap.layer_main
                ];

                groups.forEach(function(group)
                {
                    group.eachLayer(function(marker)
                    {
                        marker.on({
                            mouseover: mouse_in,
                            mouseout: mouse_out
                        });
                    });
                });


                // Callback
                if (callback)
                    callback(NetworkMap);
            });
        }
    };

    window.NetworkMap = NetworkMap;
})(window);
