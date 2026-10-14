const friendly = (value) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
const nextStatuses = { PENDING: ['UNDER_REVIEW', 'RESOLVED', 'REJECTED'], UNDER_REVIEW: ['RESOLVED', 'REJECTED'], RESOLVED: [], REJECTED: [] };

export default function ReportCard({ actionId, canProcess, onStatusChange, report }) {
  return (
    <article className="report-card">
      <div className="report-card-heading"><span className={`status-badge report-${report.status.toLowerCase()}`}>{friendly(report.status)}</span><time dateTime={report.createdAt}>{new Date(report.createdAt).toLocaleString()}</time></div>
      <h3>{friendly(report.violationType)}</h3>
      <p className="report-location">{report.area?.name || 'Parking area'} · Slot {report.slot?.slotNumber || 'Unavailable'}</p>
      <p><strong>Vehicle:</strong> {report.vehicleNumber}</p>
      <p>{report.description}</p>
      {canProcess && <p className="report-reporter"><strong>Reported by:</strong> {report.reporter?.name || 'Unknown'} ({report.reporter?.role || 'user'})</p>}
      {report.imageUrl && <a className="text-link" href={report.imageUrl} rel="noreferrer" target="_blank">Open evidence image</a>}
      {report.reviewedBy && <p className="review-meta">Reviewed by {report.reviewedBy.name} on <time dateTime={report.reviewedAt}>{new Date(report.reviewedAt).toLocaleString()}</time></p>}
      {canProcess && nextStatuses[report.status].length > 0 && <div className="report-actions">{nextStatuses[report.status].map((status) => <button className={status === 'REJECTED' ? 'danger-button' : 'secondary-button'} disabled={actionId === report._id} key={status} onClick={() => onStatusChange(report, status)} type="button">{actionId === report._id ? 'Updating…' : friendly(status)}</button>)}</div>}
    </article>
  );
}
