#!/bin/bash

# Generate EPIC retro game sound effects using FFmpeg
# Creates punchy 8-bit style sounds with maximum energy

OUTPUT_DIR="src/client/public/sounds"
mkdir -p "$OUTPUT_DIR"

echo "🔊 Generating EPIC retro game sounds..."
echo ""

# Attack sound - AGGRESSIVE sword slash with layered square waves
echo "⚔️  Generating attack.ogg..."
ffmpeg -f lavfi -i "sine=frequency=1200:duration=0.06" \
  -f lavfi -i "sine=frequency=800:duration=0.06" \
  -f lavfi -i "anoisesrc=duration=0.02:color=white" \
  -filter_complex "[0]volume=0.8[a0];[1]volume=0.6[a1];[2]highpass=f=8000,volume=0.4[noise];[a0][a1][noise]amix=inputs=3:duration=first:dropout_transition=0,crystalizer=i=2.0:c=1" \
  -acodec libvorbis -q:a 5 "$OUTPUT_DIR/attack.ogg" -y 2>/dev/null
echo "  ✅ attack.ogg ($(ls -lh "$OUTPUT_DIR/attack.ogg" | awk '{print $5}'))"

# Hit/Impact - PUNCHY thump with bass drop
echo "💥 Generating hit.ogg..."
ffmpeg -f lavfi -i "sine=frequency=150:duration=0.08" \
  -f lavfi -i "sine=frequency=80:duration=0.08" \
  -filter_complex "[0]asetrate=44100*2.0,aresample=44100,atempo=0.5,volume=1.0[hit];[1]volume=0.8[bass];[hit][bass]amix=inputs=2:duration=first,crystalizer=i=3.0" \
  -acodec libvorbis -q:a 5 "$OUTPUT_DIR/hit.ogg" -y 2>/dev/null
echo "  ✅ hit.ogg ($(ls -lh "$OUTPUT_DIR/hit.ogg" | awk '{print $5}'))"

# Kill/Death - DRAMATIC descending sweep with echo
echo "💀 Generating kill.ogg..."
ffmpeg -f lavfi -i "sine=frequency=800:duration=0.25" \
  -af "asetrate=44100*4.0,aresample=44100,atempo=0.25,aecho=0.8:0.88:60:0.4,volume=0.9,crystalizer=i=2.5" \
  -acodec libvorbis -q:a 5 "$OUTPUT_DIR/kill.ogg" -y 2>/dev/null
echo "  ✅ kill.ogg ($(ls -lh "$OUTPUT_DIR/kill.ogg" | awk '{print $5}'))"

# Dash - POWERFUL whoosh with pitch sweep
echo "💨 Generating dash.ogg..."
ffmpeg -f lavfi -i "anoisesrc=duration=0.15:color=white" \
  -f lavfi -i "sine=frequency=400:duration=0.15" \
  -filter_complex "[0]highpass=f=2000,lowpass=f=8000,volume=0.7[whoosh];[1]asetrate=44100*1.5,aresample=44100,atempo=0.67,volume=0.5[sweep];[whoosh][sweep]amix=inputs=2:duration=first,crystalizer=i=2.0" \
  -acodec libvorbis -q:a 5 "$OUTPUT_DIR/dash.ogg" -y 2>/dev/null
echo "  ✅ dash.ogg ($(ls -lh "$OUTPUT_DIR/dash.ogg" | awk '{print $5}'))"

# Wave complete - TRIUMPHANT ascending fanfare with harmony
echo "🌊 Generating wave.ogg..."
ffmpeg -f lavfi -i "sine=frequency=523:duration=0.4" \
  -f lavfi -i "sine=frequency=659:duration=0.4" \
  -f lavfi -i "sine=frequency=784:duration=0.4" \
  -filter_complex "[0]asetrate=44100*0.4,aresample=44100,atempo=2.5,volume=0.8[lead];[1]adelay=50|50,asetrate=44100*0.4,aresample=44100,atempo=2.5,volume=0.6[mid];[2]adelay=100|100,asetrate=44100*0.4,aresample=44100,atempo=2.5,volume=0.4[high];[lead][mid][high]amix=inputs=3:duration=first,crystalizer=i=2.0" \
  -acodec libvorbis -q:a 5 "$OUTPUT_DIR/wave.ogg" -y 2>/dev/null
