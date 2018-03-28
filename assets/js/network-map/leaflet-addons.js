'use strict';

import { extend, isArray } from 'leaflet/src/core/Util'
import { Attribution } from 'leaflet/src/control/Control.Attribution';
import { Simple } from 'leaflet/src/geo/crs/CRS.Simple';
import { toTransformation } from 'leaflet/src/geometry/Transformation';


/**
 * Generates a latlng coordinates object with the given coordinates.
 *
 * Alias of L.latLng for convenience and coherence reasons.
 *
 * @param y The Y coordinate.
 * @param x The X coordinate.
 * @returns A L.LatLng instance.
 */
export const yx = L.latLng;


/**
 * Generates a latlng coordinates object with the given coordinates.
 *
 * Wrapper inverting the parameters for convenience and readability reasons.
 *
 * @param x The X coordinate.
 * @param y The Y coordinate.
 * @returns A L.LatLng instance.
 */
export const xy = function (x, y)
{
    // When doing xy([x, y]);
    if (isArray(x))
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
export const ZePSCRS = extend({}, Simple, {
    transformation: toTransformation(1, 0, 1, 0)
});


/**
 * An attribution block with some HTML markup so we can style it and adapt it to mobiles, and accepting an array of
 * attributions in layers.
 */
export const ZePSAttribution = Attribution.extend({
    // @section
    // @aka ZePSAttribution options
    options: {
        prefixSeparator: ' | ',
        attributionsSeparator: ', '
    },

    _update: function ()
    {
        if (!this._map) return;

        let attributions = [];

        for (let i in this._attributions) {
            if (this._attributions[i]) {
                attributions.push(i);
            }
        }

        let htmlAttribution = '';

        if (this.options.prefix)
        {
            htmlAttribution += '<span class="leaflet-control-attribution-prefix">' + this.options.prefix + '</span>';
            if (attributions.length)
            {
                htmlAttribution += '<span class="leaflet-control-attribution-prefix-separator">' + this.options.prefixSeparator + '</span>';
            }
        }

        if (attributions.length)
        {
            htmlAttribution += '<span class="leaflet-control-attribution-attributions">';
            htmlAttribution += '<span class="leaflet-control-attribution-attribution">';
            htmlAttribution += attributions.join('</span><span class="leaflet-control-attribution-attribution-separator">' + this.options.attributionsSeparator + '</span><span class="leaflet-control-attribution-attribution">');
            htmlAttribution += '</span></span>';
        }

        this._container.innerHTML = htmlAttribution;
    },

    // @method addAttribution(attribution: String|Array): this
    // Adds an attribution text (e.g. `'Vector data &copy; Mapbox'`) or multiples at the same time.
    addAttribution: function (attribution)
    {
        if (!attribution) return this;

        if (isArray(attribution))
        {
            attribution.forEach(a => this.addSingleAttribution(a));
        }
        else
        {
            this.addSingleAttribution(attribution);
        }

        return this;
    },

    addSingleAttribution: function (text)
    {
        if (!text) return this;

        if (!this._attributions[text])
        {
            this._attributions[text] = 0;
        }

        this._attributions[text]++;

        this._update();

        return this;
    },
});
