const mongoose = require('mongoose');
const Destination = require('../models/Destination');
const Event = require('../models/Event');
const AppError = require('../utils/AppError');

function withStatus(event) {
  const now = Date.now();
  const start = new Date(event.startsAt).getTime();
  const end = new Date(event.endsAt).getTime();
  let status = 'UPCOMING';
  if (now >= start && now <= end) status = 'ACTIVE';
  else if (now > end) status = 'ENDED';
  return { ...event, status };
}

async function listEvents(request, response) {
  const filter = { endsAt: { $gte: new Date() } }; // active or upcoming
  if (request.query.destination && mongoose.isObjectIdOrHexString(request.query.destination)) {
    filter.destination = request.query.destination;
  }
  const events = await Event.find(filter)
    .sort({ startsAt: 1 })
    .limit(50)
    .populate({ path: 'destination', select: 'name category city' })
    .lean();
  response.status(200).json({ success: true, message: 'Events retrieved', data: { events: events.map(withStatus) } });
}

async function createEvent(request, response) {
  const source = request.body || {};
  const destinationId = typeof source.destination === 'string' ? source.destination.trim() : '';
  const name = typeof source.name === 'string' ? source.name.trim().replace(/\s+/g, ' ') : '';
  const description = typeof source.description === 'string' ? source.description.trim() : '';
  const startsAt = new Date(source.startsAt);
  const endsAt = new Date(source.endsAt);
  const errors = {};

  if (!mongoose.isObjectIdOrHexString(destinationId)) errors.destination = 'Select a valid destination';
  if (name.length < 2 || name.length > 120) errors.name = 'Name must contain 2 to 120 characters';
  if (Number.isNaN(startsAt.getTime())) errors.startsAt = 'Enter a valid start time';
  if (Number.isNaN(endsAt.getTime())) errors.endsAt = 'Enter a valid end time';
  else if (!Number.isNaN(startsAt.getTime()) && endsAt <= startsAt) errors.endsAt = 'End time must be after the start time';
  if (description.length > 500) errors.description = 'Description cannot exceed 500 characters';

  if (Object.keys(errors).length > 0) {
    return response.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  const destination = await Destination.findById(destinationId);
  if (!destination) throw new AppError('Destination not found', 404);

  const event = await Event.create({ destination: destinationId, name, description, startsAt, endsAt, createdBy: request.user._id });
  return response.status(201).json({ success: true, message: 'Event created', data: { event } });
}

async function deleteEvent(request, response) {
  if (!mongoose.isObjectIdOrHexString(request.params.id)) throw new AppError('Invalid event id', 400);
  const event = await Event.findById(request.params.id);
  if (!event) throw new AppError('Event not found', 404);
  await event.deleteOne();
  response.status(200).json({ success: true, message: 'Event deleted', data: { id: event._id.toString() } });
}

module.exports = { createEvent, deleteEvent, listEvents };
