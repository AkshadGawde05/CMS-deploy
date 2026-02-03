import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';

dotenv.config();

async function createTestAttendance() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get first student
    const student = await Student.findOne();
    
    if (!student) {
      console.log('❌ No students found. Please create a student first.');
      process.exit(1);
    }

    console.log(`📝 Creating test attendance for: ${student.fname} ${student.lname}`);

    // Create test attendance records for last 7 days
    const records = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const checkInTime = new Date(date);
      checkInTime.setHours(9, Math.floor(Math.random() * 30), 0);

      records.push({
        studentId: student._id,
        batchId: student.batchid,
        deviceId: 'manual',
        timestamp: checkInTime,
        date: new Date(date.toDateString()),
        logType: 'check_in',
        status: i % 5 === 0 ? 'late' : 'present',
        source: 'manual',
        notes: `Test data - Day ${i + 1}`
      });
    }

    await Attendance.insertMany(records);
    
    console.log(`✅ Created ${records.length} test attendance records`);
    console.log('\nTest API now:');
    console.log('curl http://localhost:5000/api/attendance -H "Authorization: Bearer YOUR_TOKEN"');
    
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

createTestAttendance();
