export default function SlotCard({ canReserve = false, onReserve, slot }) {
  return (
    <article className={`slot-card slot-${slot.status.toLowerCase()}`}>
      <div className="slot-card-heading"><h3>{slot.slotNumber}</h3><span className={`status-badge status-${slot.status.toLowerCase()}`}>{slot.status}</span></div>
      <dl><div><dt>Vehicle</dt><dd>{slot.vehicleType}</dd></div><div><dt>Category</dt><dd>{slot.category}</dd></div></dl>
      {canReserve && <button className="reserve-button" onClick={() => onReserve(slot)} type="button">Reserve slot</button>}
    </article>
  );
}
