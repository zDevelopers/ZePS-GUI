<?php

namespace ZePS\Controllers;

use Silex\Application;
use Symfony\Component\HttpFoundation\Response;
use ZePS\Routing\RoutesManager;


class NetworkMapController
{
    public function network_json(Application $app)
    {
        $network = $app['zeps.routing']->get_netherrail_network();

        if (empty($network))
            $app->abort(503);

        return $app->json($network);
    }

    public function network_colors_json(Application $app)
    {
        $colors = $app['zeps.routing']->get_netherrail_network_colors();

        if ($colors === null || empty($colors))
            $app->abort(503);

        return $app->json($colors);
    }
}
