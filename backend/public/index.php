<?php
declare(strict_types=1);

spl_autoload_register(function (string $class): void {
    $file = __DIR__ . '/../src/' . str_replace('\\', '/', preg_replace('/^App\\\\/', '', $class)) . '.php';
    if (is_file($file)) require $file;
});

use App\Env;
use App\Router;

Env::load(__DIR__ . '/../.env');

header('Access-Control-Allow-Origin: ' . Env::get('CORS_ORIGIN', 'http://localhost:5173'));
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$router = new Router();
require __DIR__ . '/../src/routes.php';
$router->dispatch($_SERVER['REQUEST_METHOD'], (string)parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
