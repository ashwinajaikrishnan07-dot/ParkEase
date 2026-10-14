import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Search, Car, CalendarClock, ClipboardList, Navigation, ArrowRight, CircleParking,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { listDestinations, getDestinationParking } from '../services/destinationService.js';
import { listEvents } from '../services/eventService.js';
import { getMyReservations } from '../services/reservationService.js';
import DestinationCard from '../components/DestinationCard.jsx';

const categories = [
  { id: '', label: 'All' },
  { id: 'MALL', label: 'Malls' },
  { id: 'COLLEGE', label: 'Colleges' },
  { id: 'HOSPITAL', label: 'Hospitals' },
  { id: 'TEMPLE', label: 'Temples' },
  { id: 'BUS_STAND', label: 'Bus Stands' },
  { id: 'OFFICE', label: 'Offices' },
  { id: 'EVENT_VENUE', label: 'Events' },
];

export default function HomePage() {
  const { isAuthenticated, token } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  function handleSearch(event) {
    event.preventDefault();
    if (!isAuthenticated) return navigate('/login');
    return navigate(`/destinations?q=${encodeURIComponent(query.trim())}`);
  }

  function openCategory(id) {
    if (!isAuthenticated) return navigate('/login');
    return navigate(`/destinations${id ? `?category=${id}` : ''}`);
  }

  return (
    <div className="home">
      <section className="home-hero">
        <div className="home-hero-content">
          <div className="home-hero-copy">
            <p className="hero-eyebrow">Find parking. Skip the traffic.</p>
            <h1>Where are you going <span>to park?</span></h1>
            <p className="hero-sub">
              Tell ParkEase your destination. We&apos;ll find the best parking options nearby
              so you can arrive without circling the block.
            </p>

            <form className="hero-search" onSubmit={handleSearch}>
              <MapPin size={20} />
              <input
                aria-label="Search destination"
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a mall, college, temple, hospital, or any destination..."
                value={query}
              />
              <button className="primary-button" type="submit"><Search size={16} /> Search</button>
            </form>

            <div className="hero-chips" role="group" aria-label="Destination categories">
              {categories.map((c) => (
                <button className="hero-chip" key={c.id || 'all'} onClick={() => openCategory(c.id)} type="button">{c.label}</button>
              ))}
            </div>
          </div>

          {isAuthenticated && <FloatingParkingCard token={token} navigate={navigate} />}
        </div>
      </section>

      {isAuthenticated ? (
        <>
          <QuickActions navigate={navigate} token={token} />
          <WhereDidIPark token={token} navigate={navigate} />
          <UpcomingEvents token={token} navigate={navigate} />
          <PopularDestinations token={token} navigate={navigate} />
        </>
      ) : (
        <section className="home-section">
          <div className="guest-cta">
            <CircleParking size={34} color="#f2b900" />
            <h2>Sign in to find parking near you</h2>
            <p>Search any destination and reserve a spot in seconds.</p>
            <button className="primary-button" onClick={() => navigate('/login')} type="button">Sign in</button>
          </div>
        </section>
      )}
    </div>
  );
}

function FloatingParkingCard({ navigate, token }) {
  const [state, setState] = useState({ loading: true, dest: null, available: 0, price: null, walk: null });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { destinations } = await listDestinations(token);
        const dest = destinations.find((d) => (d.parkingAreaCount || 0) > 0) || destinations[0];
        if (!dest) { if (active) setState((s) => ({ ...s, loading: false })); return; }
        const { parkingAreas } = await getDestinationParking(token, dest._id);
        const open = parkingAreas.filter((a) => a.status === 'OPEN');
        const available = open.reduce((sum, a) => sum + (a.availability?.availableSlots || 0), 0);
        const priced = open.filter((a) => Number.isFinite(a.pricePerHour));
        const price = priced.length ? Math.min(...priced.map((a) => a.pricePerHour)) : null;
        const walk = open.length ? Math.min(...open.map((a) => a.walkingMinutes || 0)) : null;
        if (active) setState({ loading: false, dest, available, price, walk });
      } catch {
        if (active) setState((s) => ({ ...s, loading: false }));
      }
    })();
    return () => { active = false; };
  }, [token]);

  if (state.loading) {
    return <aside className="parking-float-card"><div className="pf-skeleton" aria-hidden="true" /><p className="pf-loading"><span className="spinner" /> Finding nearby parking…</p></aside>;
  }
  if (!state.dest) return null;

  return (
    <aside className="parking-float-card">
      <span className="pf-badge">Recommended nearby</span>
      <h3>{state.dest.name}</h3>
      <p className="pf-location"><MapPin size={14} /> {state.dest.address || state.dest.city}</p>
      <div className="pf-stats">
        <div><strong>{state.available}</strong><span>spaces available</span></div>
        {state.walk != null && <div><strong>{state.walk} min</strong><span>walking distance</span></div>}
        {state.price != null && <div><strong>₹{state.price}/hr</strong><span>starting price</span></div>}
      </div>
      <button className="primary-button" onClick={() => navigate(`/destinations/${state.dest._id}`)} type="button">
        View Parking Options <ArrowRight size={16} />
      </button>
    </aside>
  );
}

