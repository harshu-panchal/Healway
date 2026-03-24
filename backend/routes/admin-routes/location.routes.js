const express = require('express');
const router = express.Router();
const { addState, getStates, addCity, getCitiesByState } = require('../../controllers/admin-controllers/adminLocationController');
const { protect } = require('../../middleware/authMiddleware');
const { ROLES } = require('../../utils/constants');

// Admin only endpoints
router.post('/state', protect(ROLES.ADMIN), addState);
router.post('/city', protect(ROLES.ADMIN), addCity);
router.delete('/state/:id', protect(ROLES.ADMIN), require('../../controllers/admin-controllers/adminLocationController').deleteState);
router.delete('/city/:id', protect(ROLES.ADMIN), require('../../controllers/admin-controllers/adminLocationController').deleteCity);

// Publicly readable endpoints (for signup)
router.get('/state', getStates);
router.get('/city/:stateId', getCitiesByState);

module.exports = router;
