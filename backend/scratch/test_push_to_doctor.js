const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { sendPushNotification } = require('../services/firebaseAdminService');
const Doctor = require('../models/Doctor');

async function run() {
  await connectDB();
  const doctor = await Doctor.findOne({ email: 'vishalpatel581012@gmail.com' });
  if (!doctor) {
    console.log("Doctor not found!");
    await mongoose.connection.close();
    return;
  }
  
  console.log(`Doctor: ${doctor.firstName} has ${doctor.fcmTokens.length} tokens.`);
  if (doctor.fcmTokens.length === 0) {
    console.log("No tokens!");
    await mongoose.connection.close();
    return;
  }

  console.log("Sending push notification...");
  try {
    const response = await sendPushNotification(doctor.fcmTokens, {
      title: "🔔 Test Notification",
      body: "Testing push notification direct transmission.",
      data: { type: "test" },
      priority: "high"
    });
    console.log("Response:", response);
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
  await mongoose.connection.close();
}

run().catch(console.error);
