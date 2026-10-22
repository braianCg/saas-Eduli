<?php
declare(strict_types=1);
namespace App\Controllers;

use App\{Auth, Db, Http};

final class ProductController
{
    private static function barcode(mixed $v): ?string
    {
        $s = trim((string)$v);
        return $s === '' ? null : $s;
    }

    public static function index(array $p = []): void
    {
        $u = Auth::user();
        $q = trim((string)($_GET['q'] ?? ''));
        // El cajero no ve el costo.
        $cost = $u['role'] === 'owner' ? 'cost' : '0 AS cost';
        $sql = "SELECT id, barcode, name, price, $cost, stock, min_stock FROM products WHERE tenant_id = ? AND active = 1";
        $args = [$u['tid']];
        if ($q !== '') {
            $sql .= ' AND (name LIKE ? OR barcode = ?)';
            $args[] = '%' . $q . '%';
            $args[] = $q;
        }
        Http::json(Db::floats(Db::all($sql . ' ORDER BY name LIMIT 200', $args), ['price', 'cost']));
    }

    public static function store(array $p = []): void
    {
        $u = Auth::owner();
        $b = Http::body();
        $name = trim((string)($b['name'] ?? ''));
        if ($name === '') Http::fail(422, 'El producto necesita un nombre');
        try {
            $id = Db::exec(
                'INSERT INTO products(tenant_id,barcode,name,price,cost,stock,min_stock) VALUES(?,?,?,?,?,?,?)',
                [$u['tid'], self::barcode($b['barcode'] ?? ''), $name,
                 max(0, round((float)($b['price'] ?? 0), 2)), max(0, round((float)($b['cost'] ?? 0), 2)),
                 max(0, (int)($b['stock'] ?? 0)), max(0, (int)($b['min_stock'] ?? 0))]
            );
        } catch (\PDOException $e) {
            if ($e->getCode() === '23000') Http::fail(409, 'Ya existe un producto con ese código de barras');
            throw $e;
        }
        Http::json(['id' => $id], 201);
    }

    public static function update(array $p): void
    {
        $u = Auth::owner();
        $id = (int)$p['id'];
        $b = Http::body();
        $fields = ['name' => 'string', 'barcode' => 'barcode', 'price' => 'num', 'cost' => 'num',
                   'stock' => 'int', 'min_stock' => 'int', 'active' => 'bool'];
        $set = [];
        $args = [];
        foreach ($fields as $k => $type) {
            if (!array_key_exists($k, $b)) continue;
            $v = $b[$k];
            $args[] = match ($type) {
                'string'  => trim((string)$v),
                'barcode' => self::barcode($v),
                'num'     => max(0, round((float)$v, 2)),
                'int'     => max(0, (int)$v),
                'bool'    => $v ? 1 : 0,
            };
            $set[] = "$k = ?";
        }
        if (!$set) Http::fail(422, 'No hay nada para actualizar');
        array_push($args, $id, $u['tid']);
        try {
            Db::exec('UPDATE products SET ' . implode(', ', $set) . ' WHERE id = ? AND tenant_id = ?', $args);
        } catch (\PDOException $e) {
            if ($e->getCode() === '23000') Http::fail(409, 'Ya existe un producto con ese código de barras');
            throw $e;
        }
        Http::json(['ok' => true]);
    }
}
