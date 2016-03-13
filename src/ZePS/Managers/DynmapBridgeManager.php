<?php

namespace ZePS\Managers;

use Silex\Application;


class DynmapBridgeManager extends NetworkManager
{
    const DYNMAP_STANDALONE_INFO_PATH = '/standalone/dynmap_{worldname}.json?_={timestamp}';

    const DYNMAP_PLAYER_TYPE = 'player';

    const ERROR_CANNOT_LOAD_STATIONS       = 1;
    const ERROR_CANNOT_LOAD_DYNMAP_PLAYERS = 2;
    const ERROR_NOT_LOGGED_IN              = 4;
    const ERROR_WRONG_WORLD                = 8;


    /**
     * Returns the online players locations.
     *
     * @param Application $app The Silex application (needed to retrieve config).
     *
     * @return array An array containing the players logged in, each entry being an array with keys "name",
     * "display_name", "world", "x", "y" and "z".
     */
    public static function get_logged_in_players(Application $app)
    {
        $dynmap_infos_path = self::DYNMAP_STANDALONE_INFO_PATH;
        $dynmap_infos_path = str_replace('{worldname}', $app['config']['world_name'], $dynmap_infos_path);
        $dynmap_infos_path = str_replace('{timestamp}', time(), $dynmap_infos_path);

        $dynmap_infos = self::get_json($app['config']['dynmap']['root'] . $dynmap_infos_path);

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
     * @param Application $app         The Silex application (needed to retrieve config).
     * @param string      $player_name The player name to localize.
     *
     * @return array An array following the format below, or an integer representing the error, if any (see <code>ERROR_*</code>
     * constants).
     * <pre>array
     *(
     *    'nearest_station' => the nearest station object,
     *    'distance' => the distance between this station and the player.
     *)</pre>
     */
    public static function get_nearest_station(Application $app, $player_name)
    {
        $players = self::get_logged_in_players($app);
        if (!is_array($players))
            return $players; // error code

        $stations = RoutesManager::get_netherrail_stations()['stations'];
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

        if      ($player == null)                                  return self::ERROR_NOT_LOGGED_IN;
        else if ($player['world'] != $app['config']['world_name']) return self::ERROR_WRONG_WORLD;


        $nearest_station           = null;
        $squared_smallest_distance = -1;

        foreach ($stations as $station)
        {
            $squared_distance = self::squared_distance($player['x'], $player['z'], $station->x, $station->y);

            if ($nearest_station == null || $squared_distance < $squared_smallest_distance)
            {
                $nearest_station           = $station;
                $squared_smallest_distance = $squared_distance;
            }
        }

        return array
        (
            'nearest_station' => $nearest_station,
            'distance' => sqrt($squared_smallest_distance)
        );
    }


    /**
     * Calculate the squared distance between two points.
     *
     * The squared distance is calculated because this is only used for comparison, and it avoid the use of the
     * square root function, improving performances.
     *
     * @param float $x1 X-coordinate of the first point.
     * @param float $z1 Z-coordinate of the first point.
     * @param float $x2 X-coordinate of the second point.
     * @param float $z2 Z-coordinate of the second point.
     *
     * @return float The squared distance between (x1, z1) and (x2, z2).
     */
    private function squared_distance($x1, $z1, $x2, $z2)
    {
        return pow(abs($x1 - $x2), 2) + pow(abs($z1 - $z2), 2);
    }
}
