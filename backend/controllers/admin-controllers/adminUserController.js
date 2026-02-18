const asyncHandler = require('../../middleware/asyncHandler');
const Patient = require('../../models/Patient');

/**
 * Helper to build basic pagination options
 */
const buildPagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Build common search filter for name / email / phone fields
 */
const buildSearchFilter = (search, fields = []) => {
  if (!search || !search.trim() || !fields.length) return {};

  const regex = new RegExp(search.trim(), 'i');

  return {
    $or: fields.map((field) => ({ [field]: regex })),
  };
};

// GET /api/admin/users
exports.getUsers = asyncHandler(async (req, res) => {
  const { status, sortBy, sortOrder } = req.query;
  const { page, limit, skip } = buildPagination(req);

  const filter = {};

  // Map status filter
  if (status && status !== 'all') {
    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    } else if (status === 'suspended') {
      // For now, we'll treat suspended as inactive
      // You can add a separate 'suspended' field to Patient model if needed
      filter.isActive = false;
    }
  }

  const searchFilter = buildSearchFilter(req.query.search, [
    'firstName',
    'lastName',
    'email',
    'phone',
  ]);

  const finalFilter = Object.keys(searchFilter).length
    ? { $and: [filter, searchFilter] }
    : filter;

  const sort = {};
  const normalizedSortBy = sortBy || 'createdAt';
  const normalizedSortOrder = sortOrder === 'asc' ? 1 : -1;
  sort[normalizedSortBy] = normalizedSortOrder;

  const [items, total] = await Promise.all([
    Patient.find(finalFilter).sort(sort).skip(skip).limit(limit).lean(),
    Patient.countDocuments(finalFilter),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    },
  });
});

// GET /api/admin/users/:id
exports.getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await Patient.findById(id).lean();
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found.',
    });
  }

  return res.status(200).json({
    success: true,
    data: user,
  });
});

// PATCH /api/admin/users/:id/status
exports.updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status. Must be one of: active, inactive, suspended',
    });
  }

  const user = await Patient.findById(id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found.',
    });
  }

  // Map status to isActive field
  // For suspended, you might want to add a separate field in the future
  if (status === 'active') {
    user.isActive = true;
  } else {
    user.isActive = false;
  }

  await user.save();

  return res.status(200).json({
    success: true,
    message: 'User status updated successfully.',
    data: user,
  });
});

// DELETE /api/admin/users/:id
exports.deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await Patient.findById(id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found.',
    });
  }

  await Patient.findByIdAndDelete(id);

  return res.status(200).json({
    success: true,
    message: 'User deleted successfully.',
  });
});

