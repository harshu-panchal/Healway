const http = require("http");
const express = require("express");
const compression = require("compression");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const os = require("os");
require("dotenv").config();

const connectDB = require("./config/db");
const { limiter: rateLimiter } = require("./middleware/rateLimiter");
const { initializeSocket } = require("./config/socket");
const { getWorker } = require("./config/mediasoup");

const app = express();
app.set("trust proxy", 1); // Trust first proxy (required for rate limiter behind proxy)

// Middleware
app.use(compression()); // Compress all responses
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
); // Security headers (includes XSS protection)
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        process.env.FRONTEND_URL || "http://localhost:3000",
        "https://healwayx.vercel.app",
        "https://www.healwayx.vercel.app",
        "http://172.26.201.42:3000",
        "https://zjbmtdgq-3000.inc1.devtunnels.ms"

      ];

      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // In development, allow localhost origins
        if (
          process.env.NODE_ENV !== "production" &&
          (origin.includes("localhost") || origin.includes("127.0.0.1"))
        ) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      }
    },
    credentials: true,
  })
);
app.use(
  morgan("dev", {
    skip: (req, res) => {
      // Define noisy paths to skip logging for successful requests
      const noisyPaths = [
        "/api/patients/notifications",
        "/api/patients/auth/me",
        "/api/patients/dashboard",
        "/api/patients/announcements",
        "/api/patients/doctors/featured",
        "/api/patients/doctors/specialties",
        "/api/patients/doctors",
        "/api/patients/appointments",
        "/api/patients/prescriptions",
        "/api/patients/transactions",
        "/api/doctors/notifications",
        "/api/doctors/auth/me",
        "/api/doctors/dashboard/stats",
        "/api/doctors/announcements",
        "/api/doctors/appointments",
        "/api/doctors/consultations",
        "/api/doctors/patients",
        "/api/doctors/wallet/balance",
        "/api/admin/notifications",
        "/api/admin/auth/me",
        "/api/admin/dashboard/stats",
        "/api/admin/dashboard/activities",
        "/api/admin/dashboard/charts",
        "/api/admin/appointments",
        "/api/admin/doctors",
        "/api/admin/users",
        "/api/admin/specialties",
        "/api/admin/services",
        "/api/admin/wallet",
        "/api/admin/revenue",
        "/api/admin/announcements",
        "/api/admin/support",
        "/api/specialties",
        "/api/services",
        "/health",
      ];
      return (
        res.statusCode < 400 &&
        noisyPaths.some((path) => req.originalUrl.startsWith(path))
      );
    },
  })
); // Logging
app.use(express.json({ limit: "10mb" })); // Parse JSON bodies with size limit
app.use(express.urlencoded({ extended: true, limit: "10mb" })); // Parse URL-encoded bodies with size limit
app.use(cookieParser()); // Parse cookies
app.use(rateLimiter); // General rate limiting

// Note: File uploads are now served from Cloudinary CDN.
// The /uploads static middleware has been removed.

// Connect to database
connectDB();

// Initialize mediasoup worker
(async () => {
  try {
    await getWorker();
    console.log("✅ mediasoup worker initialized");
  } catch (error) {
    console.error("❌ Failed to initialize mediasoup worker:", error);
  }
})();



// Auth Routes
app.use("/api/patients/auth", require("./routes/patient-routes/auth.routes"));
app.use("/api/doctors/auth", require("./routes/doctor-routes/auth.routes"));

app.use("/api/admin/auth", require("./routes/admin-routes/auth.routes"));

// Patient Routes (Profile is handled in auth.routes.js)
app.use(
  "/api/patients/dashboard",
  require("./routes/patient-routes/dashboard.routes")
);
app.use(
  "/api/patients/upload",
  require("./routes/patient-routes/upload.routes")
);
app.use(
  "/api/patients/appointments",
  require("./routes/patient-routes/appointment.routes")
);
app.use(
  "/api/patients/consultations",
  require("./routes/patient-routes/consultation.routes")
);
app.use(
  "/api/patients/doctors",
  require("./routes/patient-routes/doctor.routes")
);
app.use(
  "/api/patients",
  require("./routes/patient-routes/prescription.routes")
);
app.use(
  "/api/patients/transactions",
  require("./routes/patient-routes/transaction.routes")
);
app.use(
  "/api/patients/history",
  require("./routes/patient-routes/history.routes")
);
app.use(
  "/api/patients/support",
  require("./routes/patient-routes/support.routes")
);
app.use(
  "/api/patients/notifications",
  require("./routes/patient-routes/notification.routes")
);
app.use(
  "/api/patients/fcm-tokens",
  require("./routes/patient-routes/fcmToken.routes")
);
app.use(
  "/api/patients/announcements",
  require("./routes/patient-routes/announcement.routes")
);

