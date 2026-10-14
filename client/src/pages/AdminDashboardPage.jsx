import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import RefreshStatus from '../components/RefreshStatus.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { usePollingResource } from '../hooks/usePollingResource.js';
import { getDashboardStats, getHeatmap } from '../services/adminService.js';

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const loader = useCallback(async (signal) => {
    const [stats, heat] = await Promise.all([getDashboardStats(token, { signal }), getHeatmap(token, { signal })]);
    return { stats: stats.stats, heatmap: heat.heatmap };
  }, [token]);
  const { data, error, isLoading, isRefreshing, lastUpdated, refresh } = usePollingResource(loader);
  const stats = data?.stats;
  const heatmap = data?.heatmap || [];

  if (isLoading && !stats) return <main className="route-status" role="status">Loading dashboard…</main>;
  if (!stats) return <main className="status-card"><p className="eyebrow">Unavailable</p><h1>Dashboard unavailable</h1><p className="summary">{error || 'Statistics could not be loaded.'}</p></main>;

  const cards = [
    ['Users', stats.totalUsers], ['Parking areas', stats.totalAreas], ['Total slots', stats.totalSlots],
    ['Available', stats.availableSlots], ['Occupied', stats.occupiedSlots], ['Reserved', stats.reservedSlots],
    ['Occupancy %', `${stats.occupancyPercentage}%`], ['Active reservations', stats.activeReservations], ['Pending reports', stats.pendingReports],
  ];

  return (
    <main className="management-layout">
      <header className="page-heading"><div><p className="eyebrow">Administration</p><h1>Dashboard</h1><p>Live operational overview, refreshed every 15 seconds.</p></div></header>
      <RefreshStatus error={error} isRefreshing={isRefreshing} lastUpdated={lastUpdated} onRefresh={refresh} />
      <section aria-label="Summary statistics" className="stat-grid">{cards.map(([label, value]) => <div className="stat-card" key={label}><strong>{value}</strong><span>{label}</span></div>)}</section>

      <section aria-labelledby="heatmap-title" style={{ marginBottom: '2rem' }}>
        <h2 id="heatmap-title">Live occupancy heatmap</h2>
        <div className="heatmap-grid">
          {heatmap.map((area) => (
            <div className={`heatmap-tile heat-${area.congestionLevel.toLowerCase()}`} key={area._id} title={`${area.occupancyPercentage}% occupied`}>
              <strong>{area.name}</strong>
              {area.destination && <span className="heatmap-dest">{area.destination}</span>}
              <span className="heatmap-figure">{area.availableSlots}/{area.totalSlots} free</span>
              <span className="heatmap-level">{area.congestionLevel}</span>
            </div>
          ))}
        </div>
      </section>

      <nav aria-label="Admin management" className="admin-links">
        <Link className="admin-link" to="/admin/users">Manage users</Link>
        <Link className="admin-link" to="/admin/reservations">Reservation oversight</Link>
        <Link className="admin-link" to="/admin/analytics">Analytics</Link>
        <Link className="admin-link" to="/admin/events">Event parking</Link>
        <Link className="admin-link" to="/admin/parking">Parking areas</Link>
        <Link className="admin-link" to="/admin/slots">Parking slots</Link>
        <Link className="admin-link" to="/reports">Report queue</Link>
      </nav>
    </main>
  );
}
