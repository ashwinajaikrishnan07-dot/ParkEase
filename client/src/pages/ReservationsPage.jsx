import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import RefreshStatus from '../components/RefreshStatus.jsx';
import ReservationCard from '../components/ReservationCard.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { usePollingResource } from '../hooks/usePollingResource.js';
import { cancelReservation, checkInReservation, checkOutReservation, extendReservation, getMyReservations } from '../services/reservationService.js';

const TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'parked', label: 'Parked now' },
  { id: 'history', label: 'History' },
];

export default function ReservationsPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('upcoming');
  const [action, setAction] = useState(null);
  const loader = useCallback(async (signal) => (await getMyReservations(token, { signal })).reservations, [token]);
  const polling = usePollingResource(loader);

  const groups = useMemo(() => ({
    upcoming: polling.data?.filter((r) => r.status === 'ACTIVE') || [],
    parked: polling.data?.filter((r) => r.status === 'CHECKED_IN') || [],
    history: polling.data?.filter((r) => ['COMPLETED', 'CANCELLED'].includes(r.status)) || [],
  }), [polling.data]);

  async function perform(type, reservation, payload) {
    if (type === 'cancel' && !window.confirm(`Cancel booking for slot ${reservation.slot?.slotNumber}?`)) return;
    if (type === 'checkOut' && !window.confirm(`Check out from slot ${reservation.slot?.slotNumber}?`)) return;
    setAction({ id: reservation._id, type });
    try {
      if (type === 'cancel') await cancelReservation(token, reservation._id);
      if (type === 'checkIn') await checkInReservation(token, reservation._id);
      if (type === 'checkOut') await checkOutReservation(token, reservation._id);
      if (type === 'extend') await extendReservation(token, reservation._id, payload);
      toast.success({ cancel: 'Booking cancelled and slot released.', checkIn: 'Checked in. Your slot is now occupied.', checkOut: 'Checked out. Your slot is now free.', extend: 'Booking extended.' }[type]);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setAction(null);
      polling.refresh();
    }
  }

  if (polling.isLoading && !polling.data) return <main className="route-status" role="status"><span className="spinner" /> Loading bookings…</main>;

  const current = groups[tab];
  const emptyText = {
    upcoming: 'You have no upcoming bookings.',
    parked: 'No vehicles are currently checked in.',
    history: 'No completed or cancelled bookings yet.',
  }[tab];

  return (
    <main className="management-layout">
      <header className="page-heading">
        <div><p className="eyebrow">Your parking</p><h1>My Bookings</h1></div>
        <span className="count-badge">{groups.upcoming.length} upcoming</span>
      </header>

      <div className="tabs" role="tablist">
        {TABS.map(({ id, label }) => (
          <button aria-selected={tab === id} className={`tab ${tab === id ? 'active' : ''}`} key={id} onClick={() => setTab(id)} role="tab" type="button">
            {label} {groups[id].length > 0 && `(${groups[id].length})`}
          </button>
        ))}
      </div>

      <RefreshStatus error={polling.error} isRefreshing={polling.isRefreshing} lastUpdated={polling.lastUpdated} onRefresh={polling.refresh} />

      {current.length === 0 ? (
        <div className="empty-state">
          <p>{emptyText}</p>
          <Link className="primary-button" to="/parking">Find Parking</Link>
        </div>
      ) : (
        <div className="reservation-grid">
          {current.map((reservation) => <ReservationCard action={action} key={reservation._id} onAction={perform} reservation={reservation} />)}
        </div>
      )}
    </main>
  );
}
