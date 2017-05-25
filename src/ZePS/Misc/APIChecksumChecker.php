<?php

namespace ZePS\Misc;

use Silex\Application;
use ZePS\Routing\RoutesManager;


class APIChecksumChecker extends NetworkManager
{
    private $API_CHECK;

    public function __construct(Application $app)
    {
        parent::__construct($app);

        $this->API_CHECK = $app['config']['api_root'] . '/version';
        $this->cached = false;
    }

    public function get_checksum()
    {
        $checksum_data = $this->get_json($this->API_CHECK);

        if ($checksum_data === false || !isset($checksum_data->sha256) || empty($checksum_data->sha256))
            return false;

        return $checksum_data->sha256;
    }
}
