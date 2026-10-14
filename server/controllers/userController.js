const User = require('../models/User');
const AppError = require('../utils/AppError');

async function getProfile(request, response) {
  response.status(200).json({
    success: true,
    message: 'Profile retrieved',
    data: { user: request.user.toJSON() },
  });
}

async function updateProfile(request, response) {
  if (request.body.email !== request.user.email) {
    const duplicate = await User.exists({
      email: request.body.email,
      _id: { $ne: request.user._id },
    });

    if (duplicate) {
      throw new AppError('An account with this email already exists', 409, {
        email: 'This email address is already in use',
      });
    }
  }

  request.user.name = request.body.name;
  request.user.email = request.body.email;
  request.user.phone = request.body.phone;
  await request.user.save();

  response.status(200).json({
    success: true,
    message: 'Profile updated',
    data: { user: request.user.toJSON() },
  });
}

module.exports = { getProfile, updateProfile };
