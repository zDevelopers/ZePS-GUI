<?php

namespace ZePS\Misc;

use Silex\Application;
use ZePS\Routing\RoutesManager;


class APIChecksumChecker extends NetworkManager
{
    private $API_CHECK;
    private $version_data = null;

    public function __construct(Application $app)
    {
        parent::__construct($app);

        $this->API_CHECK = $app['config']['api_root'] . '/version';
        $this->cached = false;
    }

    private function load_data()
    {
        if ($this->version_data === null)
        {
            $this->version_data = $this->get_json($this->API_CHECK);
        }

        return $this->version_data !== false;
    }

    public function get_checksum()
    {
        if (!$this->load_data() || !isset($this->version_data->sha256) || empty($this->version_data->sha256))
            return false;

        return $this->version_data->sha256;
    }

    public function get_version()
    {
        if (!$this->load_data() || !isset($this->version_data->version) || empty($this->version_data->version))
            return '';

        return [
            'version' => str_replace(['NetherRail-', '-SNAPSHOT'], '', $this->version_data->version),
            'snapshot' => strpos(strtolower($this->version_data->version), 'snapshot') !== false
        ];
    }
}
