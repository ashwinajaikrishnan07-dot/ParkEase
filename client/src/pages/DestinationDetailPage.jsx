import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Car, Bike } from 'lucide-react';
import { AlertTriangle, TrendingUp, Star, Umbrella, Video, Zap } from 'lucide-react';
import ParkingAreaCard from '../components/ParkingAreaCard.jsx';
import MapView from '../components/MapView.jsx';
import TrafficReports from '../components/TrafficReports.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { getDestinationInsights, getDestinationParking } from '../services/destinationService.js';
import { listEvents } from '../services/eventService.js';

const vehicleOptions = [
  { id: '', label: 'All', icon: MapPin },
  { id: 'CAR', label: 'Car', icon: Car },
  { id: 'MOTORCYCLE', label: 'Motorbike', icon: Bike },
  { id: 'SCOOTER', label: 'Scooter', icon: Bike },
];

const sortOptions = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'price', label: 'Price: low to high' },
  { id: 'distance', label: 'Walking distance' },
  { id: 'availability', label: 'Most available' },
];

const featureToggles = [
  { id: 'covered', label: 'Covered', icon: Umbrella },
  { id: 'cctv', label: 'CCTV', icon: Video },
  { id: 'evCharging', label: 'EV charging', icon: Zap },
];

const availableOf = (area, vehicleType) => (vehicleType ? (area.matchedAvailable ?? 0) : area.availability.availableSlots);

function applyFiltersAndSort(areas, { filters, sort, vehicleType }) {
  let list = areas.filter((a) => {
    if (filters.covered && !a.covered) return false;
    if (filters.cctv && !a.cctv) return false;
    if (filters.evCharging && !a.evCharging) return false;
    if (filters.maxPrice && a.pricePerHour > filters.maxPrice) return false;
    return true;
  });
  list = [...list];
  if (sort === 'price') list.sort((a, b) => a.pricePerHour - b.pricePerHour);
  else if (sort === 'distance') list.sort((a, b) => (a.walkingMinutes || 0) - (b.walkingMinutes || 0));
  else if (sort === 'availability') list.sort((a, b) => availableOf(b, vehicleType) - availableOf(a, vehicleType));
  // 'recommended' keeps the backend's recommendationScore order.
  return list;
}

