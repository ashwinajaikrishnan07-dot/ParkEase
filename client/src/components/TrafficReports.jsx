import { useCallback, useEffect, useState } from 'react';
import { Gauge, MessageSquarePlus, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { createTrafficReport, getTrafficReports } from '../services/trafficService.js';

const LEVELS = [
  { id: 'SMOOTH', label: 'Smooth', className: 'traffic-smooth' },
  { id: 'MODERATE', label: 'Moderate', className: 'traffic-moderate' },
  { id: 'HEAVY', label: 'Heavy', className: 'traffic-heavy' },
];

const LEVEL_LABEL = { SMOOTH: 'Smooth', MODERATE: 'Moderate', HEAVY: 'Heavy' };

function timeAgo(date) {
  const minutes = Math.round((Date.now() - new Date(date).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function TrafficReports({ destinationId }) {
  const { token } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [level, setLevel] = useState('MODERATE');
  const [comment, setComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async (signal) => {
    try {
      const result = await getTrafficReports(token, destinationId, { signal });
      setData(result);
    } catch { /* non-critical */ }
  }, [token, destinationId]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function submit(event) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await createTrafficReport(token, { destination: destinationId, level, comment: comment.trim() });
      setComment('');
      toast.success('Thanks! Your traffic update is live for other drivers.');
      load();
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setIsSaving(false);
    }
  }

  const reports = data?.reports || [];
  const summary = data?.summary;

  return (
    <section className="traffic-panel">
      <div className="traffic-panel-head">
        <h2><Gauge size={18} /> Traffic from drivers</h2>
        {summary?.level && (
          <span className={`traffic-chip traffic-${summary.level.toLowerCase()}`}>
            {LEVEL_LABEL[summary.level]} · {summary.total} recent report{summary.total > 1 ? 's' : ''}
          </span>
        )}
      </div>
      <p className="traffic-sub">Real updates shared by people heading here — no estimates.</p>

      <form className="traffic-form" onSubmit={submit}>
        <div className="traffic-level-pick" role="group" aria-label="Traffic level">
          {LEVELS.map((option) => (
            <button
              aria-pressed={level === option.id}
              className={`traffic-level-btn ${option.className} ${level === option.id ? 'active' : ''}`}
              key={option.id}
              onClick={() => setLevel(option.id)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="traffic-input-row">
          <input
            aria-label="Add a note"
            maxLength={240}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a note (optional) — e.g. jam near the signal"
            value={comment}
          />
          <button className="primary-button compact-button" disabled={isSaving} type="submit">
            <MessageSquarePlus size={15} /> {isSaving ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>

      {reports.length === 0 ? (
        <p className="traffic-empty">No traffic updates yet. Be the first to let others know.</p>
      ) : (
        <ul className="traffic-list">
          {reports.map((report) => (
            <li key={report._id}>
              <span className={`traffic-dot traffic-${report.level.toLowerCase()}`} />
              <div className="traffic-list-body">
                <span className="traffic-list-top">
                  <strong>{LEVEL_LABEL[report.level]}</strong>
                  <span className="traffic-list-who">{report.user?.name || 'A driver'}</span>
                </span>
                {report.comment && <span className="traffic-list-comment">{report.comment}</span>}
              </div>
              <span className="traffic-list-time"><Clock size={12} /> {timeAgo(report.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
