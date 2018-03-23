'use strict';

import { NetworkMap } from './network-map';

export function setup_network_map($map)
{
    let network_map = new NetworkMap($map);
    network_map.render();
}
