# PWA Icon Generation Guide

This directory contains SVG templates for your Grindproof PWA icons. You need to convert these to PNG files in various sizes.

## Required Icon Sizes

### Standard Icons
- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `icon-192x192.png`
- `icon-384x384.png`
- `icon-512x512.png`

### Maskable Icons (for Android Adaptive Icons)
- `icon-192x192-maskable.png`
- `icon-512x512-maskable.png`

### Apple Touch Icons
- `apple-touch-icon.png` (180x180)
- `apple-touch-icon-120x120.png`

## Generation Methods

### Option 1: Using Sharp (Node.js) - Recommended

Install sharp:
```bash
yarn add -D sharp
```

Run the generation script:
```bash
node scripts/generate-icons.js
```

### Option 2: Using ImageMagick (Command Line)

Install ImageMagick:
```bash
# macOS
brew install imagemagick

# Ubuntu/Debian
sudo apt-get install imagemagick
```

Generate icons:
```bash
# Standard icons
for size in 72 96 128 144 152 192 384 512; do
  convert -background none -resize ${size}x${size} icon-template.svg icon-${size}x${size}.png
done

# Maskable icons
convert -background none -resize 192x192 icon-template-maskable.svg icon-192x192-maskable.png
convert -background none -resize 512x512 icon-template-maskable.svg icon-512x512-maskable.png

# Apple touch icons
convert -background none -resize 180x180 icon-template.svg apple-touch-icon.png
convert -background none -resize 120x120 icon-template.svg apple-touch-icon-120x120.png
```

### Option 3: Using Online Tools

1. Go to https://realfavicongenerator.net/
2. Upload the `icon-template.svg` file
3. Download the generated icon pack
4. Extract and place files in this directory

### Option 4: Using Figma/Sketch/Design Tool

1. Open `icon-template.svg` in your design tool
2. Export PNG at each required size
3. Repeat for maskable template with proper safe zone

## Maskable Icons

Maskable icons are used by Android for adaptive icons. The content should be within the safe zone (80% of the canvas, centered) so it won't be cut off by different mask shapes.

- `icon-template-maskable.svg` already has proper safe zone padding
- The icon content is scaled to 60% with appropriate margins

## Testing Icons

After generation, test your icons:
1. Build your app: `yarn build`
2. Deploy or run production build
3. Test installation on:
   - iOS Safari
   - Android Chrome
   - Desktop Chrome

## Verification Checklist

- [ ] All required PNG files generated
- [ ] Icons display correctly on light backgrounds
- [ ] Icons display correctly on dark backgrounds
- [ ] Maskable icons properly centered in safe zone
- [ ] Apple touch icons look good on iOS home screen
- [ ] File sizes are optimized (<50KB each)

