const mongoose = require('mongoose');
const Destination = require('../models/Destination');
const Favorite = require('../models/Favorite');
const ParkingArea = require('../models/ParkingArea');
const AppError = require('../utils/AppError');

async function listFavorites(request, response) {
  const favorites = await Favorite.find({ user: request.user._id })
    .sort({ createdAt: -1 })
    .populate({ path: 'destination', select: 'name category city address image rating' })
    .lean();

  const existing = favorites.filter((favorite) => favorite.destination);
  const areaCounts = await ParkingArea.aggregate([
    { $match: { destination: { $in: existing.map((f) => f.destination._id) } } },
    { $group: { _id: '$destination', count: { $sum: 1 } } },
  ]);
  const countByDestination = new Map(areaCounts.map((row) => [row._id.toString(), row.count]));

  const destinations = existing.map((favorite) => ({
    ...favorite.destination,
    favoriteId: favorite._id,
    parkingAreaCount: countByDestination.get(favorite.destination._id.toString()) || 0,
  }));

  response.status(200).json({ success: true, message: 'Favorites retrieved', data: { destinations } });
}

async function addFavorite(request, response) {
  const destinationId = typeof request.body.destination === 'string' ? request.body.destination.trim() : '';
  if (!mongoose.isObjectIdOrHexString(destinationId)) throw new AppError('Invalid destination id', 400, { destination: 'Select a valid destination' });

  const destination = await Destination.findById(destinationId);
  if (!destination) throw new AppError('Destination not found', 404);

  const existing = await Favorite.findOne({ user: request.user._id, destination: destinationId });
  if (existing) {
    return response.status(200).json({ success: true, message: 'Already in favorites', data: { favorite: existing } });
  }

  const favorite = await Favorite.create({ user: request.user._id, destination: destinationId });
  return response.status(201).json({ success: true, message: 'Added to favorites', data: { favorite } });
}

async function removeFavorite(request, response) {
  if (!mongoose.isObjectIdOrHexString(request.params.destinationId)) throw new AppError('Invalid destination id', 400);
  await Favorite.deleteOne({ user: request.user._id, destination: request.params.destinationId });
  response.status(200).json({ success: true, message: 'Removed from favorites', data: { destination: request.params.destinationId } });
}

module.exports = { addFavorite, listFavorites, removeFavorite };
