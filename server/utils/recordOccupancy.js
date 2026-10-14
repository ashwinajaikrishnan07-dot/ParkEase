const OccupancyHistory = require('../models/OccupancyHistory');
const ParkingSlot = require('../models/ParkingSlot');

async function recordOccupancy(areaId) {
  const [summary] = await ParkingSlot.aggregate([
    { $match: { area: areaId } },
    {
      $group: {
        _id: '$area',
        totalSlots: { $sum: 1 },
        occupiedCount: { $sum: { $cond: [{ $eq: ['$status', 'OCCUPIED'] }, 1, 0] } },
        availableCount: { $sum: { $cond: [{ $eq: ['$status', 'AVAILABLE'] }, 1, 0] } },
        maintenanceCount: { $sum: { $cond: [{ $eq: ['$status', 'MAINTENANCE'] }, 1, 0] } },
      },
    },
  ]);

  const occupiedCount = summary?.occupiedCount || 0;
  const availableCount = summary?.availableCount || 0;
  const usableSlots = (summary?.totalSlots || 0) - (summary?.maintenanceCount || 0);
  const occupancyPercentage = usableSlots > 0
    ? Math.round((occupiedCount / usableSlots) * 10000) / 100
    : 0;

  return OccupancyHistory.create({
    area: areaId,
    occupiedCount,
    availableCount,
    occupancyPercentage,
    recordedAt: new Date(),
  });
}

module.exports = { recordOccupancy };
