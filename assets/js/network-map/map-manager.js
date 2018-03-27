'use strict';

import { NetworkMap } from './network-map';

export function setup_network_map($map)
{
    let network_map = new NetworkMap($map);
    network_map.render();

    document.addEventListener('zeps-route-erased', () =>
    {
        if (network_map.has_highlighted_paths())
        {
            network_map.un_highlight_paths();
            network_map.shading_default = 0;
            network_map.re_render_highlighted_path();
        }
    });

    document.addEventListener('zeps-route-updated', e =>
    {
        network_map.un_highlight_paths();
        network_map.shading_default = 0.8;

        let path_id = network_map.highlight_path(e.detail);
        network_map.re_render_highlighted_path(() => network_map.center_on_highlighted_path(path_id, true));
    });

    document.addEventListener('zeps-station-selected-for-highlight', e =>
    {
        network_map.fly_to_station(e.detail, true);
    });
}
