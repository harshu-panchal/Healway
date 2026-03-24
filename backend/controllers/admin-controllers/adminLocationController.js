const State = require('../../models/State');
const City = require('../../models/City');
const asyncHandler = require('../../middleware/asyncHandler');

// @desc    Add a new state
// @route   POST /api/admin/locations/state
// @access  Private (Admin)
exports.addState = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'State name is required.' });
  }

  const existingState = await State.findOne({ name: new RegExp(`^${name.trim()}$`, 'i') });
  if (existingState) {
    return res.status(400).json({ success: false, message: 'State already exists.' });
  }

  const state = await State.create({ name: name.trim() });

  res.status(201).json({
    success: true,
    message: 'State added successfully.',
    data: state,
  });
});

// @desc    Get all states
// @route   GET /api/admin/locations/state
// @access  Public (for signup) / Private (for admin)
exports.getStates = asyncHandler(async (req, res) => {
  const states = await State.find({ isActive: true }).sort({ name: 1 });

  res.status(200).json({
    success: true,
    data: states,
  });
});

// @desc    Add a new city
// @route   POST /api/admin/locations/city
// @access  Private (Admin)
exports.addCity = asyncHandler(async (req, res) => {
  const { name, stateId } = req.body;

  if (!name || !name.trim() || !stateId) {
    return res.status(400).json({ success: false, message: 'City name and state reference are required.' });
  }

  const state = await State.findById(stateId);
  if (!state) {
    return res.status(404).json({ success: false, message: 'Selected state not found.' });
  }

  const existingCity = await City.findOne({
    name: new RegExp(`^${name.trim()}$`, 'i'),
    stateId: stateId,
  });

  if (existingCity) {
    return res.status(400).json({ success: false, message: 'City already exists in this state.' });
  }

  const city = await City.create({
    name: name.trim(),
    stateId: stateId
  });

  res.status(201).json({
    success: true,
    message: 'City added successfully.',
    data: city,
  });
});

// @desc    Get cities by state
// @route   GET /api/admin/locations/city/:stateId
// @access  Public (for signup) / Private (for admin)
exports.getCitiesByState = asyncHandler(async (req, res) => {
  const { stateId } = req.params;

  if (!stateId) {
    return res.status(400).json({ success: false, message: 'State ID is required.' });
  }

  const cities = await City.find({ stateId, isActive: true }).sort({ name: 1 });

  res.status(200).json({
    success: true,
    data: cities,
  });
});

// @desc    Delete a state
// @route   DELETE /api/location/state/:id
// @access  Private (Admin)
exports.deleteState = asyncHandler(async (req, res) => {
  const state = await State.findById(req.params.id);

  if (!state) {
    return res.status(404).json({ success: false, message: 'State not found.' });
  }

  // Delete all cities associated with this state
  await City.deleteMany({ stateId: state._id });

  // Delete the state
  await state.deleteOne();

  res.status(200).json({
    success: true,
    message: 'State and its associated cities deleted successfully.',
  });
});

// @desc    Delete a city
// @route   DELETE /api/location/city/:id
// @access  Private (Admin)
exports.deleteCity = asyncHandler(async (req, res) => {
  const city = await City.findById(req.params.id);

  if (!city) {
    return res.status(404).json({ success: false, message: 'City not found.' });
  }

  await city.deleteOne();

  res.status(200).json({
    success: true,
    message: 'City deleted successfully.',
  });
});
