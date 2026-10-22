import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import Login from './pages/Login';
import Pos from './pages/Pos';
import Products from './pages/Products';
import Ganancias from './pages/Ganancias';
import Facturas from './pages/Facturas';
import Personal from './pages/Personal';

function Shell() {
  const { user, logout } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const owner = user.role === 'owner';
  return (
    <div className="shell">
      <aside className="side no-print">
        <div className="brand">{user.kiosk}</div>
        <nav>
          <NavLink to="/caja">Caja</NavLink>
          <NavLink to="/productos">Inventario</NavLink>
          {owner && <NavLink to="/ganancias">Ganancias</NavLink>}
          {owner && <NavLink to="/facturas">Facturas</NavLink>}
          {owner && <NavLink to="/personal">Personal</NavLink>}
        </nav>
        <button className="ghost on-dark" onClick={logout}>Salir · {user.name}</button>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

function OwnerOnly() {
  const { user } = useAuth();
  return user?.role === 'owner' ? <Outlet /> : <Navigate to="/caja" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Shell />}>
        <Route path="/caja" element={<Pos />} />
        <Route path="/productos" element={<Products />} />
        <Route element={<OwnerOnly />}>
          <Route path="/ganancias" element={<Ganancias />} />
          <Route path="/facturas" element={<Facturas />} />
          <Route path="/personal" element={<Personal />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/caja" replace />} />
    </Routes>
  );
}
