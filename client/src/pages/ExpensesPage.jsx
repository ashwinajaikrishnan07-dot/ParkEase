import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { IndianRupee, TrendingUp, CarFront, AlertTriangle, CalendarClock, MapPin } from 'lucide-react';
import RefreshStatus from '../components/RefreshStatus.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { usePollingResource } from '../hooks/usePollingResource.js';
import { getExpenses } from '../services/reservationService.js';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function ExpensesPage() {
  const { token } = useAuth();
  const loader = useCallback(async (signal) => getExpenses(token, { signal }), [token]);
  const polling = usePollingResource(loader, 30000);

  if (polling.isLoading && !polling.data) {
    return <main className="route-status" role="status"><span className="spinner" /> Loading expenses…</main>;
  }

  const data = polling.data || { summary: {}, byMonth: [], byArea: [], recent: [] };
  const { summary, byMonth, byArea, recent } = data;
  const maxMonth = Math.max(1, ...byMonth.map((m) => m.total));
  const hasData = summary.totalVisits > 0;

  const cards = [
    { icon: IndianRupee, label: 'Total spent', value: money(summary.totalSpent), tone: 'accent' },
    { icon: CalendarClock, label: 'This month', value: money(summary.thisMonthSpent) },
    { icon: CarFront, label: 'Parking visits', value: summary.totalVisits },
    { icon: TrendingUp, label: 'Avg per visit', value: money(summary.avgPerVisit) },
    { icon: AlertTriangle, label: 'Overstay fees', value: money(summary.totalOverstayFees), tone: 'warn' },
    { icon: CalendarClock, label: 'Committed (upcoming)', value: money(summary.committed) },
  ];

  return (
    <main className="management-layout">
      <header className="page-heading">
        <div><p className="eyebrow">Your spending</p><h1>Parking Expenses</h1></div>
      </header>

      <RefreshStatus error={polling.error} isRefreshing={polling.isRefreshing} lastUpdated={polling.lastUpdated} onRefresh={polling.refresh} />

      {!hasData ? (
        <div className="empty-state">
          <p>No completed parking sessions yet. Your spending will appear here after you check out.</p>
          <Link className="primary-button" to="/destinations">Find Parking</Link>
        </div>
      ) : (
        <>
          <div className="expense-cards">
            {cards.map(({ icon: Icon, label, value, tone }) => (
              <div className={`expense-card ${tone ? `expense-${tone}` : ''}`} key={label}>
                <span className="expense-card-icon"><Icon size={20} /></span>
                <div>
                  <span className="expense-card-label">{label}</span>
                  <strong className="expense-card-value">{value}</strong>
                </div>
              </div>
            ))}
          </div>

          <section className="expense-section">
            <h2>Last 6 months</h2>
            <div className="expense-chart">
              {byMonth.map((m) => (
                <div className="expense-bar-col" key={m.month}>
                  <span className="expense-bar-value">{m.total > 0 ? money(m.total) : ''}</span>
                  <div className="expense-bar-track">
                    <div className="expense-bar-fill" style={{ height: `${Math.round((m.total / maxMonth) * 100)}%` }} />
                  </div>
                  <span className="expense-bar-label">{m.label}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="expense-split">
            <section className="expense-section">
              <h2>By location</h2>
              {byArea.length === 0 ? <p className="summary-hint">No data yet.</p> : (
                <ul className="expense-area-list">
                  {byArea.map((a) => (
                    <li key={a.area}>
                      <span className="expense-area-name"><MapPin size={14} /> {a.area}</span>
                      <span className="expense-area-meta">{a.visits} visit{a.visits > 1 ? 's' : ''}</span>
                      <strong>{money(a.total)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="expense-section">
              <h2>Recent sessions</h2>
              {recent.length === 0 ? <p className="summary-hint">No recent sessions.</p> : (
                <ul className="expense-recent-list">
                  {recent.map((r) => (
                    <li key={r.id}>
                      <div>
                        <strong>{r.area || 'Parking'}</strong>
                        <span>{new Date(r.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div className="expense-recent-amount">
                        <strong>{money(r.amount)}</strong>
                        {r.overstayFee > 0 && <span className="expense-overstay">incl. ₹{r.overstayFee} overstay</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  );
}
