<?php
declare(strict_types=1);
namespace App\Controllers;

use App\{Auth, Db, Http};

final class ReportController
{
    private static function date(mixed $v): ?\DateTimeImmutable
    {
        $d = is_string($v) ? \DateTimeImmutable::createFromFormat('!Y-m-d', $v) : false;
        return $d ?: null;
    }

    /** Ventas y ganancia en un rango (por defecto, últimos 30 días). Solo el dueño. */
    public static function summary(array $p = []): void
    {
        $u = Auth::owner();
        $to = self::date($_GET['to'] ?? null) ?? new \DateTimeImmutable('today');
        $from = self::date($_GET['from'] ?? null) ?? $to->modify('-29 days');
        if ($from > $to) Http::fail(422, 'El rango de fechas es inválido');

        $where = 's.tenant_id = ? AND s.created_at >= ? AND s.created_at < ?';
        $args = [$u['tid'], $from->format('Y-m-d'), $to->modify('+1 day')->format('Y-m-d')];

        $daily = Db::floats(Db::all(
            "SELECT DATE(s.created_at) AS d, SUM(si.qty * si.unit_price) AS revenue,
                    SUM(si.qty * (si.unit_price - si.unit_cost)) AS profit
             FROM sales s JOIN sale_items si ON si.sale_id = s.id WHERE $where GROUP BY d ORDER BY d", $args
        ), ['revenue', 'profit']);

        $top = Db::floats(Db::all(
            "SELECT si.name, SUM(si.qty) AS units, SUM(si.qty * (si.unit_price - si.unit_cost)) AS profit
             FROM sales s JOIN sale_items si ON si.sale_id = s.id WHERE $where
             GROUP BY si.product_id, si.name ORDER BY units DESC LIMIT 5", $args
        ), ['units', 'profit']);

        $byPayment = Db::floats(Db::all(
            "SELECT s.payment_method AS method, SUM(s.total) AS total, COUNT(*) AS tickets
             FROM sales s WHERE $where GROUP BY s.payment_method", $args
        ), ['total']);

        $tickets = (int)Db::one("SELECT COUNT(*) AS c FROM sales s WHERE $where", $args)['c'];
        $revenue = array_sum(array_column($daily, 'revenue'));
        $profit = array_sum(array_column($daily, 'profit'));

        $low = Db::all(
            'SELECT id, name, stock, min_stock FROM products
             WHERE tenant_id = ? AND active = 1 AND stock <= min_stock ORDER BY stock LIMIT 20',
            [$u['tid']]
        );

        Http::json([
            'range' => ['from' => $from->format('Y-m-d'), 'to' => $to->format('Y-m-d')],
            'kpis' => [
                'revenue' => round($revenue, 2),
                'profit' => round($profit, 2),
                'tickets' => $tickets,
                'avg_ticket' => $tickets ? round($revenue / $tickets, 2) : 0,
            ],
            'daily' => $daily,
            'top' => $top,
            'by_payment' => $byPayment,
            'low_stock' => $low,
        ]);
    }
}
