import { QRCodeSVG } from 'qrcode.react';
import { CircleParking } from 'lucide-react';

export default function ParkingPass({ areaName, dateLabel, destinationName, reference, slotNumber, timeLabel, vehicle }) {
  return (
    <div className="parking-pass">
      <div className="parking-pass-head">
        <span className="brand"><CircleParking size={18} color="#f2b900" style={{ verticalAlign: '-3px', marginRight: 4 }} />Park<span className="brand-wise">Ease</span></span>
        <span className="parking-pass-tag">Parking Pass</span>
      </div>
      <div className="parking-pass-slot">
        <strong>{slotNumber}</strong>
        <span>{areaName}{destinationName ? ` · ${destinationName}` : ''}</span>
      </div>
      <div className="parking-pass-qr">
        <QRCodeSVG value={reference} size={132} level="M" marginSize={1} />
        <span>Scan at entry / exit</span>
      </div>
      <dl className="parking-pass-rows">
        {dateLabel && <div><dt>Date</dt><dd>{dateLabel}</dd></div>}
        {timeLabel && <div><dt>Time</dt><dd>{timeLabel}</dd></div>}
        {vehicle && <div><dt>Vehicle</dt><dd>{vehicle}</dd></div>}
        <div><dt>Booking ID</dt><dd>{reference}</dd></div>
      </dl>
    </div>
  );
}
