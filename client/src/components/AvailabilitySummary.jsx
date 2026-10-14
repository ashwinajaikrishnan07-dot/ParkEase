export default function AvailabilitySummary({ availability }) {
  const stats = [
    ['Available', availability.availableSlots],
    ['Occupied', availability.occupiedSlots],
    ['Reserved', availability.reservedSlots],
    ['Maintenance', availability.maintenanceSlots],
  ];

  return (
    <div className="availability-summary">
      <div className="availability-stats">
        {stats.map(([label, value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
      </div>
      <label className="occupancy-progress">
        <span>{availability.occupancyPercentage}% occupied</span>
        <progress max="100" value={availability.occupancyPercentage}>{availability.occupancyPercentage}%</progress>
      </label>
    </div>
  );
}
