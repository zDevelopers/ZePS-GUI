'use strict';

import 'leaflet';
import 'leaflet-easybutton';

export class NetworkMap
{
    constructor($map_container)
    {
        // The Leaflet map object
        this.map = undefined;

        // The container
        this.$map_container = $map_container;
        this.map_container_id = $map_container.attr('id');

        // If true, a button will be added to get a permanent link to the current location, and such a location
        // will be loaded and used as default from the URL anchor, if available.
        this.permanent_url_with_anchor = $map_container.data('permanent-url-with-anchor') == 'yes';

        // The location of the buttons in the map (zoom, anchor...).
        // Can be topleft, topright, bottomleft, bottomright.
        this.buttons_location = 'bottomright';

        // If a form is available on the map, defines here their jQuery objects
        // to links the form and the map, e.g. by adding buttons in the popups
        // to select a station as departure or destination.
        this.elem_form_from_id = $map_container.data('form-from-id');
        this.elem_form_to_id = $map_container.data('form-to-id');

        // The Dynmap base URL, without trailing slash. If undefined, links to the dynmap will not be displayed.
        // Followed by the config
        this.dynmap_root = $map_container.data('dynmap-root');
        this.dynmap_map_overworld = $map_container.data('dynmap-map-overworld');
        this.dynmap_map_nether = $map_container.data('dynmap-map-nether');
        this.dynmap_map_type = $map_container.data('dynmap-map-type');

        // The link to the “missing stations” page
        this.missing_stations = $map_container.data('path-missing-stations');

        // The layers displayed on the map
        this.layer_main = undefined;
        this.layer_intersections = undefined;
        this.layer_terminus = undefined;
        this.layer_others = undefined;
        this.layer_lines = undefined;

        // The stations colors
        this.lines_colors = {};
        this.stations_colors = {};
        this.stations_default_color_dot = '#800080';
        this.stations_color_dot_intersection = '#ffffff';
        this.stations_color_dot_intersection_outline = '#000000';
        this.stations_color_dot_terminus = '#000000';
        this.stations_color_dot_main = '#cd0000';
        this.stations_default_color_lines = '#800080';

        // The stations sizes
        this.stations_size_outline_normal = 2;
        this.stations_size_outline_main = 5;
        this.station_size_dot = 9;

        // The main stations (array)
        this.main_stations = $map_container.data('main-stations') ? $map_container.data('main-stations').split(',') : [];

        // An object containing the station marker indexed by station's code name.
        this.stations = [];

        // The default view of the map.
        // TODO This should be retrieved from the core someway.
        this.default_center = [-80, -1306];
        this.default_zoom = 10;

        // The map color shading (to enhance a path).
        this.shading_default = 0;

        // The paths to highlight.
        this.highlighted_paths = [];
        this.highlighted_stations = [];

        // The API to call to retrieve the JSON network
        this.network_api = $map_container.data('api-network');
        this.network_colors_api = $map_container.data('api-network-colors');

        // The raw network object returned by the API but indexed by station ID.
        this.network = {};

        // The lines, to be able to re-colorize lines after.
        this.lines = [];

        // The links already drawn, avoiding duplicated lines (better performances, plus visible in the dashed lines).
        this.lines_drawn = [];

        // The labels colors to update when the map is loaded.
        this.label_colors_waiting_for_update = [];

        // Loads the default highlighted route, if any
        let highlighted_route = $map_container.data('highlighted-route');

        if (highlighted_route)
        {
            let highlighted_stations = $map_container.data('highlighted-route').split(',').filter(station => station.length > 0);
            if (highlighted_stations.length > 0)
            {
                this.highlight_path(highlighted_stations);
                this.shading_default = 0.8;
            }
        }
    }



    // -------------------- Configuration methods


    /**
     * Highlights a path in the map.
     *
     * Must be called before the init method.
     *
     * @param path The path to highlight (ordered list of stations code names)
     * @param shading The shading to apply to this path (default = 0, i.e. the normal color).
     *
     * @return {Number} The highlighted path ID.
     */
    highlight_path(path, shading)
    {
        if (shading === undefined)
            shading = 0;

        this.highlight_path_start(path[0]);
        this.highlight_path_end(path[path.length - 1]);
        return this.highlighted_paths.push({ path: path, shading: shading}) - 1;
    }

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
    highlight_station(station_code_name, dot_style, label_style, label_classes)
    {
        this.highlighted_stations.push({
            station_code: station_code_name,
            style: {
                dot: dot_style,
                label: {
                    css: label_style,
                    classes: label_classes
                }
            }
        });
    }

