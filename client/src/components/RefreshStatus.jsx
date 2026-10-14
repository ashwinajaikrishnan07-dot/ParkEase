export default function RefreshStatus({ error, isRefreshing, lastUpdated, onRefresh }) {
  return (
    <div className="refresh-status">
      <div>
        {lastUpdated && <span>Updated <time dateTime={lastUpdated.toISOString()}>{lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time></span>}
        {error && <span className="stale-message" role="alert">Could not refresh: {error}. Showing the last available data.</span>}
      </div>
      <button className="secondary-button" disabled={isRefreshing} onClick={onRefresh} type="button">{isRefreshing ? 'Refreshing…' : 'Refresh now'}</button>
    </div>
  );
}
