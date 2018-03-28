# Z*é*PS

L'interface d'un outil de calcul d'itinéraire dans le Nether Zcraftien, et peut-être plus à l'avenir...


[![SensioLabsInsight](https://insight.sensiolabs.com/projects/2819b28e-eaa4-4b5f-8b36-71b1d3dd3f1f/big.png)](https://insight.sensiolabs.com/projects/2819b28e-eaa4-4b5f-8b36-71b1d3dd3f1f)


## Installation & update

### Install

PHP 5.5+ is required to run this application.

```bash
# Clones the repository
git clone https://github.com/zDevelopers/ZePS-GUI.git
cd ZePS-GUI

# Installs Composer
# Check the installation instructions here: https://getcomposer.org/download/ (link below).

# Updates the dependencies
php composer.phar install

# And the front dependencies
npm install --save-dev
```
*[Composer installation documentation is available here](https://getcomposer.org/download/).*

### Update

```bash
# Updates the code (if needed)
git pull

# Updates the dependencies (if needed)
php composer.phar install
npm install --save-dev

# Clears the cache (always, especially in production)
# If you don't want to remove all the cache for the routing API (because it auto-clears when needed),
# you should delete the cache/twig/ directory only (but, delete it!): rm -rf cache/twig/*
rm -rf cache/*
```

## Run

The front assets are built using webpack.

### Local test server

To launch the webpack development server plus the PHP server, run:
```bash
npm run dev
```
The app should be accessible at [127.0.0.1:8888](http://127.0.0.1:8888).

To debug from other devices, such as phones, use
```bash
npm run dev-remote
```
so the webpack dev server will listen from any IP, not only localhost, and the PHP server configured to lookup for webpack at the correct IP. As long as _both_ 8080 and 8888 ports are open, you'll be able to access the app using [http://networkIP:8888](http://networkIP:8888).

In both cases, these commands enable webpack's hot-reload.


### Production server

To generate production assets, run:

```bash
npm run prod
```

and you'll find them in the `web/dist` directory a few seconds later.

The server serving the application must serve the `/web/` directory only.  
By default, the service will be available through `https://root/index.php`, `https://root/index.php/plan`, etc. To remove the filename part, use a rewrite rule, like this one for Apache:

```apache
<IfModule mod_rewrite.c>
        Options -MultiViews

        RewriteEngine On
        RewriteBase /
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule ^ index.php [L]
</IfModule>
```
(with all usual security features too, like no indexing, etc.). [Use that if you prefer nginx.](https://silex.symfony.com/doc/2.0/web_servers.html#nginx)

To enhance application performances, you can use the optimized autoloader (I even recommend it)—but if you do so, you'll have to re-update it for every release.
```bash
php composer.phar dump-autoload -a
```
