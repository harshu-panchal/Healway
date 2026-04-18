const express = require('express');
const router = express.Router();
const { getFooterSettings } = require('../../controllers/public-controllers/publicSettingsController');

router.get('/footer', getFooterSettings);

module.exports = router;
