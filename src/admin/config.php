<?php
// HTTP
define('HTTP_SERVER', 'http://localhost/admin/');
define('HTTP_CATALOG', 'http://localhost/');

// HTTPS
define('HTTPS_SERVER', 'http://localhost/admin/');
define('HTTPS_CATALOG', 'http://localhost/');

// DIR
define('DIR_APPLICATION', '/var/www/html/admin/');
define('DIR_SYSTEM', '/var/www/html/system/');
define('DIR_IMAGE', '/var/www/html/image/');
define('DIR_STORAGE', '/var/www/storage/');
define('DIR_CATALOG', '/var/www/html/catalog/');
define('DIR_LANGUAGE', DIR_APPLICATION . 'language/');
define('DIR_TEMPLATE', DIR_APPLICATION . 'view/template/');
define('DIR_CONFIG', DIR_SYSTEM . 'config/');
define('DIR_CACHE', DIR_STORAGE . 'cache/');
define('DIR_DOWNLOAD', DIR_STORAGE . 'download/');
define('DIR_LOGS', DIR_STORAGE . 'logs/');
define('DIR_MODIFICATION', DIR_STORAGE . 'modification/');
define('DIR_UPLOAD', DIR_STORAGE . 'upload/');

// DB
define('DB_DRIVER', 'mysqli');
define('DB_HOSTNAME', 'mysql');
define('DB_USERNAME', 'root');
define('DB_PASSWORD', 'root_password');
define('DB_DATABASE', 'opencart_db');
define('DB_PORT', '3306');
define('DB_PREFIX', 'oc_');

// Sessions
define('SESSION_ENGINE', 'redis');

// Redis
define('REDIS_HOSTNAME', 'redis'); // required by session/redis.php
define('REDIS_HOST', 'redis');
define('REDIS_PORT', 6379);
define('REDIS_DB', 0);
define('REDIS_PASSWORD', '');
define('REDIS_TIMEOUT', 1);

// Cache
define('CACHE_DRIVER', 'redis');

// OpenCart API
define('OPENCART_SERVER', 'https://www.opencart.com/');
