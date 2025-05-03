#!/usr/bin/env node

/**
 * Cron Job Setup Script
 * 
 * This script sets up a cron job to run the scheduled-sync.js script once a week.
 * It generates the crontab entry and provides instructions for manual installation.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if scheduled-sync.js exists
const syncScriptPath = path.join(__dirname, 'scheduled-sync.js');
if (!fs.existsSync(syncScriptPath)) {
  console.error('Error: scheduled-sync.js not found!');
  console.error('Make sure scheduled-sync.js exists in the project directory.');
  process.exit(1);
}

// Get the absolute path of node and the script
const nodePath = process.execPath;
const fullScriptPath = path.resolve(syncScriptPath);

// Default to running on Sunday at 2:00 AM
const cronSchedule = '0 2 * * 0';
const cronCommand = `${nodePath} ${fullScriptPath} >> ${path.join(__dirname, 'sync-log.txt')} 2>&1`;

// Generate the crontab entry
const cronEntry = `${cronSchedule} ${cronCommand}`;

// Create a temp file with the cron entry for reference
const tempCronFilePath = path.join(__dirname, 'crontab-entry.txt');
fs.writeFileSync(tempCronFilePath, cronEntry + '\n');

console.log('\n========================================');
console.log('Shopify to Firebase Sync - Cron Setup');
console.log('========================================\n');

console.log('Generated cron job to run weekly on Sunday at 2:00 AM');
console.log(`Cron schedule: ${cronSchedule}`);
console.log(`Command: ${cronCommand}`);

console.log('\nSetup Options:');
console.log('1. Automatic setup (recommended)');
console.log('2. Manual setup');

// Determine if we're on a system that supports crontab
let supportsCrontab = false;
try {
  execSync('crontab -l', { stdio: 'ignore' });
  supportsCrontab = true;
} catch (error) {
  // If we get here, either the system doesn't have crontab or we don't have permission
  supportsCrontab = false;
}

if (supportsCrontab) {
  console.log('\nYour system appears to support crontab. You can use the automatic setup.');
  console.log('\nTo automatically add this job to your crontab, run:');
  console.log(`(crontab -l 2>/dev/null; echo "${cronEntry}") | crontab -`);
  
  console.log('\nOr for Windows, you can use Task Scheduler:');
  console.log('1. Open Task Scheduler');
  console.log('2. Create a Basic Task');
  console.log('3. Set the trigger to Weekly, Sunday at 2:00 AM');
  console.log(`4. Set the action to Start a Program: ${nodePath}`);
  console.log(`5. Add arguments: ${fullScriptPath}`);
} else {
  console.log('\nAutomatic crontab setup is not available on this system.');
  
  // On Windows, give Task Scheduler instructions
  if (process.platform === 'win32') {
    console.log('\nTo set up on Windows, use Task Scheduler:');
    console.log('1. Open Task Scheduler (search for it in the Start menu)');
    console.log('2. Click "Create Basic Task" in the right panel');
    console.log('3. Name it "Shopify Firebase Sync" and add a description');
    console.log('4. Set the trigger to "Weekly" and select Sunday');
    console.log('5. Set the time to 2:00 AM');
    console.log('6. Choose "Start a program" for the action');
    console.log(`7. Browse to select your Node.js executable: ${nodePath}`);
    console.log(`8. Add the full path to the script as an argument: ${fullScriptPath}`);
    console.log('9. Complete the wizard and your task will be scheduled');
  }
}

console.log('\nA reference file has been created at:');
console.log(tempCronFilePath);
console.log('\nThe sync process will log all output to:');
console.log(path.join(__dirname, 'sync-log.txt'));

console.log('\n========================================');
console.log('To test the sync script manually, run:');
console.log(`node ${path.relative(process.cwd(), fullScriptPath)}`);
console.log('========================================\n'); 