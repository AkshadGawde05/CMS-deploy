const mongoose = require('mongoose');
require('dotenv').config();
const Student = require('../../models/Student');

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Add device_user_id field to Student schema
    const result = await Student.updateMany(
      { device_user_id: { $exists: false } },
      { $set: { device_user_id: null } }
    );

    console.log(`✅ Updated ${result.modifiedCount} student records`);
    console.log('Migration complete!');

    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
