<?php

namespace ZePS\Controllers;

use Silex\Application;
use Symfony\Component\HttpFoundation\Response;
use ZePS\Managers\RoutesManager;


class NetworkMapController
{
    public function network_map(Application $app)
    {
        return new Response($app['twig']->render('network_map.html.twig', array(
            'section' => 'network_map'
        )));
    }

    public function network_json(Application $app)
    {
        $network = RoutesManager::get_netherrail_network();

        if (empty($network))
            $app->abort(503);

        return $app->json($network);
    }
}
