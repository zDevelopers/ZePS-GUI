<?php

namespace ZePS\Controllers;

use Silex\Application;
use ZePS\Managers\DynmapBridgeManager;


class APIController
{
    public function logged_in_players(Application $app, $world_names)
    {
        $players = DynmapBridgeManager::get_logged_in_players($app);

        if (is_int($players))
            return $app->json(array('error_code' => $players, 'error_message' => $this->code2error($players)), 503);


        if (empty($world_names))
        {
            return $app->json($players);
        }
        else
        {
            $filtered_players = array();
            $allowed_worlds = explode(',', $world_names);

            foreach ($players as $player)
            {
                if (in_array($player['world'], $allowed_worlds))
                {
                    $filtered_players[] = $player;
                }
            }

            return $app->json($filtered_players);
        }
    }


    public function nearest_station(Application $app, $name)
    {
        $station = DynmapBridgeManager::get_nearest_station($app, $name);

        if (is_int($station))
            return $app->json(array('error_code' => $station, 'error_message' => $this->code2error($station)), 503);

        return $app->json($station);
    }


    private function code2error($error_code)
    {
        switch ($error_code)
        {
            case DynmapBridgeManager::ERROR_CANNOT_LOAD_DYNMAP_PLAYERS:
                return 'Cannot load players from dynmap, is the dynmap up and the URL correctly configured?';

            case DynmapBridgeManager::ERROR_CANNOT_LOAD_STATIONS:
                return 'Cannot load stations from the routing API, is it up? Try again later.';

            case DynmapBridgeManager::ERROR_NOT_LOGGED_IN:
                return 'This player is not logged in.';

            case DynmapBridgeManager::ERROR_WRONG_WORLD:
                return 'This player is not in a good world.';

            default:
                return (string) $error_code;
        }
    }
}