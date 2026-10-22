import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import type { StaffMember } from '../types';

export default function Personal() {
  const [rows, setRows] = useState<StaffMember[]>([]);
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api<StaffMember[]>('/staff').then(setRows).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('/staff', { body: f });
      setF({ name: '', email: '', password: '' });
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="page">
      <h1>Personal</h1>
      <p className="muted">Los cajeros pueden cobrar y ver el inventario, pero no ven costos, ganancias ni facturas.</p>
      <form className="inline-form" onSubmit={add}>
        <input placeholder="Nombre" value={f.name} onChange={set('name')} required />
        <input placeholder="Email" type="email" value={f.email} onChange={set('email')} required />
        <input placeholder="Contraseña (8+ caracteres)" type="password" minLength={8} value={f.password} onChange={set('password')} required />
        <button>Agregar cajero</button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}><td>{r.name}</td><td>{r.email}</td><td>{r.role === 'owner' ? 'Dueño' : 'Cajero'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
