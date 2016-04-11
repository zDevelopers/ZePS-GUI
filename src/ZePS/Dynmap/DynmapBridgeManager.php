<?php

namespace ZePS\Dynmap;

use Silex\Application;
use ZePS\Misc\NetworkManager;
use ZePS\Routing\RoutesManager;


class DynmapBridgeManager extends NetworkManager
{
    const DYNMAP_STANDALONE_INFO_PATH = '/standalone/dynmap_{worldname}.json?_={timestamp}';

    const DYNMAP_PLAYER_TYPE = 'player';

    const ERROR_CANNOT_LOAD_STATIONS       = 1;
    const ERROR_CANNOT_LOAD_DYNMAP_PLAYERS = 2;
    const ERROR_NOT_LOGGED_IN              = 4;
    const ERROR_WRONG_WORLD                = 8;

    /**
     * DynmapBridgeManager constructor.
     *
     * @param Application $app The Silex application
     */
    public function __construct($app)
    {
        parent::__construct($app);

        $this->cached = false;
    }


    /**
     * Returns the online players locations.
     *
     * @return array An array containing the players logged in, each entry being an array with keys "name",
     * "display_name", "world", "x", "y" and "z".
     */
    public function get_logged_in_players()
    {
        $dynmap_infos_path = self::DYNMAP_STANDALONE_INFO_PATH;
        $dynmap_infos_path = str_replace('{worldname}', $this->app['config']['world_name_nether'], $dynmap_infos_path);
        $dynmap_infos_path = str_replace('{timestamp}', time(), $dynmap_infos_path);

        $dynmap_infos = $this->get_json($this->app['config']['dynmap']['root'] . $dynmap_infos_path);

        if ($dynmap_infos === false || !isset($dynmap_infos->players))
            return self::ERROR_CANNOT_LOAD_DYNMAP_PLAYERS;

        $players = array();

        foreach ($dynmap_infos->players as $player)
        {
            if (isset($player->type) && $player->type != self::DYNMAP_PLAYER_TYPE)
                continue;

            $players[] = array
            (
                'name'         => isset($player->account) ? $player->account : null,
                'display_name' => isset($player->name) ? $player->name : null,

                'world' => isset($player->world) ? $player->world : null,
                'x'     => isset($player->x) ? $player->x : null,
                'y'     => isset($player->y) ? $player->y : null,
                'z'     => isset($player->z) ? $player->z : null
            );
        }

        return $players;
    }

    /**
     * Returns the station nearest the given player name.
     *
     * @param string $player_name The player name to localize.
     *
     * @return array An array following the format below, or an integer representing the error, if any (see <code>ERROR_*</code>
     * constants).
     * @internal param Application $app The Silex application (needed to retrieve config).
     */
    public function get_nearest_station($player_name)
    {
        $players = self::get_logged_in_players();
        if (!is_array($players))
            return $players; // error code

        $stations = $this->app['zeps.routing']->get_netherrail_stations();
        if (count($stations) == 0)
            return self::ERROR_CANNOT_LOAD_STATIONS;

        $player = null;
        foreach ($players as $current_player)
        {
            if ($current_player['name'] == $player_name)
            {
                $player = $current_player;
                break;
            }
        }

        if ($player == null)
            return self::ERROR_NOT_LOGGED_IN;
        else if (!in_array($player['world'], $this->app['config']['overworld_and_nether_worlds']))
            return self::ERROR_WRONG_WORLD;


        // Coordinates correction if the player is in the overworld

        $player_x = $player['x'];
        $player_z = $player['z'];

        $from_overworld = ($player['world'] != $this->app['config']['world_name_nether']);

        return $this->app['zeps.routing']->get_closest_station($player_x, $player_z, $from_overworld);
    }
}
