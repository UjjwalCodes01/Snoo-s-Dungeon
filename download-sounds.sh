#!/bin/bash
# download-sounds.sh - Download free game sound effects

echo "🎵 Sound Download Options"
echo "========================"
echo ""
echo "Unfortunately, automated download from Kenney.nl requires manual steps."
echo ""
echo "📥 OPTION 1: Download from Kenney.nl (RECOMMENDED)"
echo "   1. Visit: https://kenney.nl/assets/digital-audio"
echo "   2. Click the orange 'Download' button"
echo "   3. Extract the ZIP file"
echo "   4. Run this script again to organize files"
echo ""
echo "📥 OPTION 2: Use freesound.org"
echo "   1. Visit: https://freesound.org"
echo "   2. Search for: '8-bit game sounds'"
echo "   3. Download 9 sounds and rename them"
echo ""
echo "📥 OPTION 3: Generate from Web"
echo "   Using jsfxr.frozenfractal.com to create sounds"
echo ""

read -p "Do you have the Kenney ZIP file downloaded? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter the full path to digitalaudio.zip: " ZIP_PATH
    
    if [ -f "$ZIP_PATH" ]; then
        echo "📂 Extracting files..."
        
        # Get project root
        PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
        SOUNDS_DIR="$PROJECT_ROOT/src/client/public/sounds"
        TMP_DIR="/tmp/kenney-sounds-$$"
        
        mkdir -p "$TMP_DIR"
        unzip -q "$ZIP_PATH" -d "$TMP_DIR"
        
        echo "📋 Copying and renaming sound files..."
        
        # Find the Audio directory (might be nested differently)
        AUDIO_DIR=$(find "$TMP_DIR" -type d -name "Audio" -o -name "Sounds" | head -1)
        
        if [ -z "$AUDIO_DIR" ]; then
            echo "❌ Cannot find Audio directory in ZIP"
            echo "📁 Contents:"
            ls -R "$TMP_DIR"
            rm -rf "$TMP_DIR"
            exit 1
        fi
        
        echo "✅ Found audio directory: $AUDIO_DIR"
        echo ""
        
        # Copy files with various possible names
        declare -A file_map=(
            ["attack"]="pepSound1.ogg|blip_001.ogg|switch1.ogg"
            ["hit"]="impactPunch_medium_001.ogg|impact_001.ogg|hit.ogg"
            ["kill"]="explosionCrunch_000.ogg|explosion_001.ogg|boom.ogg"
            ["dash"]="forceField_001.ogg|swoosh.ogg|whoosh.ogg"
            ["wave"]="powerUp12.ogg|powerUp.ogg|success.ogg"
            ["boss"]="lowDown.ogg|lowFrequency_001.ogg|bass.ogg"
            ["gameOver"]="lowThreeTone.ogg|失败.ogg|lose.ogg"
            ["victory"]="highUp.ogg|highFrequency_001.ogg|win.ogg"
            ["pickup"]="pickupCoin.ogg|coin.ogg|pickup.ogg"
        )
        
        for sound in "${!file_map[@]}"; do
            IFS='|' read -ra NAMES <<< "${file_map[$sound]}"
            FOUND=false
            
            for name in "${NAMES[@]}"; do
                if [ -f "$AUDIO_DIR/$name" ]; then
                    cp "$AUDIO_DIR/$name" "$SOUNDS_DIR/${sound}.ogg"
                    echo "✅ ${sound}.ogg (from $name)"
                    FOUND=true
                    break
                fi
            done
            
            if [ "$FOUND" = false ]; then
                echo "⚠️  ${sound}.ogg not found (using placeholder)"
            fi
        done
        
        # Cleanup
        rm -rf "$TMP_DIR"
        
        echo ""
        echo "✅ Sound files organized!"
        echo ""
        echo "📁 Your sounds directory:"
        ls -lh "$SOUNDS_DIR"
        echo ""
        echo "🎮 Test your game: npm run dev"
    else
        echo "❌ File not found: $ZIP_PATH"
        exit 1
    fi
else
    echo ""
    echo "📝 Manual Download Instructions:"
    echo ""
    echo "1. Visit https://kenney.nl/assets/digital-audio"
    echo "2. Click 'Download' (orange button)"
    echo "3. Save the ZIP file"
    echo "4. Run this script again: ./download-sounds.sh"
    echo ""
    echo "OR use the quick web-based generator:"
    echo "./generate-web-sounds.sh"
fi
