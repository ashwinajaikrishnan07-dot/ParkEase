import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import RefreshStatus from '../components/RefreshStatus.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { usePollingResource } from '../hooks/usePollingResource.js';
import { getAnalyticsDashboard, getOccupancyAnalytics, getPeakHours } from '../services/analyticsService.js';

function hourLabel(hour) {
  const suffix = hour < 12 ? 'am' : 'pm';
  const value = hour % 12 === 0 ? 12 : hour % 12;
  return `${value}${suffix}`;
}

export default function AdminAnalyticsPage() {
  const { token } = useAuth();
  const loader = useCallback(async (signal) => {
    const [dashboard, occupancy, peak] = await Promise.all([
      getAnalyticsDashboard(token, { signal }),
      getOccupancyAnalytics(token, { signal }),
      getPeakHours(token, { signal }),
    ]);
    return { dashboard, occupancy: occupancy.occupancy, windowHours: occupancy.windowHours, peakHours: peak.peakHours, busiestHour: peak.busiestHour };
  }, [token]);
  const { data, error, isLoading, isRefreshing, lastUpdated, refresh } = usePollingResource(loader);

  if (isLoading && !data) return <main className="route-status" role="status">Loading analytics…</main>;
  if (!data) return <main className="status-card"><p className="eyebrow">Unavailable</p><h1>Analytics unavailable</h1><p className="summary">{error || 'Analytics could not be loaded.'}</p><Link className="text-link" to="/admin">Back to dashboard</Link></main>;

  const { busiestHour, dashboard, occupancy, peakHours, windowHours } = data;
  const maxReservations = Math.max(1, ...peakHours.map((item) => item.reservations));
  const cards = [['Total slots', dashboard.totalSlots], ['Available', dashboard.availableSlots], ['Occupied', dashboard.occupiedSlots], ['Reserved', dashboard.reservedSlots], ['Occupancy %', `${dashboard.occupancyPercentage}%`], ['Active reservations', dashboard.activeReservations], ['Pending reports', dashboard.pendingReports]];

  return (
    <main className="management-layout">
      <header className="page-heading"><div><p className="eyebrow">Administration</p><h1>Analytics</h1><p>Occupancy and demand insights.</p></div><Link className="text-link" to="/admin">← Dashboard</Link></header>
      <RefreshStatus error={error} isRefreshing={isRefreshing} lastUpdated={lastUpdated} onRefresh={refresh} />
      <section aria-label="Current metrics" className="stat-grid">{cards.map(([label, value]) => <div className="stat-card" key={label}><strong>{value}</strong><span>{label}</span></div>)}</section>

      <section aria-labelledby="occupancy-title"><h2 id="occupancy-title">Average occupancy by area (last {windowHours}h)</h2>{occupancy.length === 0 ? <p className="empty-state">No occupancy history recorded yet. Data appears after check-outs.</p> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Area</th><th>Average occupancy</th><th>Peak occupancy</th><th>Samples</th></tr></thead><tbody>{occupancy.map((item) => <tr key={item.area}><td>{item.areaName}</td><td>{item.averageOccupancy}%</td><td>{item.peakOccupancy}%</td><td>{item.samples}</td></tr>)}</tbody></table></div>}</section>

      <section aria-labelledby="peak-title"><h2 id="peak-title">Reservations by start hour{busiestHour !== null && <span className="count-badge"> Busiest {hourLabel(busiestHour)}</span>}</h2><div className="peak-chart">{peakHours.map((item) => <div className="peak-bar" key={item.hour}><div className="peak-bar-fill" style={{ height: `${(item.reservations / maxReservations) * 100}%` }} title={`${item.reservations} reservations`}><span className="sr-only">{item.reservations} reservations at {hourLabel(item.hour)}</span></div><span className="peak-bar-label">{item.hour % 3 === 0 ? hourLabel(item.hour) : ''}</span></div>)}</div></section>
    </main>
  );
}
