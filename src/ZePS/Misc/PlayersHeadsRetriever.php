<?php

namespace ZePS\Misc;

use Doctrine\Common\Cache\FileCache;
use Silex\Application;


/**
 * A cache class to retrieve player heads images.
 *
 * All the fetching methods of this cache take an username or an UUID.
 * They return a PUBLIC PATH to the locally-stored image, downloaded on-the-fly if needed.
 *
 * @package ZePS\ZePS\Misc
 */
class PlayersHeadsRetriever extends FileCache
{
    const MOJANG_API_NAME_TO_UUID = 'https://api.mojang.com/users/profiles/minecraft/{username}';
    const AVATAR_API = 'https://crafatar.com/avatars/{uuid}?overlay&size=32';


    /**
     *  The Silex application.
     * @var Application
     */
    private $app;

    /**
     * The public path to access the images. E.g. "/assets/heads/".
     * @var string
     */
    private $public_path;

    /**
     * The lifetime of a stored head (seconds).
     * @var int
     */
    private $head_lifetime;


    /**
     * PlayersHeadsRetriever constructor.
     *
     * @param Application $app The Silex application
     */
    public function __construct(Application $app)
    {
        parent::__construct($app['config']['cache']['players_heads']['directory'], '.png');

        $this->app = $app;
        $this->public_path = str_replace($app['config']['web_root'], '', $app['config']['cache']['players_heads']['directory']);
        $this->head_lifetime = $app['config']['cache']['players_heads']['lifetime'];
    }


    /**
     * Fetches a player head.
     * The head is downloaded if needed.
     *
     * @param string $id The username or UUID.
     *
     * @return false|string The public path to the image file, or false if an error happens while retrieving the head.
     */
    public function fetch($id)
    {
        if (!$this->doContains($id))
        {
            $this->doSave($id, null, $this->head_lifetime);
        }

        return $this->doFetch($id);
    }

    /**
     * Checks if a head is stored.
     *
     * @param string $id The username or UUID.
     *
     * @return bool true if stored.
     */
    public function contains($id)
    {
        return $this->doContains($id);
    }

    /**
     * Manually saves a player head.
     * You should use the fetch method instead. It saves the heads on the fly if needed.
     *
     * @param string $id The username or UUID.
     * @param mixed  $data Unused.
     * @param int    $lifeTime The lifetime. If != 0, sets a specific lifetime for this
     *                         cache entry (0 => infinite lifeTime).
     *
     * @return bool True if successfully stored.
     */
    public function save($id, $data = null, $lifeTime = 0)
    {
        return $this->doSave($id, $data, $lifeTime);
    }


    /**
     * Fetches an entry from the cache.
     *
     * @param string $id The id of the cache entry to fetch.
     *
     * @return mixed|false The cached data or FALSE, if no cache entry exists for the given id.
     */
    protected function doFetch($id)
    {
        if ($this->doContains($id))
        {
            return $this->getPublicPath($id);
        }
        else return false;
    }

    /**
     * Tests if an entry exists in the cache.
     *
     * @param string $id The cache id of the entry to check for.
     *
     * @return bool TRUE if a cache entry exists for the given cache id, FALSE otherwise.
     */
    protected function doContains($id)
    {
        return
            is_file($this->getFilename($id))
            && $this->app['cache.uuid']->contains('head_file.' . $this->retrieveUUID($id));
    }

    /**
     * Puts data into the cache.
     *
     * @param string $id         The cache id.
     * @param string $data       The cache entry/data.
     * @param int    $lifeTime   The lifetime. If != 0, sets a specific lifetime for this
     *                           cache entry (0 => infinite lifeTime).
     *
     * @return bool TRUE if the entry was successfully stored in the cache, FALSE otherwise.
     */
    protected function doSave($id, $data, $lifeTime = 0)
    {
        $uuid = $this->retrieveUUID($id);

        $ch = \curl_init();
        \curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        \curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        \curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        \curl_setopt($ch, CURLOPT_URL, str_replace('{uuid}', $uuid, self::AVATAR_API));
        $result = \curl_exec($ch);
        \curl_close($ch);

        if ($result === false)
            return false;

        $this->app['cache.uuid']->save('head_file.' . $uuid, true, $lifeTime);

        return $this->writeFile($this->getFilename($id), $result);
    }


    protected function getFilename($id)
    {
        $uuid = $this->retrieveUUID($id);

        return $this->directory
            . DIRECTORY_SEPARATOR
            . substr($uuid, 0, 2)
            . DIRECTORY_SEPARATOR
            . $uuid
            . $this->getExtension();
    }

    protected function getPublicPath($id)
    {
        return str_replace($this->app['config']['web_root'], '', $this->getFilename($id));
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
    private function retrieveUUID($player)
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
    private function standardizeUUID($uuid)
    {
        return str_replace('-', '', strtolower($uuid));
    }
}
