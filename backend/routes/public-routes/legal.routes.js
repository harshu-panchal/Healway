const express = require('express');
const router = express.Router();
const { getLegalDocument } = require('../../controllers/public-controllers/legalController');

router.get('/:document', getLegalDocument);

module.exports = router;

