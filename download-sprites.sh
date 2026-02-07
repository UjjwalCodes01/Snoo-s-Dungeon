#!/bin/bash

# Quick Sprite Download Script
# Downloads Kenney's Tiny Dungeon pack

echo "🎨 Downloading Kenney's Tiny Dungeon Asset Pack..."
echo ""

SPRITES_DIR="./src/client/public/sprites"
TEMP_DIR="/tmp/kenney-dungeon"

# Create directories
mkdir -p "$SPRITES_DIR"
mkdir -p "$TEMP_DIR"

cd "$TEMP_DIR"

# Download Kenney's Tiny Dungeon Pack
echo "📦 Downloading from Kenney.nl..."
wget -q --show-progress "https://kenney.nl/content/3-assets/53-tiny-dungeon/tinyDungeon_v1.1.zip" -O tiny-dungeon.zip

# Extract
echo "📂 Extracting files..."
unzip -q tiny-dungeon.zip

# Find and copy sprite files
echo "🔍 Looking for sprite sheets..."

# Copy any PNG files found
find . -name "*.png" -type f | head -20 | while read file; do
    filename=$(basename "$file")
    echo "   Found: $filename"
done

echo ""
echo "✅ Download complete!"
echo ""
echo "📋 Next steps:"
echo "1. Navigate to $TEMP_DIR"
echo "2. Open the PNG files and identify which ones to use"
echo "3. Rename them according to our naming convention:"
echo "   - player.png (main character)"
echo "   - enemy-goblin.png (green enemy)"
echo "   - enemy-skeleton.png (white enemy)"
echo "   - enemy-slime.png (fast enemy)"
echo "   - enemy-dragon.png (boss)"
echo "4. Copy them to: $SPRITES_DIR"
echo ""
echo "Or run this command to see all files:"
echo "ls -lh $TEMP_DIR/*.png"
