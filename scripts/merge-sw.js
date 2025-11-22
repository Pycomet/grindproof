/**
 * Service Worker Merger
 * Merges custom push notification handlers with the next-pwa generated service worker
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SW_PATH = path.join(PUBLIC_DIR, 'sw.js');
const CUSTOM_SW_PATH = path.join(PUBLIC_DIR, 'sw-custom.js');

function mergeServiceWorkers() {
  console.log('🔧 Merging service worker files...');

  // Check if generated sw.js exists
  if (!fs.existsSync(SW_PATH)) {
    console.error('❌ Error: sw.js not found. Build the app first with "yarn build"');
    process.exit(1);
  }

  // Check if custom sw handlers exist
  if (!fs.existsSync(CUSTOM_SW_PATH)) {
    console.error('❌ Error: sw-custom.js not found');
    process.exit(1);
  }

  try {
    // Read the generated service worker
    const swContent = fs.readFileSync(SW_PATH, 'utf8');

    // Read the custom handlers
    const customSwContent = fs.readFileSync(CUSTOM_SW_PATH, 'utf8');

    // Check if already merged
    if (swContent.includes('// Custom Push Notification Handlers')) {
      console.log('✅ Service worker already includes push notification handlers');
      return;
    }

    // Extract only the event listeners from custom sw
    const eventListenersMatch = customSwContent.match(
      /\/\/ Handle push notifications[\s\S]*?console\.log\('\[Service Worker\] Custom push notification handlers loaded'\);/
    );

    if (!eventListenersMatch) {
      console.error('❌ Error: Could not extract event listeners from sw-custom.js');
      process.exit(1);
    }

    const eventListeners = eventListenersMatch[0];

    // Append custom handlers to the generated service worker
    const mergedContent = swContent + '\n\n' + 
      '// Custom Push Notification Handlers\n' +
      '// Added by merge-sw.js script\n\n' +
      eventListeners + '\n';

    // Write the merged content back
    fs.writeFileSync(SW_PATH, mergedContent, 'utf8');

    console.log('✅ Successfully merged push notification handlers into sw.js');
    console.log('📍 Location: public/sw.js');
  } catch (error) {
    console.error('❌ Error merging service workers:', error.message);
    process.exit(1);
  }
}

// Run the merge
mergeServiceWorkers();

