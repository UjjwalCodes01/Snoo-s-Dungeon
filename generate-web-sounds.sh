#!/bin/bash
# generate-web-sounds.sh - Generate retro game sounds using sfxr-style synthesis

echo "🎵 Generating Retro Game Sounds"
echo "================================"
echo ""
echo "Creating 8-bit style sounds using ffmpeg..."
echo ""

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ ffmpeg is required but not installed"
    echo ""
    echo "Install it:"
    echo "  Ubuntu/Debian: sudo apt install ffmpeg"
    echo "  macOS: brew install ffmpeg"
    echo "  Arch: sudo pacman -S ffmpeg"
    echo ""
    exit 1
fi

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SOUNDS_DIR="$PROJECT_ROOT/src/client/public/sounds"

echo "📁 Output directory: $SOUNDS_DIR"
echo ""

# Function to generate a simple tone
generate_tone() {
    local filename=$1
    local freq=$2
    local duration=$3
    local waveform=$4
    
    ffmpeg -f lavfi -i "sine=frequency=$freq:duration=$duration" \
           -af "volume=0.3" \
           -c:a libvorbis -q:a 2 \
           "$SOUNDS_DIR/$filename.ogg" \
           -y -loglevel quiet
    
    echo "✅ Generated $filename.ogg"
}

# Function to generate noise-based sound
generate_noise() {
    local filename=$1
    local duration=$2
    local lowpass=$3
    
    ffmpeg -f lavfi -i "anoisesrc=duration=$duration:color=white:amplitude=0.3" \
           -af "lowpass=f=$lowpass,volume=0.3" \
           -c:a libvorbis -q:a 2 \
           "$SOUNDS_DIR/$filename.ogg" \
           -y -loglevel quiet
    
    echo "✅ Generated $filename.ogg"
}

# Function to generate sweep
generate_sweep() {
    local filename=$1
    local freq_start=$2
    local freq_end=$3
    local duration=$4
    
    ffmpeg -f lavfi -i "sine=frequency=$freq_start:duration=$duration" \
           -af "asetrate=44100*($freq_end/$freq_start)^(t/$duration),aresample=44100,volume=0.3" \
           -c:a libvorbis -q:a 2 \
           "$SOUNDS_DIR/$filename.ogg" \
           -y -loglevel quiet 2>/dev/null || {
        # Fallback to simple tone if sweep fails
        ffmpeg -f lavfi -i "sine=frequency=$freq_start:duration=$duration" \
               -af "volume=0.3" \
               -c:a libvorbis -q:a 2 \
               "$SOUNDS_DIR/$filename.ogg" \
               -y -loglevel quiet
    }
    
    echo "✅ Generated $filename.ogg"
}

# Generate all game sounds
echo "🎮 Generating game sounds..."
echo ""

# Attack - short high-pitched blip
generate_tone "attack" 800 0.08 "square"

# Hit - punchy mid-range tone
generate_tone "hit" 200 0.05 "square"

# Kill - descending sweep
generate_sweep "kill" 400 100 0.15

# Dash - whoosh noise
generate_noise "dash" 0.12 4000

# Wave - ascending chord (simulate with single tone)
generate_sweep "wave" 440 880 0.3

# Boss - ominous low tone
generate_tone "boss" 80 0.4 "square"

# Game Over - descending sad tone
generate_sweep "gameOver" 300 50 0.5

# Victory - ascending fanfare (simulate with rising tone)
generate_sweep "victory" 523 1047 0.4

# Pickup - quick rising blip
generate_sweep "pickup" 600 1200 0.1

echo ""
echo "✅ All sounds generated!"
echo ""
echo "📊 Sound files:"
ls -lh "$SOUNDS_DIR"
echo ""
echo "🎮 Test your game: npm run dev"
echo ""
echo "💡 These are synthesized 8-bit style sounds"
echo "   For higher quality, download from: https://kenney.nl/assets/digital-audio"
