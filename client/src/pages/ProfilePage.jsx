import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';

const STAFF_ROLE_LABELS = { admin: 'Administrator', security: 'Security', operator: 'Parking operator' };

export default function ProfilePage() {
  const { updateProfile, user } = useAuth();
  const staffLabel = STAFF_ROLE_LABELS[user.role];
  const [form, setForm] = useState({ name: user.name, email: user.email, phone: user.phone });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setForm({ name: user.name, email: user.email, phone: user.phone });
  }, [user]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setErrors((current) => ({ ...current, [event.target.name]: undefined }));
    setMessage('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrors({});
    setMessage('');
    setIsSaving(true);

    try {
      await updateProfile(form);
      setMessage('Profile updated successfully.');
    } catch (error) {
      setMessage(error.message);
      setErrors(error.errors || {});
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="management-layout">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Account settings</p>
          <h1>Your profile</h1>
        </div>
        {staffLabel && <span className="role-badge">{staffLabel}</span>}
      </header>

      <section className="management-card">
        {message && <div className={Object.keys(errors).length ? 'form-alert' : 'success-alert'} role="status">{message}</div>}
        <form className="management-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="profile-name">Full name</label>
          <input id="profile-name" name="name" onChange={updateField} required value={form.name} />
          {errors.name && <p className="field-error">{errors.name}</p>}

          <label htmlFor="profile-email">Email address</label>
          <input id="profile-email" name="email" onChange={updateField} required type="email" value={form.email} />
          {errors.email && <p className="field-error">{errors.email}</p>}

          <label htmlFor="profile-phone">Phone number</label>
          <input id="profile-phone" name="phone" onChange={updateField} required type="tel" value={form.phone} />
          {errors.phone && <p className="field-error">{errors.phone}</p>}

          <button className="primary-button" disabled={isSaving} type="submit">
            {isSaving ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      </section>
    </main>
  );
}
