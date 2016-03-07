$(document).ready(function()
{
    // Imported from https://github.com/webbukkit/DynmapCore/blob/master/src/main/resources/extracted/web/js/hdmap.js
    // By mikeprimm - Apache License.

    fromLocationToLatLng = function(location) {
        var wtp = this.options.worldtomap;
        var xx = wtp[0]*location.x + wtp[1]*location.y + wtp[2]*location.z;
        var yy = wtp[3]*location.x + wtp[4]*location.y + wtp[5]*location.z;
        return new L.LatLng(
            xx       / (1 << this.options.mapzoomout)
            , (128-yy) / (1 << this.options.mapzoomout)
            , true);
    };

    fromLatLngToLocation = function(latlon, y) {
        var ptw = this.options.maptoworld;
        var lat = latlon.lat * (1 << this.options.mapzoomout);
        var lon = 128 - latlon.lng * (1 << this.options.mapzoomout);
        var x = ptw[0]*lat + ptw[1]*lon + ptw[2]*y;
        var z = ptw[6]*lat + ptw[7]*lon + ptw[8]*y;
        return { x: x, y: y, z: z };
    };



    // ZéPS
    // By Amaury Carrade - CeCILL-B.

    var route_map = L.map('route_map', {

        // dynmap start
        crs: L.extend({}, L.CRS, {
            code: 'simple',
            projection: {
                project: function(latlng) {
                    // Direct translation of lat -> x, lng -> y.
                    return new L.Point(latlng.lat, latlng.lng);
                },
                unproject: function(point) {
                    // Direct translation of x -> lat, y -> lng.
                    return new L.LatLng(point.x, point.y);
                }
            },
            // a = 1; b = 2; c = 1; d = 0
            // x = a * x + b; y = c * y + d
            // End result is 1:1 values during transformation.
            transformation: new L.Transformation(1, 0, 1, 0),
            scale: function(zoom) {
                // Equivalent to 2 raised to the power of zoom, but faster.
                return (1 << zoom);
            }
        })
        // dynmap end

    });

    HDMapType.tileLayer(map_config.dynmap_root + 'tiles/{map_name}/{map_type}/{lat}/{lng}.png', {
        attribution: 'Map loaded from <a href="' + map_config.dynmap_root + '">dynmap</a>',
        continuousWorld: true,
        maxZoom: 18,

        map_name: map_config.nether_map,
        map_type: map_config.nether_map_type,

        lat: function (x) {
            var info = this.getTileInfo({x: x, y: 0}, zoom);

        },
        lng: function (z) {
            return '0_0';
        }
    }).addTo(route_map);
});
