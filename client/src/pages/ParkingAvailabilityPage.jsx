import { useCallback, useMemo, useState } from 'react';
import ParkingAreaCard from '../components/ParkingAreaCard.jsx';
import ParkingFilters from '../components/ParkingFilters.jsx';
import RefreshStatus from '../components/RefreshStatus.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { usePollingResource } from '../hooks/usePollingResource.js';
import { listParkingAreas } from '../services/parkingService.js';

const initialFilters = { search: '', status: '', vehicleType: '', availableOnly: false };

export default function ParkingAvailabilityPage() {
  const { token } = useAuth();
  const [filters, setFilters] = useState(initialFilters);
  const loadAreas = useCallback(async (signal) => {
    const data = await listParkingAreas(token, { signal });
    return data.parkingAreas;
  }, [token]);
  const { data: areas, error, isLoading, isRefreshing, lastUpdated, refresh } = usePollingResource(loadAreas);

  const visibleAreas = useMemo(() => {
    if (!areas) return [];
    const search = filters.search.trim().toLowerCase();
    return areas.filter((area) => {
      if (search && !`${area.name} ${area.location}`.toLowerCase().includes(search)) return false;
      if (filters.status && area.status !== filters.status) return false;
      if (filters.vehicleType && !area.allowedVehicleTypes.includes(filters.vehicleType)) return false;
      if (filters.availableOnly && !(area.status === 'OPEN' && area.availability.availableSlots > 0)) return false;
      return true;
    });
  }, [areas, filters]);

  function changeFilter(event) {
    const { checked, name, type, value } = event.target;
    setFilters((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  }

  return (
    <main className="availability-layout">
      <header className="page-heading"><div><p className="eyebrow">Live parking status</p><h1>Find parking</h1><p>Availability refreshes automatically every 15 seconds.</p></div></header>
      <ParkingFilters filters={filters} onChange={changeFilter} onReset={() => setFilters(initialFilters)} />
      <RefreshStatus error={error} isRefreshing={isRefreshing} lastUpdated={lastUpdated} onRefresh={refresh} />
      <section aria-busy={isRefreshing} aria-labelledby="parking-results-title">
        <div className="results-heading"><h2 id="parking-results-title">Parking areas</h2>{areas && <span>{visibleAreas.length} of {areas.length} areas</span>}</div>
        {isLoading && !areas ? <p className="empty-state" role="status">Loading parking availability…</p> : !areas ? <div className="form-alert" role="alert">{error || 'Parking availability could not be loaded.'}</div> : areas.length === 0 ? <p className="empty-state">No parking areas have been configured.</p> : visibleAreas.length === 0 ? <p className="empty-state">No parking areas match these filters.</p> : <div className="availability-grid">{visibleAreas.map((area) => <ParkingAreaCard area={area} key={area._id} />)}</div>}
      </section>
    </main>
  );
}
