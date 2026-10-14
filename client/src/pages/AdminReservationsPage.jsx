import { useCallback, useState } from 'react';
import RefreshStatus from '../components/RefreshStatus.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { usePollingResource } from '../hooks/usePollingResource.js';
import { listAdminReservations } from '../services/adminService.js';

const statuses = ['ACTIVE', 'CHECKED_IN', 'COMPLETED', 'CANCELLED'];

export default function AdminReservationsPage() {
  const { token } = useAuth();
  const [status, setStatus] = useState('');
  const loader = useCallback(async (signal) => (await listAdminReservations(token, { status }, { signal })).reservations, [status, token]);
  const { data: reservations, error, isLoading, isRefreshing, lastUpdated, refresh } = usePollingResource(loader);

  if (isLoading && !reservations) return <main className="route-status" role="status">Loading reservations…</main>;
  const list = reservations || [];
  return (
    <main className="management-layout">
      <header className="page-heading"><div><p className="eyebrow">Administration</p><h1>Reservation oversight</h1></div><span className="count-badge">{list.length} shown</span></header>
      <div className="list-heading"><h2>All reservations</h2><label>Status<select onChange={(event) => setStatus(event.target.value)} value={status}><option value="">All statuses</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select></label></div>
      <RefreshStatus error={error} isRefreshing={isRefreshing} lastUpdated={lastUpdated} onRefresh={refresh} />
      {list.length === 0 ? <p className="empty-state">No reservations match this view.</p> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>User</th><th>Vehicle</th><th>Area</th><th>Slot</th><th>Status</th><th>Start</th></tr></thead><tbody>{list.map((item) => <tr key={item._id}><td>{item.user?.name || 'Unknown'}</td><td>{item.vehicle?.registrationNumber || '—'}</td><td>{item.area?.name || '—'}</td><td>{item.slot?.slotNumber || '—'}</td><td><span className={`status-badge reservation-${item.status.toLowerCase()}`}>{item.status}</span></td><td><time dateTime={item.startTime}>{new Date(item.startTime).toLocaleString()}</time></td></tr>)}</tbody></table></div>}
    </main>
  );
}
