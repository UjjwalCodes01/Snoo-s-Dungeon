#!/bin/bash

# Generate EPIC background music for dungeon game
# Fast-paced chiptune with driving bassline and melody

OUTPUT_DIR="src/client/public/sounds"
mkdir -p "$OUTPUT_DIR"

echo "🎵 Generating EPIC background music..."
echo ""

# Create an energetic chiptune track with:
# - Driving bass line (low frequency oscillations)
# - Melodic lead (high frequency arpeggio)
# - Rhythmic pulse (mid-range chord stabs)
# Duration: 8 seconds for seamless looping

echo "🎹 Composing epic dungeon theme..."

# Generate complex multi-layered chiptune
ffmpeg \
  -f lavfi -i "sine=frequency=165:duration=8" \
  -f lavfi -i "sine=frequency=220:duration=8" \
  -f lavfi -i "sine=frequency=330:duration=8" \
  -f lavfi -i "sine=frequency=440:duration=8" \
  -f lavfi -i "sine=frequency=660:duration=8" \
  -f lavfi -i "sine=frequency=880:duration=8" \
  -filter_complex "\
    [0]atrim=0:8,asetpts=PTS-STARTPTS,tremolo=f=8:d=0.8,volume=0.35[bass]; \
    [1]atrim=0:8,asetpts=PTS-STARTPTS,tremolo=f=4:d=0.6,volume=0.25[chord1]; \
    [2]atrim=0:8,asetpts=PTS-STARTPTS,tremolo=f=4:d=0.6,volume=0.20[chord2]; \
    [3]atrim=0:8,asetpts=PTS-STARTPTS,tremolo=f=16:d=0.7,volume=0.30[melody1]; \
    [4]atrim=0:8,asetpts=PTS-STARTPTS,tremolo=f=16:d=0.7,adelay=125|125,volume=0.20[melody2]; \
    [5]atrim=0:8,asetpts=PTS-STARTPTS,tremolo=f=32:d=0.5,volume=0.15[arp]; \
    [bass][chord1][chord2][melody1][melody2][arp]amix=inputs=6:duration=longest:dropout_transition=0, \
    crystalizer=i=1.5:c=1, \
    volume=0.25" \
  -t 8 -acodec libvorbis -q:a 4 "$OUTPUT_DIR/bgmusic.ogg" -y 2>/dev/null

if [ -f "$OUTPUT_DIR/bgmusic.ogg" ]; then
    SIZE=$(ls -lh "$OUTPUT_DIR/bgmusic.ogg" | awk '{print $5}')
    echo "  ✅ bgmusic.ogg ($SIZE)"
    echo ""
    echo "🎸 EPIC dungeon music ready!"
    echo "   • Fast-paced chiptune"
    echo "   • Driving bassline"
    echo "   • Energetic melody"
    echo "   • Perfect for intense gameplay"
else
    echo "  ❌ Failed to generate background music"
    exit 1
fi
