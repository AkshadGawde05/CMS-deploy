import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const addNamesToTeachersAndParents = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Update Teachers - copy names from populated user_id
    console.log('\n👨‍🏫 Migrating Teachers collection...');
    const teachers = await db.collection('teachers').find({}).toArray();
    let teacherCount = 0;
    
    for (const teacher of teachers) {
      if (teacher.user_id && (!teacher.fname || !teacher.lname)) {
        const user = await db.collection('users').findOne({ _id: teacher.user_id });
        if (user && user.fname && user.lname) {
          await db.collection('teachers').updateOne(
            { _id: teacher._id },
            { 
              $set: { 
                fname: user.fname,
                lname: user.lname
              } 
            }
          );
          teacherCount++;
        }
      }
    }
    console.log(`✅ Updated ${teacherCount} teacher records`);

    // Update Parents - copy names from populated user_id
    console.log('\n👨‍👩‍👧 Migrating Parents collection...');
    const parents = await db.collection('parents').find({}).toArray();
    let parentCount = 0;
    
    for (const parent of parents) {
      if (parent.user_id && (!parent.fname || !parent.lname)) {
        const user = await db.collection('users').findOne({ _id: parent.user_id });
        if (user && user.fname && user.lname) {
          await db.collection('parents').updateOne(
            { _id: parent._id },
            { 
              $set: { 
                fname: user.fname,
                lname: user.lname
              } 
            }
          );
          parentCount++;
        }
      }
    }
    console.log(`✅ Updated ${parentCount} parent records`);

    console.log('\n✨ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Teachers: ${teacherCount} records updated`);
    console.log(`   Parents: ${parentCount} records updated`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

addNamesToTeachersAndParents();
