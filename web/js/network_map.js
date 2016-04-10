(function(window) {
    'use strict';

    var NetworkMap =
    {
        // The Leaflet map object
        map: undefined,

        // The container ID
        map_container_id: undefined,

        // If true, a button will be added to get a permanent link to the current location, and such a location
        // will be loaded and used as default from the URL anchor, if available.
        permanent_url_with_anchor: false,

        // The layers displayed on the map
        layer_main: undefined,
        layer_intersections: undefined,
        layer_terminus: undefined,
        layer_others: undefined,
        layer_lines: undefined,

        // The stations colors
        lines_colors: {},
        stations_colors: {},
        stations_default_color_dot: 'purple',
        stations_color_dot_intersection: 'white',
        stations_color_dot_intersection_outline: 'black',
        stations_color_dot_terminus: 'black',
        stations_color_dot_main: '#cd0000',
        stations_default_color_lines: 'purple',

        // The stations sizes
        stations_size_outline_normal: 2,
        stations_size_outline_main: 5,
        station_size_dot: 10,

        // The main stations (array)
        main_stations: [],

        // The API to call to retrieve the JSON network
        network_api: undefined,
        network_colors_api: undefined,

        // The raw network object returned by the API but indexed by station ID.
        network: {},

        // The links already drawn, avoiding duplicated lines (better performances, plus visible in the dashed lines).
        lines_drawn: [],


        // -------------------- Utilities


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
         * Converts lat/long used by Leaflet to Minecraft coordinates.
         *
         * @param latlng The lat/lng of Leaflet, in a two-sized array [lat, lng].
         * @returns {*[]} The x/z coordinates, in a two-sized array.
         * @private
         */
        _latlng_to_coords: function (latlng)
        {
            return [Math.round(latlng[1] * 1000), Math.round(-latlng[0] * 1000)];
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
            var is_intersection = false;

            if (relations_count > 2)
            {
                is_intersection = true;
            }
            else if (relations_count == 2)
            {
                // If there are two relations, it's an intersection if they are not in the same axis.
                var direction1 = station.network[0].direction;
                var direction2 = station.network[1].direction;

                var axis1 = (direction1 == 'east' || direction1 == 'west') ? 0 : 1;
                var axis2 = (direction2 == 'east' || direction2 == 'west') ? 0 : 1;

                if (axis1 != axis2) is_intersection = true;
            }

            return {
                is_intersection: is_intersection,
                is_terminus: relations_count <= 1
            };
        },


        // -------------------- Map creation


        /**
         * Creates a station.
         *
         * @param name The station's display name.
         * @param code_name The station's code name.
         * @param id The station's internal ID.
         * @param location The station's location (array: first key is X, other is Z coordinate in Minecraft system).
         * @param is_intersection True if this station is an intersection.
         * @param is_terminus True if this station is a terminus.
         * @param is_main True if this station is a main station.
         * @returns {*} A Leaflet circleMarker object.
         * @private
         */
        _create_station: function(name, code_name, id, location, is_intersection, is_terminus, is_main)
        {
            // Station classes (from type)
            var label_classes = [];
            if (is_intersection || is_terminus || is_main)
                label_classes.push('major_station');
            if (is_terminus)
                label_classes.push('terminus_station');
            if (is_main)
                label_classes.push('main_station');


            // Station color
            var outlineColor = NetworkMap.stations_default_color_dot;
            var insideColor  = NetworkMap.stations_default_color_dot;

            if (is_main)
            {
                insideColor  = NetworkMap.stations_color_dot_main;
                outlineColor = NetworkMap.stations_color_dot_main;
            }
            else if (is_intersection)
            {
                insideColor  = NetworkMap.stations_color_dot_intersection;
                outlineColor = NetworkMap.stations_color_dot_intersection_outline;
            }
            else if (is_terminus)
            {
                insideColor  = NetworkMap.stations_color_dot_terminus;
                outlineColor = NetworkMap.stations_color_dot_terminus;
            }


            // Station object
            var station = L.circleMarker(NetworkMap._coords_to_latlng(location), {
                color: outlineColor,
                fillColor: insideColor,

                opacity: 0.76,
                fillOpacity: 1,

                weight: is_main ? NetworkMap.stations_size_outline_main : NetworkMap.stations_size_outline_normal,
                stroke: is_main || is_intersection,

                className: 'network-map-station'
            }).bindLabel('<div class="station-label' + (is_intersection || is_main ? ' station-label-intersection' : '') + (is_main ? ' station-label-main' : '') + '">' + name + '</div>', {
                noHide: true,
                className: label_classes.join(' ')
            });


            // Station metadata
            station.zeps_station_code_name = code_name;
            station.zeps_station_id        = id;

            station.zeps_station_is_main         = is_main;
            station.zeps_station_is_terminus     = is_terminus;
            station.zeps_station_is_intersection = is_intersection;


            return station;
        },

        /**
         * Creates a line.
         *
         * @param from The line's first point (array: first key is X, other is Z coordinate in Minecraft system).
         * @param to The line's last point.
         * @param color The line's color.
         * @param is_rail True if this is a railway segment.
         * @return {*} A Leaflet polyline object.
         * @private
         */
        _create_line: function(from, to, color, is_rail)
        {
            return L.polyline([NetworkMap._coords_to_latlng(from), NetworkMap._coords_to_latlng(to)], {
                color: color,
                opacity: 1,
                clickable: false,

                dashArray: !is_rail ? '5, 5, 1, 5' : null,

                className: 'network-map-line'
            });
        },

        __encode_link: function(station1, station2)
        {
            return station1.x + ',' + station1.y + ';' + station2.x + ',' + station2.y;
        },

        __link_exists: function(station1, station2)
        {
            return NetworkMap.lines_drawn.indexOf(NetworkMap.__encode_link(station1, station2)) > -1
                || NetworkMap.lines_drawn.indexOf(NetworkMap.__encode_link(station2, station1)) > -1;
        },

        /**
         * Links two stations with a line, if possible.
         *
         * @param lines The line will be added to this object, if it can be created.
         * @param station_base The base station.
         * @param direction The direction to use to find the other station. If a station is defined in this direction,
         *                  a link will be created.
         * @private
         */
        _link_stations: function(lines, station_base, direction)
        {
            // We try to find a link in this direction
            var link = null;
            station_base.network.forEach(function(network_link)
            {
                if (network_link.direction == direction)
                {
                    link = network_link;
                }
            });

            if (link != null)
            {
                var station_other = NetworkMap.network[link.to];

                if (station_other && !NetworkMap.__link_exists(station_base, station_other))
                {
                    var color = NetworkMap.stations_default_color_lines;
                    var colors_set;
                    var ref_coordinate;

                    if (direction == 'east' || direction == 'west')
                    {
                        colors_set = NetworkMap.lines_colors.eastwest;
                        ref_coordinate = station_base.y;
                    }
                    else
                    {
                        colors_set = NetworkMap.lines_colors.northsouth;
                        ref_coordinate = station_base.x;
                    }

                    colors_set.forEach(function(colors_set_item)
                    {
                        if (colors_set_item.coordinates.indexOf(ref_coordinate) > -1)
                        {
                            color = 'rgb(' + colors_set_item.color.red + ',' + colors_set_item.color.green + ',' + colors_set_item.color.blue + ')';
                        }
                    });

                    NetworkMap.stations_colors[station_base.code_name]  = color;
                    NetworkMap.stations_colors[station_other.code_name] = color;

                    lines.push(NetworkMap._create_line(
                        [station_base.x, station_base.y], [station_other.x, station_other.y],
                        color, link.is_rail
                    ));

                    NetworkMap.lines_drawn.push(NetworkMap.__encode_link(station_base, station_other));
                }
            }
        },

        /**
         * Updates the size of a circle marker.
         *
         * @param marker The marker to update.
         * @param size The new size. If undefined, reset to the default size.
         * @private
         */
        _update_station_dot_size: function(marker, size)
        {
            marker.setRadius(size ? size : NetworkMap.station_size_dot);
        },

        /**
         * Updates the size of all circle markers in the given layer.
         *
         * @param layer The layer to update.
         * @param size The new size. If undefined, reset to the default size.
         * @private
         */
        _update_layer_dot_size: function(layer, size)
        {
            layer.eachLayer(function (marker)
            {
                NetworkMap._update_station_dot_size(marker, size);
            });
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


        // -------------------- Zoom adaptation


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
            var $label_terminus = $('.leaflet-label.terminus_station');
            var $label_main = $('.leaflet-label.main_station');

            if (zoom_level >= 11)
            {
                NetworkMap._add_layer(NetworkMap.layer_others);
                NetworkMap._add_layer(NetworkMap.layer_terminus);

                NetworkMap._update_layer_dot_size(NetworkMap.layer_intersections);
                NetworkMap._update_layer_dot_size(NetworkMap.layer_main);
                NetworkMap._update_layer_dot_size(NetworkMap.layer_terminus);
                NetworkMap._update_layer_dot_size(NetworkMap.layer_others);

                $labels.show();
            }
            else if (zoom_level == 10)
            {
                NetworkMap._add_layer(NetworkMap.layer_others);
                NetworkMap._add_layer(NetworkMap.layer_terminus);

                NetworkMap._update_layer_dot_size(NetworkMap.layer_intersections);
                NetworkMap._update_layer_dot_size(NetworkMap.layer_main);
                NetworkMap._update_layer_dot_size(NetworkMap.layer_terminus);
                NetworkMap._update_layer_dot_size(NetworkMap.layer_others);

                $labels.hide();
                $labels_major.show();
                $label_terminus.hide();
            }
            else if (zoom_level == 9)
            {
                NetworkMap._add_layer(NetworkMap.layer_others);
                NetworkMap._add_layer(NetworkMap.layer_terminus);

                NetworkMap._update_layer_dot_size(NetworkMap.layer_main, 8);
                NetworkMap._update_layer_dot_size(NetworkMap.layer_intersections, 8);
                NetworkMap._update_layer_dot_size(NetworkMap.layer_terminus, 5);
                NetworkMap._update_layer_dot_size(NetworkMap.layer_others, 5);

                $labels.hide();
                $label_main.show();
            }
            else if (zoom_level == 8)
            {
                NetworkMap.map.removeLayer(NetworkMap.layer_others);
                NetworkMap.map.removeLayer(NetworkMap.layer_terminus);

                NetworkMap._update_layer_dot_size(NetworkMap.layer_intersections, 4);
                NetworkMap._update_layer_dot_size(NetworkMap.layer_main, 7);

                $labels.hide();
                $label_main.show();
            }
        },


        // -------------------- Permanent links with hashes


        /**
         * Encodes the current location (x, z and zoom) in the URL hash.
         * @private
         */
        _encode_location_in_hash: function () {
            var center = NetworkMap.map.getCenter();
            var center_coordinates = NetworkMap._latlng_to_coords([center.lat, center.lng]);
            var zoom = NetworkMap.map.getZoom();

            window.location.hash = center_coordinates[0] + ',' + center_coordinates[1] + ',' + zoom;
        },

        /**
         * Loads a location from the URL hash.
         * @private
         */
        _update_location_from_hash: function () {
            var location_components = window.location.hash.substring(1).split(',');

            if (location_components.length >= 2) {
                var center_lat = parseInt(location_components[0]);
                var center_lng = parseInt(location_components[1]);

                if (!isNaN(center_lat) && !isNaN(center_lng)) {
                    var center = NetworkMap._coords_to_latlng([center_lat, center_lng]);
                    var zoom = 10;

                    if (location_components.length >= 3)
                        zoom = parseInt(location_components[2]);

                    if (!isNaN(zoom))
                        NetworkMap.map.setView(center, zoom);
                }
            }
        },


        // -------------------- Initialization


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


            if (!NetworkMap.network_api || !NetworkMap.network_colors_api)
            {
                console.error('NetworkMap: network API not configured.');
                return;
            }

            if (!NetworkMap.map_container_id)
            {
                console.error('NetworkMap: container ID not configured.');
                return;
            }


            $.getJSON(NetworkMap.network_colors_api, function (network_colors)
            {
                NetworkMap.lines_colors = network_colors;

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
                    network_array.forEach(function (station) {
                        if (station.is_visible) {
                            var neighborhood = NetworkMap._get_neighborhood_infos(station);
                            var is_main_station = NetworkMap.main_stations.indexOf(station.code_name) > -1;

                            var marker_station = NetworkMap._create_station(
                                station.full_name, station.code_name, station.id, [station.x, station.y],
                                neighborhood.is_intersection, neighborhood.is_terminus, is_main_station
                            );

                            if (is_main_station)              markers_main.push(marker_station);
                            else if (neighborhood.is_intersection) markers_intersections.push(marker_station);
                            else if (neighborhood.is_terminus)     markers_terminus.push(marker_station);
                            else                                   markers_others.push(marker_station);
                        }

                        if (station.network) {
                            NetworkMap._link_stations(lines, station, 'east');
                            NetworkMap._link_stations(lines, station, 'north');
                            NetworkMap._link_stations(lines, station, 'south');
                            NetworkMap._link_stations(lines, station, 'west');
                        }
                    });


                    // Attributes the colors of the dots, for basic stations
                    markers_others.forEach(function (station)
                    {
                        var color = NetworkMap.stations_colors[station.zeps_station_code_name];
                        station.setStyle({ color: color, fillColor: color });
                    });


                    // Creates the layers, and display them on the map
                    NetworkMap.layer_main = L.layerGroup(markers_main);
                    NetworkMap.layer_intersections = L.layerGroup(markers_intersections);
                    NetworkMap.layer_terminus = L.layerGroup(markers_terminus);
                    NetworkMap.layer_others = L.layerGroup(markers_others);
                    NetworkMap.layer_lines = L.layerGroup(lines);


                    // Removes the loader
                    $network_map.empty();


                    // Loads the map
                    NetworkMap.map = L.map(NetworkMap.map_container_id, {
                        center: [0, 0],
                        zoom: 10,

                        minZoom: 8,
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
                    NetworkMap.map.on('zoomend', function () {
                        NetworkMap._adapt_zoom();
                    });


                    // Adds display of the labels on hover, if not already displayed
                    var mouse_in = function (e) {
                        var $label = $(e.target.getLabel()._container);

                        if (!$label.is(":visible")) {
                            $label.fadeIn(200);

                            $label.data('zeps-network-map-previously-hidden', true);
                            $label.data('zeps-network-map-previous-container-style', e.target.options);
                            $label.data('zeps-network-map-displayed-at-zoom', NetworkMap.map.getZoom());

                            e.target.setStyle({
                                stroke: true,
                                weight: 5
                            });
                        }
                    };
                    var mouse_out = function (e) {
                        var $label = $(e.target.getLabel()._container);

                        if ($label.data('zeps-network-map-previously-hidden')) {
                            // We hide the label only if the zoom level is the same.
                            // Else, either the zoom level change hidden it, and we don't have to change that, or
                            // it makes it always displayed, and again we don't have to change anything.
                            if ($label.data('zeps-network-map-displayed-at-zoom') == NetworkMap.map.getZoom())
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

                    groups.forEach(function (group) {
                        group.eachLayer(function (marker) {
                            marker.on({
                                mouseover: mouse_in,
                                mouseout: mouse_out
                            });
                        });
                    });


                    // Updates the displayed location if needed
                    if (NetworkMap.permanent_url_with_anchor)
                    {
                        NetworkMap._update_location_from_hash();

                        L
                            .easyButton('glyphicon-link', NetworkMap._encode_location_in_hash, 'Lien permanent')
                            .addTo(NetworkMap.map);
                    }


                    // Enables tooltips
                    $('.leaflet-bar-part').tooltip({
                        placement: 'right'
                    });


                    // Callback
                    if (callback)
                        callback(NetworkMap);
                });
            });
        }
    };

    window.NetworkMap = NetworkMap;
})(window);
