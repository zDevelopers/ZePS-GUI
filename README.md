# Z*é*PS

L'interface d'un outil de calcul d'itinéraire dans le Nether Zcraftien, et peut-être plus à l'avenir...


## Installation & update

### Installation

PHP 5.5+ is required to run this application.

```bash
# Clones the repository
git clone https://github.com/zDevelopers/ZePS-GUI.git
cd ZePS-GUI

# Installs Composer
php -r "readfile('https://getcomposer.org/installer');" > composer-setup.php
php -r "if (hash('SHA384', file_get_contents('composer-setup.php')) === '7228c001f88bee97506740ef0888240bd8a760b046ee16db8f4095c0d8d525f2367663f22a46b48d072c816e7fe19959') { echo 'Installer verified'; } else { echo 'Installer corrupt'; unlink('composer-setup.php'); } echo PHP_EOL;"
php composer-setup.php
php -r "unlink('composer-setup.php');"

# Updates the dependencies
php composer.phar install
```
*[Up-to-date Composer installation documentation is available here](https://getcomposer.org/download/).*

### Update

```bash
# Updates the code (if needed)
git pull

# Updates the dependencies (if needed)
php composer.phar update

# Clears the cache (always)
rm -rf cache/*
```

### Local test server

```bash
php -S 0.0.0.0:8080 -t ./web/
```
The app should be accessible at [127.0.0.1:8080](http://127.0.0.1:8080), or at the same port using your local IP address from other devices (e.g. phones).
