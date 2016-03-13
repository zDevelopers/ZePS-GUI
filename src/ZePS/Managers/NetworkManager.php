<?php

namespace ZePS\Managers;


abstract class NetworkManager
{
    /**
     * Retrieves a JSON content.
     *
     * @param string $url The URL to load.
     * @param bool $debug True to print debug notices.
     * @return object The retrieved JSON object.
     */
    protected static function get_json($url, $debug = false)
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

        $json = \json_decode($result);

        if ($debug)
        {
            echo '<strong>Calling URL: </strong>' . $url . '<br /><pre>';
            var_dump($json);
            echo '</pre>';
        }

        return $json;
    }
}
