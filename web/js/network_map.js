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


function coords2latlng(coordinates)
{
    return [coordinates[0] / 1000, coordinates[1] / 1000];
}

function add_station(map, name, location, color, is_intersection)
{
    L.circleMarker(coords2latlng(location), {
        color: color,
        fillColor: is_intersection ? 'white' : color,

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

$(function ()
{
    var $network_map = $('#network_map');

    // Removes the loader
    $network_map.empty();

    var map = L.map('network_map').setView([0, 0], 10);

    map.attributionControl.addAttribution('Plan du Netherrail <a href="https://zcraft.fr">Zcraftien</a> | Données aggrégées par <a href="https://github.com/FlorianCassayre/ZePS-Core">Florian Cassayre</a>');

    // TODO load and display the network
});