export default function DestinationDetailPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const [vehicleType, setVehicleType] = useState('');
  const [data, setData] = useState(null);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeAreaId, setActiveAreaId] = useState(null);
  const cardRefs = useRef({});
  const [sort, setSort] = useState('recommended');
  const [filters, setFilters] = useState({ covered: false, cctv: false, evCharging: false, maxPrice: 0 });

  const [events, setEvents] = useState([]);

  useEffect(() => {
    let active = true;
    getDestinationInsights(token, id)
      .then((result) => { if (active) setInsights(result.insights); })
      .catch(() => null);
    listEvents(token, { destination: id })
      .then((result) => { if (active) setEvents(result.events); })
      .catch(() => null);
    return () => { active = false; };
  }, [token, id]);

  const load = useCallback(async (signal) => {
    setIsLoading(true);
    try {
      const result = await getDestinationParking(token, id, { vehicleType }, { signal });
      setData(result);
      setError('');
    } catch (requestError) {
      if (requestError.name !== 'AbortError') setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, [token, id, vehicleType]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const visibleAreas = useMemo(
    () => applyFiltersAndSort(data?.parkingAreas || [], { filters, sort, vehicleType }),
    [data, filters, sort, vehicleType],
  );

  function toggleFeature(key) {
    setFilters((current) => ({ ...current, [key]: !current[key] }));
  }

  if (isLoading && !data) return <main className="route-status" role="status"><span className="spinner" /> Finding parking…</main>;
  if (!data) {
    return (
      <main className="status-card">
        <p className="eyebrow">Unavailable</p>
        <h1>Destination unavailable</h1>
        <p className="summary">{error || 'This destination could not be loaded.'}</p>
        <Link className="text-link" to="/destinations">← Back to destinations</Link>
      </main>
    );
  }

  const { destination, parkingAreas } = data;
  const openAreas = visibleAreas.filter((a) => a.status === 'OPEN');
  const totalAvailable = visibleAreas.reduce((sum, a) => sum + availableOf(a, vehicleType), 0);

  return (
    <main className="availability-layout">
      <Link className="back-link" to="/destinations"><ArrowLeft size={16} /> All destinations</Link>
      <header className="destination-hero">
        <div>
          <h1>{destination.name}</h1>
          <p className="area-detail-sub"><MapPin size={15} /> {destination.address || destination.city}</p>
        </div>
        <div className="destination-hero-stat">
          <strong>{totalAvailable}</strong>
          <span>spaces available{vehicleType ? ` · ${vehicleType.toLowerCase()}` : ''}</span>
        </div>
      </header>

      {events.length > 0 && (
        <div className="event-callout">
          <AlertTriangle size={20} />
          <div>
            <strong>{events[0].name}{events[0].status === 'ACTIVE' ? ' · happening now' : ''}</strong>
            <span>{events[0].description || 'Expect higher parking demand during this event.'} ({new Date(events[0].startsAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })})</span>
          </div>
        </div>
      )}

      {insights && (
        <div className={`insight-banner insight-${(insights.congestionLevel || 'low').toLowerCase()}`}>
          {insights.congestionLevel === 'FULL' || insights.congestionLevel === 'HIGH' ? <AlertTriangle size={20} /> : <TrendingUp size={20} />}
          <div>
            <strong>{insights.warning || 'Live parking status'}</strong>
            <span>{insights.occupancyPercentage}% occupied now · {insights.availableSlots} spaces free right now</span>
          </div>
        </div>
      )}

      {destination.latitude != null && (
        <MapView
          center={[destination.latitude, destination.longitude]}
          markers={[
            { id: destination._id, lat: destination.latitude, lng: destination.longitude, title: destination.name, subtitle: destination.address, kind: 'destination' },
            ...visibleAreas
              .filter((a) => a.latitude != null)
              .map((a) => ({ id: a._id, lat: a.latitude, lng: a.longitude, title: a.name, subtitle: `${a.availability.availableSlots} free · ₹${a.pricePerHour}/hr`, to: `/parking/${a._id}`, kind: 'area' })),
          ]}
          zoom={15}
          height={300}
          selectedId={activeAreaId}
          onSelect={(markerId) => {
            setActiveAreaId(markerId);
            cardRefs.current[markerId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        />
      )}

      <div className="chip-row" role="group" aria-label="Vehicle type">
        {vehicleOptions.map(({ id: vt, label, icon: Icon }) => (
          <button className={`chip ${vehicleType === vt ? 'chip-active' : ''}`} key={vt || 'all'} onClick={() => setVehicleType(vt)} type="button">
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div className="filter-bar">
        <div className="filter-toggles" role="group" aria-label="Parking features">
          {featureToggles.map(({ id: key, label, icon: Icon }) => (
            <button
              aria-pressed={filters[key]}
              className={`chip ${filters[key] ? 'chip-active' : ''}`}
              key={key}
              onClick={() => toggleFeature(key)}
              type="button"
            >
              <Icon size={14} /> {label}
            </button>
          ))}
          <label className="filter-select">
            Max price
            <select onChange={(e) => setFilters((c) => ({ ...c, maxPrice: Number(e.target.value) }))} value={filters.maxPrice}>
              <option value={0}>Any</option>
              <option value={10}>≤ ₹10/hr</option>
              <option value={20}>≤ ₹20/hr</option>
              <option value={30}>≤ ₹30/hr</option>
            </select>
          </label>
        </div>
        <label className="filter-select">
          Sort
          <select onChange={(e) => setSort(e.target.value)} value={sort}>
            {sortOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
      </div>

      <TrafficReports destinationId={destination._id} />

      {parkingAreas.length === 0 ? (
        <p className="empty-state">No parking areas here match your vehicle. Try another vehicle type.</p>
      ) : visibleAreas.length === 0 ? (
        <p className="empty-state">No parking matches these filters. Try removing a filter.</p>
      ) : openAreas.length === 0 ? (
        <div className="form-alert" role="alert">All parking at this destination is currently full or closed. Please check back shortly.</div>
      ) : (
        <div className="availability-grid">
          {visibleAreas.map((area, index) => (
            <div
              className={`area-card-wrap ${activeAreaId === area._id ? 'is-highlighted' : ''}`}
              key={area._id}
              onMouseEnter={() => setActiveAreaId(area._id)}
              ref={(el) => { cardRefs.current[area._id] = el; }}
            >
              {sort === 'recommended' && index === 0 && area.status === 'OPEN' && availableOf(area, vehicleType) > 0 && (
                <span className="recommended-badge"><Star size={12} fill="currentColor" style={{ verticalAlign: '-1px' }} /> Recommended for you</span>
              )}
              <ParkingAreaCard area={area} eventName={events[0]?.name} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
