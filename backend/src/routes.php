<?php
declare(strict_types=1);

use App\Controllers\{AuthController, ProductController, SaleController, ReportController, InvoiceController};

/** @var App\Router $router */
$router->add('POST', '/auth/register', [AuthController::class, 'register']);
$router->add('POST', '/auth/login',    [AuthController::class, 'login']);
$router->add('GET',  '/staff',         [AuthController::class, 'staff']);
$router->add('POST', '/staff',         [AuthController::class, 'createStaff']);

$router->add('GET',  '/products',      [ProductController::class, 'index']);
$router->add('POST', '/products',      [ProductController::class, 'store']);
$router->add('PUT',  '/products/{id}', [ProductController::class, 'update']);

$router->add('GET',  '/sales',         [SaleController::class, 'index']);
$router->add('POST', '/sales',         [SaleController::class, 'store']);
$router->add('GET',  '/sales/{id}',    [SaleController::class, 'show']);

$router->add('GET',  '/reports/summary', [ReportController::class, 'summary']);

$router->add('GET',  '/invoices',       [InvoiceController::class, 'index']);
$router->add('POST', '/invoices/parse', [InvoiceController::class, 'parse']);
$router->add('POST', '/invoices',       [InvoiceController::class, 'store']);
