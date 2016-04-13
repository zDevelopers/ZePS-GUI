<?php

namespace ZePS\Controllers;


use Silex\Application;
use Symfony\Component\HttpFoundation\Response;
use ZePS\Misc\PlayersHeadsRetriever;

class PlayerHeadsController
{
    public function get_head(Application $app, $name)
    {
        return $app->redirect((new PlayersHeadsRetriever($app))->fetch($name), Response::HTTP_MOVED_PERMANENTLY);
    }
}
