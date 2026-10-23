<?php
declare(strict_types=1);

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

spl_autoload_register(function (string $class): void {
    $file = __DIR__ . '/../src/' . str_replace('\\', '/', preg_replace('/^App\\\\/', '', $class)) . '.php';
    if (is_file($file)) require $file;
});

use App\Env;
use App\Router;

Env::load(__DIR__ . '/../.env');

// Security headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-XSS-Protection: 1; mode=block');

// CORS configuration
header('Access-Control-Allow-Origin: ' . Env::get('CORS_ORIGIN', 'http://localhost:5173'));
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$router = new Router();
require __DIR__ . '/../src/routes.php';
$router->dispatch($_SERVER['REQUEST_METHOD'], (string)parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
