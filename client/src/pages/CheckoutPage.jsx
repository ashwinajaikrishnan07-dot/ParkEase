import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Landmark, Smartphone } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { createReservation } from '../services/reservationService.js';

const DEFAULT_RATE_PER_HOUR = 20;
const payMethods = [
  { id: 'UPI', label: 'UPI', icon: Smartphone },
  { id: 'CARD', label: 'Debit / Credit Card', icon: CreditCard },
  { id: 'NETBANKING', label: 'Net Banking', icon: Landmark },
];

function bookingId() {
  return `PW${Date.now().toString(36).toUpperCase()}`;
}

export default function CheckoutPage() {
  const { token } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [method, setMethod] = useState('UPI');
  const [isSaving, setIsSaving] = useState(false);

  if (!state?.slotId) return <Navigate to="/parking" replace />;

  const rate = Number.isFinite(state.pricePerHour) ? state.pricePerHour : DEFAULT_RATE_PER_HOUR;
  const hours = Math.max(1, Math.ceil((new Date(state.endTime) - new Date(state.startTime)) / 3600000));
  const amount = hours * rate;

  async function pay() {
    setIsSaving(true);
    try {
      const data = await createReservation(token, {
        vehicle: state.vehicleId,
        area: state.areaId,
        slot: state.slotId,
        startTime: state.startTime,
        endTime: state.endTime,
      });
      toast.success('Booking confirmed!');
      navigate('/booking-success', {
        replace: true,
        state: {
          reservationId: data.reservation._id,
          reference: bookingId(),
          areaName: state.areaName,
          slotNumber: state.slotNumber,
          date: state.date,
          startLabel: state.startLabel,
          endLabel: state.endLabel,
          amount,
        },
      });
    } catch (error) {
      if (error.status === 409) {
        // Backend distinguishes slot-taken vs vehicle-already-booked — show the real reason.
        toast.error(error.message || 'That slot was just booked. Please choose another.');
        navigate(`/parking/${state.areaId}`, { replace: true });
      } else if (error.status === 400 && error.errors && Object.keys(error.errors).length) {
        // Surface the real reason (e.g. start time in the past) instead of a generic message.
        const detail = Object.values(error.errors)[0];
        toast.error(`${detail}. Please adjust your date and time.`);
        navigate(`/parking/${state.areaId}`, { replace: true });
      } else {
        toast.error(error.message);
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="checkout-layout">
      <Link className="back-link" to={`/parking/${state.areaId}`}><ArrowLeft size={16} /> Back to slot selection</Link>
      <header className="page-heading"><div><p className="eyebrow">Checkout</p><h1>Confirm &amp; Pay</h1></div></header>

      <div className="checkout-card">
        <dl className="summary-rows">
          <div className="summary-row"><dt>Parking area</dt><dd>{state.areaName}</dd></div>
          <div className="summary-row"><dt>Slot</dt><dd>{state.slotNumber}</dd></div>
          <div className="summary-row"><dt>Vehicle</dt><dd>{state.vehicleLabel}</dd></div>
          <div className="summary-row"><dt>Date</dt><dd>{new Date(state.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</dd></div>
          <div className="summary-row"><dt>Time</dt><dd>{state.startLabel} – {state.endLabel}</dd></div>
          <div className="summary-row"><dt>Duration</dt><dd>{hours} hr</dd></div>
        </dl>
        <div className="summary-divider" />
        <div className="summary-row"><dt style={{ color: 'var(--ink)', fontWeight: 700 }}>Amount payable</dt><dd className="summary-amount">₹{amount}</dd></div>
        <p className="policy-note">Free cancellation up to 2 hours before start (full refund). Within 2 hours: 50% refund. After start: no refund. Refunds are simulated for this demo.</p>
      </div>

      <div className="checkout-card" style={{ marginTop: '1.25rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Payment method</h2>
        <p className="summary-hint" style={{ textAlign: 'left', margin: 0 }}>Payment is simulated for this demo.</p>
        <div className="pay-options">
          {payMethods.map(({ id, label, icon: Icon }) => (
            <label className={`pay-option ${method === id ? 'selected' : ''}`} key={id}>
              <input checked={method === id} name="pay" onChange={() => setMethod(id)} type="radio" value={id} />
              <Icon size={20} color="#8a6a00" />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <button className="primary-button" disabled={isSaving} onClick={pay} type="button">
          {isSaving ? 'Confirming…' : `Pay ₹${amount} & Confirm Booking →`}
        </button>
      </div>
    </div>
  );
}
