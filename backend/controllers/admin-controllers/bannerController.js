const Banner = require('../../models/Banner');
const asyncHandler = require('../../middleware/asyncHandler');

// @desc    Get all banners (Admin)
// @route   GET /api/admin/banners
// @access  Private (Admin)
exports.getAllBanners = asyncHandler(async (req, res) => {
  const banners = await Banner.find().sort({ sortOrder: 1, createdAt: -1 });

  res.status(200).json({
    success: true,
    count: banners.length,
    data: banners,
  });
});

// @desc    Create a new banner (Admin)
// @route   POST /api/admin/banners
// @access  Private (Admin)
exports.createBanner = asyncHandler(async (req, res) => {
  const { title, imageUrl, link, isActive, sortOrder } = req.body;

  if (!imageUrl) {
    return res.status(400).json({
      success: false,
      message: 'Image URL is required for a banner',
    });
  }

  const banner = await Banner.create({
    title,
    imageUrl,
    link,
    isActive: isActive !== undefined ? isActive : true,
    sortOrder: sortOrder || 0,
  });

  res.status(201).json({
    success: true,
    data: banner,
  });
});

// @desc    Update any banner (Admin)
// @route   PATCH /api/admin/banners/:id
// @access  Private (Admin)
exports.updateBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const banner = await Banner.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!banner) {
    return res.status(404).json({
      success: false,
      message: 'Banner not found',
    });
  }

  res.status(200).json({
    success: true,
    data: banner,
  });
});

// @desc    Delete any banner (Admin)
// @route   DELETE /api/admin/banners/:id
// @access  Private (Admin)
exports.deleteBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const banner = await Banner.findByIdAndDelete(id);

  if (!banner) {
    return res.status(404).json({
      success: false,
      message: 'Banner not found',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Banner deleted successfully',
  });
});

// @desc    Get active banners (Patient/Public)
// @route   GET /api/patients/banners
// @access  Public
exports.getActiveBanners = asyncHandler(async (req, res) => {
  const banners = await Banner.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 });

  res.status(200).json({
    success: true,
    count: banners.length,
    data: banners,
  });
});