// Doctor Routes (Profile is handled in auth.routes.js)
app.use(
  "/api/doctors/dashboard",
  require("./routes/doctor-routes/dashboard.routes")
);
app.use("/api/doctors/upload", require("./routes/doctor-routes/upload.routes"));
app.use(
  "/api/doctors/patients",
  require("./routes/doctor-routes/patient.routes")
);
app.use(
  "/api/doctors/consultations",
  require("./routes/doctor-routes/consultation.routes")
);
app.use(
  "/api/doctors/prescriptions",
  require("./routes/doctor-routes/prescription.routes")
);
app.use(
  "/api/doctors/appointments",
  require("./routes/doctor-routes/appointment.routes")
);
app.use("/api/doctors/queue", require("./routes/doctor-routes/queue.routes"));
app.use(
  "/api/doctors/availability",
  require("./routes/doctor-routes/availability.routes")
);
app.use("/api/doctors/slots", require("./routes/doctor-routes/slots.routes"));
app.use("/api/doctors/wallet", require("./routes/doctor-routes/wallet.routes"));
app.use(
  "/api/doctors/support",
  require("./routes/doctor-routes/support.routes")
);
app.use(
  "/api/doctors/notifications",
  require("./routes/doctor-routes/notification.routes")
);
app.use(
  "/api/doctors/fcm-tokens",
  require("./routes/doctor-routes/fcmToken.routes")
);
app.use(
  "/api/doctors/announcements",
  require("./routes/doctor-routes/announcement.routes")
);



// Admin Routes
app.use("/api/admin", require("./routes/admin-routes/providers.routes"));
app.use("/api/admin", require("./routes/admin-routes/users.routes"));
app.use(
  "/api/admin/dashboard",
  require("./routes/admin-routes/dashboard.routes")
);
app.use(
  "/api/admin/appointments",
  require("./routes/admin-routes/appointment.routes")
);


app.use("/api/admin/wallet", require("./routes/admin-routes/wallet.routes"));
app.use("/api/admin/revenue", require("./routes/admin-routes/revenue.routes"));
app.use(
  "/api/admin/settings",
  require("./routes/admin-routes/settings.routes")
);
app.use("/api/admin/support", require("./routes/admin-routes/support.routes"));
app.use(
  "/api/admin/verifications",
  require("./routes/admin-routes/verification.routes")
);
app.use(
  "/api/admin/notifications",
  require("./routes/admin-routes/notification.routes")
);
app.use(
  "/api/admin/announcements",
  require("./routes/admin-routes/announcement.routes")
);

app.use("/api/admin/specialties", require("./routes/admin-routes/specialty.routes"));
app.use("/api/admin/services", require("./routes/admin-routes/service.routes"));
app.use("/api/admin/upload", require("./routes/admin-routes/upload.routes"));


app.use(
  "/api/specialties",
  require("./routes/patient-routes/specialty.routes")
);

app.use(
  "/api/services",
  require("./routes/patient-routes/service.routes")
);
app.use("/api/public/legal", require("./routes/public-routes/legal.routes"));

app.get("/", (req, res) => {
  res.json({
    message: "Healway Backend API",
    status: "running",
    version: "1.0.0",
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// All API routes are configured above

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  const status = err.status || 500;

  // Silently handle 401 errors (authentication failures are expected after logout)
  // Only log non-401 errors or if in development mode
  if (status !== 401 || process.env.NODE_ENV === "development") {
    if (status === 401) {
      // Log 401 errors only in development with less verbosity
      console.log(`[401] ${req.method} ${req.path} - Authentication required`);
    } else {
      // Log other errors normally
      console.error("Error:", err);
    }
  }

  res.status(status).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.IO for real-time updates
initializeSocket(server);

// Listen on all network interfaces (0.0.0.0) to allow network access
server.listen(PORT, () => {
  const networkInterfaces = os.networkInterfaces();
  const addresses = [];

  // Get localhost address
  addresses.push(`http://localhost:${PORT}`);
  addresses.push(`http://127.0.0.1:${PORT}`);

  // Get network IP addresses
  Object.keys(networkInterfaces).forEach((interfaceName) => {
    networkInterfaces[interfaceName].forEach((iface) => {
      // Skip internal (loopback) and non-IPv4 addresses
      // Handle both string 'IPv4' and number 4 (Windows compatibility)
      const isIPv4 = iface.family === "IPv4" || iface.family === 4;
      if (isIPv4 && !iface.internal) {
        const address = `http://${iface.address}:${PORT}`;
        // Avoid duplicates
        if (!addresses.includes(address)) {
          addresses.push(address);
        }
      }
    });
  });

  console.log(`\n🚀 Server is running on port ${PORT}`);
  console.log(`\n📍 Available at:`);
  addresses.forEach((address) => {
    console.log(`   ${address}`);
  });
  console.log("");
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${PORT} is already in use!\n`);
    process.exit(1);
  } else {
    console.error('\n❌ Server error:', error);
    process.exit(1);
  }
});

module.exports = app;