function QuickActions({ navigate, token }) {
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    let active = true;
    getMyReservations(token)
      .then((data) => { if (active) setReservations(data.reservations || []); })
      .catch(() => null);
    return () => { active = false; };
  }, [token]);

  const lastArea = reservations[0]?.area?._id;
  const parked = reservations.find((r) => r.status === 'CHECKED_IN');

  const actions = [
    { icon: Car, title: 'Find Parking', text: 'Search and reserve nearby parking spots', onClick: () => navigate('/destinations') },
    { icon: CalendarClock, title: 'Book Again', text: lastArea ? 'Rebook your usual parking spot' : 'Your recent spots will appear here', onClick: () => navigate(lastArea ? `/parking/${lastArea}` : '/destinations') },
    { icon: ClipboardList, title: 'My Bookings', text: 'View and manage your reservations', onClick: () => navigate('/reservations') },
    { icon: Navigation, title: 'Where Did I Park?', text: parked ? `Parked at ${parked.area?.name}` : 'Find your parked vehicle easily', onClick: () => navigate('/reservations') },
  ];

  return (
    <section className="home-section">
      <div className="qa-grid">
        {actions.map(({ icon: Icon, title, text, onClick }) => (
          <button className="qa-card" key={title} onClick={onClick} type="button">
            <span className="qa-icon"><Icon size={22} /></span>
            <span className="qa-body">
              <strong>{title}</strong>
              <span>{text}</span>
            </span>
            <ArrowRight className="qa-arrow" size={18} />
          </button>
        ))}
      </div>
    </section>
  );
}

function WhereDidIPark({ navigate, token }) {
  const [parked, setParked] = useState(null);

  useEffect(() => {
    let active = true;
    getMyReservations(token)
      .then((data) => { if (active) setParked((data.reservations || []).find((r) => r.status === 'CHECKED_IN') || null); })
      .catch(() => null);
    return () => { active = false; };
  }, [token]);

  if (!parked) return null;
  return (
    <section className="home-section">
      <div className="parked-banner">
        <div className="parked-pin"><MapPin size={26} /></div>
        <div>
          <p className="parked-eyebrow">You are parked here</p>
          <h3>{parked.area?.name || 'Parking area'} · Slot {parked.slot?.slotNumber || '—'}</h3>
          <p className="parked-meta">{parked.vehicle?.registrationNumber} · since {new Date(parked.checkedInAt || parked.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <button className="secondary-button compact-button" onClick={() => navigate('/reservations')} type="button">View booking</button>
      </div>
    </section>
  );
}

function UpcomingEvents({ navigate, token }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let active = true;
    listEvents(token)
      .then((data) => { if (active) setEvents(data.events || []); })
      .catch(() => null);
    return () => { active = false; };
  }, [token]);

  if (!events.length) return null;
  return (
    <section className="home-section">
      <div className="home-section-head"><h2>Events near you</h2></div>
      <div className="event-list">
        {events.slice(0, 3).map((event) => (
          <button className="event-banner" key={event._id} onClick={() => navigate(`/destinations/${event.destination?._id}`)} type="button">
            <span className="event-icon"><CalendarClock size={22} /></span>
            <div>
              <span className={`event-status event-${event.status.toLowerCase()}`}>{event.status === 'ACTIVE' ? 'Happening now' : event.status === 'UPCOMING' ? 'Upcoming' : 'Ended'}</span>
              <h3>{event.name}</h3>
              <p>{event.destination?.name} · {new Date(event.startsAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function PopularDestinations({ navigate, token }) {
  const [destinations, setDestinations] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    listDestinations(token)
      .then((data) => { if (active) setDestinations(data.destinations); })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [token]);

  return (
    <section className="home-section">
      <div className="home-section-head">
        <h2>Popular Destinations Near You</h2>
        <button className="text-link" onClick={() => navigate('/destinations')} type="button">View all →</button>
      </div>
      {error ? (
        <div className="form-alert" role="alert">{error}</div>
      ) : !destinations ? (
        <div className="loading-block"><span className="spinner" /> Loading destinations…</div>
      ) : destinations.length === 0 ? (
        <p className="empty-state">No destinations available yet.</p>
      ) : (
        <div className="destination-rail">
          {destinations.slice(0, 8).map((destination) => (
            <div className="destination-rail-item" key={destination._id}>
              <DestinationCard destination={destination} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
