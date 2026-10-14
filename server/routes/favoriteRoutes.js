const express = require('express');
const { addFavorite, listFavorites, removeFavorite } = require('../controllers/favoriteController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);
router.get('/', listFavorites);
router.post('/', addFavorite);
router.delete('/:destinationId', removeFavorite);

module.exports = router;
