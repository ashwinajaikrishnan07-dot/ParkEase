import { useMemo, useState } from 'react';

const violationTypes = ['NO_VALID_RESERVATION', 'WRONG_SLOT', 'RESTRICTED_SLOT', 'ACCESSIBLE_SLOT_MISUSE', 'EV_SLOT_MISUSE', 'BLOCKING_OR_OBSTRUCTING', 'OTHER'];
const empty = { area: '', slot: '', vehicleNumber: '', violationType: 'WRONG_SLOT', description: '', imageUrl: '' };
const label = (value) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());

export default function ReportForm({ areas, errors, isSaving, onSubmit, slots }) {
  const [form, setForm] = useState(empty);
  const matchingSlots = useMemo(() => slots.filter((slot) => slot.area === form.area), [form.area, slots]);

  function change(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value, ...(name === 'area' ? { slot: '' } : {}) }));
  }
  async function submit(event) {
    event.preventDefault();
    const succeeded = await onSubmit(form);
    if (succeeded) setForm({ ...empty, area: areas[0]?._id || '' });
  }

  return (
    <form className="report-form" onSubmit={submit} noValidate>
      <div><label htmlFor="report-area">Parking area</label><select id="report-area" name="area" onChange={change} value={form.area}><option value="">Select area</option>{areas.map((area) => <option key={area._id} value={area._id}>{area.name}</option>)}</select>{errors.area && <p className="field-error">{errors.area}</p>}</div>
      <div><label htmlFor="report-slot">Parking slot</label><select id="report-slot" name="slot" onChange={change} value={form.slot}><option value="">Select slot</option>{matchingSlots.map((slot) => <option key={slot._id} value={slot._id}>{slot.slotNumber}</option>)}</select>{errors.slot && <p className="field-error">{errors.slot}</p>}</div>
      <div><label htmlFor="report-vehicle">Vehicle number</label><input id="report-vehicle" name="vehicleNumber" onChange={change} placeholder="KL07AB1234" value={form.vehicleNumber} />{errors.vehicleNumber && <p className="field-error">{errors.vehicleNumber}</p>}</div>
      <div><label htmlFor="report-type">Violation</label><select id="report-type" name="violationType" onChange={change} value={form.violationType}>{violationTypes.map((type) => <option key={type} value={type}>{label(type)}</option>)}</select>{errors.violationType && <p className="field-error">{errors.violationType}</p>}</div>
      <div className="wide-field"><label htmlFor="report-description">Description</label><textarea id="report-description" name="description" onChange={change} placeholder="Describe what happened and where the vehicle is positioned." rows="4" value={form.description} />{errors.description && <p className="field-error">{errors.description}</p>}</div>
      <div className="wide-field"><label htmlFor="report-image">Evidence image URL <span>(optional)</span></label><input id="report-image" name="imageUrl" onChange={change} placeholder="https://example.com/evidence.jpg" type="url" value={form.imageUrl} />{errors.imageUrl && <p className="field-error">{errors.imageUrl}</p>}</div>
      <button className="primary-button wide-field" disabled={isSaving || !areas.length} type="submit">{isSaving ? 'Submitting…' : 'Submit report'}</button>
    </form>
  );
}
