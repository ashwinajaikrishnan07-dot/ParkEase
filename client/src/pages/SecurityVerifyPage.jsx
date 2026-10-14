import { useState } from 'react';
import { ShieldCheck, CircleCheck, CircleX, ScanLine } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { verifyReservation } from '../services/reservationService.js';

export default function SecurityVerifyPage() {
  const { token } = useAuth();
  const [bookingId, setBookingId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  async function verify(event) {
    event.preventDefault();
    const id = bookingId.trim();
    if (!id) return;
    setIsChecking(true);
    setResult(null);
    setError('');
    try {
      const data = await verifyReservation(token, id);
      setResult(data);
    } catch (requestError) {
      setError(requestError.status === 404 ? 'No booking found for that ID.' : requestError.message);
    } finally {
      setIsChecking(false);
    }
  }

  const r = result?.reservation;

  return (
    <main className="management-layout" style={{ maxWidth: 640 }}>
      <header className="page-heading"><div><p className="eyebrow">Security</p><h1>Verify parking pass</h1><p>Enter or scan the booking ID from the driver's parking pass.</p></div></header>

      <form className="verify-form" onSubmit={verify}>
        <div className="search-field" style={{ flex: 1, background: '#fff', border: '1px solid var(--line-strong)' }}>
          <ScanLine size={18} />
          <input aria-label="Booking ID" onChange={(e) => setBookingId(e.target.value)} placeholder="Paste booking ID…" value={bookingId} />
        </div>
        <button className="primary-button" disabled={isChecking} type="submit">{isChecking ? 'Checking…' : 'Verify'}</button>
      </form>

      {error && <div className="form-alert" role="alert">{error}</div>}

      {result && (
        <div className={`verify-result ${result.valid ? 'verify-valid' : 'verify-invalid'}`} role="status">
          <div className="verify-icon">{result.valid ? <CircleCheck size={40} /> : <CircleX size={40} />}</div>
          <h2>{result.valid ? 'Valid pass' : 'Not valid'}</h2>
          <p className="verify-reason">{result.reason}</p>
          <dl className="summary-rows" style={{ width: '100%', marginTop: '1rem' }}>
            <div className="summary-row"><dt>Slot</dt><dd>{r.slot?.slotNumber || '—'}</dd></div>
            <div className="summary-row"><dt>Area</dt><dd>{r.area?.name || '—'}</dd></div>
            <div className="summary-row"><dt>Vehicle</dt><dd>{r.vehicle?.registrationNumber || '—'}</dd></div>
            <div className="summary-row"><dt>Status</dt><dd>{r.status}</dd></div>
            <div className="summary-row"><dt>Window</dt><dd>{new Date(r.startTime).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} – {new Date(r.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</dd></div>
          </dl>
        </div>
      )}

      {!result && !error && (
        <div className="empty-state"><ShieldCheck size={28} color="#f2b900" /><p>Scan a pass to confirm a driver's booking before entry.</p></div>
      )}
    </main>
  );
}
