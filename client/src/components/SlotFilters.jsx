const statuses = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'];
const vehicleTypes = ['CAR', 'MOTORCYCLE', 'SCOOTER', 'BICYCLE'];
const categories = ['GENERAL', 'FACULTY', 'VISITOR', 'EV', 'ACCESSIBLE'];

export default function SlotFilters({ filters, onChange, onReset }) {
  return (
    <fieldset className="slot-filters">
      <legend>Filter slots</legend>
      {[['status', statuses], ['vehicleType', vehicleTypes], ['category', categories]].map(([name, values]) => <label key={name}>{name === 'vehicleType' ? 'Vehicle type' : name[0].toUpperCase() + name.slice(1)}<select name={name} onChange={onChange} value={filters[name]}><option value="">All</option>{values.map((value) => <option key={value}>{value}</option>)}</select></label>)}
      <button className="secondary-button" onClick={onReset} type="button">Reset filters</button>
    </fieldset>
  );
}
