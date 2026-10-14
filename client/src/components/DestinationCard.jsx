import { Link } from 'react-router-dom';
import { MapPin, Star, ArrowRight, Heart, GraduationCap, ShoppingBag, Cross, Building2, Clapperboard, Bus, MapPinned, Landmark, CalendarClock, Trees, Utensils, Train } from 'lucide-react';
import SmartImage from './SmartImage.jsx';
import { useFavorites } from '../hooks/useFavorites.js';

const CATEGORY_ICON = {
  COLLEGE: GraduationCap,
  MALL: ShoppingBag,
  HOSPITAL: Cross,
  OFFICE: Building2,
  THEATRE: Clapperboard,
  BUS_STAND: Bus,
  TEMPLE: Landmark,
  EVENT_VENUE: CalendarClock,
  PUBLIC_PLACE: Trees,
  RESTAURANT: Utensils,
  HOTEL: Train,
};

const FALLBACK = 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=70';

function label(category) {
  return category.toLowerCase().replace('_', ' ').replace(/^./, (c) => c.toUpperCase());
}

export default function DestinationCard({ destination }) {
  const Icon = CATEGORY_ICON[destination.category] || MapPinned;
  const { isFavorite, toggle } = useFavorites();
  const faved = isFavorite(destination._id);

  function handleFavorite(event) {
    event.preventDefault();
    event.stopPropagation();
    toggle(destination._id);
  }

  return (
    <Link className="destination-card" to={`/destinations/${destination._id}`}>
      <div className="destination-card-media">
        <SmartImage alt={destination.name} src={destination.image || FALLBACK} />
        <span className="destination-category"><Icon size={13} /> {label(destination.category)}</span>
        <button
          aria-label={faved ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={faved}
          className={`favorite-button ${faved ? 'is-faved' : ''}`}
          onClick={handleFavorite}
          type="button"
        >
          <Heart fill={faved ? 'currentColor' : 'none'} size={18} />
        </button>
      </div>
      <div className="destination-card-body">
        <h3>{destination.name}</h3>
        <span className="area-location"><MapPin size={14} /> {destination.city || destination.address || 'Nearby'}</span>
        <div className="destination-card-footer">
          <span className="area-rating"><Star fill="currentColor" size={14} /> {destination.rating?.toFixed(1) ?? '4.5'}</span>
          <span className="destination-areas">{destination.parkingAreaCount ?? 0} parking areas <ArrowRight size={15} /></span>
        </div>
      </div>
    </Link>
  );
}
