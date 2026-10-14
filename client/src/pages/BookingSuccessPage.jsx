import { Link, Navigate, useLocation } from 'react-router-dom';
import { Check } from 'lucide-react';
import ParkingPass from '../components/ParkingPass.jsx';

export default function BookingSuccessPage() {
  const { state } = useLocation();
  if (!state?.reference) return <Navigate to="/reservations" replace />;

  const dateLabel = new Date(state.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="success-screen">
      <span className="success-check"><Check size={38} /></span>
      <h1>Booking Confirmed!</h1>
      <p className="summary" style={{ margin: 0 }}>Your parking slot has been booked. Show this pass at the entry gate.</p>
      <ParkingPass
        areaName={state.areaName}
        dateLabel={dateLabel}
        reference={state.reference}
        slotNumber={state.slotNumber}
        timeLabel={`${state.startLabel} – ${state.endLabel}`}
      />
      <div className="success-actions">
        <Link className="primary-button" to="/reservations">View My Bookings</Link>
        <Link className="secondary-button" to="/">Go to Home</Link>
      </div>
    </div>
  );
}
