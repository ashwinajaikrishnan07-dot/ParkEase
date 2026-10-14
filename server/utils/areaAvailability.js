const ParkingSlot = require('../models/ParkingSlot');

function emptyAvailability() {
  return {
    totalSlots: 0,
    availableSlots: 0,
    occupiedSlots: 0,
    reservedSlots: 0,
    maintenanceSlots: 0,
    usableSlots: 0,
    occupancyPercentage: 0,
    availableByType: {},
  };
}

// Enriches ParkingArea documents with live availability derived from slot state,
// including per-vehicle-type available counts (cars vs two-wheelers vs EV).
async function enrichWithAvailability(parkingAreas) {
  if (parkingAreas.length === 0) return [];

  const areaIds = parkingAreas.map((area) => area._id);
  const [summaries, typeRows] = await Promise.all([
    ParkingSlot.aggregate([
      { $match: { area: { $in: areaIds } } },
      {
        $group: {
          _id: '$area',
          totalSlots: { $sum: 1 },
          availableSlots: { $sum: { $cond: [{ $eq: ['$status', 'AVAILABLE'] }, 1, 0] } },
          occupiedSlots: { $sum: { $cond: [{ $eq: ['$status', 'OCCUPIED'] }, 1, 0] } },
          reservedSlots: { $sum: { $cond: [{ $eq: ['$status', 'RESERVED'] }, 1, 0] } },
          maintenanceSlots: { $sum: { $cond: [{ $eq: ['$status', 'MAINTENANCE'] }, 1, 0] } },
        },
      },
    ]),
    ParkingSlot.aggregate([
      { $match: { area: { $in: areaIds }, status: 'AVAILABLE' } },
      { $group: { _id: { area: '$area', type: '$vehicleType' }, count: { $sum: 1 } } },
    ]),
  ]);

  const byArea = new Map(summaries.map((summary) => [summary._id.toString(), summary]));
  const typeByArea = new Map();
  for (const row of typeRows) {
    const key = row._id.area.toString();
    if (!typeByArea.has(key)) typeByArea.set(key, {});
    typeByArea.get(key)[row._id.type] = row.count;
  }

  return parkingAreas.map((area) => {
    const summary = byArea.get(area._id.toString());
    const availability = summary
      ? {
          totalSlots: summary.totalSlots,
          availableSlots: summary.availableSlots,
          occupiedSlots: summary.occupiedSlots,
          reservedSlots: summary.reservedSlots,
          maintenanceSlots: summary.maintenanceSlots,
          usableSlots: summary.totalSlots - summary.maintenanceSlots,
          occupancyPercentage: 0,
          availableByType: typeByArea.get(area._id.toString()) || {},
        }
      : emptyAvailability();

    if (availability.usableSlots > 0) {
      availability.occupancyPercentage = Math.round((availability.occupiedSlots / availability.usableSlots) * 10000) / 100;
    }

    // Live congestion derived purely from current slot state (no prediction).
    availability.congestionLevel = congestionLevel(availability);

    return { ...area.toJSON(), availability };
  });
}

// Congestion level reflects how hard it is to find a space right now.
function congestionLevel(availability) {
  if (availability.usableSlots === 0) return 'UNKNOWN';
  if (availability.availableSlots === 0) return 'FULL';
  const occupancy = availability.occupancyPercentage;
  if (occupancy >= 90) return 'HIGH';
  if (occupancy >= 60) return 'MEDIUM';
  return 'LOW';
}

module.exports = { enrichWithAvailability, emptyAvailability, congestionLevel };
