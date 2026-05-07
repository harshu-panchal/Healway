const mongoose = require('mongoose');
const asyncHandler = require('../../middleware/asyncHandler');
const Doctor = require('../../models/Doctor');
const Follow = require('../../models/Follow');
const ProfileView = require('../../models/ProfileView');
const Patient = require('../../models/Patient');

/**
 * GET /api/doctors/analytics/summary - Get total followers and views
 */
exports.getAnalyticsSummary = asyncHandler(async (req, res) => {
  const doctorId = req.auth.id;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [doctor, newFollowersThisWeek, viewsThisWeek] = await Promise.all([
    Doctor.findById(doctorId).select('followerCount viewCount').lean(),
    Follow.countDocuments({
      doctorId,
      createdAt: { $gte: sevenDaysAgo }
    }),
    ProfileView.countDocuments({
      doctorId,
      createdAt: { $gte: sevenDaysAgo }
    })
  ]);
  
  if (!doctor) {
    return res.status(404).json({ success: false, message: "Doctor not found" });
  }

  res.status(200).json({
    success: true,
    data: {
      totalFollowers: doctor.followerCount || 0,
      totalViews: doctor.viewCount || 0,
      followersGrowth: newFollowersThisWeek,
      viewsGrowth: viewsThisWeek,
      followRate: doctor.viewCount > 0 ? (doctor.followerCount / doctor.viewCount) * 100 : 0,
      activeGrowth: viewsThisWeek > 0 ? (newFollowersThisWeek / viewsThisWeek) * 100 : 0
    }
  });
});

/**
 * GET /api/doctors/analytics/followers - Get list of followers
 */
exports.getFollowersList = asyncHandler(async (req, res) => {
  const doctorId = req.auth.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const total = await Follow.countDocuments({ doctorId });
  const follows = await Follow.find({ doctorId })
    .populate({
      path: 'patientId',
      select: 'firstName lastName profileImage email phone gender',
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const followers = follows.map(f => {
    if (!f.patientId) return null;
    return {
      id: f.patientId._id,
      patientId: f.patientId, // Include nested object for frontend
      createdAt: f.createdAt
    };
  }).filter(f => f !== null);

  res.status(200).json({
    success: true,
    data: followers,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  });
});

/**
 * GET /api/doctors/analytics/charts - Get chart data for views/follows
 */
exports.getAnalyticsCharts = asyncHandler(async (req, res) => {
  const doctorId = req.auth.id;
  const days = parseInt(req.query.days) || 7;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // Use explicit ObjectId to avoid any casting issues
  let doctorObjId;
  try {
    doctorObjId = new mongoose.Types.ObjectId(doctorId);
  } catch (err) {
    return res.status(400).json({ success: false, message: "Invalid doctor ID" });
  }

  // Fetch views and follows in parallel with individual error handling
  const [views, follows] = await Promise.all([
    ProfileView.find({ 
      doctorId: doctorObjId, 
      createdAt: { $gte: startDate } 
    }).select('createdAt').lean().catch(err => {
      console.error('Error fetching views:', err);
      return [];
    }),
    Follow.find({ 
      doctorId: doctorObjId, 
      createdAt: { $gte: startDate } 
    }).select('createdAt').lean().catch(err => {
      console.error('Error fetching follows:', err);
      return [];
    })
  ]);

  // Group stats by date in memory
  const statsByDate = {};
  
  (views || []).forEach(v => {
    try {
      const dateStr = new Date(v.createdAt).toISOString().split('T')[0];
      if (!statsByDate[dateStr]) statsByDate[dateStr] = { views: 0, follows: 0 };
      statsByDate[dateStr].views++;
    } catch (e) {}
  });

  (follows || []).forEach(f => {
    try {
      const dateStr = new Date(f.createdAt).toISOString().split('T')[0];
      if (!statsByDate[dateStr]) statsByDate[dateStr] = { views: 0, follows: 0 };
      statsByDate[dateStr].follows++;
    } catch (e) {}
  });

  // Generate daily stats for the requested timeframe
  const dailyStats = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const dateStr = d.toISOString().split('T')[0];
    const entry = statsByDate[dateStr] || { views: 0, follows: 0 };
    
    dailyStats.push({
      date: dateStr,
      label: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
      views: entry.views,
      follows: entry.follows
    });
  }

  res.status(200).json({
    success: true,
    data: {
      dailyStats
    }
  });
});
