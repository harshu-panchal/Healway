const express = require('express');
const router = express.Router();
const { getLegalDocument } = require('../../controllers/public-controllers/legalController');

router.get('/:role/:document', getLegalDocument);
router.get('/:document', getLegalDocument);

module.exports = router;
