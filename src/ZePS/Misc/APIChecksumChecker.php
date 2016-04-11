<?php

namespace ZePS\Misc;

use Silex\Application;


class APIChecksumChecker extends NetworkManager
{
    const API_CHECK = 'http://florian.cassayre.me/api/minecraft/zeps/v1.1/checksum';


    public function __construct(Application $app)
    {
        parent::__construct($app);

        $this->cached = false;
    }

    public function get_checksum()
    {
        $checksum_data = $this->get_json(self::API_CHECK);

        if ($checksum_data === false || !isset($checksum_data->sha256) || empty($checksum_data->sha256))
            return false;

        return $checksum_data->sha256;
    }
}
