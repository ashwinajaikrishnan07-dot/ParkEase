import { Check, Wrench, Accessibility, Zap, ArrowDown } from 'lucide-react';

const BOOKED = ['RESERVED', 'OCCUPIED'];
const TWO_WHEELER = ['MOTORCYCLE', 'SCOOTER', 'BICYCLE'];
const CAR_ROW = 10; // bays per car row
const BIKE_ROW = 16; // bays per two-wheeler row (narrower bays)
const ROW_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Derive layout metadata the DB does not store: split by vehicle class, then
// chunk each class into fixed-width rows so the plan always lines up as a grid
// of real parking bays with aisles between the rows.
function buildSections(slots) {
  const cars = [];
  const bikes = [];
  for (const slot of slots) {
    (TWO_WHEELER.includes(slot.vehicleType) ? bikes : cars).push(slot);
  }
  const sort = (list) => list.sort((a, b) => a.slotNumber.localeCompare(b.slotNumber, undefined, { numeric: true }));
  sort(cars);
  sort(bikes);

  const sections = [];
  if (cars.length) sections.push({ kind: 'car', title: 'Car parking', perRow: CAR_ROW, rows: chunk(cars, CAR_ROW) });
  if (bikes.length) sections.push({ kind: 'bike', title: 'Two-wheeler parking', perRow: BIKE_ROW, rows: chunk(bikes, BIKE_ROW) });
  return sections;
}

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function CarSilhouette() {
  return (
    <svg className="veh" viewBox="0 0 40 72" aria-hidden="true">
      <rect x="4.5" y="3" width="31" height="66" rx="8" />
      <rect x="9" y="10" width="22" height="15" rx="4" className="veh-glass" />
      <rect x="9" y="46" width="22" height="12" rx="4" className="veh-glass" />
      <rect x="7" y="30" width="26" height="12" rx="2" className="veh-roof" />
    </svg>
  );
}

function BikeSilhouette() {
  return (
    <svg className="veh" viewBox="0 0 20 54" aria-hidden="true">
      <rect x="8" y="6" width="4" height="40" rx="2" />
      <rect x="3" y="11" width="14" height="4.5" rx="2.25" />
      <ellipse cx="10" cy="7" rx="3.2" ry="4" />
      <ellipse cx="10" cy="47" rx="3.6" ry="4.5" />
    </svg>
  );
}

export default function SlotMap({ onSelect, selectedId, slots }) {
  const sections = buildSections(slots);

  if (sections.length === 0) {
    return <p className="empty-state">No parking bays configured for this area yet.</p>;
  }

  return (
    <div className="lot" role="group" aria-label="Parking lot layout">
      <div className="lot-inner">
        <div className="lot-marker entrance"><ArrowDown size={14} /> Entrance</div>

        {sections.map((section) => (
          <section className={`lot-section lot-${section.kind}`} key={section.kind}>
            <header className="lot-section-title">
              {section.title}
              <span className="lot-section-count">{section.rows.flat().filter((s) => s.status === 'AVAILABLE').length} free</span>
            </header>

            {section.rows.map((rowSlots, rowIndex) => (
              <div key={rowIndex}>
                <div className="lot-rowline">
                  <span className="row-label">{ROW_LABELS[rowIndex] || rowIndex + 1}</span>
                  <div className={`bay-strip bay-strip-${section.kind}`}>
                    {rowSlots.map((slot) => {
                      const isSelected = slot._id === selectedId;
                      const isBooked = BOOKED.includes(slot.status);
                      const isMaintenance = slot.status === 'MAINTENANCE';
                      const isAvailable = slot.status === 'AVAILABLE';
                      const stateClass = isSelected ? 'is-selected' : isAvailable ? 'is-available' : isBooked ? 'is-booked' : 'is-maintenance';
                      const stateLabel = isSelected ? 'Selected' : isAvailable ? 'Available' : isMaintenance ? 'Under maintenance' : 'Booked';
                      const Silhouette = section.kind === 'car' ? CarSilhouette : BikeSilhouette;
                      return (
                        <button
                          aria-label={`Bay ${slot.slotNumber}, ${section.kind === 'car' ? 'car' : 'two-wheeler'}${slot.category && slot.category !== 'GENERAL' ? `, ${slot.category.toLowerCase()}` : ''} — ${stateLabel}`}
                          aria-pressed={isSelected}
                          className={`bay bay-${section.kind} ${stateClass}`}
                          disabled={!isAvailable && !isSelected}
                          key={slot._id}
                          onClick={() => isAvailable && onSelect(slot)}
                          title={`Bay ${slot.slotNumber} — ${stateLabel}`}
                          type="button"
                        >
                          {slot.category === 'ACCESSIBLE' && <span className="bay-tag"><Accessibility size={11} /></span>}
                          {slot.category === 'EV' && <span className="bay-tag bay-tag-ev"><Zap size={11} /></span>}
                          {isMaintenance ? (
                            <span className="bay-face"><Wrench size={section.kind === 'car' ? 18 : 13} /></span>
                          ) : isSelected ? (
                            <span className="bay-face bay-face-selected"><Check size={section.kind === 'car' ? 20 : 14} /></span>
                          ) : isBooked ? (
                            <Silhouette />
                          ) : null}
                          <span className="bay-number">{slot.slotNumber}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {rowIndex < section.rows.length - 1 && (
                  <div className="lot-aisle" aria-hidden="true">
                    <span className="aisle-arrow"><ArrowDown size={13} /></span>
                  </div>
                )}
              </div>
            ))}
          </section>
        ))}

        <div className="lot-marker exit"><ArrowDown size={14} /> Exit</div>
      </div>
    </div>
  );
}
