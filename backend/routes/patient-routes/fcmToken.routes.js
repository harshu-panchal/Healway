const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const { ROLES } = require('../../utils/constants');
const { saveToken, removeToken, testNotification } = require('../../controllers/fcmTokenController');

// All routes require patient authentication
router.post('/save', protect(ROLES.PATIENT), saveToken);
router.delete('/remove', protect(ROLES.PATIENT), removeToken);
router.post('/test', protect(ROLES.PATIENT), testNotification);

module.exports = router;
