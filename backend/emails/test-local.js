#!/usr/bin/env node
/**
 * Local test script for email service
 * Run this to test email rendering without Docker
 * 
 * Usage: node test-local.js
 */

const { render } = require('@react-email/render');
const React = require('react');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Email Rendering Locally\n');

// Test 1: Import BaseEmail
console.log('1️⃣  Testing BaseEmail import...');
try {
  const { BaseEmail, colors } = require('./emails/BaseEmail');
  console.log('✅ BaseEmail imported successfully');
  console.log('   Colors:', Object.keys(colors));
} catch (e) {
  console.log('❌ Failed to import BaseEmail:', e.message);
  process.exit(1);
}

// Test 2: Import ReminderEmail
console.log('\n2️⃣  Testing ReminderEmail import...');
try {
  const ReminderEmail = require('./emails/ReminderEmail');
  console.log('✅ ReminderEmail imported successfully');
} catch (e) {
  console.log('❌ Failed to import ReminderEmail:', e.message);
  process.exit(1);
}

// Test 3: Render simple email
console.log('\n3️⃣  Testing simple email render...');
try {
  const ReminderEmail = require('./emails/ReminderEmail');
  
  const html = render(React.createElement(ReminderEmail, {
    name: 'Alex',
    title: 'Test Interview',
    description: 'This is a test email',
    dueDate: 'Tomorrow at 2PM',
    timeUntil: '18 hours',
    urgency: 'tomorrow',
    eventType: 'interview',
    actionUrl: 'https://applytide.com'
  }));
  
  console.log(`✅ Email rendered successfully (${html.length} characters)`);
  
  // Save to file
  const outputPath = path.join(__dirname, 'test-output.html');
  fs.writeFileSync(outputPath, html, 'utf-8');
  console.log(`   💾 Saved to ${outputPath}`);
} catch (e) {
  console.log('❌ Failed to render email:', e.message);
  console.log(e.stack);
  process.exit(1);
}

// Test 4: Render with AI prep tips
console.log('\n4️⃣  Testing email with AI prep tips...');
try {
  const ReminderEmail = require('./emails/ReminderEmail');
  
  const html = render(React.createElement(ReminderEmail, {
    name: 'Alex',
    title: 'Technical Interview - Senior Engineer',
    description: 'System design round with the engineering team',
    dueDate: 'Tomorrow, Nov 5 at 2:00 PM',
    timeUntil: '18 hours',
    urgency: 'tomorrow',
    eventType: 'interview',
    actionUrl: 'https://applytide.com/app/123',
    aiPrepTips: {
      company: 'TechCorp',
      companyInfo: 'TechCorp is a rapidly growing SaaS company known for innovative cloud solutions.',
      prepTime: '8-12 hours',
      focusAreas: [
        { icon: '🎯', title: 'System Design', description: 'Load balancing, caching, sharding' },
        { icon: '💎', title: 'Microservices', description: 'Service discovery, API gateways' },
        { icon: '⚡', title: 'Scalability', description: 'Horizontal vs vertical, CAP theorem' },
        { icon: '🚀', title: 'Cloud-Native', description: 'Kubernetes, Docker, service mesh' },
      ],
      roadmap: [
        "Review TechCorp's engineering blog and identify 2-3 technical challenges",
        "Practice designing a distributed system end-to-end",
        "Prepare 3 STAR stories about handling traffic spikes",
        "Review CAP theorem with concrete examples",
        "Brush up on Kubernetes: pods, deployments, services",
      ]
    }
  }));
  
  console.log(`✅ Email with AI tips rendered (${html.length} characters)`);
  
  // Save to file
  const outputPath = path.join(__dirname, 'test-output-ai.html');
  fs.writeFileSync(outputPath, html, 'utf-8');
  console.log(`   💾 Saved to ${outputPath}`);
} catch (e) {
  console.log('❌ Failed to render email with AI tips:', e.message);
  console.log(e.stack);
  process.exit(1);
}

console.log('\n🎉 All tests passed!\n');
console.log('📧 Open test-output.html and test-output-ai.html in a browser to preview');
console.log('\n✨ Ready to start the server with: node server.js');
