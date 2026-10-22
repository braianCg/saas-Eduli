import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { api, money } from '../api';
import type { InvoiceDraft, InvoiceDraftItem, InvoiceRow, Product } from '../types';

export default function Facturas() {
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<InvoiceRow[]>([]);
  const [draft, setDraft] = useState<InvoiceDraft | null>(null);
  const [updateCosts, setUpdateCosts] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const reload = useCallback(() => {
    api<Product[]>('/products').then(setProducts).catch(() => undefined);
    api<InvoiceRow[]>('/invoices').then(setHistory).catch(() => undefined);
  }, []);
  useEffect(reload, [reload]);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    setOk('');
    try {
      const form = new FormData();
      form.append('file', file);
      const d = await api<InvoiceDraft>('/invoices/parse', { form });
      // Asigna solo coincidencias exactas de nombre; el resto lo elige la persona.
      d.items = d.items.map((it) => {
        const hit = products.find((p) => p.name.toLowerCase() === it.description.toLowerCase());
        return { ...it, product_id: hit ? hit.id : null };
      });
      setDraft(d);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const setItem = (i: number, patch: Partial<InvoiceDraftItem>) =>
    setDraft((d) => (d ? { ...d, items: d.items.map((it, k) => (k === i ? { ...it, ...patch } : it)) } : d));
  const setField = (patch: Partial<InvoiceDraft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  async function confirm() {
    if (!draft) return;
    setBusy(true);
    setError('');
    try {
      await api('/invoices', { body: { ...draft, update_costs: updateCosts } });
      const n = draft.items.filter((i) => i.product_id).length;
      setOk(`Factura guardada. Se actualizó el stock de ${n} producto${n === 1 ? '' : 's'}.`);
      setDraft(null);
      reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const calc = draft ? draft.items.reduce((s, i) => s + i.qty * i.unit_cost, 0) : 0;

  return (
    <div className="page">
      <h1>Facturas de proveedores</h1>
      <p className="muted">Subí una foto o un PDF. Revisás lo que leyó y, al confirmar, suma el stock y actualiza los costos.</p>

      <label className="drop">
        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={onFile} disabled={busy} />
        <span>{busy ? 'Leyendo la factura…' : 'Elegir foto o PDF de la factura'}</span>
      </label>

      {error && <p className="error" role="alert">{error}</p>}
      {ok && <p className="success" role="status">{ok}</p>}

      {draft && (
        <section className="panel">
          <h2>Revisá los datos</h2>
          <div className="inline-form">
            <label>Proveedor<input value={draft.supplier ?? ''} onChange={(e) => setField({ supplier: e.target.value })} /></label>
            <label>CUIT<input value={draft.cuit ?? ''} onChange={(e) => setField({ cuit: e.target.value })} /></label>
            <label>Número<input value={draft.number ?? ''} onChange={(e) => setField({ number: e.target.value })} /></label>
            <label>Fecha<input type="date" value={draft.date ?? ''} onChange={(e) => setField({ date: e.target.value || null })} /></label>
            <label>Total facturado<input type="number" step="any" value={draft.total ?? ''} onChange={(e) => setField({ total: e.target.value === '' ? null : Number(e.target.value) })} /></label>
          </div>

          <div className="table-wrap">
            <table>
              <thead><tr><th>Descripción</th><th className="num">Cantidad</th><th className="num">Costo unitario</th><th>Producto del inventario</th></tr></thead>
              <tbody>
                {draft.items.map((it, i) => (
                  <tr key={i}>
                    <td><input value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} /></td>
                    <td className="num"><input className="cell" type="number" min="1" value={it.qty} onChange={(e) => setItem(i, { qty: Math.max(1, Number(e.target.value)) })} /></td>
                    <td className="num"><input className="cell" type="number" step="any" min="0" value={it.unit_cost} onChange={(e) => setItem(i, { unit_cost: Math.max(0, Number(e.target.value)) })} /></td>
                    <td>
                      <select value={it.product_id ?? ''} onChange={(e) => setItem(i, { product_id: e.target.value ? Number(e.target.value) : null })}>
                        <option value="">Sin asignar (no suma stock)</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="muted">Suma de ítems (neto): {money(calc)}</p>
          <label className="check"><input type="checkbox" checked={updateCosts} onChange={(e) => setUpdateCosts(e.target.checked)} /> Actualizar el costo de los productos con esta factura</label>
          <div className="row">
            <button onClick={confirm} disabled={busy || draft.items.length === 0}>Guardar factura y sumar stock</button>
            <button className="ghost" onClick={() => setDraft(null)}>Descartar</button>
          </div>
        </section>
      )}

      <section className="panel">
        <h2>Facturas cargadas</h2>
        {history.length === 0 ? <p className="muted">Todavía no cargaste ninguna.</p> : (
          <ul className="restock">
            {history.map((h) => (
              <li key={h.id}>
                <span>{h.supplier ?? 'Sin proveedor'} · {h.number ?? 's/n'}</span>
                <b>{h.total != null ? money(h.total) : '—'} <small>{h.invoice_date ?? ''}</small></b>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
