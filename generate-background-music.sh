#!/bin/bash

# Generate looping background music for the game
# Creates a retro-style chiptune melody

OUTPUT_DIR="src/client/public/sounds"
mkdir -p "$OUTPUT_DIR"

echo "🎵 Generating background music..."

# Generate a simple 8-bit style background music loop
# Using basic waveforms for a retro game feel
ffmpeg -f lavfi -i "sine=frequency=440:duration=2" \
  -f lavfi -i "sine=frequency=554:duration=2" \
  -f lavfi -i "sine=frequency=659:duration=2" \
  -f lavfi -i "sine=frequency=523:duration=2" \
  -f lavfi -i "sine=frequency=220:duration=8" \
  -filter_complex "\
  [0:a]volume=0.3[a0]; \
  [1:a]adelay=2000|2000,volume=0.3[a1]; \
  [2:a]adelay=4000|4000,volume=0.3[a2]; \
  [3:a]adelay=6000|6000,volume=0.3[a3]; \
  [4:a]volume=0.15[bass]; \
  [a0][a1][a2][a3][bass]amix=inputs=5:duration=longest:dropout_transition=0,volume=0.5" \
  -t 8 -acodec libvorbis -q:a 3 "$OUTPUT_DIR/bgmusic.ogg" -y 2>/dev/null

if [ -f "$OUTPUT_DIR/bgmusic.ogg" ]; then
    SIZE=$(ls -lh "$OUTPUT_DIR/bgmusic.ogg" | awk '{print $5}')
    echo "✅ Background music generated: bgmusic.ogg ($SIZE)"
else
    echo "❌ Failed to generate background music"
    exit 1
fi

echo ""
echo "🎵 Background music ready for looping playback!"
