import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, money } from '../api';
import { useAuth } from '../auth';
import type { Product } from '../types';

const EMPTY = { barcode: '', name: '', price: '', cost: '', stock: '', min_stock: '' };

function NumCell({ value, onSave }: { value: number; onSave: (n: number) => void }) {
  return (
    <input
      className="cell" type="number" step="any" min="0" defaultValue={value} key={value}
      onBlur={(e) => {
        const n = Number(e.target.value);
        if (Number.isFinite(n) && n >= 0 && n !== value) onSave(n);
      }}
    />
  );
}

export default function Products() {
  const { user } = useAuth();
  const owner = user?.role === 'owner';
  const [rows, setRows] = useState<Product[]>([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api<Product[]>(`/products?q=${encodeURIComponent(q)}`).then(setRows).catch((e: Error) => setError(e.message));
  }, [q]);
  useEffect(load, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('/products', {
        body: {
          barcode: form.barcode, name: form.name, price: Number(form.price), cost: Number(form.cost),
          stock: Number(form.stock || 0), min_stock: Number(form.min_stock || 0),
        },
      });
      setForm(EMPTY);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function save(id: number, patch: Partial<Product>) {
    try {
      await api(`/products/${id}`, { method: 'PUT', body: patch });
    } catch (err) {
      setError((err as Error).message);
    }
    load();
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="page">
      <h1>Inventario</h1>
      {owner && (
        <form className="inline-form" onSubmit={add}>
          <input placeholder="Código de barras" value={form.barcode} onChange={set('barcode')} />
          <input placeholder="Nombre" value={form.name} onChange={set('name')} required />
          <input placeholder="Precio" type="number" step="any" min="0" value={form.price} onChange={set('price')} required />
          <input placeholder="Costo" type="number" step="any" min="0" value={form.cost} onChange={set('cost')} required />
          <input placeholder="Stock" type="number" min="0" value={form.stock} onChange={set('stock')} />
          <input placeholder="Stock mínimo" type="number" min="0" value={form.min_stock} onChange={set('min_stock')} />
          <button>Agregar producto</button>
        </form>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <input className="search" placeholder="Buscar producto" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Producto</th><th>Código</th><th className="num">Precio</th>
              {owner && <th className="num">Costo</th>}
              <th className="num">Stock</th>{owner && <th className="num">Mínimo</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className={p.stock <= p.min_stock ? 'low' : ''}>
                <td>{p.name}</td>
                <td className="muted">{p.barcode ?? '—'}</td>
                <td className="num">{owner ? <NumCell value={p.price} onSave={(n) => save(p.id, { price: n })} /> : money(p.price)}</td>
                {owner && <td className="num"><NumCell value={p.cost} onSave={(n) => save(p.id, { cost: n })} /></td>}
                <td className="num">{owner ? <NumCell value={p.stock} onSave={(n) => save(p.id, { stock: n })} /> : p.stock}</td>
                {owner && <td className="num"><NumCell value={p.min_stock} onSave={(n) => save(p.id, { min_stock: n })} /></td>}
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="muted">Todavía no hay productos.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
