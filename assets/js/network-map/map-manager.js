'use strict';

import { NetworkMap } from './network-map';

export function setup_network_map($map)
{
	let network_map = new NetworkMap($map);
	network_map.render();

	setTimeout(() => {
		network_map.highlight_path('falaisie,pic_assaut,ghast,morea,carbone,verticale,camouil,pinpinb,pkteddyb,pere_dodue,fleurs,nouvea,pepiniere_ouest,bastion_du_cactus_givre,mointagne,unknown_1,not_finished_2,birdy,chez_squall,grand_ouest,fallen_kingdom,ile_volcanique'.split(','));
		network_map.re_render_highlighted_path();
	}, 2000);
}
