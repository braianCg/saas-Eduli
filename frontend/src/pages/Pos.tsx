import { useEffect, useState } from 'react';
import { api, money } from '../api';
import { TicketModal } from '../Ticket';
import { PAYMENT_LABELS, type PaymentMethod, type Product, type RecentSale, type Ticket } from '../types';

interface Line { product: Product; qty: number }

export default function Pos() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<Line[]>([]);
  const [method, setMethod] = useState<PaymentMethod>('efectivo');
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [recent, setRecent] = useState<RecentSale[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      api<Product[]>(`/products?q=${encodeURIComponent(q)}`).then(setResults).catch((e: Error) => setError(e.message));
    }, 200);
    return () => clearTimeout(t);
  }, [q, tick]);

  useEffect(() => {
    api<RecentSale[]>('/sales').then(setRecent).catch(() => undefined);
  }, [tick]);

  function add(p: Product) {
    setCart((c) => {
      const i = c.findIndex((l) => l.product.id === p.id);
      if (i >= 0) {
        const next = [...c];
        next[i] = { ...next[i], qty: Math.min(next[i].qty + 1, p.stock) };
        return next;
      }
      return p.stock > 0 ? [...c, { product: p, qty: 1 }] : c;
    });
  }

  function setQty(id: number, qty: number) {
    setCart((c) => c.flatMap((l) => (l.product.id !== id ? [l] : qty <= 0 ? [] : [{ ...l, qty: Math.min(qty, l.product.stock) }])));
  }

  // Enter en el buscador: lo usa la pistola lectora de códigos de barras.
  async function onEnter() {
    const code = q.trim();
    if (!code) return;
    try {
      const r = await api<Product[]>(`/products?q=${encodeURIComponent(code)}`);
      const hit = r.find((p) => p.barcode === code) ?? (r.length === 1 ? r[0] : undefined);
      if (hit) { add(hit); setQ(''); } else setError('No encontré ese producto');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const total = cart.reduce((s, l) => s + l.product.price * l.qty, 0);

  async function charge() {
    setBusy(true);
    setError('');
    try {
      const t = await api<Ticket>('/sales', {
        body: { payment_method: method, items: cart.map((l) => ({ product_id: l.product.id, qty: l.qty })) },
      });
      setTicket(t);
      setCart([]);
      setTick((n) => n + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function reprint(id: number) {
    try { setTicket(await api<Ticket>(`/sales/${id}`)); } catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="pos">
      <section className="catalog">
        <input
          className="search" autoFocus placeholder="Buscá por nombre o escaneá el código"
          value={q} onChange={(e) => { setQ(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && onEnter()}
        />
        {error && <p className="error" role="alert">{error}</p>}
        <div className="grid">
          {results.map((p) => (
            <button key={p.id} className="item" disabled={p.stock <= 0} onClick={() => add(p)}>
              <span className="item-name">{p.name}</span>
              <span className="item-price">{money(p.price)}</span>
              <span className={p.stock <= p.min_stock ? 'item-stock low' : 'item-stock'}>
                {p.stock <= 0 ? 'Sin stock' : `Stock ${p.stock}`}
              </span>
            </button>
          ))}
          {results.length === 0 && <p className="muted">No hay productos con esa búsqueda.</p>}
        </div>
      </section>

      <section className="cart">
        <h2>Venta actual</h2>
        {cart.length === 0 && <p className="muted">Tocá un producto o escaneá un código para empezar.</p>}
        <ul className="lines">
          {cart.map((l) => (
            <li key={l.product.id}>
              <span className="l-name">{l.product.name}</span>
              <span className="qty">
                <button aria-label="Quitar uno" onClick={() => setQty(l.product.id, l.qty - 1)}>−</button>
                <b>{l.qty}</b>
                <button aria-label="Agregar uno" onClick={() => setQty(l.product.id, l.qty + 1)}>+</button>
              </span>
              <span className="l-sub">{money(l.product.price * l.qty)}</span>
            </li>
          ))}
        </ul>

        <div className="price-tag" aria-live="polite">{money(total)}</div>

        <div className="methods" role="radiogroup" aria-label="Medio de pago">
          {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((m) => (
            <button key={m} role="radio" aria-checked={method === m} className={method === m ? 'chip on' : 'chip'} onClick={() => setMethod(m)}>
              {PAYMENT_LABELS[m]}
            </button>
          ))}
        </div>
        <button className="charge" disabled={busy || cart.length === 0} onClick={charge}>
          {busy ? 'Cobrando…' : 'Cobrar y generar ticket'}
        </button>

        {recent.length > 0 && (
          <details className="recent">
            <summary>Últimos tickets</summary>
            <ul>
              {recent.map((r) => (
                <li key={r.id}>
                  <button className="link" onClick={() => reprint(r.id)}>
                    Nº {String(r.ticket_number).padStart(6, '0')} · {money(r.total)}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {ticket && <TicketModal ticket={ticket} onClose={() => setTicket(null)} />}
    </div>
  );
}
