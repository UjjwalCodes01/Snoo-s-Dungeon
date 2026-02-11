#!/bin/bash
# quick-sounds-download.sh - Download from alternative free sources

echo "🎵 Quick Sound Download (Alternative Sources)"
echo "=============================================="
echo ""

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SOUNDS_DIR="$PROJECT_ROOT/src/client/public/sounds"

echo "📥 Downloading from OpenGameArt.org and other CC0 sources..."
echo ""

# Function to download with fallback
download_sound() {
    local name=$1
    local url=$2
    local output="$SOUNDS_DIR/$name.ogg"
    
    echo -n "Downloading $name.ogg... "
    
    if curl -L -f -s "$url" -o "$output" --max-time 30; then
        # Check if file is actually audio (> 1KB)
        if [ $(stat -f%z "$output" 2>/dev/null || stat -c%s "$output" 2>/dev/null) -gt 1000 ]; then
            echo "✅"
            return 0
        fi
    fi
    
    echo "⚠️  (using placeholder)"
    return 1
}

# Download sounds from various CC0 sources
# These are example URLs - you'll need actual working URLs

echo "Attempting downloads..."
echo ""

# Alternative: Use archive.org or other reliable sources
# For now, we'll list where to find each sound

cat << 'EOF'
📝 MANUAL DOWNLOAD RECOMMENDED

Due to download restrictions on most free sound sites, please:

1. Visit one of these FREE sound libraries:
   
   🌟 KENNEY.NL (Recommended):
   https://kenney.nl/assets/digital-audio
   - Download the pack
   - Run: ./download-sounds.sh
   - Follow the prompts
   
   🌟 FREESOUND.ORG:
   https://freesound.org
   - Search for each sound type
   - Download and rename to match:
     * attack.ogg
     * hit.ogg
     * kill.ogg
     * dash.ogg
     * wave.ogg
     * boss.ogg
     * gameOver.ogg
     * victory.ogg
     * pickup.ogg

2. OR use the synthesizer script:
   chmod +x generate-web-sounds.sh
   ./generate-web-sounds.sh
   
   (Requires ffmpeg: sudo apt install ffmpeg)

3. Place all files in:
   src/client/public/sounds/

EOF

echo ""
read -p "Would you like to open Kenney.nl in your browser? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    xdg-open "https://kenney.nl/assets/digital-audio" 2>/dev/null || \
    open "https://kenney.nl/assets/digital-audio" 2>/dev/null || \
    echo "Please visit: https://kenney.nl/assets/digital-audio"
fi

echo ""
echo "Current sounds in $SOUNDS_DIR:"
ls -lh "$SOUNDS_DIR" 2>/dev/null || echo "No sounds yet"