echo "  ✅ wave.ogg ($(ls -lh "$OUTPUT_DIR/wave.ogg" | awk '{print $5}'))"

# Boss spawn - EPIC ominous rumble with tension
echo "👹 Generating boss.ogg..."
ffmpeg -f lavfi -i "sine=frequency=60:duration=0.6" \
  -f lavfi -i "sine=frequency=90:duration=0.6" \
  -f lavfi -i "anoisesrc=duration=0.6:color=brown" \
  -filter_complex "[0]tremolo=f=7:d=0.95,volume=1.0[rumble];[1]tremolo=f=11:d=0.9,volume=0.7[growl];[2]lowpass=f=200,volume=0.3[noise];[rumble][growl][noise]amix=inputs=3:duration=first,crystalizer=i=3.0" \
  -acodec libvorbis -q:a 5 "$OUTPUT_DIR/boss.ogg" -y 2>/dev/null
echo "  ✅ boss.ogg ($(ls -lh "$OUTPUT_DIR/boss.ogg" | awk '{print $5}'))"

# Game over - EPIC FAIL descending with reverb
echo "☠️  Generating gameOver.ogg..."
ffmpeg -f lavfi -i "sine=frequency=400:duration=0.7" \
  -f lavfi -i "sine=frequency=200:duration=0.7" \
  -filter_complex "[0]asetrate=44100*3.0,aresample=44100,atempo=0.33,volume=0.8[fall1];[1]asetrate=44100*2.5,aresample=44100,atempo=0.4,volume=0.6[fall2];[fall1][fall2]amix=inputs=2:duration=first,aecho=0.8:0.9:500:0.5,crystalizer=i=2.0" \
  -acodec libvorbis -q:a 5 "$OUTPUT_DIR/gameOver.ogg" -y 2>/dev/null
echo "  ✅ gameOver.ogg ($(ls -lh "$OUTPUT_DIR/gameOver.ogg" | awk '{print $5}'))"

# Victory - EPIC WIN fanfare with sparkle
echo "🏆 Generating victory.ogg..."
ffmpeg -f lavfi -i "sine=frequency=523:duration=0.5" \
  -f lavfi -i "sine=frequency=659:duration=0.5" \
  -f lavfi -i "sine=frequency=1047:duration=0.5" \
  -f lavfi -i "anoisesrc=duration=0.5:color=white" \
  -filter_complex "[0]asetrate=44100*0.35,aresample=44100,atempo=2.86,volume=1.0[c1];[1]adelay=80|80,asetrate=44100*0.35,aresample=44100,atempo=2.86,volume=0.8[e];[2]adelay=160|160,asetrate=44100*0.35,aresample=44100,atempo=2.86,volume=0.6[c2];[3]highpass=f=8000,volume=0.2[sparkle];[c1][e][c2][sparkle]amix=inputs=4:duration=first,crystalizer=i=2.5" \
  -acodec libvorbis -q:a 5 "$OUTPUT_DIR/victory.ogg" -y 2>/dev/null
echo "  ✅ victory.ogg ($(ls -lh "$OUTPUT_DIR/victory.ogg" | awk '{print $5}'))"

# Pickup - SATISFYING blip with overtones
echo "✨ Generating pickup.ogg..."
ffmpeg -f lavfi -i "sine=frequency=800:duration=0.12" \
  -f lavfi -i "sine=frequency=1600:duration=0.12" \
  -filter_complex "[0]asetrate=44100*0.4,aresample=44100,atempo=2.5,volume=0.9[base];[1]adelay=20|20,asetrate=44100*0.4,aresample=44100,atempo=2.5,volume=0.5[harmonic];[base][harmonic]amix=inputs=2:duration=first,crystalizer=i=2.5" \
  -acodec libvorbis -q:a 5 "$OUTPUT_DIR/pickup.ogg" -y 2>/dev/null
echo "  ✅ pickup.ogg ($(ls -lh "$OUTPUT_DIR/pickup.ogg" | awk '{print $5}'))"

echo ""
echo "🎮 Total size: $(du -sh $OUTPUT_DIR | awk '{print $1}')"
echo ""
echo "✅ All EPIC sounds generated successfully!"
