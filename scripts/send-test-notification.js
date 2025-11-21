#!/usr/bin/env node

/**
 * Test script to send push notifications using Firebase Admin SDK
 * 
 * Usage:
 *   node scripts/send-test-notification.js <device-token>
 * 
 * Setup:
 *   1. Download Firebase service account JSON from Firebase Console
 *   2. Save as firebase-admin-key.json in project root
 *   3. Install: npm install firebase-admin
 *   4. Run this script with a device token
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
try {
  const serviceAccount = require('../firebase-admin-key.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (error) {
  console.error('❌ Error loading Firebase Admin SDK credentials');
  console.error('Make sure firebase-admin-key.json exists in project root');
  console.error('Download it from Firebase Console > Project Settings > Service Accounts');
  process.exit(1);
}

// Get device token from command line
const deviceToken = process.argv[2];

if (!deviceToken) {
  console.error('❌ Missing device token');
  console.log('\nUsage:');
  console.log('  node scripts/send-test-notification.js <device-token>');
  console.log('\nExample:');
  console.log('  node scripts/send-test-notification.js eyJhbGciOiJSUzI1NiI...');
  process.exit(1);
}

// Notification payload
const message = {
  notification: {
    title: '🎯 Task Reminder',
    body: "Time to crush your goals! Don't forget your workout session.",
  },
  data: {
    route: '/dashboard',
    type: 'task_reminder',
    taskId: 'test-task-123',
  },
  token: deviceToken,
};

// Send notification
console.log('📤 Sending notification...\n');
console.log('Token:', deviceToken.substring(0, 20) + '...');
console.log('Title:', message.notification.title);
console.log('Body:', message.notification.body);
console.log('Data:', message.data);

admin
  .messaging()
  .send(message)
  .then((response) => {
    console.log('\n✅ Notification sent successfully!');
    console.log('Message ID:', response);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error sending notification:', error.message);
    console.error('\nCommon issues:');
    console.error('- Invalid device token');
    console.error('- Token expired (user uninstalled app)');
    console.error('- Wrong Firebase project');
    console.error('- APNs/FCM not configured correctly');
    process.exit(1);
  });

