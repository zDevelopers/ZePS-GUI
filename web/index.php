<?php

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../src/autoload.php';


$app = new Silex\Application();

$app['debug'] = true;

$app->register(new Silex\Provider\UrlGeneratorServiceProvider());
$app->register(new Silex\Provider\TwigServiceProvider(), array(
    'twig.path' => __DIR__.'/../templates',
));

$app['twig']->getExtension('core')->setTimezone('Europe/Paris');

$app['twig']->addFilter(new Twig_SimpleFilter('number_format', function ($number, $decimals = 0, $decimal_point = ',', $thousands_separator = '&#8239;') {
    return number_format($number, $decimals, $decimal_point, $thousands_separator);
}, array('is_safe' => array('html'))));


$app
    ->get('/', 'ZePS\\Controllers\\RouteSearchController::homepage')
    ->bind('zeps.homepage');

$app
    ->get('/{from}/{to}/{options}', 'ZePS\\Controllers\\RouteSearchController::search_results')
    ->value('options', '')
    ->bind('zeps.search_results');

$app->run();
