export type Role = 'owner' | 'cashier';
export interface User { name: string; role: Role; kiosk: string }

export interface Product {
  id: number; barcode: string | null; name: string;
  price: number; cost: number; stock: number; min_stock: number;
}

export type PaymentMethod = 'efectivo' | 'debito' | 'credito' | 'transferencia' | 'qr';

export interface Ticket {
  id: number; ticket_number: number; total: number; payment_method: PaymentMethod;
  created_at: string; cashier: string; kiosk: string;
  items: { name: string; qty: number; unit_price: number }[];
}

export interface RecentSale {
  id: number; ticket_number: number; total: number; payment_method: PaymentMethod; created_at: string;
}

export interface Summary {
  range: { from: string; to: string };
  kpis: { revenue: number; profit: number; tickets: number; avg_ticket: number };
  daily: { d: string; revenue: number; profit: number }[];
  top: { name: string; units: number; profit: number }[];
  by_payment: { method: PaymentMethod; total: number; tickets: number }[];
  low_stock: { id: number; name: string; stock: number; min_stock: number }[];
}

export interface InvoiceDraftItem { description: string; qty: number; unit_cost: number; product_id: number | null }
export interface InvoiceDraft {
  supplier: string | null; cuit: string | null; number: string | null;
  date: string | null; total: number | null; items: InvoiceDraftItem[];
}
export interface InvoiceRow {
  id: number; supplier: string | null; number: string | null; invoice_date: string | null; total: number | null;
}

export interface StaffMember { id: number; name: string; email: string; role: Role }

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito', transferencia: 'Transferencia', qr: 'QR',
};
