import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { createParkingArea, deleteParkingArea, listParkingAreas, updateParkingArea } from '../services/parkingService.js';

const types = ['CAR', 'MOTORCYCLE', 'SCOOTER', 'BICYCLE'];
const statuses = ['OPEN', 'FULL', 'CLOSED', 'MAINTENANCE'];
const emptyForm = { name: '', location: '', description: '', capacity: 1, allowedVehicleTypes: ['CAR'], status: 'OPEN' };

export default function ParkingAreasPage() {
  const { token } = useAuth();
  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    listParkingAreas(token)
      .then((data) => active && setAreas(data.parkingAreas))
      .catch((error) => active && setMessage(error.message))
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, [token]);

  function changeField(event) {
    const value = event.target.name === 'capacity' ? Number(event.target.value) : event.target.value;
    setForm((current) => ({ ...current, [event.target.name]: value }));
    setErrors((current) => ({ ...current, [event.target.name]: undefined }));
  }

  function toggleType(type) {
    setForm((current) => ({
      ...current,
      allowedVehicleTypes: current.allowedVehicleTypes.includes(type)
        ? current.allowedVehicleTypes.filter((item) => item !== type)
        : [...current.allowedVehicleTypes, type],
    }));
    setErrors((current) => ({ ...current, allowedVehicleTypes: undefined }));
  }

  function resetForm() { setForm(emptyForm); setEditingId(null); setErrors({}); }
  function editArea(area) {
    setEditingId(area._id);
    setForm({ name: area.name, location: area.location, description: area.description, capacity: area.capacity, allowedVehicleTypes: area.allowedVehicleTypes, status: area.status });
    setErrors({}); setMessage(''); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(event) {
    event.preventDefault(); setIsSaving(true); setErrors({}); setMessage('');
    try {
      if (editingId) {
        const data = await updateParkingArea(token, editingId, form);
        setAreas((current) => current.map((area) => area._id === editingId ? data.parkingArea : area));
        setMessage('Parking area updated.');
      } else {
        const data = await createParkingArea(token, form);
        setAreas((current) => [...current, data.parkingArea].sort((a, b) => a.name.localeCompare(b.name)));
        setMessage('Parking area created.');
      }
      resetForm();
    } catch (error) { setMessage(error.message); setErrors(error.errors || {}); }
    finally { setIsSaving(false); }
  }

  async function remove(area) {
    if (!window.confirm(`Delete ${area.name}? Areas containing slots cannot be deleted.`)) return;
    try {
      await deleteParkingArea(token, area._id);
      setAreas((current) => current.filter((item) => item._id !== area._id));
      setMessage('Parking area deleted.');
    } catch (error) { setMessage(error.message); setErrors(error.errors || {}); }
  }

  return (
    <main className="management-layout">
      <header className="page-heading"><div><p className="eyebrow">Admin inventory</p><h1>Parking areas</h1></div><span className="count-badge">{areas.length} areas</span></header>
      <section className="management-card">
        <h2>{editingId ? 'Edit parking area' : 'Create parking area'}</h2>
        {message && <div className={Object.keys(errors).length ? 'form-alert' : 'success-alert'} role="status">{message}</div>}
        <form className="parking-form" onSubmit={submit} noValidate>
          <div><label htmlFor="area-name">Name</label><input id="area-name" name="name" onChange={changeField} value={form.name} />{errors.name && <p className="field-error">{errors.name}</p>}</div>
          <div><label htmlFor="area-location">Location</label><input id="area-location" name="location" onChange={changeField} value={form.location} />{errors.location && <p className="field-error">{errors.location}</p>}</div>
          <div><label htmlFor="area-capacity">Capacity</label><input id="area-capacity" min="1" name="capacity" onChange={changeField} type="number" value={form.capacity} />{errors.capacity && <p className="field-error">{errors.capacity}</p>}</div>
          <div><label htmlFor="area-status">Status</label><select id="area-status" name="status" onChange={changeField} value={form.status}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div>
          <div className="wide-field"><label htmlFor="area-description">Description</label><textarea id="area-description" name="description" onChange={changeField} rows="3" value={form.description} />{errors.description && <p className="field-error">{errors.description}</p>}</div>
          <fieldset className="wide-field checkbox-group"><legend>Allowed vehicle types</legend>{types.map((type) => <label key={type}><input checked={form.allowedVehicleTypes.includes(type)} onChange={() => toggleType(type)} type="checkbox" /> {type}</label>)}{errors.allowedVehicleTypes && <p className="field-error">{errors.allowedVehicleTypes}</p>}</fieldset>
          <div className="form-actions"><button className="primary-button" disabled={isSaving} type="submit">{isSaving ? 'Saving…' : editingId ? 'Update area' : 'Create area'}</button>{editingId && <button className="secondary-button" onClick={resetForm} type="button">Cancel</button>}</div>
        </form>
      </section>
      <section><h2>Managed areas</h2>{isLoading ? <p className="empty-state">Loading areas…</p> : areas.length === 0 ? <p className="empty-state">No parking areas yet.</p> : <div className="parking-grid">{areas.map((area) => <article className="parking-card" key={area._id}><div><span className={`status-badge status-${area.status.toLowerCase()}`}>{area.status}</span><h3>{area.name}</h3><p>{area.location}</p><p>{area.capacity} spaces · {area.allowedVehicleTypes.join(', ')}</p></div><div className="card-actions"><button className="secondary-button" onClick={() => editArea(area)}>Edit</button><button className="danger-button" onClick={() => remove(area)}>Delete</button></div></article>)}</div>}</section>
    </main>
  );
}
