import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { createParkingSlot, deleteParkingSlot, listParkingAreas, listParkingSlots, updateParkingSlot } from '../services/parkingService.js';

const vehicleTypes = ['CAR', 'MOTORCYCLE', 'SCOOTER', 'BICYCLE'];
const categories = ['GENERAL', 'FACULTY', 'VISITOR', 'EV', 'ACCESSIBLE'];
const statuses = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'];
const blank = { area: '', slotNumber: '', vehicleType: 'CAR', category: 'GENERAL', status: 'AVAILABLE' };

export default function ParkingSlotsPage() {
  const { token } = useAuth();
  const [areas, setAreas] = useState([]); const [slots, setSlots] = useState([]);
  const [form, setForm] = useState(blank); const [editingId, setEditingId] = useState(null);
  const [filterArea, setFilterArea] = useState(''); const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(''); const [isLoading, setIsLoading] = useState(true); const [isSaving, setIsSaving] = useState(false);
  const areaNames = useMemo(() => Object.fromEntries(areas.map((area) => [area._id, area.name])), [areas]);

  useEffect(() => {
    let active = true;
    Promise.all([listParkingAreas(token), listParkingSlots(token)])
      .then(([areaData, slotData]) => { if (!active) return; setAreas(areaData.parkingAreas); setSlots(slotData.parkingSlots); setForm((current) => ({ ...current, area: current.area || areaData.parkingAreas[0]?._id || '' })); })
      .catch((error) => active && setMessage(error.message)).finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, [token]);

  async function applyFilter(value) {
    setFilterArea(value); setIsLoading(true);
    try { const data = await listParkingSlots(token, { area: value }); setSlots(data.parkingSlots); }
    catch (error) { setMessage(error.message); } finally { setIsLoading(false); }
  }
  function change(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); setErrors((current) => ({ ...current, [event.target.name]: undefined })); }
  function reset() { setEditingId(null); setForm({ ...blank, area: areas[0]?._id || '' }); setErrors({}); }
  function edit(slot) { setEditingId(slot._id); setForm({ area: slot.area, slotNumber: slot.slotNumber, vehicleType: slot.vehicleType, category: slot.category, status: slot.status }); setMessage(''); setErrors({}); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  async function submit(event) {
    event.preventDefault(); setIsSaving(true); setMessage(''); setErrors({});
    try {
      const data = editingId ? await updateParkingSlot(token, editingId, form) : await createParkingSlot(token, form);
      if (filterArea && data.parkingSlot.area !== filterArea) setSlots((current) => current.filter((slot) => slot._id !== editingId));
      else if (editingId) setSlots((current) => current.map((slot) => slot._id === editingId ? data.parkingSlot : slot));
      else setSlots((current) => [...current, data.parkingSlot]);
      setMessage(editingId ? 'Parking slot updated.' : 'Parking slot created.'); reset();
    } catch (error) { setMessage(error.message); setErrors(error.errors || {}); } finally { setIsSaving(false); }
  }

  async function remove(slot) {
    if (!window.confirm(`Delete slot ${slot.slotNumber}?`)) return;
    try { await deleteParkingSlot(token, slot._id); setSlots((current) => current.filter((item) => item._id !== slot._id)); setMessage('Parking slot deleted.'); }
    catch (error) { setMessage(error.message); setErrors(error.errors || {}); }
  }

  return (
    <main className="management-layout">
      <header className="page-heading"><div><p className="eyebrow">Admin inventory</p><h1>Parking slots</h1></div><span className="count-badge">{slots.length} shown</span></header>
      <section className="management-card"><h2>{editingId ? 'Edit parking slot' : 'Create parking slot'}</h2>{message && <div className={Object.keys(errors).length ? 'form-alert' : 'success-alert'} role="status">{message}</div>}
        {areas.length === 0 ? <p className="empty-state">Create a parking area before adding slots.</p> : <form className="parking-form" onSubmit={submit} noValidate>
          <div><label htmlFor="slot-area">Parking area</label><select id="slot-area" name="area" onChange={change} value={form.area}>{areas.map((area) => <option key={area._id} value={area._id}>{area.name}</option>)}</select>{errors.area && <p className="field-error">{errors.area}</p>}</div>
          <div><label htmlFor="slot-number">Slot number</label><input id="slot-number" name="slotNumber" onChange={change} placeholder="A01" value={form.slotNumber} />{errors.slotNumber && <p className="field-error">{errors.slotNumber}</p>}</div>
          <div><label htmlFor="slot-type">Vehicle type</label><select id="slot-type" name="vehicleType" onChange={change} value={form.vehicleType}>{vehicleTypes.map((value) => <option key={value}>{value}</option>)}</select>{errors.vehicleType && <p className="field-error">{errors.vehicleType}</p>}</div>
          <div><label htmlFor="slot-category">Category</label><select id="slot-category" name="category" onChange={change} value={form.category}>{categories.map((value) => <option key={value}>{value}</option>)}</select></div>
          <div><label htmlFor="slot-status">Status</label><select id="slot-status" name="status" onChange={change} value={form.status}>{statuses.map((value) => <option key={value}>{value}</option>)}</select></div>
          <div className="form-actions"><button className="primary-button" disabled={isSaving}>{isSaving ? 'Saving…' : editingId ? 'Update slot' : 'Create slot'}</button>{editingId && <button className="secondary-button" onClick={reset} type="button">Cancel</button>}</div>
        </form>}
      </section>
      <section><div className="list-heading"><h2>Managed slots</h2><label>Filter by area <select onChange={(event) => applyFilter(event.target.value)} value={filterArea}><option value="">All areas</option>{areas.map((area) => <option key={area._id} value={area._id}>{area.name}</option>)}</select></label></div>
        {isLoading ? <p className="empty-state">Loading slots…</p> : slots.length === 0 ? <p className="empty-state">No matching parking slots.</p> : <div className="parking-grid">{slots.map((slot) => <article className="parking-card" key={slot._id}><div><span className={`status-badge status-${slot.status.toLowerCase()}`}>{slot.status}</span><h3>{slot.slotNumber}</h3><p>{areaNames[slot.area] || 'Unknown area'}</p><p>{slot.vehicleType} · {slot.category}</p></div><div className="card-actions"><button className="secondary-button" onClick={() => edit(slot)}>Edit</button><button className="danger-button" onClick={() => remove(slot)}>Delete</button></div></article>)}</div>}
      </section>
    </main>
  );
}
