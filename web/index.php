<?php

use Doctrine\Common\Cache\FilesystemCache;
use Silex\Application;
use Symfony\Component\HttpFoundation\Request;
use ZePS\Dynmap\DynmapBridgeManager;
use ZePS\Misc\APIChecksumChecker;
use ZePS\Quotes\QuotesManager;
use ZePS\Routing\RoutesManager;

require_once __DIR__ . '/../vendor/autoload.php';


$app = new Silex\Application();


// Application configuration

$app['version'] = '1.2';

$app['config'] = array
(
    'api_root' => 'https://api.zeps.zcraft.fr',// The root of the ZePS routing API (without trailing slash)

    'stations' => array(
        'spawn' => 'tentacles',                // The name of the station located at the spawn point.
        'main' => array('tentacles', 'nouvea', 'vaalon') // The name of the stations accessible through a portal
                                                         // via the spawn.
    ),

    'world_name_nether' => 'V5_nether',        // The name of the world where the netherrail is in
    'world_name_overworld' => 'V5',            // The name of the world above the netherrail world
    'overworld_and_nether_worlds' => array(    // A list of nether & overworld worlds. Any world except 'world_name'
        'V5', 'V5_nether'                      // is considered as overworld.
    ),

    'dynmap' => array
    (
        'root' => 'http://map.zcraft.fr',      // The root of the dynmap, aka the public URL used to access it.
        'standalone' => true,                  // Non-standalone dynmap installation currently not supported!
        'map_type' => 'flat'                   // The name of the map to use to link to the dynmap.
    ),

    'missing_stations' => array(
        'json_file' => __DIR__ . '/../missing_stations.json'
    ),

    'twig' => array(
        'cache' => __DIR__ . '/../cache/twig'          // The Twig's cache folder
    ),

    'web_root' => __DIR__,

    'cache' => array(
        'directory' => __DIR__ . '/../cache/data',     // The main cache folder for miscellaneous data.
        'checksum_cache_key' => 'router_api_checksum', // The key where the API checksum is stored. If the checksum change, the cache is invalidated.
        'last_update_cache_key' => 'router_api_last_update', // The key storing the last detected update of the routing data

        'cache_suffix_routing'  => 'routingcache',    // The suffix of the routing API cache
        'cache_suffix_uuid' => 'uuidcache',           // The suffix of the player<>UUID cache

        'cache_uuid_lifetime' => 604800,              // The UUID cache lifetime in seconds. 604800 = a week.

        'players_heads' => array(
            'directory' => __DIR__ . '/assets/heads/',// The storage location of the players heads. Must be in the web folder!
            'lifetime'  => 604800                     // The lifetime of a head locally cached. It is downloaded again past this delay.
        )
    ),

    'git' => array(
        'web_commit_url' => 'https://github.com/zDevelopers/ZePS-GUI/commit/%s' // The URL to a commit. %s is the hash.
    )
);

$app['root_directory'] = __DIR__ . '/../';

if (file_exists(__DIR__ . '/../config.php')) $app['config'] = array_merge($app['config'], include(__DIR__ . '/../config.php'));


// Silex initialization

if (in_array($_SERVER['REMOTE_ADDR'], array('127.0.0.1', '::1')))
{
    $app['debug'] = true;
}

$app['maintenance'] = false;
if (file_exists(__DIR__.'/../maintenance'))
{
    $app['maintenance'] = true;
}

$app->register(new Silex\Provider\UrlGeneratorServiceProvider());
$app->register(new Silex\Provider\SessionServiceProvider());
$app->register(new Silex\Provider\TwigServiceProvider(), array(
    'twig.path'    => __DIR__.'/../templates',
    'twig.options' => array(
        'strict_variables' => false,
        'cache' => $app['debug'] ? false : $app['config']['twig']['cache'],
        'auto_reload' => $app['debug']
    )
));

$app['twig']->getExtension('core')->setTimezone('Europe/Paris');

$app['twig']->addFilter(new Twig_SimpleFilter('number_format', function ($number, $decimals = 0, $decimal_point = ',', $thousands_separator = '&#8239;') {
    return number_format($number, $decimals, $decimal_point, $thousands_separator);
}, array('is_safe' => array('html'))));

$app['twig']->addFilter(new Twig_SimpleFilter('time_format', function ($seconds, $with_seconds = true) {
    return \ZePS\Misc\DateTimeManager::friendly_interval($seconds, $with_seconds);
}));


// Caching