    /**
     * Highlights a startup station, using a pre-determined style.
     *
     * @param station_code_name The station's code name.
     */
    highlight_path_start(station_code_name)
    {
        this.highlight_station(
            station_code_name,
            {
                color: '#00BB00',
                fillColor: '#00FF00'
            },
            {},
            'main_station'
        );
    }


    /**
     * Highlights an end-of-path station, using a pre-determined style.
     *
     * @param station_code_name The station's code name.
     */
    highlight_path_end(station_code_name)
    {
        this.highlight_station(
            station_code_name,
            {
                color: this.stations_color_dot_main,
                fillColor: '#FF0000'
            },
            {},
            'main_station'
        );
    }

    /**
     * Removes the highlighting on a path.
     *
     * @param paths_ids The paths IDs, as returned by highlight_path. If undefined, removes all.
     */
    un_highlight_paths(...paths_ids)
    {
        if (paths_ids === undefined)
            paths_ids = this.highlighted_paths.keys();

        let stations_to_un_highlight = [];

        paths_ids.forEach(path_id => {
            let path = this.highlighted_paths[path_id];
            stations_to_un_highlight.push(path.path[0]);
            stations_to_un_highlight.push(path.path[path.lenght - 1]);
        });

        // We removes the paths and highlighted stations for this path.
        this.highlighted_paths = this.highlighted_paths.filter((path, i) => !paths_ids.find(i));
        this.un_highlight_stations(...stations_to_un_highlight);
    }

    /**
     * Removes the highlighting on stations.
     *
     * @param stations_codes The stations code names. If undefined, removes all.
     */
    un_highlight_stations(...stations_codes)
    {
        if (stations_codes === undefined)
        {
            this.highlighted_stations = [];
            return;
        }

        this.highlighted_stations = this.highlighted_stations.filter(
            station => !stations_codes.find(station.station_code)
        );
    }



    // -------------------- Centering methods


