const mongoose = require('mongoose');
const Destination = require('../models/Destination');
const TrafficReport = require('../models/TrafficReport');
const { TRAFFIC_LEVELS } = require('../models/TrafficReport');
const AppError = require('../utils/AppError');

const population = [{ path: 'user', select: 'name' }];

// Build a crowd-sourced summary from recent user traffic reports (last 6 hours).
function summarize(reports) {
  const recentWindow = Date.now() - 6 * 60 * 60 * 1000;
  const recent = reports.filter((r) => new Date(r.createdAt).getTime() >= recentWindow);
  const counts = { SMOOTH: 0, MODERATE: 0, HEAVY: 0 };
  for (const report of recent) counts[report.level] += 1;
  const total = recent.length;
  let level = null;
  if (total > 0) {
    level = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }
  return { level, counts, total };
}

async function listTrafficReports(request, response) {
  const destinationId = typeof request.query.destination === 'string' ? request.query.destination.trim() : '';
  if (!mongoose.isObjectIdOrHexString(destinationId)) throw new AppError('A valid destination id is required', 400, { destination: 'Select a destination' });

  const reports = await TrafficReport.find({ destination: destinationId })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate(population);

  response.status(200).json({
    success: true,
    message: 'Traffic reports retrieved',
    data: { reports, summary: summarize(reports) },
  });
}

async function createTrafficReport(request, response) {
  const destinationId = typeof request.body.destination === 'string' ? request.body.destination.trim() : '';
  const level = typeof request.body.level === 'string' ? request.body.level.trim().toUpperCase() : '';
  const comment = typeof request.body.comment === 'string' ? request.body.comment.trim().slice(0, 240) : '';
  const errors = {};
  if (!mongoose.isObjectIdOrHexString(destinationId)) errors.destination = 'Select a valid destination';
  if (!TRAFFIC_LEVELS.includes(level)) errors.level = 'Choose a traffic level';
  if (Object.keys(errors).length > 0) throw new AppError('Validation failed', 400, errors);

  const destination = await Destination.findById(destinationId);
  if (!destination) throw new AppError('Destination not found', 404);

  const report = await TrafficReport.create({ user: request.user._id, destination: destinationId, level, comment });
  const populated = await TrafficReport.findById(report._id).populate(population);
  response.status(201).json({ success: true, message: 'Thanks for the update', data: { report: populated } });
}

module.exports = { createTrafficReport, listTrafficReports, summarize };
