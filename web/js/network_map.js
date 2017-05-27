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

        // The Dynmap base URL, without trailing slash. If undefined, links to the dynmap will not be displayed.
        // Followed by the config
        dynmap_root: undefined,
        dynmap_map_overworld: undefined,
        dynmap_map_nether: undefined,
        dynmap_map_type: undefined,

        // The link to the “missing stations” page
        missing_stations: undefined,

        // The layers displayed on the map
        layer_main: undefined,
        layer_intersections: undefined,
        layer_terminus: undefined,
        layer_others: undefined,
        layer_lines: undefined,

        // The stations colors
        lines_colors: {},
        stations_colors: {},
        stations_default_color_dot: '#800080',
        stations_color_dot_intersection: '#ffffff',
        stations_color_dot_intersection_outline: '#000000',
        stations_color_dot_terminus: '#000000',
        stations_color_dot_main: '#cd0000',
        stations_default_color_lines: '#800080',

        // The stations sizes
        stations_size_outline_normal: 2,
        stations_size_outline_main: 5,
        station_size_dot: 10,

        // The main stations (array)
        main_stations: [],

        // An object containing the station marker indexed by station's code name.
        stations: [],

        // The default view of the map
        default_center: [-80, -1306],
        default_zoom: 10,

        // The map color shading (to enhance a path).
        shading_default: 0,

        // The paths to highlight.
        highlighted_paths: [],
        highlighted_stations: [],

        // The API to call to retrieve the JSON network
        network_api: undefined,
        network_colors_api: undefined,

        // The raw network object returned by the API but indexed by station ID.
        network: {},

        // The links already drawn, avoiding duplicated lines (better performances, plus visible in the dashed lines).
        lines_drawn: [],

        // The labels colors to update when the map is loaded.
        label_colors_waiting_for_update: [],


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

        /**
         * Shades a color.
         *
         * Thanks: http://stackoverflow.com/a/13542669/5599794
         *
         * @param percentage The shading percentage.
         * @param css_color The base CSS color.
         * @param target_color The target CSS color, to shade to this color instead of white (if percentage positive) or
         *                     black (else).
         *
         * @private
         */
        __shade_color: function(percentage, css_color, target_color)
        {
            var n = percentage < 0 ? percentage * -1 : percentage;
            var from, to;

            if (css_color.length > 7)
            {
                from = css_color.split(",");
                to   = (target_color ? target_color : percentage < 0 ? "rgb(0,0,0)" : "rgb(255,255,255)").split(",");

                var R = parseInt(from[0].slice(4));
                var G = parseInt(from[1]);
                var B = parseInt(from[2]);

                return "rgb("
                    + (Math.round((parseInt(to[0].slice(4)) - R) * n) + R) + ","
                    + (Math.round((parseInt(to[1]) - G) * n) + G) + ","
                    + (Math.round((parseInt(to[2]) - B) * n) + B) +")";
            }
            else
            {
                from = parseInt(css_color.slice(1), 16);
                to   = parseInt((target_color ? target_color : percentage < 0 ? "#000000" : "#FFFFFF").slice(1), 16);

                var R1 = from >> 16;
                var G1 = from >> 8 & 0x00FF;
                var B1 = from & 0x0000FF;

                return "#" + (0x1000000
                        + (Math.round(((to >> 16) - R1) * n) + R1) * 0x10000
                        + (Math.round(((to >> 8 & 0x00FF) - G1) * n) + G1) * 0x100
                        + (Math.round(((to & 0x0000FF) - B1) * n) + B1)).toString(16).slice(1);
            }
        },


        // -------------------- Map creation


        /**
         * Creates a station.
         *
         * @param station The station object retrieved.
         * @param location The station's location (array: first key is X, other is Z coordinate in Minecraft system).
         * @param is_intersection True if this station is an intersection.
         * @param is_terminus True if this station is a terminus.
         * @param is_main True if this station is a main station.
         * @returns {*} A Leaflet circleMarker object.
         * @private
         */
        _create_station: function(station, location, is_intersection, is_terminus, is_main)
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
            var station_marker = L.circleMarker(NetworkMap._coords_to_latlng(location), {
                color:     outlineColor,
                fillColor: insideColor,

                opacity: 0.76,
                fillOpacity: 1,

                weight: is_main ? NetworkMap.stations_size_outline_main : NetworkMap.stations_size_outline_normal,
                stroke: is_main || is_intersection,

                className: 'network-map-station'
            }).bindLabel('<div class="station-label' + (is_intersection || is_main ? ' station-label-intersection' : '') + (is_main ? ' station-label-main' : '') + '" id="station-label-for-' + station.code_name + '">' + station.full_name + '</div>', {
                noHide: true,
                className: label_classes.join(' ')
            });


            // Station metadata
            station_marker.zeps = {
                station: station,

                is_main: is_main,
                is_terminus: is_terminus,
                is_intersection: is_intersection,

                base_color: outlineColor,
                base_fill_color: insideColor
            };


            // Updates the shading of the label (important: after metadata!)
            NetworkMap._colorize_marker(station_marker, undefined, NetworkMap._get_real_shading(station_marker));


            return station_marker;
        },

        /**
         * Creates a line.
         *
         * @param station_from The line's departure station.
         * @param station_to The line's destination station.
         * @param color The line's color.
         * @param is_rail True if this is a railway segment.
         * @return {*} A Leaflet polyline object.
         * @private
         */
        _create_line: function(station_from, station_to, color, is_rail)
        {
            var line =  L.polyline([NetworkMap._coords_to_latlng([station_from.x, station_from.y]), NetworkMap._coords_to_latlng([station_to.x, station_to.y])], {
                opacity: 1,
                clickable: false,

                dashArray: !is_rail ? '5, 5, 1, 5' : null,

                className: 'network-map-line'
            });

            line.zeps = {
                station_from: station_from,
                station_to: station_to,
                base_color: color
            };

            // Important: after metadata
            NetworkMap._colorize_marker(line, color, NetworkMap._get_real_shading(line));

            return line;
        },

        /**
         * Encodes a stations link in a string. Th string depends on the origin, destination and order.
         * This is used to draw each connection once.
         *
         * @param station1 The first station.
         * @param station2 The other station.
         * @returns {string} A string identifier of the link.
         * @private
         */
        __encode_link: function(station1, station2)
        {
            return station1.x + ',' + station1.y + ';' + station2.x + ',' + station2.y;
        },

        /**
         * Checks if a link exists between the given station (regardless of the order).
         *
         * @param station1 A station.
         * @param station2 The other station.
         * @returns {boolean} True if a link was already drawn.
         * @private
         */
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

                    if (!NetworkMap.stations_colors[station_base.code_name])
                        NetworkMap.stations_colors[station_base.code_name] = [color];
                    else
                        NetworkMap.stations_colors[station_base.code_name].push(color);

                    if (!NetworkMap.stations_colors[station_other.code_name])
                        NetworkMap.stations_colors[station_other.code_name] = [color];
                    else
                        NetworkMap.stations_colors[station_other.code_name].push(color);

                    lines.push(NetworkMap._create_line(
                        station_base, station_other, color, link.is_rail
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
         * Colorizes a station or a line.
         *
         * @param marker The marker to colorize.
         * @param color The color. If undefined, the previous color is kept.
         *              The color can be a single value, or an array with (ordered) the outline and inside color,
         *              or an object with the keys `outline` and `inside`.
         * @param shading The shading to apply. If undefined, the default shading is used.
         *                0 = no color change, -1 = black, 1 = white;
         *                ]0;1[ = lighten, ]-1;0[ = darken.
         * @private
         */
        _colorize_marker: function(marker, color, shading)
        {
            shading = shading !== undefined ? shading : NetworkMap.shading_default;

            // Anything to do?
            if (!color && !shading)
                return;

            var outlineColor, insideColor;

            if (color)
            {
                if (typeof color === 'string' || color instanceof String) {
                    outlineColor = insideColor = color;
                }
                else if (color instanceof Array) {
                    outlineColor = color[0];
                    insideColor = color[1];
                }
                else if (color.outline && color.inside) {
                    outlineColor = color.outline;
                    insideColor = color.inside;
                }
            }

            // Stations dots
            if (marker instanceof L.CircleMarker)
            {
                // Updates the color of the dot itself
                if (!color)
                {
                    outlineColor = marker.zeps.base_color ? marker.zeps.base_color : marker.options.color;
                    insideColor = marker.zeps.base_fill_color ? marker.zeps.base_fill_color : marker.options.fillColor;
                }

                marker.setStyle({
                    color: NetworkMap.__shade_color(shading, outlineColor),
                    fillColor: NetworkMap.__shade_color(shading, insideColor)
                });


                // Updates the color of the label
                var label_id = 'station-label-for-' + marker.zeps.station.code_name;
                var label_color = NetworkMap.__shade_color(shading, '#111111');
                var label = document.getElementById(label_id);

                if (label)
                {
                    label.style.color = label_color;
                }
                else
                {
                    // If the label is not already drawn, the color must be updated later, when the map is fully loaded.
                    // This only happens before the map is drawn. The colors are updated a few milliseconds after the
                    // initialization of the map, in the init method.
                    NetworkMap.label_colors_waiting_for_update.push({
                        id: label_id,
                        color: label_color
                    });
                }
            }

            // Links between the stations
            else if (marker instanceof L.Polyline)
            {
                marker.setStyle({
                    color: NetworkMap.__shade_color(shading, color ? insideColor : marker.zeps.base_color ? marker.zeps.base_color : marker.options.color)
                });
            }

            // Else, unsupported marker, no action.
        },

        /**
         * Returns the real color to use for this marker, taking into account the highlighted path.
         *
         * @param marker The marker.
         * @return number|boolean The shading to use, or FALSE if the given marker is not a ZePS link or station.
         * @private
         */
        _get_real_shading: function(marker)
        {
            if (!marker.zeps)
                return false;

            var shading;

            // Stations dots
            if (marker instanceof L.CircleMarker)
            {
                shading = NetworkMap.shading_default;

                NetworkMap.highlighted_paths.forEach(function (highlight_map)
                {
                    for (var j = 0; j < highlight_map.path.length; j++)
                    {
                        if (marker.zeps.station.code_name == highlight_map.path[j])
                        {
                            shading = highlight_map.shading;
                            break;
                        }
                    }
                });

                return shading;
            }

            // Links between the stations
            else if (marker instanceof L.Polyline)
            {
                shading = NetworkMap.shading_default;

                NetworkMap.highlighted_paths.forEach(function (highlight_map)
                {
                    for (var j = 0; j < highlight_map.path.length; j++)
                    {
                        var current_station = highlight_map.path[j];
                        var next_station = highlight_map.path[j+1];
                        var from_station = marker.zeps.station_from.code_name;
                        var to_station = marker.zeps.station_to.code_name;

                        if ((current_station == from_station && next_station == to_station) || (next_station == from_station && current_station == to_station))
                        {
                            shading = highlight_map.shading;
                            break;
                        }
                    }
                });

                return shading;
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
                $label_main.show();
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


        // -------------------- Configuration methods


        /**
         * Highlights a path in the map.
         *
         * Must be called before the init method.
         *
         * @param path The path to highlight (ordered list of stations code names)
         * @param shading The shading to apply to this path (default: 0, i.e. the normal color).
         *
         * @return {Number} The highlighted path ID.
         */
        highlight_path: function(path, shading)
        {
            return NetworkMap.highlighted_paths.push({ path: path, shading: shading}) - 1;
        },

        /**
         * Highlights a station, giving another style.
         *
         * These stations will be added to the main stations layer, so they will always be displayed, at every zoom
         * levels. They will also by default inherits their styles from the main stations one (for both station dot
         * and label).
         *
         * @param station_code_name The station's code name.
         * @param dot_style The special style to give.
         * @param label_style An object containing CSS properties to add to the label.
         * @param label_classes A string containing space-separated classes to add to the label.
         */
        highlight_station: function(station_code_name, dot_style, label_style, label_classes)
        {
            NetworkMap.highlighted_stations.push({
                station_code: station_code_name,
                style: {
                    dot: dot_style,
                    label: {
                        css: label_style,
                        classes: label_classes
                    }
                }
            });
        },

        /**
         * Highlights a startup station, using a pre-determined style.
         *
         * @param station_code_name The station's code name.
         */
        highlight_path_start: function(station_code_name)
        {
            NetworkMap.highlight_station(
                station_code_name,
                {
                    color: '#00BB00',
                    fillColor: '#00FF00'
                },
                {},
                'main_station'
            );
        },


        /**
         * Highlights an end-of-path station, using a pre-determined style.
         *
         * @param station_code_name The station's code name.
         */
        highlight_path_end: function(station_code_name)
        {
            NetworkMap.highlight_station(
                station_code_name,
                {
                    color: NetworkMap.stations_color_dot_main,
                    fillColor: '#FF0000'
                },
                {},
                'main_station'
            );
        },


        // -------------------- Centering methods


        /**
         * Centers & adjust the map on an highlighted path.
         *
         * @param path_id The highlighted path ID. The first added is 0, then 1, 2, etc.
         *                This ID is returned by the highlight_path method.
         */
        center_on_highlighted_path: function(path_id)
        {
            if (!NetworkMap.map)
            {
                console.error('Cannot call NetworkMap.center_on_highlighted_path before the init method. Use it in the init callback.');
                return;
            }

            var path = NetworkMap.highlighted_paths[path_id];
            if (!path) return;

            var min_x, min_z, max_x, max_z;

            // Comparison functions returning the other value if one is undefined
            var comparison = function(comparison_function) {
                return function (a, b) {
                    if (a === undefined && b === undefined)
                        return NaN;
                    else if (a === undefined)
                        return b;
                    else if (b === undefined)
                        return a;
                    else
                        return comparison_function(a, b);
                }
            };

            var min = comparison(Math.min), max = comparison(Math.max);

            path.path.forEach(function (station_code_name) {
                var station = NetworkMap.stations[station_code_name];
                if (station && station.zeps)
                {
                    min_x = min(min_x, station.zeps.station.x);
                    min_z = min(min_z, station.zeps.station.y);
                    max_x = max(max_x, station.zeps.station.x);
                    max_z = max(max_z, station.zeps.station.y);
                }
            });

            if (min_x === undefined || min_z === undefined || max_x === undefined || max_z === undefined)
                return;

            NetworkMap.map.fitBounds([NetworkMap._coords_to_latlng([min_x, min_z]), NetworkMap._coords_to_latlng([max_x, max_z])]);
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

                            // We check if the station is highlighted
                            if (!is_main_station) {
                                for (var i = 0; i < NetworkMap.highlighted_stations.length; i++) {
                                    if (station.code_name == NetworkMap.highlighted_stations[i].station_code) {
                                        is_main_station = true;
                                        break;
                                    }
                                }
                            }

                            var marker_station = NetworkMap._create_station(
                                station, [station.x, station.y],
                                neighborhood.is_intersection, neighborhood.is_terminus, is_main_station
                            );

                            if      (is_main_station)              markers_main.push(marker_station);
                            else if (neighborhood.is_intersection) markers_intersections.push(marker_station);
                            else if (neighborhood.is_terminus)     markers_terminus.push(marker_station);
                            else                                   markers_others.push(marker_station);

                            NetworkMap.stations[station.code_name] = marker_station;
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
                        // All the colors of the stations are stored, but these simple stations will always have
                        // only one color, the first of the array.
                        var color = NetworkMap.stations_colors[station.zeps.station.code_name][0];

                        // We also update the base color of the station (color unshaded).
                        station.zeps.base_color      = color;
                        station.zeps.base_fill_color = color;

                        NetworkMap._colorize_marker(station, color, NetworkMap._get_real_shading(station));
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
                        center: NetworkMap._coords_to_latlng(NetworkMap.default_center),
                        zoom: NetworkMap.default_zoom,

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
                        'Plan du Netherrail <a href="https://zcraft.fr">Zcraftien</a>' +
                        ' | Données aggrégées par <a href="https://github.com/FlorianCassayre/ZePS-Core">Florian Cassayre &amp; Amaury Carrade</a>' +
                        (NetworkMap.missing_stations ? ' | <a href="' + NetworkMap.missing_stations + '">Station manquante ?</a>' : '')
                    );


                    // Ensures the zoom is handled correctly
                    NetworkMap._adapt_zoom();
                    NetworkMap.map.on('zoomend', function () {
                        NetworkMap._adapt_zoom();
                    });


                    // Adds display of the labels on hover, if not already displayed
                    var mouse_in = function (e) {
                        var $label = $(e.target.getLabel()._container);

                        // Z-index update, so the label is always above others when pointed
                        $label.data('zeps-network-map-old-zindex', $label.css('z-index'));
                        $label.css('z-index', 9001);

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
                        var old_zindex = $label.data('zeps-network-map-old-zindex');

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

                        if (old_zindex)
                        {
                            $label.css('z-index', old_zindex);
                            $label.removeData('zeps-network-map-old-zindex');
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

                            // Adds pop-up on stations, with name, lines and dynmap links.
                            var unique_lines = NetworkMap.stations_colors[marker.zeps.station.code_name]
                                .sort()
                                .filter(function(el,i,a) { return i == a.indexOf(el); });

                            var popup = '<h4>';
                            unique_lines.forEach(function (color) {
                                popup += '<div class="square-line" style="background-color: ' + color + ';"></div>';
                            });
                            popup += '<span>' + marker.zeps.station.full_name + '</span></h4>';

                            popup += '<p class="station-popup-subtitle">';
                            if (marker.zeps.station.is_portal)
                                if (marker.zeps.is_intersection)
                                    popup += '<strong>Portail et intersection</strong>';
                                else
                                    popup += '<strong>Portail de sortie</strong>';
                            else
                                popup += '<strong>Intersection</strong>';

                            if (!marker.zeps.station.is_intersection)
                                popup += ' (sans arrêt)';

                            popup += '</p><p class="station-popup-content">';

                            popup += '<strong>Coordonnées : </strong>' + marker.zeps.station.x + ' ; ' + marker.zeps.station.y + '<br />';
                            if (NetworkMap.dynmap_root && (NetworkMap.dynmap_map_overworld || NetworkMap.dynmap_map_nether))
                            {
                                popup += '<strong>Voir sur la Dynmap : </strong>';

                                var links = [];
                                if (NetworkMap.dynmap_map_overworld)
                                    links.push('<a href="' + NetworkMap.dynmap_root + '/' + '?worldname=' + NetworkMap.dynmap_map_overworld + '&mapname=' + NetworkMap.dynmap_map_type + '&x=' + (marker.zeps.station.x * 8) + '&y=64&z=' + (marker.zeps.station.y * 8) + '" target="_blank">surface</a>');
                                if (NetworkMap.dynmap_map_nether)
                                    links.push('<a href="' + NetworkMap.dynmap_root + '/' + '?worldname=' + NetworkMap.dynmap_map_nether + '&mapname=' + NetworkMap.dynmap_map_type + '&x=' + marker.zeps.station.x + '&y=64&z=' + marker.zeps.station.y + '&zoom=3" target="_blank">nether</a>');

                                popup += links.join(', ');
                            }

                            popup += '</p>';

                            marker.bindPopup(popup);
                        });
                    });


                    // Updates the highlighted stations
                    NetworkMap.highlighted_stations.forEach(function(highlight)
                    {
                        if (highlight.style)
                        {
                            var marker = NetworkMap.stations[highlight.station_code];
                            if (marker)
                            {
                                if (highlight.style.dot)
                                    marker.setStyle(highlight.style.dot);

                                if (highlight.style.label)
                                {
                                    var $label = $('#station-label-for-' + highlight.station_code);

                                    if (highlight.style.label.classes)
                                        $label.addClass(highlight.style.label.classes);

                                    if (highlight.style.label.css)
                                        $label.css(highlight.style.label.css);
                                }
                            }
                        }
                    });


                    // Updates the displayed location if needed
                    if (NetworkMap.permanent_url_with_anchor)
                    {
                        NetworkMap._update_location_from_hash();

                        L
                            .easyButton('fa fa-link', NetworkMap._encode_location_in_hash, 'Lien permanent')
                            .addTo(NetworkMap.map);
                    }


                    // Updates labels colors
                    NetworkMap.label_colors_waiting_for_update.forEach(function(update)
                    {
                        document.getElementById(update.id).style.color = update.color;
                    });

                    NetworkMap.label_colors_waiting_for_update = [];


                    // Callback
                    if (callback)
                        NetworkMap.map.whenReady(function() { callback(NetworkMap) });
                });
            });
        }
    };

    window.NetworkMap = NetworkMap;
})(window);
