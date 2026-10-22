import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ROUTE_SEO: Record<string, { title: string; description: string }> = {
  '/login': {
    title: 'Iniciar Sesión / Registro | Kiosko SaaS',
    description: 'Accedé a tu cuenta o abrí un nuevo kiosko para gestionar tu comercio minorista de forma rápida y sencilla.',
  },
  '/caja': {
    title: 'Punto de Venta (POS) y Caja | Kiosko SaaS',
    description: 'Cobrá rápidamente a tus clientes, buscá productos por nombre o código de barras y emití tickets de venta al instante.',
  },
  '/productos': {
    title: 'Gestión de Inventario y Productos | Kiosko SaaS',
    description: 'Administrá tu inventario, precios, costos y stock mínimo para mantener el control total de tus productos.',
  },
  '/ganancias': {
    title: 'Reportes Financieros y Ganancias | Kiosko SaaS',
    description: 'Visualizá métricas clave, KPIs de ingresos, ganancias netas y análisis de ventas por medio de pago.',
  },
  '/facturas': {
    title: 'Carga Inteligente de Facturas con IA | Kiosko SaaS',
    description: 'Escaneá y procesá comprobantes de proveedores automáticamente con IA para actualizar stock e inventario.',
  },
  '/personal': {
    title: 'Administración de Personal | Kiosko SaaS',
    description: 'Gestioná el acceso de tus empleados y cajeros asignados a tu comercio.',
  },
};

export function SEO() {
  const { pathname } = useLocation();

  useEffect(() => {
    const info = ROUTE_SEO[pathname] || {
      title: 'Kiosko SaaS - Sistema de Gestión Punto de Venta (POS)',
      description: 'Plataforma web de gestión integral para kioscos y comercios minoristas.',
    };

    document.title = info.title;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', info.description);

    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', info.title);

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', info.description);
  }, [pathname]);

  return null;
}
