import { useCallback, useEffect, useState } from 'react';
import RefreshStatus from '../components/RefreshStatus.jsx';
import ReportCard from '../components/ReportCard.jsx';
import ReportForm from '../components/ReportForm.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { usePollingResource } from '../hooks/usePollingResource.js';
import { listParkingAreas, listParkingSlots } from '../services/parkingService.js';
import { createReport, getMyReports, listReports, updateReportStatus } from '../services/reportService.js';

export default function ReportsPage() {
  const { token, user } = useAuth();
  const isStaff = ['security', 'admin'].includes(user.role);
  const [areas, setAreas] = useState([]);
  const [slots, setSlots] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState({ message: '', isError: false });

  useEffect(() => {
    let active = true;
    Promise.all([listParkingAreas(token), listParkingSlots(token)])
      .then(([areaData, slotData]) => { if (active) { setAreas(areaData.parkingAreas); setSlots(slotData.parkingSlots); } })
      .catch((error) => active && setFeedback({ message: error.message, isError: true }));
    return () => { active = false; };
  }, [token]);

  const loader = useCallback(async (signal) => {
    const data = isStaff
      ? await listReports(token, { status: statusFilter }, { signal })
      : await getMyReports(token, { signal });
    return data.reports;
  }, [isStaff, statusFilter, token]);
  const polling = usePollingResource(loader);

  async function submitReport(form) {
    setIsSaving(true); setErrors({}); setFeedback({ message: '', isError: false });
    try {
      await createReport(token, form);
      setFeedback({ message: 'Misparking report submitted successfully.', isError: false });
      polling.refresh();
      return true;
    } catch (error) {
      setErrors(error.errors || {});
      setFeedback({ message: error.message, isError: true });
      return false;
    } finally { setIsSaving(false); }
  }

  async function changeStatus(report, status) {
    setActionId(report._id); setFeedback({ message: '', isError: false });
    try {
      await updateReportStatus(token, report._id, status);
      setFeedback({ message: `Report moved to ${status.toLowerCase().replace('_', ' ')}.`, isError: false });
    } catch (error) { setFeedback({ message: error.message, isError: true }); }
    finally { setActionId(null); polling.refresh(); }
  }

  if (polling.isLoading && !polling.data) return <main className="route-status" role="status">Loading reports…</main>;
  const reports = polling.data || [];
  return (
    <main className="management-layout">
      <header className="page-heading"><div><p className="eyebrow">Parking safety</p><h1>Misparking reports</h1><p>{isStaff ? 'Review and process reports from drivers across the city.' : 'Report incorrectly parked vehicles and track their status.'}</p></div><span className="count-badge">{reports.length} reports</span></header>
      {feedback.message && <div className={feedback.isError ? 'form-alert' : 'success-alert'} role={feedback.isError ? 'alert' : 'status'}>{feedback.message}</div>}
      <section className="management-card"><h2>Submit a report</h2><ReportForm areas={areas} errors={errors} isSaving={isSaving} onSubmit={submitReport} slots={slots} /></section>
      <RefreshStatus error={polling.error} isRefreshing={polling.isRefreshing} lastUpdated={polling.lastUpdated} onRefresh={polling.refresh} />
      <section aria-busy={polling.isRefreshing} aria-labelledby="report-list-title">
        <div className="list-heading"><h2 id="report-list-title">{isStaff ? 'Report queue' : 'Your reports'}</h2>{isStaff && <label>Status filter<select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}><option value="">All statuses</option><option>PENDING</option><option>UNDER_REVIEW</option><option>RESOLVED</option><option>REJECTED</option></select></label>}</div>
        {reports.length === 0 ? <p className="empty-state">No reports match this view.</p> : <div className="report-grid">{reports.map((report) => <ReportCard actionId={actionId} canProcess={isStaff} key={report._id} onStatusChange={changeStatus} report={report} />)}</div>}
      </section>
    </main>
  );
}
