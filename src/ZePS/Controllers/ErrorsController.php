<?php

namespace ZePS\Controllers;

use Silex\Application;
use Symfony\Component\HttpFoundation\Response;


class ErrorsController
{
    public function handle_error(Application $app, \Exception $e, $code)
    {
        if ($app['debug'] && !$app['request']->query->has('prod'))
        {
            return;
        }

        switch ($code)
        {
            case 404:
                return new Response($app['twig']->render('errors/404.html.twig'));

            case 500:
                return new Response($app['twig']->render('errors/500.html.twig'));

            default:
                return new Response($app['twig']->render('errors/unknown.html.twig', array(
                    'error_code' => $code,
                    'error_title' => Response::$statusTexts[$code]
                )));
        }
    }
}
