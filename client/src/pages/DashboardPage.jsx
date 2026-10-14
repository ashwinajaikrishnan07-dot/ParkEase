import { useAuth } from '../hooks/useAuth.js';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <main className="dashboard-card">
      <p className="eyebrow">Authenticated session</p>
      <h1>Welcome, {user.name}</h1>
      <p className="summary">
        Your ParkEase account is connected. Find parking by destination,
        reserve a bay, and skip the traffic.
      </p>
      <dl className="account-details">
        <div><dt>Email</dt><dd>{user.email}</dd></div>
        <div><dt>Role</dt><dd>{user.role}</dd></div>
        <div><dt>Phone</dt><dd>{user.phone}</dd></div>
      </dl>
    </main>
  );
}
