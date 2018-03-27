<?php

namespace ZePS\Controllers;

use Silex\Application;
use ZePS\Dynmap\DynmapBridgeManager;


class APIController
{
    public function logged_in_players(Application $app, $world_names)
    {
        $players = $app['zeps.dynmap']->get_logged_in_players();

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
        $station = $app['zeps.dynmap']->get_nearest_station($name);

        if (is_int($station))
            return $app->json(array('error_code' => $station, 'error_message' => $this->code2error($station)), 503);

        return $app->json(array(
            'nearest_station' => $station['nearest_station']->toJSON(),
            'distance' => $station['distance'],
            'from_overworld' => $station['from_overworld']
        ));
    }


    public function route_length(Application $app, $from_id, $to_id, $official, $accessible)
    {
        return $app->json(array(
            'from_station' => $app['zeps.routing']->get_station_by_id($from_id) -> toJSON(),
            'to_station'   => $app['zeps.routing']->get_station_by_id($to_id) -> toJSON(),
            'travel_time'  => $app['zeps.routing']->get_netherrail_route($from_id, $to_id, $official, $accessible)->getTravelTime()
        ));
    }


    private function remove_special_characters($string)
    {
        return iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $string);
    }

    public function autocomplete(Application $app)
    {
        $original_input = $app['request']->query->get('input');
        $input = strtolower($this->remove_special_characters(trim($original_input)));

        if (empty($input))
        {
            return $app->json(array('items' => array(), 'input' => ''));
        }

        $matchingStations = array();
        $weights = $app['config']['autocompletion']['weights'];

        foreach ($app['zeps.routing']->get_netherrail_stations()['stations'] as $station)
        {
            $station_name = $this->remove_special_characters(trim($station->getDisplayName()));
            $station_name_lower = strtolower($station_name);
            $strpos_input = strpos($station_name_lower, $input);

            if ($strpos_input > -1)
            {
                $weight = 0;

                if ($strpos_input === 0)
                {
                    $weight = $weights['beginning_station_name'];
                }
                else
                {
                    $words_in_station_name = preg_split('/[ ,\-_]/', $station_name);

                    foreach ($words_in_station_name as $word)
                    {
                        $strpos_input_in_word = strpos(strtolower($word), $input);
                        if ($strpos_input_in_word === 0)
                        {
                            $weight += $weights['beginning_word'];
                        }
                        else if ($strpos_input_in_word > -1)
                        {
                            $weight += $weights['in_word'];
                        }

                        // If the matched word starts with an uppercase character,
                        // it's probably more important.
                        $chr = mb_substr ($word, 0, 1, "UTF-8");
                        if (mb_strtolower($chr, "UTF-8") != $chr)
                        {
                            $weight += $weights['in_capitalized_word'];
                        }
                    }
                }

                $input_count_in_name = substr_count($station_name_lower, $input);
                if ($input_count_in_name >= 2)
                {
                    $weight += $weights['multiple_occurrences_per_occurrence'] * $input_count_in_name;
                }

                $matchingStations[] = array(
                    'display_name' => $station->getDisplayName(),
                    'weight' => $weight
                );
            }
        }

        if (!empty($matchingStations))
        {
            $sortMatches = array();

            foreach($matchingStations as $match)
            {
                foreach($match as $key => $value)
                {
                    if(!isset($sortMatches[$key]))
                    {
                        $sortMatches[$key] = array();
                    }

                    $sortMatches[$key][] = $value;
                }
            }

            array_multisort($sortMatches['weight'], SORT_DESC, $matchingStations);
        }

        return $app->json(array(
            'items' => array_slice($matchingStations, 0, $app['config']['autocompletion']['max_results']),
            'input' => $original_input
        ));
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
