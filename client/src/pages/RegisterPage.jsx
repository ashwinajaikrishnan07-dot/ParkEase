import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
};

export default function RegisterPage() {
  const { isAuthenticated, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [event.target.name]: undefined }));
  }

  function validate() {
    const errors = {};
    if (form.name.trim().length < 2) errors.name = 'Enter your full name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email address';
    if (!/^\+?[0-9\s()-]{10,20}$/.test(form.phone)) errors.phone = 'Enter a valid phone number';
    if (form.password.length < 8) errors.password = 'Use at least 8 characters';
    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = validate();
    setError('');
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      await register(form);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
      setFieldErrors(requestError.errors || {});
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-card" aria-labelledby="register-title">
        <p className="eyebrow">Join ParkEase</p>
        <h1 id="register-title">Create account</h1>
        <p className="auth-intro">Create a free account to find and book parking across the city.</p>

        {error && <div className="form-alert" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="register-name">Full name</label>
          <input autoComplete="name" id="register-name" name="name" onChange={updateField} required value={form.name} />
          {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}

          <label htmlFor="register-email">Email address</label>
          <input autoComplete="email" id="register-email" name="email" onChange={updateField} required type="email" value={form.email} />
          {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}

          <label htmlFor="register-phone">Phone number</label>
          <input autoComplete="tel" id="register-phone" name="phone" onChange={updateField} required type="tel" value={form.phone} />
          {fieldErrors.phone && <p className="field-error">{fieldErrors.phone}</p>}

          <label htmlFor="register-password">Password</label>
          <input autoComplete="new-password" id="register-password" maxLength="72" minLength="8" name="password" onChange={updateField} required type="password" value={form.password} />
          {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">Already registered? <Link to="/login">Sign in</Link></p>
      </section>
    </main>
  );
}
