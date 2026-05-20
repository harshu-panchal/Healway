const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Doctor = require('../models/Doctor');

async function run() {
  await connectDB();
  const doctors = await Doctor.find({}).select('firstName lastName email fcmTokens fcmTokenMobile');
  console.log('--- DOCTORS ---');
  for (const doc of doctors) {
    console.log(`Doctor: ${doc.firstName} ${doc.lastName} (${doc.email})`);
    console.log(`  fcmTokens:`, doc.fcmTokens);
    console.log(`  fcmTokenMobile:`, doc.fcmTokenMobile);
  }
  await mongoose.connection.close();
}

run().catch(console.error);
