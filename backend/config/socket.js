const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/tokenService');
const { getModelForRole } = require('../utils/getModelForRole');
const Appointment = require('../models/Appointment');
const { buildAllowedOrigins, createCorsOriginChecker } = require('./cors');

let io;

const initializeSocket = (server) => {
  const allowedOrigins = buildAllowedOrigins();

  // In development, allow all localhost origins
  const isDevelopment = process.env.NODE_ENV !== 'production';

  io = new Server(server, {
    cors: {
      origin: createCorsOriginChecker({ label: 'Socket.IO CORS' }),
      methods: ['GET', 'POST', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Authorization', 'Content-Type'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'], // Explicitly allow both
  });

  console.log('🔌 Socket.IO initialized with CORS origins:', isDevelopment ? 'All localhost origins (development)' : allowedOrigins);

  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        console.warn('Socket.IO connection rejected: No token provided');
        return next(new Error('Authentication error: Token missing'));
      }

      // Verify token format first
      if (typeof token !== 'string' || token.trim().length === 0) {
        console.warn('Socket.IO connection rejected: Invalid token format');
        return next(new Error('Authentication error: Invalid token format'));
      }

      const decoded = await verifyAccessToken(token);

      if (!decoded || !decoded.id || !decoded.role) {
        console.warn('Socket.IO connection rejected: Invalid token payload');
        return next(new Error('Authentication error: Invalid token payload'));
      }

      const Model = getModelForRole(decoded.role);

      if (!Model) {
        console.warn(`Socket.IO connection rejected: Invalid role (${decoded.role})`);
        return next(new Error('Authentication error: Invalid role'));
      }

      const user = await Model.findById(decoded.id).select('-password');

      if (!user) {
        console.warn(`Socket.IO connection rejected: User not found (${decoded.role}:${decoded.id})`);
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = { id: decoded.id, role: decoded.role, user };
      // console.log(`✅ Socket.IO authentication successful: ${decoded.role}:${decoded.id}`);
      next();
    } catch (error) {
      // More specific error handling
      if (error.name === 'JsonWebTokenError') {
        console.warn('Socket.IO connection rejected: Invalid token format', {
          name: error.name,
          message: error.message,
        });
        return next(new Error('Authentication error: Invalid token'));
      }

      if (error.name === 'TokenExpiredError') {
        console.warn('Socket.IO connection rejected: Token expired', {
          name: error.name,
          message: error.message,
        });
        return next(new Error('Authentication error: Token expired'));
      }

      if (error.message?.includes('Token missing') || error.message?.includes('Token invalid')) {
        console.warn('Socket.IO connection rejected:', error.message);
        return next(error);
      }

      console.error('Socket.IO authentication error:', {
        message: error.message,
        name: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
      next(new Error('Authentication error: ' + error.message));
    }
  });

  io.on('connection', (socket) => {
    const { id, role, user } = socket.user;

    // console.log(`User connected: ${role} - ${id} (socket ID: ${socket.id})`);

    // Join role-specific room (ensure id is string)
    const userIdStr = id.toString();
    const userRoom = `${role}-${userIdStr}`;
    socket.join(userRoom);
    // console.log(`✅ User joined room: ${userRoom}`);

    // For patients, also log which rooms they're in
    if (role === 'patient') {
      socket.rooms.forEach(room => {
        // console.log(`   Patient ${id} is in room: ${room}`);
      });
    }

    // Join general rooms for broadcasting
    if (role === 'doctor') {
      socket.join('doctors');
    } else if (role === 'admin') {
      socket.join('admins');
    } else if (role === 'patient') {
      socket.join('patients');
    }

    // Handle appointment events
    socket.on('appointment:subscribe', (appointmentId) => {
      socket.join(`appointment-${appointmentId}`);
    });

    socket.on('appointment:unsubscribe', (appointmentId) => {
      socket.leave(`appointment-${appointmentId}`);
    });

    // ========== Order Events ==========
    socket.on('order:subscribe', (orderId) => {
      socket.join(`order-${orderId}`);
    });

    socket.on('order:unsubscribe', (orderId) => {
      socket.leave(`order-${orderId}`);
    });

    // Handle request events
    socket.on('request:subscribe', (requestId) => {
      socket.join(`request-${requestId}`);
    });

    socket.on('request:unsubscribe', (requestId) => {
      socket.leave(`request-${requestId}`);
    });

    // ==========================================
    // Call Signaling Events
    // ==========================================

    // 1. Join Call Room
    socket.on('call:joinRoom', ({ callId }, callback) => {
      try {
        const room = `call-${callId}`;
        socket.join(room);
        console.log(`📞 Socket ${socket.id} joined room ${room}`);

        // Notify others in room
        socket.to(room).emit('call:peerJoined', { userId: id, role });

        if (callback) callback({ success: true });
      } catch (error) {
        console.error('Error joining call room:', error);
        if (callback) callback({ error: error.message });
      }
    });

    // 2. Initiate Call (Doctor -> Patient)
    socket.on('call:initiate', (data) => {
      // data: { callId, patientId, doctorName, ... }
      console.log('📞 Call Initiated:', data);

      // Notify the patient
      if (data.patientId) {
        io.to(`patient-${data.patientId}`).emit('call:invite', {
          callId: data.callId,
          appointmentId: data.appointmentId,
          doctorName: data.doctorName,
          doctorId: id,
          callType: data.callType || 'audio'
        });
      }

      // Notify sender it was sent
      socket.emit('call:initiated', { callId: data.callId });
    });

    // 3. Accept Call (Patient -> Doctor)
    socket.on('call:accept', ({ callId }) => {
      console.log('📞 Call Accepted:', callId);
      const room = `call-${callId}`;

      // Join the call room
      socket.join(room);

      // Notify doctor (and anyone else in room)
      io.to(room).emit('call:accepted', { callId, acceptorId: id });
    });

    // 4. Decline Call
    socket.on('call:decline', ({ callId }) => {
      console.log('📞 Call Declined:', callId);
      io.to(`call-${callId}`).emit('call:declined', { callId });
    });

    // 5. End Call
    socket.on('call:end', ({ callId }, callback) => {
      console.log('📞 Call Ended:', callId);
      io.to(`call-${callId}`).emit('call:ended', { callId });

      // Leave room
      socket.leave(`call-${callId}`);

      if (callback) callback({ success: true });
    });

    // 6. Patient Joined (After accepting)
    socket.on('call:joined', ({ callId }) => {
      console.log('📞 Patient joined call flow:', callId);
      io.to(`call-${callId}`).emit('call:patientJoined', { callId, patientId: id });
    });

    // ==========================================
    // SFU / Mediasoup Signaling Events
    // ==========================================
    const {
      createWebRtcTransport,
      connectTransport,
      createProducer,
      createConsumer,
      resumeConsumer,
      getRtpCapabilities,
      getProducersForCall
    } = require('./mediasoup');

    socket.on('mediasoup:getRtpCapabilities', async ({ callId }, callback) => {
      try {
        const rtpCapabilities = await getRtpCapabilities(callId);
        callback({ rtpCapabilities });
      } catch (error) {
        callback({ error: error.message });
      }
    });

    socket.on('mediasoup:createWebRtcTransport', async ({ callId }, callback) => {
      try {
        const transport = await createWebRtcTransport(callId);
        callback({ transport });
      } catch (error) {
        callback({ error: error.message });
      }
    });

    socket.on('mediasoup:connectTransport', async ({ transportId, dtlsParameters }, callback) => {
      try {
        await connectTransport(transportId, dtlsParameters);
        callback({ success: true });
      } catch (error) {
        callback({ error: error.message });
      }
    });

    socket.on('mediasoup:produce', async ({ transportId, kind, rtpParameters, callId }, callback) => {
      try {
        const producer = await createProducer(transportId, rtpParameters, kind);

        // Broadcast new producer to room
        socket.to(`call-${callId}`).emit('mediasoup:newProducer', {
          producerId: producer.id,
          kind: producer.kind
        });

        callback({ producerId: producer.id });
      } catch (error) {
        callback({ error: error.message });
      }
    });

    socket.on('mediasoup:consume', async ({ transportId, producerId, rtpCapabilities, callId }, callback) => {
      try {
        const consumer = await createConsumer(transportId, producerId, rtpCapabilities, callId);
        callback({
          consumer: {
            id: consumer.id,
            producerId: consumer.producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters
          }
        });
      } catch (error) {
        callback({ error: error.message });
      }
    });

    socket.on('mediasoup:resumeConsumer', async ({ consumerId }, callback) => {
      try {
        await resumeConsumer(consumerId);
        callback({ success: true });
      } catch (error) {
        callback({ error: error.message });
      }
    });

    socket.on('mediasoup:getProducers', ({ callId }, callback) => {
      try {
        const producers = getProducersForCall(callId);
        callback({ producers });
      } catch (error) {
        callback({ error: error.message });
      }
    });

    // ==========================================
    // P2P WebRTC Signaling
    // ==========================================

    // Get ICE servers for P2P WebRTC connections
    socket.on('p2p:getIceServers', (data, callback) => {
      try {
        console.log('📡 P2P ICE Servers requested');

        // Default STUN servers (free Google STUN servers)
        const iceServers = [
          { urls: ['stun:stun.l.google.com:19302'] },
          { urls: ['stun:stun1.l.google.com:19302'] },
          { urls: ['stun:stun2.l.google.com:19302'] },
          { urls: ['stun:stun3.l.google.com:19302'] },
          { urls: ['stun:stun4.l.google.com:19302'] },
        ];

        // Add TURN server if configured in environment
        if (process.env.TURN_SERVER_URL && process.env.TURN_SERVER_USERNAME && process.env.TURN_SERVER_CREDENTIAL) {
          iceServers.push({
            urls: process.env.TURN_SERVER_URL,
            username: process.env.TURN_SERVER_USERNAME,
            credential: process.env.TURN_SERVER_CREDENTIAL
          });
          console.log('📡 TURN server added to ICE servers');
        }

        console.log('📡 Returning', iceServers.length, 'ICE servers');

        if (callback) {
          callback({ iceServers });
        }
      } catch (error) {
        console.error('📡 Error getting ICE servers:', error);
        if (callback) {
          callback({ error: error.message });
        }
      }
    });

    socket.on('p2p:offer', (data) => {
      // data: { callId, offer, to }
      // If 'to' is specified, send to that specific user room, else broadcast to call room
      console.log('📡 P2P Offer relaying for call:', data.callId);
      socket.to(`call-${data.callId}`).emit('p2p:offer', {
        callId: data.callId,
        offer: data.offer,
        from: id,
        role: role
      });
    });

    socket.on('p2p:answer', (data) => {
      console.log('📡 P2P Answer relaying for call:', data.callId);
      socket.to(`call-${data.callId}`).emit('p2p:answer', {
        callId: data.callId,
        answer: data.answer,
        from: id
      });
    });

    socket.on('p2p:iceCandidate', (data) => {
      console.log('📡 P2P ICE Candidate relaying for call:', data.callId);
      socket.to(`call-${data.callId}`).emit('p2p:iceCandidate', {
        callId: data.callId,
        candidate: data.candidate,
        from: id
      });
    });

    socket.on('disconnect', async () => {
      // console.log(`User disconnected: ${role} - ${id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
};

// Helper functions to emit events
const emitToUser = (userId, role, event, data) => {
  if (io) {
    io.to(`${role}-${userId}`).emit(event, data);
  }
};

const emitToRoom = (room, event, data) => {
  if (io) {
    io.to(room).emit(event, data);
  }
};

const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

module.exports = {
  initializeSocket,
  getIO,
  emitToUser,
  emitToRoom,
  emitToAll,
};

