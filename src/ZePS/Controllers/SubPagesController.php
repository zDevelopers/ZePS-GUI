<?php

namespace ZePS\Controllers;

use Silex\Application;
use Symfony\Component\HttpFoundation\Request;


class SubPagesController
{
    public function about(Application $app)
    {
        $composer_json = json_decode(file_get_contents($app['root_directory'] . '/composer.json'), true);

        return $app['twig']->render('sub-pages/about.html.twig', [
            'last_updates' => $app['zeps.stats']->get_update_infos(),
            'authors' => $this->normalize_people($composer_json['authors']),
            'versions' => [
                'core' => $this->normalize_version($app['zeps.check']->get_version()),
                'gui'  => $this->normalize_version($composer_json['version'])
            ],
            'thanks' => $this->normalize_people($composer_json['extra']['thanks'], true)
        ]);
    }

    public function statistics(Application $app)
    {
        return $app['twig']->render('sub-pages/statistics.html.twig', [
            'statistics' => $app['zeps.stats']->get_statistics()
        ]);
    }

    public function missings(Application $app)
    {
        $missings = [];

        if (file_exists($app['config']['missing_stations']['json_file']))
            $missings = json_decode(file_get_contents($app['config']['missing_stations']['json_file']));

        return $app['twig']->render('sub-pages/missings.html.twig', array(
            'missings' => $missings,
            'stations' => $app['zeps.routing']->get_netherrail_stations(),
        ));
    }

    public function submit_missings(Application $app, Request $request)
    {
        $missings = [];

        if (file_exists($app['config']['missing_stations']['json_file']))
            $missings = json_decode(file_get_contents($app['config']['missing_stations']['json_file']));

        $r = $request->request;

        $name       = $r->get('station_name');
        $pos_x      = $r->get('station_coords_x');
        $pos_z      = $r->get('station_coords_z');
        $neighbor_1 = !empty(trim($r->get('station_neighbor_1_raw'))) ? $r->get('station_neighbor_1_raw') : $r->get('station_neighbor_1');
        $neighbor_2 = !empty(trim($r->get('station_neighbor_2_raw'))) ? $r->get('station_neighbor_2_raw') : $r->get('station_neighbor_2');
        $link       = $r->get('station_link');
        $notes      = $r->get('station_notes');

        if ($name == null || $pos_x === null || $pos_z === null)
            $app->abort(400);

        $missing = [
            'name' => trim($name),
            'location' => ['x' => trim($pos_x), 'z' => trim($pos_z)],
            'neighbors' => [trim($neighbor_1), trim($neighbor_2)],
            'link' => trim($link),
            'notes' => trim($notes),
            'ip' => $request->getClientIp()
        ];

        $missings[] = $missing;

        file_put_contents(
            $app['config']['missing_stations']['json_file'],
            json_encode($missings, JSON_NUMERIC_CHECK | JSON_PRETTY_PRINT | JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE)
        );

        if ($request->isXmlHttpRequest())
        {
            return $app->json([
                'saved' => true,
                'html_row' => $app['twig']->render('sub-pages/missings_row.html.twig', ['missing' => $missing])
            ], 201);
        }
        else return $app->redirect($app['url_generator']->generate('zeps.missing', array(), 301));
    }

    public function legacy(Application $app, $sub_page)
    {
        return $app->redirect($app['url_generator']->generate('zeps.homepage', array(), 301) . '#' . $sub_page);
    }


    private function remove_special_characters($string)
    {
        return iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $string);
    }

    private function normalize_people($raw_people, $sort = false)
    {
        $normalized_people = [];

        foreach ($raw_people as $person)
        {
            if (!$person) continue;

            if (is_string($person))
            {
                $normalized_people[] = [
                    'name'     => $person,
                    'email'    => null,
                    'homepage' => null,
                    'role'     => null
                ];
            }
            else if (is_array($person))
            {
                if (!isset($person['name']) || empty($person['name'])) continue;

                $normalized_people[] = [
                    'name'     => $person['name'],
                    'email'    => isset($person['email'])    ? $person['email']    : null,
                    'homepage' => isset($person['homepage']) ? $person['homepage'] : null,
                    'role'     => isset($person['role'])     ? $person['role']     : null,
                ];
            }
        }

        if ($sort)
        {
            uasort($normalized_people, function ($a, $b)
            {
                return strnatcmp(
                    strtolower($this->remove_special_characters($a['name'])),
                    strtolower($this->remove_special_characters($b['name']))
                );
            });
        }

        return $normalized_people;
    }

    private function normalize_version($version)
    {
        $raw_version = is_array($version) ? $version['version'] : $version;
        $version_parts = explode('.', $raw_version);
        $version_parts_length = count($version_parts);

        $normalized_version_parts = [
            $version_parts_length > 0 ? $version_parts[0] : 0,
            $version_parts_length > 1 ? $version_parts[1] : 0,
            $version_parts_length > 2 ? $version_parts[2] : 0,
        ];

        if (is_array($version)) $version['version'] = implode('.', $normalized_version_parts);
        else                    $version            = implode('.', $normalized_version_parts);

        return $version;
    }
}
