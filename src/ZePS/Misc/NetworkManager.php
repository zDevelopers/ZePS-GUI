<?php

namespace ZePS\Misc;

use Silex\Application;


abstract class NetworkManager
{
    /**
     * The Silex application (needed to access services).
     * @var Application
     */
    protected $app;

    /**
     * Set to false to disable cache on requests made through get_json.
     * @var bool
     */
    protected $cached = true;

    /**
     * The cache lifetime
     * @var int
     */
    protected $cache_lifetime = 86400;


    public function __construct(Application $app)
    {
        $this->app = $app;
    }

    /**
     * Retrieves a JSON content.
     *
     * @param string $url The URL to load.
     *
     * @return object The retrieved JSON object.
     */
    protected function get_json($url)
    {
        if (!$this->cached)
            return $this->load_from_url($url);

        $data = $this->app['cache']->fetch($url);

        // No data available?
        if ($data === false)
        {
            $data = $this->load_from_url($url);
            $this->app['cache']->save($url, $data, $this->cache_lifetime);
        }

        return $data;
    }

    private function load_from_url($url)
    {
        $ch = \curl_init();
        \curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        \curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        \curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        \curl_setopt($ch, CURLOPT_URL, $url);
        $result = \curl_exec($ch);
        \curl_close($ch);

        if ($result === false)
            return false;

        return \json_decode($result);
    }
}
