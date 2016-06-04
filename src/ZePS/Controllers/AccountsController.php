<?php

namespace ZePS\Controllers;

use Silex\Application;

class AccountsController
{
    public function check_account(Application $app, $name)
    {
        $success = true;
        $error = 'OK';
        $uuid = null;

        if (strlen($name) > 16)
        {
            $success = false;
            $error = 'Pseudonyme invalide (trop long).';
        }
        else
        {
            $uuid = $app['zeps.uuid']->retrieveUUID($name);

            if ($uuid === false)
            {
                $success = false;
                $error = 'Pseudonyme inexistant.';
            }
        }

        return $app->json(array(
            'success' => $success,
            'error' => $error,
            'username' => $name,
            'uuid' => $uuid
        ));
    }
}
