<?php

namespace ZePS\Controllers;

use Silex\Application;
use Symfony\Component\HttpFoundation\Response;


class NetworkMapController
{
    public function network_map(Application $app)
    {
        return new Response($app['twig']->render('network_map.html.twig', array(
            'section' => 'network_map'
        )));
    }
}
