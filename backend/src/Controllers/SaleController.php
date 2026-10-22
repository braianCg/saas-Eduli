<?php
declare(strict_types=1);
namespace App\Controllers;

use App\{Auth, Db, Http};

final class SaleController
{
    private const METHODS = ['efectivo', 'debito', 'credito', 'transferencia', 'qr'];

    /** Crea la venta. Los precios SIEMPRE salen de la base, nunca del cliente. */
    public static function store(array $p = []): void
    {
        $u = Auth::user();
        $b = Http::body();
        $method = (string)($b['payment_method'] ?? '');
        if (!in_array($method, self::METHODS, true)) Http::fail(422, 'Medio de pago inválido');
        if (!is_array($b['items'] ?? null) || !$b['items']) Http::fail(422, 'El carrito está vacío');

        $qty = [];
        foreach ($b['items'] as $i) {
            $pid = (int)($i['product_id'] ?? 0);
            $q = (int)($i['qty'] ?? 0);
            if ($pid <= 0 || $q <= 0) Http::fail(422, 'Ítem inválido');
            $qty[$pid] = ($qty[$pid] ?? 0) + $q;
        }
        ksort($qty); // orden fijo de bloqueo para evitar deadlocks

        $pdo = Db::pdo();
        $pdo->beginTransaction();
        try {
            $lines = [];
            $total = 0.0;
            foreach ($qty as $pid => $q) {
                $prod = Db::one(
                    'SELECT id, name, price, cost, stock FROM products WHERE id = ? AND tenant_id = ? AND active = 1 FOR UPDATE',
                    [$pid, $u['tid']]
                );
                if (!$prod) throw new \DomainException('Un producto del carrito ya no existe');
                if ((int)$prod['stock'] < $q) {
                    throw new \DomainException("Stock insuficiente de {$prod['name']} (quedan {$prod['stock']})");
                }
                $lines[] = [$prod, $q];
                $total += (float)$prod['price'] * $q;
            }

            // Número de ticket correlativo por kiosko, seguro ante ventas simultáneas.
            Db::exec('UPDATE tenants SET last_ticket = LAST_INSERT_ID(last_ticket + 1) WHERE id = ?', [$u['tid']]);
            $number = (int)$pdo->query('SELECT LAST_INSERT_ID()')->fetchColumn();

            $sid = Db::exec(
                'INSERT INTO sales(tenant_id,user_id,ticket_number,total,payment_method) VALUES(?,?,?,?,?)',
                [$u['tid'], $u['uid'], $number, round($total, 2), $method]
            );
            foreach ($lines as [$prod, $q]) {
                Db::exec(
                    'INSERT INTO sale_items(sale_id,product_id,name,qty,unit_price,unit_cost) VALUES(?,?,?,?,?,?)',
                    [$sid, $prod['id'], $prod['name'], $q, $prod['price'], $prod['cost']]
                );
                Db::exec('UPDATE products SET stock = stock - ? WHERE id = ?', [$q, $prod['id']]);
            }
            $pdo->commit();
        } catch (\DomainException $e) {
            $pdo->rollBack();
            Http::fail(409, $e->getMessage());
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
        Http::json(self::ticket($sid, (int)$u['tid']), 201);
    }

    public static function index(array $p = []): void
    {
        $u = Auth::user();
        Http::json(Db::floats(Db::all(
            'SELECT id, ticket_number, total, payment_method, created_at FROM sales WHERE tenant_id = ? ORDER BY id DESC LIMIT 15',
            [$u['tid']]
        ), ['total']));
    }

    public static function show(array $p): void
    {
        $u = Auth::user();
        Http::json(self::ticket((int)$p['id'], (int)$u['tid']));
    }

    /** Datos listos para imprimir el ticket. */
    private static function ticket(int $id, int $tid): array
    {
        $s = Db::one(
            'SELECT s.id, s.ticket_number, s.total, s.payment_method, s.created_at, u.name AS cashier, t.name AS kiosk
             FROM sales s JOIN users u ON u.id = s.user_id JOIN tenants t ON t.id = s.tenant_id
             WHERE s.id = ? AND s.tenant_id = ?',
            [$id, $tid]
        );
        if (!$s) Http::fail(404, 'Ticket no encontrado');
        $s['total'] = (float)$s['total'];
        $s['items'] = Db::floats(Db::all('SELECT name, qty, unit_price FROM sale_items WHERE sale_id = ?', [$id]), ['unit_price']);
        return $s;
    }
}