    /**
     * Centers & adjust the map on an highlighted path.
     *
     * @param path_id The highlighted path ID. The first added is 0, then 1, 2, etc.
     *                This ID is returned by the highlight_path method.
     */
    center_on_highlighted_path(path_id)
    {
        let self = this;

        if (!this.map)
        {
            console.error('Cannot call NetworkMap.center_on_highlighted_path before the init method. Use it in the init callback.');
            return;
        }

        let path = this.highlighted_paths[path_id];
        if (!path) return;

        let min_x, min_z, max_x, max_z;

        // Comparison functions returning the other value if one is undefined
        let comparison = function(comparison_function) {
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

        let min = comparison(Math.min), max = comparison(Math.max);

        path.path.forEach(function (station_code_name) {
            let station = self.stations[station_code_name];
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

        this.map.fitBounds([this._coords_to_latlng([min_x, min_z]), this._coords_to_latlng([max_x, max_z])]);

        if (this.map.getZoom() >= 11)
            this.map.setZoom(this.map.getZoom() - 1);
    }



    // -------------------- Rendering


    /**
     * Renders the map.
     * This method should be called for the initial render only. To update the map with a new path on it,
     * use re_render_highlighted_path().
     */
    render(callback)
    {
        let self = this;
        let $network_map = self.$map_container;

        if (!self.network_api || !self.network_colors_api)
        {
            console.error('NetworkMap: network API not configured.');
            return;
        }

        if (!self.map_container_id)
        {
            console.error('NetworkMap: container ID not configured.');
            return;
        }


        $.getJSON(self.network_colors_api, function (network_colors)
        {
            self.lines_colors = network_colors;

            $.getJSON(self.network_api, function (network_array)
            {
                let t0 = performance.now();

                // Constructs a map by ID
                network_array.forEach(function (station) {
                    self.network[station.id] = station;
                });

                self._create_markers();
                self._colorize_and_group_markers();

                // - Create map and hide loader -
                // - Call callback -


                // Creates list of markers (will become layers later)
                let markers_main = [];
                let markers_intersections = [];
                let markers_terminus = [];
                let markers_others = [];

                self.lines = [];


                // Creates the stations, and the lines between them
                network_array.forEach(function (station) {
                    if (station.is_visible) {
                        let neighborhood = self._get_neighborhood_infos(station);
                        let is_main_station = self.main_stations.indexOf(station.code_name) > -1;

                        // We check if the station is highlighted
                        if (!is_main_station) {
                            for (let i = 0; i < self.highlighted_stations.length; i++) {
                                if (station.code_name == self.highlighted_stations[i].station_code) {
                                    is_main_station = true;
                                    break;
                                }
                            }
                        }

                        let marker_station = self._create_station(
                            station, [station.x, station.y],
                            neighborhood.is_intersection, neighborhood.is_terminus, is_main_station
                        );

                        if      (is_main_station)              markers_main.push(marker_station);
                        else if (neighborhood.is_intersection) markers_intersections.push(marker_station);
                        else if (neighborhood.is_terminus)     markers_terminus.push(marker_station);
                        else                                   markers_others.push(marker_station);

                        self.stations[station.code_name] = marker_station;
                    }

                    if (station.network) {
                        self._link_stations(self.lines, station, 'east');
                        self._link_stations(self.lines, station, 'north');
                        self._link_stations(self.lines, station, 'south');
                        self._link_stations(self.lines, station, 'west');
                    }
                });


                // Attributes the colors of the dots, for basic stations
                markers_others.forEach(function (station)
                {
                    // All the colors of the stations are stored, but these simple stations will always have
                    // only one color, the first of the array.
                    let color = self.stations_colors[station.zeps.station.code_name][0];

                    // We also update the base color of the station (color unshaded).
                    station.zeps.base_color      = color;
                    station.zeps.base_fill_color = color;

                    self._colorize_marker(station, color, self._get_real_shading(station));
                });


                // Creates the layers, and display them on the map
                self.layer_main = L.layerGroup(markers_main);
                self.layer_intersections = L.layerGroup(markers_intersections);
                self.layer_terminus = L.layerGroup(markers_terminus);
                self.layer_others = L.layerGroup(markers_others);
                self.layer_lines = L.layerGroup(self.lines);


                // Removes the loader
                $network_map.empty();


                // Loads the map
                self.map = L.map(self.map_container_id, {
                    center: self._coords_to_latlng(self.default_center),
                    zoom: self.default_zoom,

                    minZoom: 8,
                    maxZoom: 14,

                    // Control will be added later, customized, not in the default location.
                    zoomControl: false,

                    // Layers are added by inverted order of importance—the last will be displayed on top.
                    layers: [
                        self.layer_lines,

                        self.layer_others,
                        self.layer_terminus,
                        self.layer_intersections,
                        self.layer_main
                    ]
                });

                L.control.zoom({
                    position: self.buttons_location
                }).addTo(self.map);

                self.map.attributionControl.addAttribution(
                    'Plan du Netherrail <a href="https://zcraft.fr">Zcraftien</a>' +
                    ' | Données aggrégées par <a href="https://github.com/FlorianCassayre/ZePS-Core">Florian Cassayre &amp; Amaury Carrade</a>' +
                    (self.missing_stations ? ' | <a href="' + self.missing_stations + '">Station manquante ?</a>' : '')
                );


                // Ensures the zoom is handled correctly
                self._adapt_zoom();
                self.map.on('zoomend', self._adapt_zoom.bind(self));


                // Adds display of the labels on hover, if not already displayed
                let mouse_in = function (e) {
                    let $label = $(e.target.getTooltip()._container);

                    // Z-index update, so the label is always above others when pointed
                    $label.data('zeps-network-map-old-zindex', $label.css('z-index'));
                    $label.css('z-index', 9001);

                    if (!$label.is(":visible")) {
                        $label.fadeIn(200);

                        $label.data('zeps-network-map-previously-hidden', true);
                        $label.data('zeps-network-map-previous-container-style', jQuery.extend(true, {}, e.target.options));
                        $label.data('zeps-network-map-displayed-at-zoom', self.map.getZoom());

                        e.target.setStyle({
                            stroke: true,
                            weight: 5
                        });
                    }
                };

                let mouse_out = function (e) {
                    let $label = $(e.target.getTooltip()._container);
                    let old_zindex = $label.data('zeps-network-map-old-zindex');

                    if ($label.data('zeps-network-map-previously-hidden')) {
                        // We hide the label only if the zoom level is the same.
                        // Else, either the zoom level change hidden it, and we don't have to change that, or
                        // it makes it always displayed, and again we don't have to change anything.
                        if ($label.data('zeps-network-map-displayed-at-zoom') == self.map.getZoom())
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


                let groups = [
                    self.layer_others, self.layer_terminus,
                    self.layer_intersections, self.layer_main
                ];

                groups.forEach(function (group) {
                    group.eachLayer(function (marker) {
                        marker.on({
                            mouseover: mouse_in,
                            mouseout: mouse_out
                        });

                        // Adds pop-up on stations, with name, lines and dynmap links.
                        let unique_lines = self.stations_colors[marker.zeps.station.code_name]
                            .sort()
                            .filter(function(el, i, a) { return i == a.indexOf(el); });

                        let popup_title = '', popup_subtitle = '', popup_content = '', $popup_list_actions;

                        // Popup title
                        popup_title = '<h4>';
                        unique_lines.forEach(function (color) {
                            popup_title += '<div class="square-line" style="background-color: ' + color + ';"></div>';
                        });
                        popup_title += '<span>' + marker.zeps.station.full_name + '</span></h4>';

                        // Popup subtitle
                        popup_subtitle = '<p class="station-popup-subtitle">';
                        if (marker.zeps.station.is_portal)
                            if (marker.zeps.is_intersection)
                                popup_subtitle += '<strong>Portail et intersection</strong>';
                            else
                                popup_subtitle += '<strong>Portail de sortie</strong>';
                        else
                            popup_subtitle += '<strong>Intersection</strong>';

                        if (!marker.zeps.station.is_intersection)
                            popup_subtitle += ' (sans arrêt)';

                        popup_subtitle += '</p>'

                        // Popup content
                        popup_content = '<p class="station-popup-content">';

                        popup_content += '<strong>Coordonnées : </strong>' + marker.zeps.station.x + ' ; ' + marker.zeps.station.y + '<br />';
                        if (self.dynmap_root && (self.dynmap_map_overworld || self.dynmap_map_nether))
                        {
                            popup_content += '<strong>Voir sur la Dynmap : </strong>';

                            let links = [];
                            if (self.dynmap_map_overworld)
                                links.push('<a href="' + self.dynmap_root + '/' + '?worldname=' + self.dynmap_map_overworld + '&mapname=' + self.dynmap_map_type + '&x=' + (marker.zeps.station.x * 8) + '&y=64&z=' + (marker.zeps.station.y * 8) + '" target="_blank">surface</a>');
                            if (self.dynmap_map_nether)
                                links.push('<a href="' + self.dynmap_root + '/' + '?worldname=' + self.dynmap_map_nether + '&mapname=' + self.dynmap_map_type + '&x=' + marker.zeps.station.x + '&y=64&z=' + marker.zeps.station.y + '&zoom=3" target="_blank">nether</a>');

                            popup_content += links.join(', ');
                        }

                        popup_content += '</p>';

                        // Popup actions
                        if (self.elem_form_from_id || self.elem_form_to_id)
                        {
                            let fields = {
                                'from': [
                                    $(document.getElementById(self.elem_form_from_id))
                                ],
                                'to': [
                                    $(document.getElementById(self.elem_form_to_id))
                                ]
                            };

                            function put_data_to_field(field, $button_elem)
                            {
                                fields[field][0].val($button_elem.attr('data-station-full-name'));

                                self.map.closePopup();
                            }

                            let $popup_list_action_departure = $('<li class="station-popup-link-set-departure" '
                                + 'data-station-full-name="' + marker.zeps.station.full_name + '">'
                                + '<span class="fa fa-plane fa-lg" aria-hidden="true"></span>'
                                + 'Partir d\'ici'
                                + '</li>').on('click', function() {
                                put_data_to_field('from', $(this));
                            });

                            let $popup_list_action_arrival = $('<li class="station-popup-link-set-arrival" '
                                + 'data-station-full-name="' + marker.zeps.station.full_name + '">'
                                + '<span class="fa fa-plane fa-lg fa-rotate-90" aria-hidden="true"></span>'
                                + 'Arriver ici'
                                + '</li>').on('click', function() {
                                put_data_to_field('to', $(this));
                            });

                            $popup_list_actions = $('<ul class="station-popup-actions" />')
                                .append($popup_list_action_departure)
                                .append($popup_list_action_arrival);
                        }


                        let $popup = $('<div />')
                            .append(popup_title)
                            .append(popup_subtitle)
                            .append(popup_content)
                            .append($popup_list_actions);

                        marker.bindPopup($popup[0]);

                        marker.on('click', function(e)
                        {
                            if (e.originalEvent.ctrlKey)
                            {
                                console.log(e);
                                e.originalEvent.stopPropagation();
                                alert('cc');
                            }
                        });
                    });
                });


                // Updates the highlighted stations
                self.highlighted_stations.forEach(function(highlight)
                {
                    if (highlight.style)
                    {
                        let marker = self.stations[highlight.station_code];
                        if (marker)
                        {
                            if (highlight.style.dot)
                                marker.setStyle(highlight.style.dot);

                            if (highlight.style.label)
                            {
                                let $label = $('#station-label-for-' + highlight.station_code);

                                if (highlight.style.label.classes)
                                    $label.addClass(highlight.style.label.classes);

                                if (highlight.style.label.css)
                                    $label.css(highlight.style.label.css);
                            }
                        }
                    }
                });


                // Updates the displayed location if needed
                if (self.permanent_url_with_anchor)
                {
                    self._update_location_from_hash();

                    L
                        .easyButton({
                            id: 'permanent-link-button',
                            position: self.buttons_location,
                            states: [{
                                stateName: 'default',
                                onClick: self._encode_location_in_hash.bind(self),
                                title: 'Lien permanent',
                                icon: 'fa fa-link',
                            }]
                        }).addTo(self.map);
                }


                // Updates labels colors
                self.label_colors_waiting_for_update.forEach(function(update)
                {
                    document.getElementById(update.id).style.color = update.color;
                });

                self.label_colors_waiting_for_update = [];



                // Centers on highlighted path, if any
                if (self.highlighted_paths)
                    self.center_on_highlighted_path(self.highlighted_paths.length - 1);


                // Callback
                if (callback)
                    self.map.whenReady(function() { callback(self) });

                let t1 = performance.now();
                console.log("Map rendering took " + (t1 - t0) + " milliseconds.");
            });
        });
    }


    /**
     * Re-renders the colors and dot styles of the map according to the current path(s).
     * render() must have been called before.
     */
    re_render_highlighted_path()
    {

    }



    // -------------------- Utilities


    /**
     * Converts Minecraft coordinates to lat/long used by Leaflet.
     *
     * The coordinates are divided by 1000, to be able to display points with Z>100, and inverted;
     * as the Minecraft coordinate system is different from the lat/long one.
     *
     * @param coordinates The coordinates, in a two-sized array [x, z].
     * @returns {*[]} The lat/long, in a two-sized array.
     * @private
     */
    _coords_to_latlng(coordinates)
    {
        return [-coordinates[1] / 1000, coordinates[0] / 1000];
    }

    /**
     * Converts lat/long used by Leaflet to Minecraft coordinates.
     *
     * @param latlng The lat/lng of Leaflet, in a two-sized array [lat, lng].
     * @returns {*[]} The x/z coordinates, in a two-sized array.
     * @private
     */
    _latlng_to_coords(latlng)
    {
        return [Math.round(latlng[1] * 1000), Math.round(-latlng[0] * 1000)];
    }

    /**
     * Checks if the given station is an intersection or a terminus.
     *
     * @param station The station.
     * @returns {{is_intersection: boolean, is_terminus: boolean}}
     * @private
     */
    _get_neighborhood_infos(station)
    {
        let relations_count = Object.keys(station.network).length;
        let is_intersection = relations_count > 2;

        return {
            is_intersection: is_intersection,
            is_terminus: relations_count <= 1
        };
    }

    /**
     * Shades a color.
     *
     * Thank: http://stackoverflow.com/a/13542669/5599794
     *
     * @param percentage The shading percentage.
     * @param css_color The base CSS color.
     * @param target_color The target CSS color, to shade to this color instead of white (if percentage positive) or
     *                     black (else).
     *
     * @private
     */
    __shade_color(percentage, css_color, target_color)
    {
        let n = percentage < 0 ? percentage * -1 : percentage;
        let from, to;

        if (css_color.length > 7)
        {
            from = css_color.split(",");
            to   = (target_color ? target_color : (percentage < 0 ? "rgb(0,0,0)" : "rgb(255,255,255)")).split(",");

            let R = parseInt(from[0].slice(4));
            let G = parseInt(from[1]);
            let B = parseInt(from[2]);

            return "rgb("
                + (Math.round((parseInt(to[0].slice(4)) - R) * n) + R) + ","
                + (Math.round((parseInt(to[1]) - G) * n) + G) + ","
                + (Math.round((parseInt(to[2]) - B) * n) + B) +")";
        }
        else
        {
            from = parseInt(css_color.slice(1), 16);
            to   = parseInt((target_color ? target_color : (percentage < 0 ? "#000000" : "#FFFFFF")).slice(1), 16);

            let R1 = from >> 16;
            let G1 = from >> 8 & 0x00FF;
            let B1 = from & 0x0000FF;

            return "#" + (0x1000000
                    + (Math.round(((to >> 16) - R1) * n) + R1) * 0x10000
                    + (Math.round(((to >> 8 & 0x00FF) - G1) * n) + G1) * 0x100
                    + (Math.round(((to & 0x0000FF) - B1) * n) + B1)).toString(16).slice(1);
        }
    }



    // -------------------- Map creation


    /**
     * Creates a station.
     *
     * @param station The station object retrieved.
     * @param location The station's location (array = first key is X, other is Z coordinate in Minecraft system).
     * @param is_intersection True if this station is an intersection.
     * @param is_terminus True if this station is a terminus.
     * @param is_main True if this station is a main station.
     * @returns {*} A Leaflet circleMarker object.
     * @private
     */
    _create_station(station, location, is_intersection, is_terminus, is_main)
    {
        // Station classes (from type)
        let label_classes = [];
        if (is_intersection || is_terminus || is_main)
            label_classes.push('major-station');
        if (is_terminus)
            label_classes.push('terminus-station');
        if (is_main)
            label_classes.push('main-station');


        // Station color
        let outlineColor = this.stations_default_color_dot;
        let insideColor  = this.stations_default_color_dot;

        if (is_main)
        {
            insideColor  = this.stations_color_dot_main;
            outlineColor = this.stations_color_dot_main;
        }
        else if (is_intersection)
        {
            insideColor  = this.stations_color_dot_intersection;
            outlineColor = this.stations_color_dot_intersection_outline;
        }
        else if (is_terminus)
        {
            insideColor  = this.stations_color_dot_terminus;
            outlineColor = this.stations_color_dot_terminus;
        }


        // Station object
        let station_marker = L.circleMarker(this._coords_to_latlng(location), {
            color:     outlineColor,
            fillColor: insideColor,

            opacity:     0.76,
            fillOpacity: 1,

            weight: is_main ? this.stations_size_outline_main : this.stations_size_outline_normal,
            stroke: is_main || is_intersection,

            className: 'network-map-station'
        }).bindTooltip('<div class="station-label' + (is_intersection || is_main ? ' station-label-intersection' : '') + (is_main ? ' station-label-main' : '') + '" id="station-label-for-' + station.code_name + '">' + station.full_name + '</div>', {
            permanent: true,
            opacity: 1,
            sticky: true,
            direction: 'right',
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
        this._colorize_marker(station_marker, undefined, this._get_real_shading(station_marker));


        return station_marker;
    }

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
    _create_line(station_from, station_to, color, is_rail)
    {
        let line =  L.polyline([this._coords_to_latlng([station_from.x, station_from.y]), this._coords_to_latlng([station_to.x, station_to.y])], {
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
        this._colorize_marker(line, color, this._get_real_shading(line));

        return line;
    }

    /**
     * Encodes a stations link in a string. The string depends on the origin, destination and order.
     * This is used to draw each connection once.
     *
     * @param station1 The first station.
     * @param station2 The other station.
     * @returns {string} A string identifier of the link.
     * @private
     */
    __encode_link(station1, station2)
    {
        return station1.x + ',' + station1.y + ';' + station2.x + ',' + station2.y;
    }

    /**
     * Checks if a link exists between the given station (regardless of the order).
     *
     * @param station1 A station.
     * @param station2 The other station.
     * @returns {boolean} True if a link was already drawn.
     * @private
     */
    __link_exists(station1, station2)
    {
        return this.lines_drawn.indexOf(this.__encode_link(station1, station2)) > -1
            || this.lines_drawn.indexOf(this.__encode_link(station2, station1)) > -1;
    }

    /**
     * Links two stations with a line, if possible.
     *
     * @param lines The line will be added to this object, if it can be created.
     * @param station_base The base station.
     * @param direction The direction to use to find the other station. If a station is defined in this direction;
     *                  a link will be created.
     * @private
     */
    _link_stations(lines, station_base, direction)
    {
        // We try to find a link in this direction
        let link = null;
        station_base.network.forEach(function(network_link)
        {
            if (network_link.direction == direction)
            {
                link = network_link;
            }
        });

        if (link != null)
        {
            let station_other = this.network[link.to];

            if (station_other && !this.__link_exists(station_base, station_other))
            {
                let color = this.stations_default_color_lines;
                let colors_set;
                let ref_coordinate;

                if (direction == 'east' || direction == 'west')
                {
                    colors_set = this.lines_colors.eastwest;
                    ref_coordinate = station_base.y;
                }
                else
                {
                    colors_set = this.lines_colors.northsouth;
                    ref_coordinate = station_base.x;
                }

                colors_set.forEach(function(colors_set_item)
                {
                    if (colors_set_item.coordinates.indexOf(ref_coordinate) > -1)
                    {
                        color = 'rgb(' + colors_set_item.color.red + ',' + colors_set_item.color.green + ',' + colors_set_item.color.blue + ')';
                    }
                });

                if (!this.stations_colors[station_base.code_name])
                    this.stations_colors[station_base.code_name] = [color];
                else
                    this.stations_colors[station_base.code_name].push(color);

                if (!this.stations_colors[station_other.code_name])
                    this.stations_colors[station_other.code_name] = [color];
                else
                    this.stations_colors[station_other.code_name].push(color);

                lines.push(this._create_line(
                    station_base, station_other, color, link.is_rail
                ));

                this.lines_drawn.push(this.__encode_link(station_base, station_other));
            }
        }
    }

    /**
     * Updates the size of a circle marker.
     *
     * @param marker The marker to update.
     * @param size The new size. If undefined, reset to the default size.
     * @private
     */
    _update_station_dot_size(marker, size)
    {
        marker.setRadius(size ? size : this.station_size_dot);
    }

    /**
     * Updates the size of all circle markers in the given layer.
     *
     * @param layer The layer to update.
     * @param size The new size. If undefined, reset to the default size.
     * @private
     */
    _update_layer_dot_size(layer, size)
    {
        let self = this;
        layer.eachLayer(function (marker)
        {
            self._update_station_dot_size(marker, size);
        });
    }

    /**
     * Colorizes a station or a line.
     *
     * @param marker The marker to colorize.
     * @param color The color. If undefined, the previous color is kept.
     *              The color can be a single value, or an array with (ordered) the outline and inside color;
     *              or an object with the keys `outline` and `inside`.
     * @param shading The shading to apply. If undefined, the default shading is used.
     *                0 = no color change, -1 = black, 1 = white;
     *                ]0;1[ = lighten, ]-1;0[ = darken.
     * @private
     */
    _colorize_marker(marker, color, shading)
    {
        shading = shading !== undefined ? shading : this.shading_default;

        // Anything to do?
        if (!color && !shading)
            return;

        let outlineColor, insideColor;

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
                color: this.__shade_color(shading, outlineColor),
                fillColor: this.__shade_color(shading, insideColor)
            });


            // Updates the color of the label
            let label_id = 'station-label-for-' + marker.zeps.station.code_name;
            let label_color = this.__shade_color(shading, '#111111');
            let label = document.getElementById(label_id);

            if (label)
            {
                label.style.color = label_color;
            }
            else
            {
                // If the label is not already drawn, the color must be updated later, when the map is fully loaded.
                // This only happens before the map is drawn. The colors are updated a few milliseconds after the
                // initialization of the map, in the init method.
                this.label_colors_waiting_for_update.push({
                    id: label_id,
                    color: label_color
                });
            }
        }

        // Links between the stations
        else if (marker instanceof L.Polyline)
        {
            marker.setStyle({
                color: this.__shade_color(shading, color ? insideColor : marker.zeps.base_color ? marker.zeps.base_color : marker.options.color)
            });
        }

        // Else, unsupported marker, no action.
    }

    /**
     * Returns the real color to use for this marker, taking into account the highlighted path.
     *
     * @param marker The marker.
     * @return number|boolean The shading to use, or FALSE if the given marker is not a ZePS link or station.
     * @private
     */
    _get_real_shading(marker)
    {
        if (!marker.zeps)
            return false;

        let shading;

        // Stations dots
        if (marker instanceof L.CircleMarker)
        {
            shading = this.shading_default;

            this.highlighted_paths.forEach(function (highlight_map)
            {
                for (let j = 0; j < highlight_map.path.length; j++)
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
            shading = this.shading_default;

            this.highlighted_paths.forEach(function (highlight_map)
            {
                for (let j = 0; j < highlight_map.path.length; j++)
                {
                    let current_station = highlight_map.path[j];
                    let next_station = highlight_map.path[j+1];
                    let from_station = marker.zeps.station_from.code_name;
                    let to_station = marker.zeps.station_to.code_name;

                    if ((current_station == from_station && next_station == to_station) || (next_station == from_station && current_station == to_station))
                    {
                        shading = highlight_map.shading;
                        break;
                    }
                }
            });

            return shading;
        }
    }

    /**
     * Adds a layer to the map, if not previously added.
     *
     * @param layer The layer to add.
     * @private
     */
    _add_layer(layer)
    {
        if (!this.map.hasLayer(layer))
            this.map.addLayer(layer);
    }



    // -------------------- Zoom adaptation


    /**
     * Graceful adaptation to the zoom level.
     *
     * 12+ =   all content displayed
     * 10-12 = all dots, but labels of the main stations (intersections & main cities) only.
     * 10- =   only dots & labels of the main stations.
     *
     * @private
     */
    _adapt_zoom()
    {
        let zoom_level = this.map.getZoom();

        let $labels = $('.leaflet-tooltip');
        let $labels_major = $('.leaflet-tooltip.major-station');
        let $label_terminus = $('.leaflet-tooltip.terminus-station');
        let $label_main = $('.leaflet-tooltip.main-station');

        if (zoom_level >= 11)
        {
            this.$map_container.addClass('zoom-high');
        }
        else
        {
            this.$map_container.removeClass('zoom-high');
        }

        if (zoom_level >= 11)
        {
            this._add_layer(this.layer_others);
            this._add_layer(this.layer_terminus);

            this._update_layer_dot_size(this.layer_intersections);
            this._update_layer_dot_size(this.layer_main);
            this._update_layer_dot_size(this.layer_terminus);
            this._update_layer_dot_size(this.layer_others);

            $labels.show();
        }
        else if (zoom_level == 10)
        {
            this._add_layer(this.layer_others);
            this._add_layer(this.layer_terminus);

            this._update_layer_dot_size(this.layer_intersections);
            this._update_layer_dot_size(this.layer_main);
            this._update_layer_dot_size(this.layer_terminus);
            this._update_layer_dot_size(this.layer_others);

            $labels.hide();
            $labels_major.show();
            $label_terminus.hide();
            $label_main.show();
        }
        else if (zoom_level == 9)
        {
            this._add_layer(this.layer_others);
            this._add_layer(this.layer_terminus);

            this._update_layer_dot_size(this.layer_main, 8);
            this._update_layer_dot_size(this.layer_intersections, 8);
            this._update_layer_dot_size(this.layer_terminus, 5);
            this._update_layer_dot_size(this.layer_others, 5);

            $labels.hide();
            $label_main.show();
        }
        else if (zoom_level == 8)
        {
            this.map.removeLayer(this.layer_others);
            this.map.removeLayer(this.layer_terminus);

            this._update_layer_dot_size(this.layer_intersections, 4);
            this._update_layer_dot_size(this.layer_main, 7);

            $labels.hide();
            $label_main.show();
        }
    }



    // -------------------- Permanent links with hashes


    /**
     * Encodes the current location (x, z and zoom) in the URL hash.
     * @private
     */
    _encode_location_in_hash() {
        let center = this.map.getCenter();
        let center_coordinates = this._latlng_to_coords([center.lat, center.lng]);
        let zoom = this.map.getZoom();

        window.location.hash = center_coordinates[0] + ',' + center_coordinates[1] + ',' + zoom;
    }

    /**
     * Loads a location from the URL hash.
     * @private
     */
    _update_location_from_hash () {
        let location_components = window.location.hash.substring(1).split(',');

        if (location_components.length >= 2) {
            let center_lat = parseInt(location_components[0]);
            let center_lng = parseInt(location_components[1]);

            if (!isNaN(center_lat) && !isNaN(center_lng)) {
                let center = this._coords_to_latlng([center_lat, center_lng]);
                let zoom = 10;

                if (location_components.length >= 3)
                    zoom = parseInt(location_components[2]);

                if (!isNaN(zoom))
                    this.map.setView(center, zoom);
            }
        }
    }
}
