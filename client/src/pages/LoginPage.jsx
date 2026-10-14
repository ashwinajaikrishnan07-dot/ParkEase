import { useCallback, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';

export default function LoginPage() {
  const { isAuthenticated, login, googleSignIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const destination = location.state?.from?.pathname || '/dashboard';

  const handleGoogle = useCallback(async (credential) => {
    setError('');
    try {
      await googleSignIn(credential);
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [googleSignIn, navigate, destination]);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [event.target.name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await login(form);
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError.message);
      setFieldErrors(requestError.errors || {});
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="eyebrow">Welcome back</p>
        <h1 id="login-title">Sign in</h1>
        <p className="auth-intro">Access parking availability and your ParkEase account.</p>

        {error && <div className="form-alert" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="login-email">Email address</label>
          <input
            autoComplete="email"
            id="login-email"
            name="email"
            onChange={updateField}
            required
            type="email"
            value={form.email}
            aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
          />
          {fieldErrors.email && <p className="field-error" id="login-email-error">{fieldErrors.email}</p>}

          <label htmlFor="login-password">Password</label>
          <input
            autoComplete="current-password"
            id="login-password"
            name="password"
            onChange={updateField}
            required
            type="password"
            value={form.password}
            aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
          />
          {fieldErrors.password && <p className="field-error" id="login-password-error">{fieldErrors.password}</p>}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <GoogleSignInButton onCredential={handleGoogle} onError={setError} />

        <p className="auth-switch">New to ParkEase? <Link to="/register">Create an account</Link></p>
      </section>
    </main>
  );
}
