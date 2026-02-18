const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
  getTransactions,
  getTransactionById,
  getHistory,
} = require('../../controllers/patient-controllers/patientTransactionController');

router.get('/', protect('patient'), getTransactions);
router.get('/:id', protect('patient'), getTransactionById);
router.get('/history', protect('patient'), getHistory);

module.exports = router;

