const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '../public/icons');
const SVG_TEMPLATE = path.join(ICONS_DIR, 'icon-template.svg');
const SVG_TEMPLATE_MASKABLE = path.join(ICONS_DIR, 'icon-template-maskable.svg');

// Standard icon sizes
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Maskable icon sizes
const MASKABLE_SIZES = [192, 512];

// Apple touch icon sizes
const APPLE_SIZES = [
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 120, name: 'apple-touch-icon-120x120.png' },
];

async function generateIcons() {
  console.log('🎨 Generating PWA icons...\n');

  // Check if templates exist
  if (!fs.existsSync(SVG_TEMPLATE)) {
    console.error('❌ Error: icon-template.svg not found');
    process.exit(1);
  }

  if (!fs.existsSync(SVG_TEMPLATE_MASKABLE)) {
    console.error('❌ Error: icon-template-maskable.svg not found');
    process.exit(1);
  }

  try {
    // Generate standard icons
    console.log('📱 Generating standard icons...');
    for (const size of ICON_SIZES) {
      const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
      await sharp(SVG_TEMPLATE)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`  ✓ Generated icon-${size}x${size}.png`);
    }

    // Generate maskable icons
    console.log('\n🎭 Generating maskable icons...');
    for (const size of MASKABLE_SIZES) {
      const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}-maskable.png`);
      await sharp(SVG_TEMPLATE_MASKABLE)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`  ✓ Generated icon-${size}x${size}-maskable.png`);
    }

    // Generate Apple touch icons
    console.log('\n🍎 Generating Apple touch icons...');
    for (const { size, name } of APPLE_SIZES) {
      const outputPath = path.join(ICONS_DIR, name);
      await sharp(SVG_TEMPLATE)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`  ✓ Generated ${name}`);
    }

    // Copy apple-touch-icon to public root for iOS compatibility
    const appleTouchIconPublic = path.join(__dirname, '../public/apple-touch-icon.png');
    fs.copyFileSync(
      path.join(ICONS_DIR, 'apple-touch-icon.png'),
      appleTouchIconPublic
    );
    console.log('  ✓ Copied apple-touch-icon.png to public root');

    console.log('\n✅ All icons generated successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - ${ICON_SIZES.length} standard icons`);
    console.log(`   - ${MASKABLE_SIZES.length} maskable icons`);
    console.log(`   - ${APPLE_SIZES.length} Apple touch icons`);
    console.log(`   - Total: ${ICON_SIZES.length + MASKABLE_SIZES.length + APPLE_SIZES.length} icons\n`);
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();

