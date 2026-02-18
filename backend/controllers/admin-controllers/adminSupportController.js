const asyncHandler = require('../../middleware/asyncHandler');
const SupportTicket = require('../../models/SupportTicket');
const Patient = require('../../models/Patient');
const Doctor = require('../../models/Doctor');
const {
  sendSupportTicketNotification,
  sendAdminSupportTicketNotification,
  createSupportTicketNotification
} = require('../../services/notificationService');

// Helper functions
const buildPagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// GET /api/admin/support
exports.getSupportTickets = asyncHandler(async (req, res) => {
  const { status, priority, userType } = req.query;
  const { page, limit, skip } = buildPagination(req);

  const filter = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (userType) filter.userType = userType;

  // Fetch tickets without populate (since userId has no ref)
  const tickets = await SupportTicket.find(filter)
    .populate('assignedTo', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // Manually populate user data based on userType
  const enrichedTickets = await Promise.all(
    tickets.map(async (ticket) => {
      let userData = null;

      try {
        if (ticket.userType === 'patient') {
          userData = await Patient.findById(ticket.userId)
            .select('firstName lastName email phone profileImage')
            .lean();
        } else if (ticket.userType === 'doctor') {
          userData = await Doctor.findById(ticket.userId)
            .select('firstName lastName email phone specialization clinicName profileImage')
            .lean();
        }
      } catch (error) {
        console.error(`Error fetching user data for ticket ${ticket._id}:`, error);
      }

      return {
        ...ticket,
        userId: userData || ticket.userId, // Return user data or original userId if not found
      };
    })
  );

  const total = await SupportTicket.countDocuments(filter);

  return res.status(200).json({
    success: true,
    data: {
      items: enrichedTickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    },
  });
});

// GET /api/admin/support/:id
exports.getSupportTicketById = asyncHandler(async (req, res) => {
  const { id: ticketId } = req.params;

  const ticket = await SupportTicket.findById(ticketId)
    .populate('userId')
    .populate('assignedTo', 'name email')
    .populate('responses.userId', 'name firstName lastName');

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

// POST /api/admin/support/:id/respond
exports.respondToTicket = asyncHandler(async (req, res) => {
  const { id: adminId } = req.auth;
  const { id: ticketId } = req.params;
  const { message, attachments } = req.body;

  if (!message) {
    return res.status(400).json({
      success: false,
      message: 'Message is required',
    });
  }

  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Support ticket not found',
    });
  }

  ticket.responses.push({
    userId: adminId,
    userType: 'admin',
    message,
    attachments: attachments || [],
    createdAt: new Date(),
  });

  if (ticket.status === 'open') {
    ticket.status = 'in_progress';
    ticket.assignedTo = adminId;
  }

  await ticket.save();

  // Get user data for email
  let user = null;
  if (ticket.userType === 'patient') {
    user = await Patient.findById(ticket.userId);
  } else if (ticket.userType === 'doctor') {
    user = await Doctor.findById(ticket.userId);
  }

  // Emit real-time event
  try {
    const { getIO } = require('../../config/socket');
    const io = getIO();
    io.to(`${ticket.userType}-${ticket.userId}`).emit('support:ticket:responded', {
      ticket: await SupportTicket.findById(ticket._id),
    });
  } catch (error) {
    console.error('Socket.IO error:', error);
  }

  // Send email and in-app notification to user
  if (user) {
    try {
      // Send email notification
      await sendSupportTicketNotification({
        user,
        ticket,
        userType: ticket.userType,
        isResponse: true,
      }).catch((error) => console.error('Error sending support ticket response email:', error));

      // Create in-app notification
      await createSupportTicketNotification({
        userId: ticket.userId,
        userType: ticket.userType,
        ticket,
        eventType: 'responded',
      }).catch((error) => console.error('Error creating support ticket notification:', error));
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }

  return res.status(200).json({
    success: true,
    message: 'Response added successfully',
    data: ticket,
  });
});

// PATCH /api/admin/support/:id/status
exports.updateTicketStatus = asyncHandler(async (req, res) => {
  const { id: ticketId } = req.params;
  const { status, adminNote } = req.body;

  if (!status || !['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Valid status is required',
    });
  }

  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Support ticket not found',
    });
  }

  ticket.status = status;
  if (adminNote && adminNote.trim()) {
    ticket.adminNote = adminNote.trim();
  }
  if (status === 'resolved') {
    ticket.resolvedAt = new Date();
  }
  if (status === 'closed') {
    ticket.closedAt = new Date();
  }

  await ticket.save();

  // Reload ticket to ensure all fields are fresh
  const updatedTicket = await SupportTicket.findById(ticket._id);

  // Get user data for notifications
  let user = null;
  if (updatedTicket.userType === 'patient') {
    user = await Patient.findById(updatedTicket.userId);
  } else if (updatedTicket.userType === 'doctor') {
    user = await Doctor.findById(updatedTicket.userId);
  }

  // Emit real-time event
  try {
    const { getIO } = require('../../config/socket');
    const io = getIO();
    io.to(`${updatedTicket.userType}-${updatedTicket.userId}`).emit('support:ticket:status:updated', {
      ticketId: updatedTicket._id,
      status,
      ticket: updatedTicket.toObject(),
    });
  } catch (error) {
    console.error('Socket.IO error:', error);
  }

  // Send email and in-app notification to user
  if (user) {
    try {
      // Send email notification for status update
      await sendSupportTicketNotification({
        user,
        ticket: updatedTicket,
        userType: updatedTicket.userType,
        isResponse: false,
      }).catch((error) => console.error('Error sending support ticket status email:', error));

      // Create in-app notification
      await createSupportTicketNotification({
        userId: updatedTicket.userId,
        userType: updatedTicket.userType,
        ticket: updatedTicket,
        eventType: 'status_updated',
      }).catch((error) => console.error('Error creating support ticket status notification:', error));
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }

  return res.status(200).json({
    success: true,
    message: 'Ticket status updated',
    data: updatedTicket,
  });
});
