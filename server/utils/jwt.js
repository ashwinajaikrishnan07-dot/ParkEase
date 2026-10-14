const jwt = require('jsonwebtoken');

const TOKEN_ISSUER = 'parkwise-api';
const TOKEN_AUDIENCE = 'parkwise-client';

function validateJwtConfig() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32 || secret.startsWith('replace_with')) {
    throw new Error('JWT_SECRET must be a non-placeholder value of at least 32 characters');
  }
}

function generateToken(userId) {
  validateJwtConfig();

  return jwt.sign({}, process.env.JWT_SECRET, {
    subject: userId.toString(),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  });
}

function verifyToken(token) {
  validateJwtConfig();

  return jwt.verify(token, process.env.JWT_SECRET, {
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  });
}

module.exports = { generateToken, validateJwtConfig, verifyToken };
