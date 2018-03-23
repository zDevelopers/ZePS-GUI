'use strict';

import 'leaflet';
import 'leaflet-easybutton';

import {toTransformation} from "leaflet/src/geometry/Transformation";

import {shade_color} from "../utils/colors";
import {is_mobile} from "../utils/responsive";


const yx = L.latLng;

const xy = function (x, y)
{
    // When doing xy([x, y]);
    if (L.Util.isArray(x))
    {
        return yx(x[1], x[0]);
    }

    // When doing xy(x, y);
    return yx(y, x);
};


/**
 * A CRS adapted to our maps, same as the Simple CRS but with Ys
 * from the top to the bottom.
 */
const ZePSCRS = L.Util.extend({}, L.CRS.Simple, {
    transformation: toTransformation(1, 0, 1, 0)
});


// TODO Currently in a constant for the 1.6, but this is meant to be external in V2.
const WORLD_NAME = 'V5_nether';


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
        this.permanent_url_with_anchor = $map_container.data('permanent-url-with-anchor') === 'yes';

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

        // The worlds (layers groups containing all sub-groups) displayed on the map
        // TODO for ZePS V2 with multiple maps:
        // 1. set current_world_layer on map change
        // 2. call adapt_zoom on map change
        // 3. add UI selector
        this.worlds = {};
        this.current_world_layer = undefined;

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
        this.default_zoom = 0;

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
        if (paths_ids.length === 0)
            paths_ids = Array.from(this.highlighted_paths.keys());

        let stations_to_un_highlight = [];

        paths_ids.forEach(path_id => {
            let path = this.highlighted_paths[path_id];
            stations_to_un_highlight.push(path.path[0]);
            stations_to_un_highlight.push(path.path[path.path.length - 1]);
        });

        // We removes the paths and highlighted stations for this path.
        this.highlighted_paths = this.highlighted_paths.filter((path, i) => paths_ids.indexOf(i) === -1);
        this.un_highlight_stations(...stations_to_un_highlight);
    }

    /**
     * Removes the highlighting on stations.
     *
     * @param stations_codes The stations code names. If undefined, removes all.
     */
    un_highlight_stations(...stations_codes)
    {
        if (stations_codes.length === 0)
        {
            this.highlighted_stations = [];
            return;
        }

        this.highlighted_stations = this.highlighted_stations.filter(
            station => stations_codes.indexOf(station.station_code) === -1
        );
    }



    // -------------------- Centering methods


    /**
     * Centers & adjust the map on an highlighted path.
     *
     * @param path_id The highlighted path ID. The first added is 0, then 1, 2, etc.
     *                This ID is returned by the highlight_path method.
     * @param fly boolean If true, the map will smoothly fly to the new bounds. Default false.
     */
    center_on_highlighted_path(path_id, fly)
    {
        let self = this;

        if (!this.map)
        {
            console.error('Cannot call NetworkMap.center_on_highlighted_path before the render method. Use it in the render callback.');
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

        let boundsOptions = {
            paddingTopLeft: this.map.containerPointToLayerPoint(is_mobile() ? [150, 0] : [432, 12]),
            paddingBottomRight: this.map.containerPointToLayerPoint([12, 12])
        };

        if (fly)
        {
            this.map.flyToBounds([xy([min_x, min_z]), xy([max_x, max_z])], boundsOptions);
        }
        else
        {
            this.map.fitBounds([xy([min_x, min_z]), xy([max_x, max_z])], boundsOptions);
        }
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


        $.getJSON(self.network_colors_api, network_colors =>
        {
            this.lines_colors = network_colors;

            $.getJSON(self.network_api, network_array =>
            {
                let t0 = performance.now();

                // Constructs a map by ID
                network_array.forEach(station => {
                    this.network[station.id] = station;
                });

                this._create_markers();
                this._colorize_and_group_markers();

                // Removes the loader
                this.$map_container.empty();


                // Loads the map
                this.map = L.map(this.map_container_id, {
                    center: xy(this.default_center),
                    zoom: this.default_zoom,

                    crs: ZePSCRS,

                    minZoom: -3,
                    maxZoom: 8,

                    // Control will be added later, customized, not in the default location.
                    zoomControl: false
                });


                // Initializes the layers
                this.switch_world(WORLD_NAME);


                // And the zoom controls
                L.control.zoom({
                    position: this.buttons_location
                }).addTo(this.map);


                // And the scale
                L.control.scale({
                    maxWidth: 128,
                    imperial: false  // None of this on my map!
                }).addTo(this.map);


                // Updates the displayed location if needed,
                // and adds the button for it
                if (this.permanent_url_with_anchor)
                {
                    this._update_location_from_hash();

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
                        }).addTo(this.map);
                }


                // Ensures the zoom is handled correctly
                this._adapt_zoom();
                this.map.on('zoomend', this._adapt_zoom.bind(this));


                // Updates labels colors
                this._update_label_colors();


                // Centers, if needed be
                if (this.highlighted_paths.length > 0)
                {
                    this.center_on_highlighted_path(0);
                }


                // Callback
                if (callback)
                    this.map.whenReady(function() { callback(this) });

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
        let t0 = performance.now();

        // We first re-generate the markers
        this._colorize_and_group_markers();

        // Then we update the layers on the leaflet map
        this.switch_world(this.current_world());

        // And we ensure the labels and such are correctly displayed.
        this._adapt_zoom();

        let t1 = performance.now();
        console.debug("Map re-rendering took " + (t1 - t0) + " milliseconds.");

        // After a little bit, we update the labels colors.
        // This must be
        setTimeout(() => this._update_label_colors(), 50);
    }


    /**
     * Creates the markers, annotated with metadata but not colored.
     * @private
     */
    _create_markers()
    {
        this.lines = [];

        // We first iter over the stations one time to build basic markers, lines, and colors.
        // Then we loop again with all the color data to add interaction stuff (like popups) and colors data.

        /* 1. FIRST ITERATION */

        Object.keys(this.network).map(k => this.network[k]).forEach(station =>
        {
            if (station.network)
            {
                this._link_stations(station, 'east');
                this._link_stations(station, 'north');
                this._link_stations(station, 'south');
                this._link_stations(station, 'west');
            }

            if (!station.is_visible) return;

            let relations_count = Object.keys(station.network).length;
            let is_intersection = relations_count > 2;

            let neighborhood =  {
                is_intersection: is_intersection,
                is_terminus: relations_count <= 1
            };

            let is_main_station = this.main_stations.indexOf(station.code_name) > -1;

            let station_marker = L.circleMarker(xy(station.x, station.y), {
                opacity: 0.76,
                fillOpacity: 1,

                className: 'network-map-station'
            });

            station_marker.zeps = {
                station: station,

                is_main: is_main_station,
                is_terminus: neighborhood.is_terminus,
                is_intersection: neighborhood.is_intersection,
            };

            this.stations[station.code_name] = station_marker;
        });


        /* 2. COLORS AND INTERACTION ITERATION */


        // First we define event handlers used for all markers labels (aka tooltips for Leaflet).

        let mouse_in = e =>
        {
            let $label = $(e.target.getTooltip()._container);

            // Z-index update, so the label is always above others when pointed
            $label.data('zeps-network-map-old-zindex', $label.css('z-index'));
            $label.css('z-index', 9001);

            if (!$label.is(":visible"))
            {
                $label.fadeIn(200);

                $label.data('zeps-network-map-previously-hidden', true);
                $label.data('zeps-network-map-previous-container-style', jQuery.extend(true, {}, e.target.options));
                $label.data('zeps-network-map-displayed-at-zoom', this.map.getZoom());

                e.target.setStyle({
                    stroke: true,
                    weight: 5
                });
            }
        };

        let mouse_out = e =>
        {
            let $label = $(e.target.getTooltip()._container);
            let old_zindex = $label.data('zeps-network-map-old-zindex');

            if ($label.data('zeps-network-map-previously-hidden'))
            {
                // We hide the label only if the zoom level is the same.
                // Else, either the zoom level change hidden it, and we don't have to change that, or
                // it makes it always displayed, and again we don't have to change anything.
                if ($label.data('zeps-network-map-displayed-at-zoom') === this.map.getZoom())
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

        // Then we loop again.

        Object.keys(this.stations).map(k => this.stations[k]).forEach(station_marker =>
        {
            // The colors

            station_marker.zeps.lines = this.stations_colors[station_marker.zeps.station.code_name]
                .sort()
                .filter(function (el, i, a) {
                    return i === a.indexOf(el);
                });

            station_marker.zeps.base_color = station_marker.zeps.lines[0];

            // The events

            station_marker.on({
                mouseover: mouse_in,
                mouseout: mouse_out
            });

            // The popup variables

            let popup_title, popup_subtitle, popup_content, $popup_list_actions;

            // The popup title (with station name and lines)

            popup_title = '<h4>';
            station_marker.zeps.lines.forEach(color =>
            {
                popup_title += '<div class="square-line" style="background-color: ' + color + ';"></div>';
            });
            popup_title += '<span>' + station_marker.zeps.station.full_name + '</span></h4>';

            // The popup subtitle (with station kind)

            popup_subtitle = '<p class="station-popup-subtitle">';
            if (station_marker.zeps.station.is_portal)
                if (station_marker.zeps.station.is_intersection && station_marker.zeps.is_intersection)
                    popup_subtitle += '<strong>Portail et intersection</strong>';
                else if (station_marker.zeps.station.is_intersection)
                    popup_subtitle += '<strong>Portail avec arrêt</strong>';
                else
                    popup_subtitle += '<strong>Portail de sortie</strong>';
            else
                popup_subtitle += '<strong>Intersection</strong>';

            if (!station_marker.zeps.station.is_intersection)
                popup_subtitle += ' (sans arrêt)';

            popup_subtitle += '</p>';

            if (station_marker.zeps.station.code_name === 'rive_blanche') console.log(station_marker.zeps);

            // The popup content (with coordinates, links…)

            popup_content = '<p class="station-popup-content">';
            popup_content += '<strong>Coordonnées : </strong>' + station_marker.zeps.station.x + ' ; ' + station_marker.zeps.station.y + '<br />';

            if (this.dynmap_root && (this.dynmap_map_overworld || this.dynmap_map_nether))
            {
                popup_content += '<strong>Voir sur la Dynmap : </strong>';

                let links = [];
                if (this.dynmap_map_overworld)
                    links.push('<a href="' + this.dynmap_root + '/' + '?worldname=' + this.dynmap_map_overworld + '&mapname=' + this.dynmap_map_type + '&x=' + (station_marker.zeps.station.x * 8) + '&y=64&z=' + (station_marker.zeps.station.y * 8) + '" target="_blank">surface</a>');
                if (this.dynmap_map_nether)
                    links.push('<a href="' + this.dynmap_root + '/' + '?worldname=' + this.dynmap_map_nether + '&mapname=' + this.dynmap_map_type + '&x=' + station_marker.zeps.station.x + '&y=64&z=' + station_marker.zeps.station.y + '&zoom=3" target="_blank">nether</a>');

                popup_content += links.join(', ');
            }

            popup_content += '</p>';

            // The popup actions (buttons to go from or to this station)

            if (this.elem_form_from_id || this.elem_form_to_id)
            {
                let fields = {
                    'from': [
                        $(document.getElementById(this.elem_form_from_id))
                    ],
                    'to': [
                        $(document.getElementById(this.elem_form_to_id))
                    ]
                };

                let put_data_to_field = (field, $button_elem) =>
                {
                    fields[field][0].val($button_elem.data('station-full-name'));
                    this.map.closePopup();
                };

                let $popup_list_action_departure = $('<li class="station-popup-link-set-departure" '
                    + 'data-station-full-name="' + station_marker.zeps.station.full_name + '">'
                    + '<span class="fa fa-plane fa-lg" aria-hidden="true"></span>'
                    + 'Partir d\'ici'
                    + '</li>').on('click', function() { put_data_to_field('from', $(this)); });

                let $popup_list_action_arrival = $('<li class="station-popup-link-set-arrival" '
                    + 'data-station-full-name="' + station_marker.zeps.station.full_name + '">'
                    + '<span class="fa fa-plane fa-lg fa-rotate-90" aria-hidden="true"></span>'
                    + 'Arriver ici'
                    + '</li>').on('click', function() { put_data_to_field('to', $(this)); });

                $popup_list_actions = $('<ul class="station-popup-actions" />')
                    .append($popup_list_action_departure)
                    .append($popup_list_action_arrival);
            }

            let $popup = $('<div />')
                .append(popup_title)
                .append(popup_subtitle)
                .append(popup_content)
                .append($popup_list_actions);

            station_marker.bindPopup($popup[0]);

            station_marker.on('click', e =>
            {
                if (e.originalEvent.ctrlKey)
                {
                    // TODO Put station into from/to field on Ctrl+[Maj+]Click
                    e.originalEvent.stopPropagation();
                }
            });
        });
    }

    /**
     * Links two stations with a line, if possible.
     *
     * @param station_base The base station.
     * @param direction The direction to use to find the other station. If a station is defined in this direction,
     *                  a link will be created.
     * @private
     */
    _link_stations(station_base, direction)
    {
        // We try to find a link in this direction
        let link = null;

        station_base.network.forEach(network_link =>
        {
            if (network_link.direction === direction)
            {
                link = network_link;
            }
        });
        if (link == null) return;

        let station_other = this.network[link.to];
        if (!(station_other && !this.__link_exists(station_base, station_other))) return;

        let color = this.stations_default_color_lines;
        let colors_set, ref_coordinate;

        if (direction === 'east' || direction === 'west')
        {
            colors_set = this.lines_colors.eastwest;
            ref_coordinate = station_base.y;
        }
        else
        {
            colors_set = this.lines_colors.northsouth;
            ref_coordinate = station_base.x;
        }

        colors_set.forEach(colors_set_item =>
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

        let line = L.polyline([xy([station_base.x, station_base.y]), xy([station_other.x, station_other.y])], {
            opacity: 1,
            clickable: false,

            dashArray: !link.is_rail ? '5, 5, 1, 5' : null,

            className: 'network-map-line'
        });

        line.zeps = {
            station_from: station_base,
            station_to: station_other,
            base_color: color
        };

        this.lines.push(line);
        this.lines_drawn.push(this.__encode_link(station_base, station_other));
    }

    _colorize_and_group_markers()
    {
        // We create list of markers (will become layers later)
        let markers_main = [];
        let markers_intersections = [];
        let markers_terminus = [];
        let markers_others = [];

        // We pre-build a list of highlighted stations
        let highlighted_stations_names = this.highlighted_stations.map(hs => hs.station_code);

        Object.keys(this.stations).map(k => this.stations[k]).forEach(station =>
        {
            // For each station, we check if it's a main station, an intersection, a terminus (reading the zeps
            // object), an highlighted station (reading the highlighted stations list), or a basic one (if none of
            // the above).

            let is_highlighted = highlighted_stations_names.indexOf(station.zeps.station.code_name) > -1;
            let is_main = station.zeps.is_main || is_highlighted;

            if (is_main)
            {
                markers_main.push(station);

                if (is_highlighted)
                {
                    let highlight = this.highlighted_stations.filter(hs => hs.station_code === station.zeps.station.code_name)[0];

                    if (highlight.style && highlight.style.dot)
                    {
                        station.setStyle(highlight.style.dot);
                    }

                    if (highlight.style.label)
                    {
                        let $label = $('#station-label-for-' + highlight.station_code);

                        if (highlight.style.label.classes)
                            $label.addClass(highlight.style.label.classes);

                        if (highlight.style.label.css)
                            $label.css(highlight.style.label.css);
                    }
                }
                else
                {
                    this._colorize_marker(station, this.stations_color_dot_main, this._get_real_shading(station));
                }
            }
            else if (station.zeps.is_intersection)
            {
                markers_intersections.push(station);
                this._colorize_marker(
                    station,
                    {
                        outline: this.stations_color_dot_intersection_outline,
                        inside: this.stations_color_dot_intersection
                    },
                    this._get_real_shading(station)
                );
            }
            else if (station.zeps.is_terminus)
            {
                markers_terminus.push(station);
                this._colorize_marker(station, this.stations_color_dot_terminus, this._get_real_shading(station));
            }
            else
            {
                markers_others.push(station);
                this._colorize_marker(station, station.zeps.base_color, this._get_real_shading(station));
            }


            // Then we add the label (aka tooltip, for Leaflet).

            let label_classes = [];
            if (station.zeps.is_intersection || station.zeps.is_terminus || is_main)
                label_classes.push('major-station');
            if (station.zeps.is_terminus)
                label_classes.push('terminus-station');
            if (is_main)
                label_classes.push('main-station');

            station.unbindTooltip().bindTooltip('<div class="station-label' + (station.zeps.is_intersection || is_main ? ' station-label-intersection' : '') + (is_main ? ' station-label-main' : '') + '" id="station-label-for-' + station.zeps.station.code_name + '">' + station.zeps.station.full_name + '</div>', {
                permanent: true,
                opacity: 1,
                sticky: true,
                direction: 'right',
                className: label_classes.join(' ')
            });
        });

        this.lines.forEach(line => this._colorize_marker(line, line.zeps.base_color, this._get_real_shading(line)));

        this.worlds[WORLD_NAME] = {
            main: L.layerGroup(markers_main),
            intersections: L.layerGroup(markers_intersections),
            terminus: L.layerGroup(markers_terminus),
            others: L.layerGroup(markers_others),
            lines: L.layerGroup(this.lines)
        };
    }



    // -------------------- Map creation

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
     * Updates the size of all circle markers in the given layer.
     *
     * @param layer The layer to update.
     * @param size The new size. If undefined, reset to the default size.
     * @private
     */
    _update_layer_dot_size(layer, size)
    {
        layer.eachLayer(marker => marker.setRadius(size ? size : this.station_size_dot));
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
                color: shade_color(shading, outlineColor),
                fillColor: shade_color(shading, insideColor)
            });

            // If the label is not already drawn, the color must be updated later, when the map is fully loaded.
            // This only happens before the map is drawn or re-drawn. The colors are updated a few milliseconds
            // after the initialization of the map, in the render or re-render method.
            this.label_colors_waiting_for_update.push({
                id: 'station-label-for-' + marker.zeps.station.code_name,
                color: shade_color(shading, '#111111')
            });
        }

        // Links between the stations
        else if (marker instanceof L.Polyline)
        {
            marker.setStyle({
                color: shade_color(shading, color ? insideColor : marker.zeps.base_color ? marker.zeps.base_color : marker.options.color)
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
                    if (marker.zeps.station.code_name === highlight_map.path[j])
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

                    if ((current_station === from_station && next_station === to_station) || (next_station === from_station && current_station === to_station))
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
     * Updates the labels colors when they are inserted into the DOM, after the map
     * (re-)rendering.
     *
     * @private
     */
    _update_label_colors()
    {
        this.label_colors_waiting_for_update.forEach(update =>
        {
            document.getElementById(update.id).style.color = update.color;
        });

        this.label_colors_waiting_for_update = [];
    }



    // -------------------- Layers


    /**
     * Changes the current world of the map by removing any previous layer and adding another.
     * @param new_world string The name of the new world.
     * @return boolean false if the world does not exists, true else when the world is changed.
     */
    switch_world(new_world)
    {
        if (this.worlds[new_world] === undefined) return false;

        // We remove any existing layer
        this.map.eachLayer(layer => this.map.removeLayer(layer));
        this.map.eachLayer(layer => console.debug(layer));

        // Then create the new one and attach it.
        let world = this.worlds[new_world];

        // The layers inside must be added by reverse order of importance
        let layer = L.layerGroup([
            world.lines,
            world.others,
            world.terminus,
            world.intersections,
            world.main,
        ]);

        this.map.addLayer(layer);
        this.map.current_world = new_world;
        this.current_world_layer = layer;

        return true;
    }

    /**
     * Returns the world name currently displayed.
     *
     * @returns string The current world name.
     */
    current_world()
    {
        return this.map.current_world;
    }

    /**
     * Returns the given layer by name (lines, main, intersections, terminus, others) from the current world,
     * or the specified world.
     *
     * If no layer is specified, returns the group layer for the whole current world.
     * @param layer_name The layer name. If undefined, returns the group layer of the current world.
     * @param world_name The world name. If undefined, the current world is used.
     * @returns The layer.
     * @private
     */
    _current_world_layer(layer_name, world_name)
    {
        if (layer_name === undefined)
            return this.current_world_layer;

        return this.worlds[world_name || this.current_world()][layer_name];
    }



    // -------------------- Zoom adaptation


    /**
     * Graceful adaptation to the zoom level.
     *
     * 1+     = all content displayed
     * -1 – 1 = all dots, but labels of the main stations (intersections & main cities) only.
     * (-2)-  = only dots & labels of the main stations.
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

        if (zoom_level >= 1)
        {
            this.$map_container.addClass('zoom-high');
        }
        else
        {
            this.$map_container.removeClass('zoom-high');
        }

        if (zoom_level >= 1)
        {
            this.current_world_layer.addLayer(this._current_world_layer('others'));
            this.current_world_layer.addLayer(this._current_world_layer('terminus'));

            this._update_layer_dot_size(this._current_world_layer('intersections'));
            this._update_layer_dot_size(this._current_world_layer('main'));
            this._update_layer_dot_size(this._current_world_layer('terminus'));
            this._update_layer_dot_size(this._current_world_layer('others'));

            $labels.show();
        }
        else if (zoom_level === 0)
        {
            this.current_world_layer.addLayer(this._current_world_layer('others'));
            this.current_world_layer.addLayer(this._current_world_layer('terminus'));

            this._update_layer_dot_size(this._current_world_layer('intersections'));
            this._update_layer_dot_size(this._current_world_layer('main'));
            this._update_layer_dot_size(this._current_world_layer('terminus'));
            this._update_layer_dot_size(this._current_world_layer('others'));

            $labels.hide();
            $labels_major.show();
            $label_terminus.hide();
            $label_main.show();
        }
        else if (zoom_level === -1)
        {
            this.current_world_layer.addLayer(this._current_world_layer('others'));
            this.current_world_layer.addLayer(this._current_world_layer('terminus'));

            this._update_layer_dot_size(this._current_world_layer('main'), 8);
            this._update_layer_dot_size(this._current_world_layer('intersections'), 8);
            this._update_layer_dot_size(this._current_world_layer('terminus'), 5);
            this._update_layer_dot_size(this._current_world_layer('others'), 5);

            $labels.hide();
            $label_main.show();
        }
        else if (zoom_level <= -2)
        {
            this.map.removeLayer(this._current_world_layer('others'));
            this.map.removeLayer(this._current_world_layer('terminus'));

            this._update_layer_dot_size(this._current_world_layer('intersections'), 4);
            this._update_layer_dot_size(this._current_world_layer('main'), 7);

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
        let zoom = this.map.getZoom();

        window.location.hash = center.lng + ',' + center.lat + ',' + zoom;
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
                let center = yx([center_lng, center_lat]);
                let zoom = 10;

                if (location_components.length >= 3)
                    zoom = parseInt(location_components[2]);

                if (!isNaN(zoom))
                    this.map.setView(center, zoom);
            }
        }
    }
}
