import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../services/api.js';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

function loadGsiScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('load-failed')));
      return undefined;
    }
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('load-failed'));
    document.head.appendChild(script);
    return undefined;
  });
}

// Renders the official Google button when the backend reports Google is
// configured; otherwise shows a clear setup notice. Never fakes success.
export default function GoogleSignInButton({ onCredential, onError }) {
  const buttonRef = useRef(null);
  const [status, setStatus] = useState('checking'); // checking | ready | disabled | error

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      let config;
      try {
        config = await apiRequest('/api/auth/config');
      } catch {
        if (!cancelled) setStatus('error');
        return;
      }
      if (cancelled) return;
      if (!config.googleEnabled || !config.googleClientId) {
        setStatus('disabled');
        return;
      }
      try {
        await loadGsiScript();
        if (cancelled || !buttonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: config.googleClientId,
          callback: (response) => {
            if (response?.credential) onCredential(response.credential);
            else onError?.('No credential returned by Google');
          },
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: 320,
          logo_alignment: 'center',
        });
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    }

    setup();
    return () => { cancelled = true; };
  }, [onCredential, onError]);

  if (status === 'disabled') {
    return (
      <div className="google-auth">
        <div className="auth-divider"><span>or</span></div>
        <p className="google-setup-note">
          Google sign-in isn’t configured on this server. Add a <code>GOOGLE_CLIENT_ID</code> to enable it. Email and password sign-in works below.
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="google-auth">
        <div className="auth-divider"><span>or</span></div>
        <p className="google-setup-note">Google sign-in is temporarily unavailable. Please use email and password.</p>
      </div>
    );
  }

  return (
    <div className="google-auth">
      <div className="auth-divider"><span>or</span></div>
      <div className="google-button-host" ref={buttonRef} aria-live="polite">
        {status === 'checking' && <span className="route-status"><span className="spinner" /> Loading Google sign-in…</span>}
      </div>
    </div>
  );
}
