# Z*é*PS

L'interface d'un outil de calcul d'itinéraire dans le Nether Zcraftien, et peut-être plus à l'avenir...


[![SensioLabsInsight](https://insight.sensiolabs.com/projects/2819b28e-eaa4-4b5f-8b36-71b1d3dd3f1f/big.png)](https://insight.sensiolabs.com/projects/2819b28e-eaa4-4b5f-8b36-71b1d3dd3f1f)


## Installation & update

### Installation

PHP 5.5+ is required to run this application.

```bash
# Clones the repository
git clone https://github.com/zDevelopers/ZePS-GUI.git
cd ZePS-GUI

# Installs Composer
# Check the installation instructions here: https://getcomposer.org/download/ (link below).

# Updates the dependencies
php composer.phar install
```
*[Composer installation documentation is available here](https://getcomposer.org/download/).*

### Update

```bash
# Updates the code (if needed)
git pull

# Updates the dependencies (if needed)
php composer.phar install

# Clears the cache (always)
# If you don't want to remove all the cache for the routing API (because it auto-clears when needed),
# you should delete the cache/twig/ directory only (but, delete it!): rm -rf cache/twig/*
rm -rf cache/*
```

## Deployment

### Local test server

Just use the PHP's integrated server.
```bash
php -S 0.0.0.0:8080 -t ./web/
```
The app should be accessible at [127.0.0.1:8080](http://127.0.0.1:8080), or at the same port using your local IP address from other devices (e.g. phones).

### Production server

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
(with all usual security features too, like no indexing, etc.).

To enhance application performances, you can use the optimized autoloader—but if you do so, you'll have to re-update it for every release.
```bash
php composer.phar dump-autoload -a
```
