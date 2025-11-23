const mongoose = require('mongoose');

async function checkNotifications() {
  try {
    console.log('🔍 Checking notifications collection...\n');

    await mongoose.connect('mongodb://localhost:27017/talkcart');
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const notificationsCollection = db.collection('notifications');

    // Check all notifications
    const notifications = await notificationsCollection.find({}).toArray();
    console.log(`Found ${notifications.length} notifications:`);
    
    notifications.forEach((notification, index) => {
      console.log(`\nNotification ${index + 1}:`);
      console.log(`  Type: ${notification.type}`);
      console.log(`  User: ${notification.user}`);
      console.log(`  Entity ID: ${notification.entityId}`);
      console.log(`  Message: ${notification.message}`);
    });
    
    // Count post-related notifications
    const postNotifications = await notificationsCollection.countDocuments({
      $or: [
        { type: 'post_like' },
        { type: 'post_comment' },
        { type: 'post_share' },
        { type: 'post_bookmark' }
      ]
    });
    
    console.log(`\nFound ${postNotifications} post-related notifications`);
    
    // Remove post-related notifications
    if (postNotifications > 0) {
      const deleteResult = await notificationsCollection.deleteMany({
        $or: [
          { type: 'post_like' },
          { type: 'post_comment' },
          { type: 'post_share' },
          { type: 'post_bookmark' }
        ]
      });
      console.log(`✅ Removed ${deleteResult.deletedCount} post-related notifications`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkNotifications();