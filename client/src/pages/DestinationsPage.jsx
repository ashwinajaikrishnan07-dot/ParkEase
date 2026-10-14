import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import DestinationCard from '../components/DestinationCard.jsx';
import MapView from '../components/MapView.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { listDestinations } from '../services/destinationService.js';

const categories = [
  { id: '', label: 'All' },
  { id: 'COLLEGE', label: 'College' },
  { id: 'MALL', label: 'Mall' },
  { id: 'HOSPITAL', label: 'Hospital' },
  { id: 'OFFICE', label: 'Office' },
  { id: 'THEATRE', label: 'Theatre' },
  { id: 'BUS_STAND', label: 'Bus Stand' },
];

export default function DestinationsPage() {
  const { token } = useAuth();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const category = params.get('category') || '';
  const [destinations, setDestinations] = useState(null);
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState(null);
  const cardRefs = useRef({});

  const load = useCallback(async (signal) => {
    setDestinations(null);
    setError('');
    try {
      const data = await listDestinations(token, { q: params.get('q') || '', category }, { signal });
      setDestinations(data.destinations);
    } catch (requestError) {
      if (requestError.name !== 'AbortError') setError(requestError.message);
    }
  }, [token, params, category]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function submit(event) {
    event.preventDefault();
    const next = new URLSearchParams(params);
    if (query.trim()) next.set('q', query.trim()); else next.delete('q');
    setParams(next);
  }

  function pickCategory(id) {
    const next = new URLSearchParams(params);
    if (id) next.set('category', id); else next.delete('category');
    setParams(next);
  }

  return (
    <main className="management-layout">
      <header className="page-heading">
        <div><p className="eyebrow">Discover</p><h1>Where are you going?</h1></div>
      </header>

      <form className="destination-search" onSubmit={submit}>
        <div className="search-field" style={{ flex: 1 }}>
          <Search size={18} />
          <input aria-label="Search destinations" onChange={(e) => setQuery(e.target.value)} placeholder="Search mall, college, hospital…" value={query} />
        </div>
        <button className="primary-button" type="submit">Search</button>
      </form>

      <div className="chip-row">
        {categories.map((c) => (
          <button className={`chip ${category === c.id ? 'chip-active' : ''}`} key={c.id || 'all'} onClick={() => pickCategory(c.id)} type="button">{c.label}</button>
        ))}
      </div>

      {error ? (
        <div className="form-alert" role="alert">{error}</div>
      ) : !destinations ? (
        <div className="loading-block"><span className="spinner" /> Finding destinations…</div>
      ) : destinations.length === 0 ? (
        <p className="empty-state">No destinations match your search. Try a different name or category.</p>
      ) : (
        <>
          {destinations.some((d) => d.latitude != null) && (
            <MapView
              center={[11.0168, 76.9558]}
              markers={destinations
                .filter((d) => d.latitude != null)
                .map((d) => ({ id: d._id, lat: d.latitude, lng: d.longitude, title: d.name, subtitle: `${d.parkingAreaCount || 0} parking areas`, to: `/destinations/${d._id}`, kind: 'destination' }))}
              zoom={12}
              height={340}
              selectedId={activeId}
              onSelect={(markerId) => {
                setActiveId(markerId);
                cardRefs.current[markerId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
            />
          )}
          <div className="destination-grid">
            {destinations.map((destination) => (
              <div
                className={`destination-card-wrap ${activeId === destination._id ? 'is-highlighted' : ''}`}
                key={destination._id}
                onMouseEnter={() => setActiveId(destination._id)}
                ref={(el) => { cardRefs.current[destination._id] = el; }}
              >
                <DestinationCard destination={destination} />
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
