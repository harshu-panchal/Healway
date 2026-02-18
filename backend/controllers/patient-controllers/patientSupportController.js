const asyncHandler = require('../../middleware/asyncHandler');
const SupportTicket = require('../../models/SupportTicket');
const Patient = require('../../models/Patient');
const Admin = require('../../models/Admin');
const {
  sendSupportTicketNotification,
  sendAdminSupportTicketNotification,
  createSupportTicketNotification,
  createAdminSupportTicketNotification,
} = require('../../services/notificationService');

// Helper functions
const buildPagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// POST /api/patients/support
exports.createSupportTicket = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const { subject, message, priority } = req.body;

  if (!subject || !message) {
    return res.status(400).json({
      success: false,
      message: 'Subject and message are required',
    });
  }

  const ticket = await SupportTicket.create({
    userId: id,
    userType: 'patient',
    subject,
    message,
    priority: priority || 'medium',
    status: 'open',
  });

  // Get patient data for email
  const patient = await Patient.findById(id);

  // Emit real-time event to admins
  try {
    const { getIO } = require('../../config/socket');
    const io = getIO();
    io.to('admins').emit('support:ticket:created', {
      ticket: await SupportTicket.findById(ticket._id)
        .populate('userId', 'firstName lastName email phone'),
    });
  } catch (error) {
    console.error('Socket.IO error:', error);
  }

  // Send email and in-app notifications
  try {
    // Send confirmation email to patient
    if (patient) {
      await sendSupportTicketNotification({
        user: patient,
        ticket,
        userType: 'patient',
        isResponse: false,
      }).catch((error) => console.error('Error sending support ticket email to patient:', error));
      
      // Create in-app notification for patient
      await createSupportTicketNotification({
        userId: id,
        userType: 'patient',
        ticket,
        eventType: 'created',
      }).catch((error) => console.error('Error creating support ticket notification:', error));
    }

    // Send notification to all admins (email and in-app)
    const admins = await Admin.find({ isActive: true }).select('email name');
    const { createAdminSupportTicketNotification } = require('../../services/notificationService');
    
    for (const admin of admins) {
      // Send email notification
      await sendAdminSupportTicketNotification({
        admin,
        ticket,
        user: patient,
        userType: 'patient',
      }).catch((error) => console.error(`Error sending admin support ticket email to ${admin.email}:`, error));
      
      // Create in-app notification for admin
      await createAdminSupportTicketNotification({
        adminId: admin._id,
        ticket,
        user: patient,
        userType: 'patient',
      }).catch((error) => console.error(`Error creating admin support ticket notification:`, error));
    }
  } catch (error) {
    console.error('Error sending email notifications:', error);
  }

  return res.status(201).json({
    success: true,
    message: 'Support ticket created successfully',
    data: ticket,
  });
});

// GET /api/patients/support
exports.getSupportTickets = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const { status, priority } = req.query;
  const { page, limit, skip } = buildPagination(req);

  const filter = { userId: id, userType: 'patient' };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  const [tickets, total] = await Promise.all([
    SupportTicket.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    SupportTicket.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      items: tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    },
  });
});

// GET /api/patients/support/:id
exports.getSupportTicketById = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const { ticketId } = req.params;

  const ticket = await SupportTicket.findOne({
    _id: ticketId,
    userId: id,
    userType: 'patient',
  });

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Support ticket not found',
    });
  }

  return res.status(200).json({
    success: true,
    data: ticket,
  });
});

// GET /api/patients/support/history
exports.getSupportHistory = asyncHandler(async (req, res) => {
  const { id } = req.auth;

  const tickets = await SupportTicket.find({
    userId: id,
    userType: 'patient',
    status: { $in: ['resolved', 'closed'] },
  })
    .sort({ createdAt: -1 })
    .limit(20);

  return res.status(200).json({
    success: true,
    data: tickets,
  });
});

