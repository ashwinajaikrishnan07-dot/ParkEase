import { useEffect, useState } from 'react';
import { Download, Printer, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { getReceipt } from '../services/reservationService.js';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmt = (d) => (d ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

function receiptHtml(receipt) {
  const rows = receipt.lineItems
    .map((item) => `<tr><td>${item.label}</td><td style="text-align:right">${money(item.amount)}</td></tr>`)
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>ParkEase Receipt ${receipt.receiptNumber}</title>
  <style>
    body{font-family:'Poppins',Arial,sans-serif;color:#15181f;max-width:520px;margin:32px auto;padding:0 20px}
    .brand{font-size:22px;font-weight:700}.brand span{color:#8a6a00}
    .tag{display:inline-block;margin-top:4px;padding:2px 10px;border-radius:999px;background:#e9f9ee;color:#1a7f3c;font-size:12px;font-weight:600}
    .tag.reserved{background:#fff3e0;color:#b26a00}
    h1{font-size:16px;margin:24px 0 4px}
    table{width:100%;border-collapse:collapse;margin-top:12px;font-size:14px}
    td{padding:8px 0;border-bottom:1px solid #eceef2}
    .meta{margin-top:16px;font-size:13px;color:#5b6472;line-height:1.9}
    .total{display:flex;justify-content:space-between;font-weight:700;font-size:18px;margin-top:16px;padding-top:12px;border-top:2px solid #15181f}
    .foot{margin-top:28px;font-size:12px;color:#8b94a3;text-align:center}
  </style></head><body>
  <div class="brand">Park<span>Ease</span></div>
  <span class="tag ${receipt.status === 'PAID' ? '' : 'reserved'}">${receipt.status}</span>
  <h1>Receipt ${receipt.receiptNumber}</h1>
  <div class="meta">
    <div><strong>${receipt.area || ''}</strong>${receipt.location ? ` · ${receipt.location}` : ''}</div>
    <div>Slot ${receipt.slot || '—'} · Vehicle ${receipt.vehicle || '—'}</div>
    <div>From ${fmt(receipt.startTime)}</div>
    <div>To ${fmt(receipt.endTime)}</div>
    ${receipt.checkedOutAt ? `<div>Checked out ${fmt(receipt.checkedOutAt)}</div>` : ''}
    <div>Billed to ${receipt.customer?.name || ''} (${receipt.customer?.email || ''})</div>
    <div>Issued ${fmt(receipt.issuedAt)}</div>
  </div>
  <table><tbody>${rows}</tbody></table>
  <div class="total"><span>Total ${receipt.status === 'PAID' ? 'paid' : 'payable'}</span><span>${money(receipt.total)}</span></div>
  <p class="foot">Thank you for parking with ParkEase · This is a computer-generated receipt.</p>
  </body></html>`;
}

export default function ReceiptModal({ onClose, reservationId }) {
  const { token } = useAuth();
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getReceipt(token, reservationId)
      .then((data) => { if (active) setReceipt(data.receipt); })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [token, reservationId]);

  function download() {
    const blob = new Blob([receiptHtml(receipt)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ParkEase-Receipt-${receipt.receiptNumber}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function print() {
    const win = window.open('', '_blank', 'width=600,height=700');
    if (!win) return;
    win.document.write(receiptHtml(receipt));
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="receipt-modal">
        <button aria-label="Close" className="modal-close" onClick={onClose} type="button"><X size={18} /></button>
        {error ? (
          <p className="form-alert" role="alert">{error}</p>
        ) : !receipt ? (
          <p className="route-status" role="status"><span className="spinner" /> Loading receipt…</p>
        ) : (
          <>
            <div className="receipt-head">
              <span className="brand-mini">Park<span className="brand-wise">Ease</span></span>
              <span className={`receipt-status ${receipt.status === 'PAID' ? 'paid' : 'reserved'}`}>{receipt.status}</span>
            </div>
            <h2>Receipt {receipt.receiptNumber}</h2>
            <p className="receipt-sub">{receipt.area}{receipt.location ? ` · ${receipt.location}` : ''}</p>
            <dl className="receipt-meta">
              <div><dt>Slot</dt><dd>{receipt.slot || '—'}</dd></div>
              <div><dt>Vehicle</dt><dd>{receipt.vehicle || '—'}</dd></div>
              <div><dt>From</dt><dd>{fmt(receipt.startTime)}</dd></div>
              <div><dt>To</dt><dd>{fmt(receipt.endTime)}</dd></div>
              {receipt.checkedOutAt && <div><dt>Checked out</dt><dd>{fmt(receipt.checkedOutAt)}</dd></div>}
            </dl>
            <div className="receipt-lines">
              {receipt.lineItems.map((item) => (
                <div className="receipt-line" key={item.label}><span>{item.label}</span><span>{money(item.amount)}</span></div>
              ))}
            </div>
            <div className="receipt-total"><span>Total {receipt.status === 'PAID' ? 'paid' : 'payable'}</span><span>{money(receipt.total)}</span></div>
            <div className="receipt-actions">
              <button className="primary-button compact-button" onClick={download} type="button"><Download size={15} /> Download</button>
              <button className="secondary-button compact-button" onClick={print} type="button"><Printer size={15} /> Print</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
