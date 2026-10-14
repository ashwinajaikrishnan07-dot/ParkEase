import { Link } from 'react-router-dom';
import { MapPin, Star, Video, Umbrella, ArrowRight, Flame } from 'lucide-react';
import SmartImage from './SmartImage.jsx';

const AREA_IMAGES = [
  'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=600&q=70',
  'https://images.unsplash.com/photo-1621928372414-30e144d111a0?auto=format&fit=crop&w=600&q=70',
  'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=600&q=70',
  'https://images.unsplash.com/photo-1545179605-1296651e9d0b?auto=format&fit=crop&w=600&q=70',
  'https://images.unsplash.com/photo-1470224114660-3f6686c562eb?auto=format&fit=crop&w=600&q=70',
];

function imageFor(id = '') {
  let sum = 0;
  for (let i = 0; i < id.length; i += 1) sum += id.charCodeAt(i);
  return AREA_IMAGES[sum % AREA_IMAGES.length];
}

function rating(id = '') {
  let sum = 0;
  for (let i = 0; i < id.length; i += 1) sum += id.charCodeAt(i);
  return (4.3 + (sum % 7) / 10).toFixed(1);
}

export default function ParkingAreaCard({ area, eventName }) {
  const available = area.availability?.availableSlots ?? 0;
  const total = area.availability?.totalSlots ?? 0;
  const usable = area.status === 'OPEN' && available > 0;
  const countClass = available === 0 ? 'is-none' : available <= Math.max(2, total * 0.15) ? 'is-low' : '';
  const isLow = usable && available <= 5;

  return (
    <article className="area-card">
      <div className="area-card-media">
        <SmartImage alt={area.name} src={imageFor(area._id)} />
        <span className={`status-badge status-${area.status.toLowerCase()}`}>{area.status}</span>
        {area.availability?.congestionLevel && area.availability.congestionLevel !== 'LOW' && (
          <span className={`congestion-badge congestion-${area.availability.congestionLevel.toLowerCase()}`}>
            {area.availability.congestionLevel === 'FULL' ? 'Full' : area.availability.congestionLevel === 'HIGH' ? 'Filling fast' : 'Moderate'}
          </span>
        )}
        {area.isOverflow && <span className="overflow-badge">Overflow</span>}
      </div>
      <div className="area-card-body">
        {isLow && (
          <p className="urgency-banner"><Flame size={13} style={{ verticalAlign: '-2px' }} /> Only {available} slot{available > 1 ? 's' : ''} left — book soon{eventName ? ` to enjoy ${eventName}` : ''}!</p>
        )}
        <h3>{area.name}</h3>
        <span className="area-rating"><Star fill="currentColor" size={14} /> {rating(area._id)}</span>
        <span className="area-location"><MapPin size={14} /> {area.location}</span>
        <div className="area-tags">
          <span className="area-tag">{total} slots</span>
          <span className="area-tag"><Video size={12} /> CCTV</span>
          <span className="area-tag"><Umbrella size={12} /> Covered</span>
        </div>
        <div className="area-card-footer">
          <div className="area-availability">
            <span className={`area-availability-count ${countClass}`}>{available}</span>
            <span className="area-availability-label">slots<br />available</span>
          </div>
          <Link className={usable ? 'primary-button compact-button' : 'secondary-button compact-button'} to={`/parking/${area._id}`}>
            {usable ? 'View Parking' : 'View'} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}
