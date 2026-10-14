import { Link } from 'react-router-dom';

export default function UnauthorizedPage() {
  return (
    <main className="status-card">
      <p className="eyebrow">Access denied</p>
      <h1>Permission required</h1>
      <p className="summary">Your account does not have access to this page.</p>
      <Link className="text-link" to="/dashboard">Return to dashboard</Link>
    </main>
  );
}
