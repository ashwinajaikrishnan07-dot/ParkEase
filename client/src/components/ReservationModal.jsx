import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createReservation } from '../services/reservationService.js';
import { getVehicles } from '../services/vehicleService.js';

function localDateTime(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function ReservationModal({ area, onClose, onConflict, onSuccess, slot, token }) {
  const initialStart = new Date(Date.now() + 5 * 60000);
  const [form, setForm] = useState({ vehicle: '', startTime: localDateTime(initialStart), endTime: localDateTime(new Date(initialStart.getTime() + 60 * 60000)) });
  const [vehicles, setVehicles] = useState([]);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const closeButton = useRef(null);

  useEffect(() => {
    closeButton.current?.focus();
    function handleKey(event) { if (event.key === 'Escape' && !isSaving) onClose(); }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isSaving, onClose]);

  useEffect(() => {
    let active = true;
    getVehicles(token).then((data) => {
      if (!active) return;
      const compatible = data.vehicles.filter((vehicle) => vehicle.type === slot.vehicleType);
      setVehicles(compatible);
      setForm((current) => ({ ...current, vehicle: compatible[0]?._id || '' }));
    }).catch((error) => active && setMessage(error.message)).finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, [slot.vehicleType, token]);

  function change(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); setErrors((current) => ({ ...current, [event.target.name]: undefined })); }
  async function submit(event) {
    event.preventDefault();
    const startTime = new Date(form.startTime);
    const endTime = new Date(form.endTime);
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      setErrors({ startTime: 'Enter valid reservation times', endTime: 'Enter valid reservation times' });
      return;
    }
    setIsSaving(true); setMessage(''); setErrors({});
    try {
      const data = await createReservation(token, { vehicle: form.vehicle, area: area._id, slot: slot._id, startTime: startTime.toISOString(), endTime: endTime.toISOString() });
      onSuccess(data.reservation);
    } catch (error) { setMessage(error.message); setErrors(error.errors || {}); if (error.status === 409) onConflict?.(); }
    finally { setIsSaving(false); }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !isSaving && onClose()}><section aria-labelledby="reservation-title" aria-modal="true" className="reservation-modal" role="dialog"><button aria-label="Close reservation dialog" className="modal-close" disabled={isSaving} onClick={onClose} ref={closeButton} type="button">×</button><p className="eyebrow">Reserve parking</p><h2 id="reservation-title">Slot {slot.slotNumber}</h2><p>{area.name} · {slot.vehicleType} · {slot.category}</p>{message && <div className="form-alert" role="alert">{message}</div>}{isLoading ? <p role="status">Loading your vehicles…</p> : vehicles.length === 0 ? <div className="empty-state">You need a registered {slot.vehicleType.toLowerCase()} before reserving this slot. <Link to="/vehicles">Manage vehicles</Link></div> : <form className="reservation-form" onSubmit={submit}><label htmlFor="reservation-vehicle">Vehicle</label><select id="reservation-vehicle" name="vehicle" onChange={change} value={form.vehicle}>{vehicles.map((vehicle) => <option key={vehicle._id} value={vehicle._id}>{vehicle.registrationNumber} · {vehicle.model}</option>)}</select>{errors.vehicle && <p className="field-error">{errors.vehicle}</p>}<label htmlFor="reservation-start">Start time</label><input id="reservation-start" name="startTime" onChange={change} type="datetime-local" value={form.startTime} />{errors.startTime && <p className="field-error">{errors.startTime}</p>}<label htmlFor="reservation-end">End time</label><input id="reservation-end" name="endTime" onChange={change} type="datetime-local" value={form.endTime} />{errors.endTime && <p className="field-error">{errors.endTime}</p>}<button className="primary-button" disabled={isSaving} type="submit">{isSaving ? 'Reserving…' : 'Confirm reservation'}</button></form>}</section></div>;
}
