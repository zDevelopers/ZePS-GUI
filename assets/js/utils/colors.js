'use strict';

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
export function shade_color(percentage, css_color, target_color)
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
