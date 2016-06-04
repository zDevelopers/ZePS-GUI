<?php

namespace ZePS\Misc;

use Silex\Application;


class UUIDRetriever
{
    const MOJANG_API_NAME_TO_UUID = 'https://api.mojang.com/users/profiles/minecraft/{username}';

    /**
     *  The Silex application.
     * @var Application
     */
    private $app;


    /**
     * PlayersHeadsRetriever constructor.
     *
     * @param Application $app The Silex application
     */
    public function __construct(Application $app)
    {
        $this->app = $app;
    }


    /**
     * Retrieves an UUID from a player name or an UUID.
     *
     * If an UUID is given (string of 32 characters or more), a standardized UUID is returned (all-lowercase without
     * dashes). Else, this method tries to use the UUID cache, and make a request to the Mojang API if the UUID is not
     * stored locally.
     *
     * @param string $player The player name or uuid.
     *
     * @return string A non-dashed lowercased UUID, or FALSE if the player name does not exists or the API call fails.
     */
    public function retrieveUUID($player)
    {
        // It's an UUID
        if (strlen($player) >= 32)
        {
            return $this->standardizeUUID($player);
        }
        else
        {
            $player = strtolower($player);
            $uuid = $this->app['cache.uuid']->fetch($player);

            if ($uuid === false)
            {
                $ch = \curl_init();
                \curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                \curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                \curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                \curl_setopt($ch, CURLOPT_URL, str_replace('{username}', $player, self::MOJANG_API_NAME_TO_UUID));
                $result = \curl_exec($ch);
                \curl_close($ch);

                if ($result === false)
                    return false;

                $mojangAnswer = \json_decode($result);

                if (!isset($mojangAnswer->id))
                    return false;

                $uuid = $this->standardizeUUID($mojangAnswer->id);

                $this->app['cache.uuid']->save($player, $uuid, $this->app['config']['cache']['cache_uuid_lifetime']);
            }

            return $uuid;
        }
    }

    /**
     * Removes the dashes and puts the UUID all-lowercase.
     *
     * @param string $uuid The UUID.
     * @return string A non-dashed lowercased UUID.
     */
    public function standardizeUUID($uuid)
    {
        return str_replace('-', '', strtolower($uuid));
    }
}
