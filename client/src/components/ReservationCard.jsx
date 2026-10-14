import { useState } from 'react';
import { CalendarDays, Clock, Car, QrCode, X, AlertTriangle, CalendarPlus, Receipt, IndianRupee } from 'lucide-react';
import ParkingPass from './ParkingPass.jsx';
import ReceiptModal from './ReceiptModal.jsx';
import SmartImage from './SmartImage.jsx';

const RES_IMAGES = [
  'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=600&q=70',
  'https://images.unsplash.com/photo-1621928372414-30e144d111a0?auto=format&fit=crop&w=600&q=70',
  'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=600&q=70',
];

function imageFor(id = '') {
  let sum = 0;
  for (let i = 0; i < id.length; i += 1) sum += id.charCodeAt(i);
  return RES_IMAGES[sum % RES_IMAGES.length];
}

function friendly(status) {
  return status.toLowerCase().replace('_', ' ').replace(/^./, (c) => c.toUpperCase());
}

const EXTEND_OPTIONS = [1, 2, 3];

export default function ReservationCard({ action, onAction, reservation }) {
  const [showPass, setShowPass] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showExtend, setShowExtend] = useState(false);
  const now = Date.now();
  const checkInOpens = new Date(reservation.startTime).getTime() - 15 * 60 * 1000;
  const checkInCloses = new Date(reservation.endTime).getTime();
  const canCheckIn = now >= checkInOpens && now < checkInCloses;
  const isBusy = action?.id === reservation._id;
  const overstay = reservation.overstay;
  const cost = reservation.finalCost ?? reservation.estimatedCost ?? 0;
  const isLive = ['ACTIVE', 'CHECKED_IN'].includes(reservation.status);

  function extendBy(hours) {
    const newEnd = new Date(new Date(reservation.endTime).getTime() + hours * 60 * 60 * 1000).toISOString();
    setShowExtend(false);
    onAction('extend', reservation, newEnd);
  }

  return (
    <article className="reservation-card">
      <div className="reservation-card-media">
        <SmartImage alt={reservation.area?.name || 'Parking'} src={imageFor(reservation.area?._id || reservation._id)} />
      </div>
      <div className="reservation-card-body">
        <div className="reservation-card-heading">
          <span className={`status-badge reservation-${reservation.status.toLowerCase()}`}>{friendly(reservation.status)}</span>
          <strong>{reservation.slot?.slotNumber || '—'}</strong>
        </div>
        <h3>{reservation.area?.name || 'Parking area'}</h3>
        <p><Car size={14} style={{ verticalAlign: '-2px' }} /> {reservation.vehicle?.registrationNumber || 'Vehicle unavailable'}</p>

        {overstay?.isOverstaying && (
          <div className="overstay-alert" role="alert">
            <AlertTriangle size={15} />
            <span>Overstaying by {overstay.minutes} min · extra fee ₹{overstay.fee} so far. Check out or extend.</span>
          </div>
        )}

        {reservation.status === 'CANCELLED' && reservation.refundStatus && (
          <div className={`refund-note refund-${reservation.refundStatus.toLowerCase()}`}>
            <strong>
              {reservation.refundAmount > 0
                ? `Refund ₹${reservation.refundAmount} · ${reservation.refundStatus}`
                : 'No refund'}
            </strong>
            <span>{reservation.refundReason}</span>
          </div>
        )}

        <dl>
          <div><dt><CalendarDays size={14} style={{ verticalAlign: '-2px' }} /> Date</dt><dd>{new Date(reservation.startTime).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</dd></div>
          <div><dt><Clock size={14} style={{ verticalAlign: '-2px' }} /> Time</dt><dd>{new Date(reservation.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(reservation.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</dd></div>
          {reservation.durationMinutes != null && <div><dt>Duration</dt><dd>{reservation.durationMinutes} min</dd></div>}
          {cost > 0 && <div><dt><IndianRupee size={14} style={{ verticalAlign: '-2px' }} /> {reservation.status === 'COMPLETED' ? 'Paid' : 'Estimate'}</dt><dd>₹{cost}</dd></div>}
        </dl>

        {reservation.status === 'ACTIVE' && (
          <>
            <div className="reservation-actions">
              <button className="primary-button compact-button" disabled={!canCheckIn || isBusy} onClick={() => onAction('checkIn', reservation)} type="button">
                {isBusy && action.type === 'checkIn' ? 'Checking in…' : 'Check in'}
              </button>
              <button className="danger-button compact-button" disabled={isBusy} onClick={() => onAction('cancel', reservation)} type="button">
                {isBusy && action.type === 'cancel' ? 'Cancelling…' : 'Cancel'}
              </button>
            </div>
            {!canCheckIn && <p className="action-hint">{now < checkInOpens ? `Check-in opens ${new Date(checkInOpens).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Check-in window closed'}</p>}
          </>
        )}
        {reservation.status === 'CHECKED_IN' && (
          <div className="reservation-actions">
            <button className="primary-button compact-button" disabled={isBusy} onClick={() => onAction('checkOut', reservation)} type="button">
              {isBusy && action.type === 'checkOut' ? 'Checking out…' : 'Check out'}
            </button>
          </div>
        )}

        <div className="reservation-links">
          {isLive && (
            <button className="pass-link" onClick={() => setShowPass(true)} type="button"><QrCode size={15} /> Parking pass</button>
          )}
          {isLive && (
            <button className="pass-link" disabled={isBusy} onClick={() => setShowExtend(true)} type="button"><CalendarPlus size={15} /> Extend</button>
          )}
          {reservation.status === 'COMPLETED' && (
            <button className="pass-link" onClick={() => setShowReceipt(true)} type="button"><Receipt size={15} /> Receipt</button>
          )}
        </div>
      </div>

      {showExtend && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setShowExtend(false)}>
          <div className="extend-modal">
            <button aria-label="Close" className="modal-close" onClick={() => setShowExtend(false)} type="button"><X size={18} /></button>
            <h3>Extend parking</h3>
            <p className="extend-sub">Current end: {new Date(reservation.endTime).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
            <div className="extend-options">
              {EXTEND_OPTIONS.map((h) => (
                <button className="extend-option" key={h} onClick={() => extendBy(h)} type="button">
                  +{h} hour{h > 1 ? 's' : ''}
                  <span>₹{(reservation.pricePerHour || 0) * h} more</span>
                </button>
              ))}
            </div>
            <p className="extend-note">Subject to availability. A reservation can total up to 24 hours.</p>
          </div>
        </div>
      )}

      {showReceipt && <ReceiptModal onClose={() => setShowReceipt(false)} reservationId={reservation._id} />}

      {showPass && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setShowPass(false)}>
          <div className="pass-modal">
            <button aria-label="Close" className="modal-close" onClick={() => setShowPass(false)} type="button"><X size={18} /></button>
            <ParkingPass
              areaName={reservation.area?.name || 'Parking area'}
              dateLabel={new Date(reservation.startTime).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
              reference={reservation._id}
              slotNumber={reservation.slot?.slotNumber || '—'}
              timeLabel={`${new Date(reservation.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(reservation.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              vehicle={reservation.vehicle?.registrationNumber}
            />
          </div>
        </div>
      )}
    </article>
  );
}
