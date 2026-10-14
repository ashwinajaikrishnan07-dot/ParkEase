const statuses = ['OPEN', 'FULL', 'CLOSED', 'MAINTENANCE'];
const vehicleTypes = ['CAR', 'MOTORCYCLE', 'SCOOTER', 'BICYCLE'];

export default function ParkingFilters({ filters, onChange, onReset }) {
  return (
    <fieldset className="availability-filters">
      <legend>Filter parking areas</legend>
      <label>Search<input name="search" onChange={onChange} placeholder="Name or location" type="search" value={filters.search} /></label>
      <label>Status<select name="status" onChange={onChange} value={filters.status}><option value="">All statuses</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Vehicle type<select name="vehicleType" onChange={onChange} value={filters.vehicleType}><option value="">All types</option>{vehicleTypes.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="available-filter"><input checked={filters.availableOnly} name="availableOnly" onChange={onChange} type="checkbox" /> Available now</label>
      <button className="secondary-button" onClick={onReset} type="button">Reset filters</button>
    </fieldset>
  );
}
