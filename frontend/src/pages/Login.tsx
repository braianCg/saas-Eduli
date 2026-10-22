import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import type { User } from '../types';

export default function Login() {
  const { user, login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [f, setF] = useState({ kiosk_name: '', name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/caja" replace />;

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api<{ token: string; user: User }>(mode === 'login' ? '/auth/login' : '/auth/register', { body: f });
      login(r.token, r.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="awning" aria-hidden />
      <form className="login-card" onSubmit={submit}>
        <h1>{mode === 'login' ? 'Entrá a tu kiosko' : 'Abrí tu kiosko'}</h1>
        {mode === 'register' && (
          <>
            <label>Nombre del kiosko<input value={f.kiosk_name} onChange={set('kiosk_name')} required /></label>
            <label>Tu nombre<input value={f.name} onChange={set('name')} required /></label>
          </>
        )}
        <label>Email<input type="email" value={f.email} onChange={set('email')} required autoComplete="email" /></label>
        <label>Contraseña<input type="password" minLength={mode === 'register' ? 8 : undefined} value={f.password} onChange={set('password')} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button disabled={busy}>{mode === 'login' ? 'Entrar' : 'Crear cuenta'}</button>
        <button type="button" className="ghost" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
          {mode === 'login' ? 'Quiero crear un kiosko nuevo' : 'Ya tengo cuenta'}
        </button>
      </form>
    </div>
  );
}
