import { money } from './api';
import { PAYMENT_LABELS, type Ticket } from './types';

export function TicketView({ ticket }: { ticket: Ticket }) {
  const when = new Date(ticket.created_at.replace(' ', 'T')).toLocaleString('es-AR');
  return (
    <div className="ticket">
      <h2>{ticket.kiosk}</h2>
      <p>Ticket Nº {String(ticket.ticket_number).padStart(6, '0')}</p>
      <p>{when}</p>
      <p>Atendió: {ticket.cashier}</p>
      <hr />
      {ticket.items.map((it, i) => (
        <div className="t-line" key={i}>
          <span>{it.qty} × {it.name}</span>
          <span>{money(it.qty * it.unit_price)}</span>
        </div>
      ))}
      <hr />
      <div className="t-line t-total"><span>TOTAL</span><span>{money(ticket.total)}</span></div>
      <p>Pago: {PAYMENT_LABELS[ticket.payment_method]}</p>
      <hr />
      <p className="t-note">Documento no válido como factura.</p>
    </div>
  );
}

export function TicketModal({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Ticket">
      <div className="modal-card">
        <div className="print-area"><TicketView ticket={ticket} /></div>
        <div className="row no-print">
          <button onClick={() => window.print()}>Imprimir ticket</button>
          <button className="ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
