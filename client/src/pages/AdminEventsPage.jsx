import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Trash2 } from 'lucide-react';
import RefreshStatus from '../components/RefreshStatus.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { usePollingResource } from '../hooks/usePollingResource.js';
import { listDestinations } from '../services/destinationService.js';
import { createEvent, deleteEvent, listEvents } from '../services/eventService.js';

const emptyForm = { destination: '', name: '', description: '', startsAt: '', endsAt: '' };

export default function AdminEventsPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [destinations, setDestinations] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let active = true;
    listDestinations(token)
      .then((data) => { if (active) { setDestinations(data.destinations); setForm((f) => ({ ...f, destination: f.destination || data.destinations[0]?._id || '' })); } })
      .catch(() => null);
    return () => { active = false; };
  }, [token]);

  const loader = useCallback(async (signal) => (await listEvents(token, {}, { signal })).events, [token]);
  const polling = usePollingResource(loader);

  function change(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setErrors((current) => ({ ...current, [event.target.name]: undefined }));
  }

  async function submit(event) {
    event.preventDefault();
    setIsSaving(true);
    setErrors({});
    try {
      await createEvent(token, {
        destination: form.destination,
        name: form.name,
        description: form.description,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      });
      toast.success('Event created.');
      setForm({ ...emptyForm, destination: form.destination });
      polling.refresh();
    } catch (requestError) {
      setErrors(requestError.errors || {});
      toast.error(requestError.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function remove(eventItem) {
    if (!window.confirm(`Delete "${eventItem.name}"?`)) return;
    setDeletingId(eventItem._id);
    try {
      await deleteEvent(token, eventItem._id);
      toast.success('Event deleted.');
      polling.refresh();
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setDeletingId(null);
    }
  }

  const events = polling.data || [];

  return (
    <main className="management-layout">
      <header className="page-heading">
        <div><p className="eyebrow">Administration</p><h1>Event parking</h1><p>Create temporary parking events for busy periods.</p></div>
        <Link className="text-link" to="/admin">← Dashboard</Link>
      </header>

      <section className="management-card">
        <h2>Create event</h2>
        <form className="parking-form" onSubmit={submit} noValidate>
          <div>
            <label htmlFor="event-destination">Destination</label>
            <select id="event-destination" name="destination" onChange={change} value={form.destination}>
              {destinations.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
            {errors.destination && <p className="field-error">{errors.destination}</p>}
          </div>
          <div>
            <label htmlFor="event-name">Event name</label>
            <input id="event-name" name="name" onChange={change} placeholder="Cultural Fest" value={form.name} />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="event-start">Starts</label>
            <input id="event-start" name="startsAt" onChange={change} type="datetime-local" value={form.startsAt} />
            {errors.startsAt && <p className="field-error">{errors.startsAt}</p>}
          </div>
          <div>
            <label htmlFor="event-end">Ends</label>
            <input id="event-end" name="endsAt" onChange={change} type="datetime-local" value={form.endsAt} />
            {errors.endsAt && <p className="field-error">{errors.endsAt}</p>}
          </div>
          <div className="wide-field">
            <label htmlFor="event-desc">Description</label>
            <textarea id="event-desc" name="description" onChange={change} rows="2" value={form.description} />
            {errors.description && <p className="field-error">{errors.description}</p>}
          </div>
          <button className="primary-button wide-field" disabled={isSaving} type="submit">{isSaving ? 'Creating…' : 'Create event'}</button>
        </form>
      </section>

      <RefreshStatus error={polling.error} isRefreshing={polling.isRefreshing} lastUpdated={polling.lastUpdated} onRefresh={polling.refresh} />
      <section aria-labelledby="events-title">
        <h2 id="events-title">Active &amp; upcoming events</h2>
        {events.length === 0 ? (
          <p className="empty-state">No active or upcoming events.</p>
        ) : (
          <div className="event-list">
            {events.map((eventItem) => (
              <div className="event-banner" key={eventItem._id}>
                <span className="event-icon"><CalendarClock size={22} /></span>
                <div>
                  <span className={`event-status event-${eventItem.status.toLowerCase()}`}>{eventItem.status}</span>
                  <h3>{eventItem.name}</h3>
                  <p>{eventItem.destination?.name} · {new Date(eventItem.startsAt).toLocaleString()} – {new Date(eventItem.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <button aria-label="Delete event" className="danger-button compact-button" disabled={deletingId === eventItem._id} onClick={() => remove(eventItem)} type="button"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
