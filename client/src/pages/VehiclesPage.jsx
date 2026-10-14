import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import {
  createVehicle,
  deleteVehicle,
  getVehicles,
  updateVehicle,
} from '../services/vehicleService.js';

const emptyForm = { registrationNumber: '', type: 'CAR', model: '', color: '' };
const vehicleTypes = ['CAR', 'MOTORCYCLE', 'SCOOTER', 'BICYCLE'];

export default function VehiclesPage() {
  const { token } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let active = true;

    getVehicles(token)
      .then((data) => {
        if (active) setVehicles(data.vehicles);
      })
      .catch((error) => {
        if (active) setMessage(error.message);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  function changeField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setErrors((current) => ({ ...current, [event.target.name]: undefined }));
    setMessage('');
  }

  function beginEdit(vehicle) {
    setEditingId(vehicle._id);
    setForm({
      registrationNumber: vehicle.registrationNumber,
      type: vehicle.type,
      model: vehicle.model,
      color: vehicle.color,
    });
    setErrors({});
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setMessage('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    setErrors({});
    setMessage('');

    try {
      if (editingId) {
        const data = await updateVehicle(token, editingId, form);
        setVehicles((current) => current.map((item) => (item._id === editingId ? data.vehicle : item)));
        setMessage('Vehicle updated successfully.');
      } else {
        const data = await createVehicle(token, form);
        setVehicles((current) => [data.vehicle, ...current]);
        setMessage('Vehicle added successfully.');
      }
      setEditingId(null);
      setForm(emptyForm);
    } catch (error) {
      setMessage(error.message);
      setErrors(error.errors || {});
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(vehicle) {
    if (!window.confirm(`Delete ${vehicle.registrationNumber}?`)) return;

    setDeletingId(vehicle._id);
    setMessage('');
    try {
      await deleteVehicle(token, vehicle._id);
      setVehicles((current) => current.filter((item) => item._id !== vehicle._id));
      if (editingId === vehicle._id) cancelEdit();
      setMessage('Vehicle deleted successfully.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="management-layout vehicle-layout">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Vehicle management</p>
          <h1>Your vehicles</h1>
        </div>
        <span className="count-badge">{vehicles.length} registered</span>
      </header>

      <section className="management-card">
        <h2>{editingId ? 'Edit vehicle' : 'Add a vehicle'}</h2>
        {message && <div className={Object.keys(errors).length ? 'form-alert' : 'success-alert'} role="status">{message}</div>}
        <form className="vehicle-form" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="vehicle-registration">Registration number</label>
            <input id="vehicle-registration" name="registrationNumber" onChange={changeField} placeholder="KL07AB1234" required value={form.registrationNumber} />
            {errors.registrationNumber && <p className="field-error">{errors.registrationNumber}</p>}
          </div>
          <div>
            <label htmlFor="vehicle-type">Vehicle type</label>
            <select id="vehicle-type" name="type" onChange={changeField} value={form.type}>
              {vehicleTypes.map((type) => <option key={type} value={type}>{type.toLowerCase()}</option>)}
            </select>
            {errors.type && <p className="field-error">{errors.type}</p>}
          </div>
          <div>
            <label htmlFor="vehicle-model">Model</label>
            <input id="vehicle-model" name="model" onChange={changeField} placeholder="Honda City" required value={form.model} />
            {errors.model && <p className="field-error">{errors.model}</p>}
          </div>
          <div>
            <label htmlFor="vehicle-color">Color</label>
            <input id="vehicle-color" name="color" onChange={changeField} placeholder="Silver" required value={form.color} />
            {errors.color && <p className="field-error">{errors.color}</p>}
          </div>
          <div className="form-actions">
            <button className="primary-button" disabled={isSaving} type="submit">{isSaving ? 'Saving…' : editingId ? 'Update vehicle' : 'Add vehicle'}</button>
            {editingId && <button className="secondary-button" onClick={cancelEdit} type="button">Cancel</button>}
          </div>
        </form>
      </section>

      <section aria-labelledby="vehicle-list-title">
        <h2 id="vehicle-list-title">Registered vehicles</h2>
        {isLoading ? (
          <p className="empty-state" role="status">Loading vehicles…</p>
        ) : vehicles.length === 0 ? (
          <p className="empty-state">No vehicles registered yet. Add your first vehicle above.</p>
        ) : (
          <div className="vehicle-grid">
            {vehicles.map((vehicle) => (
              <article className="vehicle-card" key={vehicle._id}>
                <div>
                  <span className="vehicle-type">{vehicle.type}</span>
                  <h3>{vehicle.registrationNumber}</h3>
                  <p>{vehicle.color} · {vehicle.model}</p>
                </div>
                <div className="card-actions">
                  <button className="secondary-button" onClick={() => beginEdit(vehicle)} type="button">Edit</button>
                  <button className="danger-button" disabled={deletingId === vehicle._id} onClick={() => handleDelete(vehicle)} type="button">
                    {deletingId === vehicle._id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
