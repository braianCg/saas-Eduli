import { useEffect, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { api, money } from '../api';
import { PAYMENT_LABELS, type Summary } from '../types';

const NAVY = '#14213d';
const GREEN = '#138a5c';
const PIE = ['#14213d', '#e0a800', '#138a5c', '#c8372d', '#6b7a99'];

const iso = (d: Date) => d.toLocaleDateString('sv-SE'); // YYYY-MM-DD en hora local

export default function Ganancias() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - (days - 1));
    api<Summary>(`/reports/summary?from=${iso(from)}&to=${iso(to)}`).then(setData).catch((e: Error) => setError(e.message));
  }, [days]);

  if (error) return <p className="error" role="alert">{error}</p>;
  if (!data) return <p className="muted">Cargando…</p>;

  const { kpis } = data;
  const margin = kpis.revenue > 0 ? (kpis.profit / kpis.revenue) * 100 : 0;
  const payments = data.by_payment.map((p) => ({ ...p, label: PAYMENT_LABELS[p.method] }));

  return (
    <div className="page">
      <div className="page-head">
        <h1>Ganancias</h1>
        <div className="seg" role="group" aria-label="Período">
          {[7, 30, 90].map((d) => (
            <button key={d} className={d === days ? 'chip on' : 'chip'} onClick={() => setDays(d)}>{d} días</button>
          ))}
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><span>Ventas</span><b>{money(kpis.revenue)}</b></div>
        <div className="kpi good"><span>Ganancia</span><b>{money(kpis.profit)}</b><small>{margin.toFixed(1)}% de margen</small></div>
        <div className="kpi"><span>Tickets</span><b>{kpis.tickets}</b></div>
        <div className="kpi"><span>Ticket promedio</span><b>{money(kpis.avg_ticket)}</b></div>
      </div>

      <section className="panel">
        <h2>Ventas y ganancia por día</h2>
        {data.daily.length === 0 ? <p className="muted">No hay ventas en este período.</p> : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d9dee7" />
              <XAxis dataKey="d" tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`} width={56} />
              <Tooltip formatter={(v) => money(Number(v))} />
              <Legend />
              <Line type="monotone" dataKey="revenue" name="Ventas" stroke={NAVY} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="profit" name="Ganancia" stroke={GREEN} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      <div className="two">
        <section className="panel">
          <h2>Lo que más se vende</h2>
          {data.top.length === 0 ? <p className="muted">Sin datos todavía.</p> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.top} layout="vertical" margin={{ left: 8 }}>
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={130} />
                <Tooltip />
                <Bar dataKey="units" name="Unidades" fill={NAVY} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="panel">
          <h2>Cómo te pagan</h2>
          {payments.length === 0 ? <p className="muted">Sin datos todavía.</p> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={payments} dataKey="total" nameKey="label" innerRadius={55} outerRadius={90}>
                  {payments.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => money(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>

      <section className="panel">
        <h2>Para reponer</h2>
        {data.low_stock.length === 0 ? <p className="muted">Todo el stock está por encima del mínimo.</p> : (
          <ul className="restock">
            {data.low_stock.map((p) => (
              <li key={p.id}><span>{p.name}</span><b>{p.stock} u. <small>(mínimo {p.min_stock})</small></b></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
