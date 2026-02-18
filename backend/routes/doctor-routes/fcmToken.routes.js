const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const { ROLES } = require('../../utils/constants');
const { saveToken, removeToken, testNotification } = require('../../controllers/fcmTokenController');

// All routes require doctor authentication
router.post('/save', protect(ROLES.DOCTOR), saveToken);
router.delete('/remove', protect(ROLES.DOCTOR), removeToken);
router.post('/test', protect(ROLES.DOCTOR), testNotification);

module.exports = router;