$app['cache.routing'] = $app->share(function($app) { return new FilesystemCache($app['config']['cache']['directory'], '.' . $app['config']['cache']['cache_suffix_routing'] . '.data'); });
$app['cache.uuid']    = $app->share(function($app) { return new FilesystemCache($app['config']['cache']['directory'], '.' . $app['config']['cache']['cache_suffix_uuid'] . '.data'); });


// Internal services

$app['zeps.routing'] = $app->share(function($app) { return new RoutesManager($app); });
$app['zeps.dynmap']  = $app->share(function($app) { return new DynmapBridgeManager($app); });
$app['zeps.quotes']  = $app->share(function($app) { return new QuotesManager(); });


// Maintenance mode

$app->before(function (Request $request, Application $app)
{
    if ($app['maintenance'])
        $app->abort(503);
}, Application::EARLY_EVENT);


// Cache is revoked if the checksum changes or the purge parameter is given.

$app->before(function (Request $request, Application $app)
{
    $stored_checksum = $app['cache.routing']->fetch($app['config']['cache']['checksum_cache_key']);
    $remote_checksum = (new APIChecksumChecker($app))->get_checksum();

    if ($request->query->has('purge'))
    {
        $clear_cache = true;
        $real_update = false;
    }
    else
    {
        if ($stored_checksum === false || $stored_checksum != $remote_checksum)
        {
            $clear_cache = true;
            $real_update = true;
        }
        else
        {
            $clear_cache = false;
            $real_update = false;
        }
    }

    $last_update = $app['cache.routing']->fetch($app['config']['cache']['last_update_cache_key']);

    if ($clear_cache)
    {
        $app['cache.routing']->flushAll();
        $app['cache.routing']->save($app['config']['cache']['checksum_cache_key'], $remote_checksum, 0);

        if ($real_update || $last_update == null)
        {
            $app['cache.routing']->save($app['config']['cache']['last_update_cache_key'], new \DateTime());
        }
        else
        {
            $app['cache.routing']->save($app['config']['cache']['last_update_cache_key'], $last_update);
        }
    }
});


// Internal API first due to the genericity of the last URL (search_results).

$app
    ->get('/api/nearest_station/{name}', 'ZePS\\Controllers\\APIController::nearest_station')
    ->bind('zeps.api.nearest_station');

$app
    ->get('/api/logged_in_players/{world_names}', 'ZePS\\Controllers\\APIController::logged_in_players')
    ->value('world_names', '')
    ->bind('zeps.api.logged_in_players');

$app
    ->get('/api/route_length/{from_id}/{to_id}/{official}/{accessible}', 'ZePS\\Controllers\\APIController::route_length')
    ->value('official', false)
    ->value('accessible', false)
    ->bind('zeps.api.route_length');

$app
    ->get('/api/stations_network', 'ZePS\\Controllers\\NetworkMapController::network_json')
    ->bind('zeps.api.stations_network');

$app
    ->get('/api/stations_network_colors', 'ZePS\\Controllers\\NetworkMapController::network_colors_json')
    ->bind('zeps.api.stations_network_colors');


// Players heads

$app
    ->get('/heads/{name}', 'ZePS\\Controllers\\PlayerHeadsController::get_head')
    ->bind('zeps.player_head');


// Statistics

$app
    ->get('/statistiques', 'ZePS\\Controllers\\StatisticsController::statistics')
    ->bind('zeps.stats');


// Redirect pages

$app
    ->get('/from_location', 'ZePS\\Controllers\\RedirectsController::from_location')
    ->bind('zeps.redirects.from_location');


// Network map

$app
    ->get('/plan', 'ZePS\\Controllers\\NetworkMapController::network_map')
    ->bind('zeps.network_map');


// Missing stations

$app
    ->get('/oublis', 'ZePS\\Controllers\\MissingController::missings')
    ->bind('zeps.missing');

$app
    ->post('/oublis', 'ZePS\\Controllers\\MissingController::submit_missings')
    ->bind('zeps.missing.submit');


// Route search pages

$app
    ->get('/', 'ZePS\\Controllers\\RouteSearchController::homepage')
    ->bind('zeps.homepage');

$app
    ->get('/{from}/{to}/{options}', 'ZePS\\Controllers\\RouteSearchController::search_results')
    ->value('options', '')
    ->bind('zeps.search_results');


// Error handler

$app->error(function(\Exception $e, $code) use ($app)
{
    return (new ZePS\Controllers\ErrorsController())->handle_error($app, $e, $code);
});


$app->run();
