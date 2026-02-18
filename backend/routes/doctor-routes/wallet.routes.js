const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
  getWalletBalance,
  getEarnings,
  getTransactions,
  getWithdrawals,
  requestWithdrawal,
} = require('../../controllers/doctor-controllers/doctorWalletController');

router.get('/balance', protect('doctor'), getWalletBalance);
router.get('/earnings', protect('doctor'), getEarnings);
router.get('/transactions', protect('doctor'), getTransactions);
router.get('/withdrawals', protect('doctor'), getWithdrawals);
router.post('/withdraw', protect('doctor'), requestWithdrawal);

module.exports = router;

