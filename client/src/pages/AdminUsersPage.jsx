import { useCallback, useState } from 'react';
import RefreshStatus from '../components/RefreshStatus.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { usePollingResource } from '../hooks/usePollingResource.js';
import { listUsers, updateUserRole } from '../services/adminService.js';

const roles = ['user', 'operator', 'security', 'admin'];

export default function AdminUsersPage() {
  const { token, user } = useAuth();
  const [actionId, setActionId] = useState(null);
  const [feedback, setFeedback] = useState({ message: '', isError: false });
  const loader = useCallback(async (signal) => (await listUsers(token, { signal })).users, [token]);
  const { data: users, error, isLoading, isRefreshing, lastUpdated, refresh } = usePollingResource(loader);

  async function changeRole(target, role) {
    setActionId(target._id); setFeedback({ message: '', isError: false });
    try {
      await updateUserRole(token, target._id, role);
      setFeedback({ message: `${target.name} is now ${role}.`, isError: false });
    } catch (requestError) { setFeedback({ message: requestError.message, isError: true }); }
    finally { setActionId(null); refresh(); }
  }

  if (isLoading && !users) return <main className="route-status" role="status">Loading users…</main>;
  const list = users || [];
  return (
    <main className="management-layout">
      <header className="page-heading"><div><p className="eyebrow">Administration</p><h1>Users</h1></div><span className="count-badge">{list.length} users</span></header>
      {feedback.message && <div className={feedback.isError ? 'form-alert' : 'success-alert'} role={feedback.isError ? 'alert' : 'status'}>{feedback.message}</div>}
      <RefreshStatus error={error} isRefreshing={isRefreshing} lastUpdated={lastUpdated} onRefresh={refresh} />
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th></tr></thead><tbody>{list.map((item) => <tr key={item._id}><td>{item.name}</td><td>{item.email}</td><td>{item.phone}</td><td><label className="sr-only" htmlFor={`role-${item._id}`}>Role for {item.name}</label><select disabled={actionId === item._id || item._id === user._id} id={`role-${item._id}`} onChange={(event) => changeRole(item, event.target.value)} value={item.role}>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select>{item._id === user._id && <span className="self-note"> (you)</span>}</td></tr>)}</tbody></table></div>
    </main>
  );
}
