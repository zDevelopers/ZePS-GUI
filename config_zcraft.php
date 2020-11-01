<?php
return [
	'roleplay' => [
        'partners' => [
            [
                'name' => 'Société Zcraftienne des Transports (SZT)',
                'name_displayed' => false,
                'logo' => '/img/zcraft/szt.png',
                'logo_css_classes' => 'is-tall is-lighter',
                'description' => 'La Société Zcraftienne des Transports est un acteur majeur du réseau Zcraftien. Nous sommes fiers d\'agir à ses côtés pour vous aider à toujours avoir un train d\'avance.',
                'link' => 'https://forum.zcraft.fr/d/6742-sztm-projets'
            ],
            [
                'name' => 'Trainline',
                'name_displayed' => false,
                'logo' => '/img/zcraft/trainline.svg',
                'description' => 'En tant qu\'outil développé essentiellement dans le train, le ZéPS salue le soutien précieux de Trainline, son fournisseur officiel de billets et d\'espaces de travail à grande vitesse.',
                'link' => 'https://trainline.fr',
                'tooltip' => '(Bon ok, en vrai on a pas de partenariat officiel. Mais le reste reste vrai !)'
            ]
        ]
    ],

    'git' => [
        'exec' => '/usr/local/bin/git'
    ]
];
