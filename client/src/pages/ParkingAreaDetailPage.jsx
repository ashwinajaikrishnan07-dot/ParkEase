import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, Clock, RefreshCw, PartyPopper, Plus } from 'lucide-react';
import AvailabilitySummary from '../components/AvailabilitySummary.jsx';
import SlotMap from '../components/SlotMap.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { getAlternatives, getParkingArea, listParkingSlots } from '../services/parkingService.js';
import { createVehicle, getVehicles } from '../services/vehicleService.js';
import { getMyReservations } from '../services/reservationService.js';
import { getMyWaitlist, joinWaitlist, leaveWaitlist } from '../services/waitlistService.js';

function defaultDate() {
  return new Date().toISOString().slice(0, 10);
}

const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// Default to a near-future window (start ~30 min from now, 1 hour long) so a
// booking is valid out of the box instead of defaulting to a past time today.
function defaultStartTime() {
  const d = new Date(Date.now() + 30 * 60000);
  d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
  return hhmm(d);
}

function defaultEndTime() {
  const d = new Date(Date.now() + 90 * 60000);
  d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
  return hhmm(d);
}

function combine(date, time) {
  return new Date(`${date}T${time}`);
}

export default function ParkingAreaDetailPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [area, setArea] = useState(null);
  const [slots, setSlots] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [vehicleId, setVehicleId] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(defaultEndTime);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [alternatives, setAlternatives] = useState([]);
  const [waitEntry, setWaitEntry] = useState(null);
  const [waitBusy, setWaitBusy] = useState(false);
  const [myReservations, setMyReservations] = useState([]);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({ registrationNumber: '', type: 'CAR', model: '', color: '' });
  const [vehicleErrors, setVehicleErrors] = useState({});
  const [addingVehicle, setAddingVehicle] = useState(false);

  const availableCount = useMemo(() => slots.filter((s) => s.status === 'AVAILABLE').length, [slots]);

  useEffect(() => {
    if (isLoading || availableCount > 0) { setAlternatives([]); return undefined; }
    let active = true;
    Promise.all([getAlternatives(token, id), getMyWaitlist(token)])
      .then(([altData, waitData]) => {
        if (!active) return;
        setAlternatives(altData.alternatives);
        setWaitEntry(waitData.entries.find((e) => (e.area?._id || e.area) === id) || null);
      })
      .catch(() => null);
    return () => { active = false; };
  }, [isLoading, availableCount, token, id]);

  async function toggleWaitlist() {
    setWaitBusy(true);
    try {
      if (waitEntry) {
        await leaveWaitlist(token, waitEntry._id);
        setWaitEntry(null);
        toast.success('Left the waitlist.');
      } else {
        const data = await joinWaitlist(token, id);
        setWaitEntry(data.entry);
        toast.success("You're on the waitlist. We'll hold your place in line.");
      }
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setWaitBusy(false);
    }
  }

  const loadSlots = useCallback(async () => {
    const data = await listParkingSlots(token, { area: id });
    setSlots(data.parkingSlots);
    // If the bay I had selected has since been booked by someone else, drop it
    // so I can't try to book an occupied slot.
    setSelected((current) => {
      if (!current) return current;
      const fresh = data.parkingSlots.find((s) => s._id === current._id);
      if (fresh && fresh.status !== 'AVAILABLE') {
        toast.error(`Slot ${current.slotNumber} was just taken. Please pick another.`);
        return null;
      }
      return current;
    });
  }, [id, token, toast]);

  // Keep the live parking map fresh so booked bays show as occupied without a
  // manual refresh (polls every 12s while the page is open).
  useEffect(() => {
    const timer = window.setInterval(() => { loadSlots().catch(() => null); }, 12000);
    return () => window.clearInterval(timer);
  }, [loadSlots]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    Promise.all([getParkingArea(token, id), listParkingSlots(token, { area: id }), getVehicles(token), getMyReservations(token)])
      .then(([areaData, slotData, vehicleData, resData]) => {
        if (!active) return;
        setArea(areaData.parkingArea);
        setSlots(slotData.parkingSlots);
        setVehicles(vehicleData.vehicles);
        setMyReservations(resData.reservations || []);
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [id, token]);

  const compatibleVehicles = useMemo(
    () => (selected ? vehicles.filter((v) => v.type === selected.vehicleType) : vehicles),
    [selected, vehicles],
  );

  useEffect(() => {
    if (compatibleVehicles.length && !compatibleVehicles.some((v) => v._id === vehicleId)) {
      setVehicleId(compatibleVehicles[0]._id);
    }
    if (!compatibleVehicles.length) setVehicleId('');
  }, [compatibleVehicles, vehicleId]);

  async function refresh() {
    setIsRefreshing(true);
    try {
      await loadSlots();
      const areaData = await getParkingArea(token, id);
      setArea(areaData.parkingArea);
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleSelect(slot) {
    setSelected((current) => (current?._id === slot._id ? null : slot));
  }

  function openAddVehicle() {
    // Prefill the type to match the selected bay so the new vehicle is compatible.
    setVehicleForm({ registrationNumber: '', type: selected?.vehicleType || 'CAR', model: '', color: '' });
    setVehicleErrors({});
    setShowAddVehicle(true);
  }

  function changeVehicleField(event) {
    setVehicleForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setVehicleErrors((current) => ({ ...current, [event.target.name]: undefined }));
  }

  async function addVehicle(event) {
    event.preventDefault();
    setAddingVehicle(true);
    setVehicleErrors({});
    try {
      const payload = { ...vehicleForm, registrationNumber: vehicleForm.registrationNumber.trim().toUpperCase() };
      const data = await createVehicle(token, payload);
      setVehicles((current) => [data.vehicle, ...current]);
      setVehicleId(data.vehicle._id); // auto-select the just-added vehicle, stay on booking
      setShowAddVehicle(false);
      toast.success('Vehicle added. You can proceed to booking.');
    } catch (requestError) {
      setVehicleErrors(requestError.errors || {});
      toast.error(requestError.message);
    } finally {
      setAddingVehicle(false);
    }
  }

  const start = combine(date, startTime);
  const end = combine(date, endTime);
  const durationMs = end - start;
  const durationValid = durationMs > 0;
  const durationLabel = durationValid ? `${Math.round((durationMs / 3600000) * 10) / 10} hr` : '—';

  // Prevent booking a vehicle that already has an overlapping reservation —
  // this is the real reason a free (green) slot can still be rejected at checkout.
  const vehicleBusy = Boolean(
    vehicleId && durationValid && myReservations.some((r) => (
      ['ACTIVE', 'CHECKED_IN'].includes(r.status)
      && (r.vehicle?._id || r.vehicle) === vehicleId
      && new Date(r.startTime) < end && new Date(r.endTime) > start
    )),
  );

  const canProceed = Boolean(selected && vehicleId && durationValid && area?.status === 'OPEN' && !vehicleBusy);

  function proceed() {
    if (!canProceed) return;
    const vehicle = vehicles.find((v) => v._id === vehicleId);
    navigate('/checkout', {
      state: {
        areaId: id,
        areaName: area.name,
        pricePerHour: area.pricePerHour,
        slotId: selected._id,
        slotNumber: selected.slotNumber,
        vehicleId,
        vehicleLabel: `${vehicle.registrationNumber} · ${vehicle.model}`,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        date,
        startLabel: startTime,
        endLabel: endTime,
        durationLabel,
      },
    });
  }

  if (isLoading) return <main className="route-status" role="status"><span className="spinner" /> Loading parking area…</main>;
  if (!area) {
    return (
      <main className="status-card">
        <p className="eyebrow">Unavailable</p>
        <h1>Parking area unavailable</h1>
        <p className="summary">{error || 'This parking area could not be loaded.'}</p>
        <Link className="text-link" to="/parking">← Back to parking</Link>
      </main>
    );
  }

  return (
    <div className="availability-layout">
      <Link className="back-link" to="/parking"><ArrowLeft size={16} /> All parking areas</Link>
      <header className="area-detail-heading">
        <div>
          <span className={`status-badge status-${area.status.toLowerCase()}`}>{area.status}</span>
          <h1>{area.name}</h1>
          <p className="area-detail-sub">{area.location}</p>
        </div>
        <span className="capacity-label">Capacity {area.capacity}</span>
      </header>
      {area.description && <p className="area-description">{area.description}</p>}

      <div className="booking-time-bar">
        <label><CalendarDays size={14} /> Date
          <input min={defaultDate()} onChange={(e) => setDate(e.target.value)} type="date" value={date} />
        </label>
        <label><Clock size={14} /> Start
          <input onChange={(e) => setStartTime(e.target.value)} type="time" value={startTime} />
        </label>
        <label><Clock size={14} /> End
          <input onChange={(e) => setEndTime(e.target.value)} type="time" value={endTime} />
        </label>
        <button className="secondary-button compact-button" disabled={isRefreshing} onClick={refresh} style={{ alignSelf: 'end' }} type="button">
          <RefreshCw size={15} /> {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {area.status !== 'OPEN' && (
        <div className="form-alert" role="alert">This area is currently {area.status.toLowerCase()} and not accepting bookings.</div>
      )}
      {!durationValid && <div className="form-alert" role="alert">End time must be after the start time.</div>}

      <div className="booking-layout">
        <div>
          <div className="slot-legend">
            <span><span className="legend-dot legend-available" /> Available</span>
            <span><span className="legend-dot legend-booked" /> Booked</span>
            <span><span className="legend-dot legend-selected" /> Selected</span>
            <span><span className="legend-dot legend-maintenance" /> Maintenance</span>
          </div>
          {availableCount === 0 && slots.length > 0 && (
            <div className="alternatives-panel">
              <h3>This parking area is currently full.</h3>
              <div className="waitlist-row">
                {waitEntry?.status === 'NOTIFIED' ? (
                  <span className="waitlist-notified"><PartyPopper size={15} style={{ verticalAlign: '-2px' }} /> A slot just opened — book now!</span>
                ) : waitEntry ? (
                  <span className="waitlist-waiting">You're on the waitlist. We'll notify you when a slot frees up.</span>
                ) : (
                  <span>Can't find a spot here?</span>
                )}
                <button className={waitEntry ? 'secondary-button compact-button' : 'primary-button compact-button'} disabled={waitBusy} onClick={toggleWaitlist} type="button">
                  {waitBusy ? 'Please wait…' : waitEntry ? 'Leave waitlist' : 'Join waitlist'}
                </button>
              </div>
              {alternatives.length === 0 ? (
                <p>No nearby alternatives are free right now. Please check back shortly.</p>
              ) : (
                <>
                  <p>Try these instead:</p>
                  <ul className="alternatives-list">
                    {alternatives.map((alt) => (
                      <li key={alt._id}>
                        <div>
                          <strong>{alt.name}</strong>
                          <span>{alt.walkingMinutes} min walk · {alt.availability.availableSlots} spaces free</span>
                        </div>
                        <Link className="secondary-button compact-button" to={`/parking/${alt._id}`}>View Slots</Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
          {slots.length === 0 ? (
            <p className="empty-state">No parking slots have been configured for this area yet.</p>
          ) : (
            <SlotMap onSelect={handleSelect} selectedId={selected?._id} slots={slots} />
          )}
        </div>

        <aside className="booking-summary">
          <h2>Booking summary</h2>
          {selected ? (
            <div className="summary-slot">
              <strong>{selected.slotNumber}</strong>
              <span>{selected.vehicleType} · {selected.category}</span>
            </div>
          ) : (
            <p className="summary-hint">Select an available slot from the map to begin.</p>
          )}
          <dl className="summary-rows">
            <div className="summary-row"><dt>Parking area</dt><dd>{area.name}</dd></div>
            <div className="summary-row"><dt>Date</dt><dd>{new Date(date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</dd></div>
            <div className="summary-row"><dt>Time</dt><dd>{startTime} – {endTime}</dd></div>
            <div className="summary-row"><dt>Duration</dt><dd>{durationLabel}</dd></div>
          </dl>
          <div className="summary-divider" />
          <label htmlFor="booking-vehicle">Select vehicle</label>
          {compatibleVehicles.length > 0 && (
            <select id="booking-vehicle" onChange={(e) => setVehicleId(e.target.value)} value={vehicleId}>
              {compatibleVehicles.map((v) => <option key={v._id} value={v._id}>{v.registrationNumber} · {v.model}</option>)}
            </select>
          )}
          {compatibleVehicles.length === 0 && (
            <p className="summary-hint">
              {vehicles.length === 0
                ? 'No vehicles saved yet — add one below to continue.'
                : `None of your vehicles are a ${selected?.vehicleType?.toLowerCase() || 'matching'} type — add one below.`}
            </p>
          )}

          {!showAddVehicle ? (
            <button className="add-vehicle-link" onClick={openAddVehicle} type="button">
              <Plus size={15} /> Add {compatibleVehicles.length > 0 ? 'another' : 'a'} vehicle
            </button>
          ) : (
            <form className="inline-vehicle-form" onSubmit={addVehicle} noValidate>
              <div>
                <label htmlFor="iv-reg">Registration number</label>
                <input autoFocus id="iv-reg" name="registrationNumber" onChange={changeVehicleField} placeholder="TN37AB1234" value={vehicleForm.registrationNumber} />
                {vehicleErrors.registrationNumber && <p className="field-error">{vehicleErrors.registrationNumber}</p>}
              </div>
              <div>
                <label htmlFor="iv-type">Type</label>
                <select id="iv-type" name="type" onChange={changeVehicleField} value={vehicleForm.type}>
                  {['CAR', 'MOTORCYCLE', 'SCOOTER', 'BICYCLE'].map((t) => <option key={t} value={t}>{t.toLowerCase()}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="iv-model">Model</label>
                <input id="iv-model" name="model" onChange={changeVehicleField} placeholder="Honda City" value={vehicleForm.model} />
                {vehicleErrors.model && <p className="field-error">{vehicleErrors.model}</p>}
              </div>
              <div>
                <label htmlFor="iv-color">Color</label>
                <input id="iv-color" name="color" onChange={changeVehicleField} placeholder="Silver" value={vehicleForm.color} />
                {vehicleErrors.color && <p className="field-error">{vehicleErrors.color}</p>}
              </div>
              <div className="inline-vehicle-actions">
                <button className="primary-button compact-button" disabled={addingVehicle} type="submit">{addingVehicle ? 'Saving…' : 'Save vehicle'}</button>
                <button className="secondary-button compact-button" onClick={() => setShowAddVehicle(false)} type="button">Cancel</button>
              </div>
            </form>
          )}
          {vehicleBusy && (
            <p className="summary-warning" role="alert">
              This vehicle already has a booking for an overlapping time. Pick another vehicle or change the time.
            </p>
          )}
          <button className="primary-button" disabled={!canProceed} onClick={proceed} type="button">
            Proceed to Booking <ArrowRight size={18} />
          </button>
          <AvailabilitySummary availability={area.availability} />
        </aside>
      </div>
    </div>
  );
}
