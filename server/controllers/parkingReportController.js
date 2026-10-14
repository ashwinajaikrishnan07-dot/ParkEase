const ParkingArea = require('../models/ParkingArea');
const ParkingReport = require('../models/ParkingReport');
const ParkingSlot = require('../models/ParkingSlot');
const AppError = require('../utils/AppError');

const population = [
  { path: 'reporter', select: 'name role' },
  { path: 'area', select: 'name location status' },
  { path: 'slot', select: 'slotNumber vehicleType category status' },
  { path: 'reviewedBy', select: 'name role' },
];
const transitions = {
  PENDING: ['UNDER_REVIEW', 'RESOLVED', 'REJECTED'],
  UNDER_REVIEW: ['RESOLVED', 'REJECTED'],
  RESOLVED: [],
  REJECTED: [],
};
const populatedReport = (id) => ParkingReport.findById(id).populate(population);

async function createReport(request, response) {
  const [area, slot] = await Promise.all([
    ParkingArea.findById(request.body.area),
    ParkingSlot.findById(request.body.slot),
  ]);
  if (!area) throw new AppError('Parking area not found', 404);
  if (!slot || !slot.area.equals(area._id)) throw new AppError('Parking slot not found in this area', 404);

  const report = await ParkingReport.create({ ...request.body, reporter: request.user._id, status: 'PENDING' });
  response.status(201).json({ success: true, message: 'Parking report submitted', data: { report: await populatedReport(report._id) } });
}

async function listMyReports(request, response) {
  const reports = await ParkingReport.find({ reporter: request.user._id }).sort({ createdAt: -1 }).populate(population);
  response.status(200).json({ success: true, message: 'Reports retrieved', data: { reports } });
}

async function listReports(request, response) {
  const filter = {};
  for (const field of ['status', 'violationType', 'area']) {
    if (request.query[field]) filter[field] = field === 'area' ? request.query[field] : request.query[field].toUpperCase();
  }
  const reports = await ParkingReport.find(filter).sort({ createdAt: -1 }).populate(population);
  response.status(200).json({ success: true, message: 'Report queue retrieved', data: { reports } });
}

async function getReport(request, response) {
  const report = await ParkingReport.findById(request.params.id);
  if (!report) throw new AppError('Parking report not found', 404);
  const isStaff = ['security', 'admin'].includes(request.user.role);
  if (!report.reporter.equals(request.user._id) && !isStaff) throw new AppError('You do not have permission to view this report', 403);
  response.status(200).json({ success: true, message: 'Parking report retrieved', data: { report: await populatedReport(report._id) } });
}

async function updateReportStatus(request, response) {
  const report = await ParkingReport.findById(request.params.id);
  if (!report) throw new AppError('Parking report not found', 404);
  if (!transitions[report.status].includes(request.body.status)) throw new AppError(`Report cannot move from ${report.status} to ${request.body.status}`, 409);

  const updated = await ParkingReport.findOneAndUpdate(
    { _id: report._id, status: report.status },
    { $set: { status: request.body.status, reviewedBy: request.user._id, reviewedAt: new Date() } },
    { returnDocument: 'after' },
  );
  if (!updated) throw new AppError('Report status changed before this update', 409);
  response.status(200).json({ success: true, message: 'Report status updated', data: { report: await populatedReport(updated._id) } });
}

module.exports = { createReport, getReport, listMyReports, listReports, updateReportStatus };
