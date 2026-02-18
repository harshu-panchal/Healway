const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../middleware/authMiddleware');
const {
  getWalletOverview,
  getProviderSummaries,
  getWithdrawals,
  updateWithdrawalStatus,
  getAdminWalletBalance,
  getAdminWalletTransactions,
} = require('../../controllers/admin-controllers/adminWalletController');

router.get('/overview', protect('admin'), authorize('admin'), getWalletOverview);
router.get('/balance', protect('admin'), authorize('admin'), getAdminWalletBalance);
router.get('/transactions', protect('admin'), authorize('admin'), getAdminWalletTransactions);
router.get('/providers', protect('admin'), authorize('admin'), getProviderSummaries);
router.get('/withdrawals', protect('admin'), authorize('admin'), getWithdrawals);
router.patch('/withdrawals/:id', protect('admin'), authorize('admin'), updateWithdrawalStatus);

module.exports = router;

