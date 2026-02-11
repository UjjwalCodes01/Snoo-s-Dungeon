// generate-placeholder-sounds.js
// Creates minimal silent .ogg files as placeholders

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const soundsDir = path.join(__dirname, 'src', 'client', 'public', 'sounds');

// Minimal valid OGG Vorbis file (silent, ~1KB each)
// This is a base64-encoded silent OGG file
const silentOggBase64 = `
T2dnUwACAAAAAAAAAABLFAAAAAAAAPDqbSsBHgF2b3JiaXMAAAAAAkSsAAAAAAAA
gD4AAAAAAAAAAAAA0AYBdm9yYmlzLQAAAFhpcGguT3JnIGxpYlZvcmJpcyBJIDIwMTgw
MzE2IChOb3cgMTAwJSBldmVuIG1vcmUgTWFnaWMpAQAAABsAAABUSVRMRT1TaWxlbnQg
UGxhY2Vob2xkZXIBBQAAAHZvcmJpcyJCQ1YAAAAACQAIBCABACAAQAQAAA4AIBBB
`;

const soundNames = [
  'attack',
  'hit', 
  'kill',
  'dash',
  'wave',
  'boss',
  'gameOver',
  'victory',
  'pickup'
];

// Create directory if it doesn't exist
if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
  console.log('✅ Created sounds directory');
}

// Generate placeholder files
soundNames.forEach(name => {
  const filePath = path.join(soundsDir, `${name}.ogg`);
  
  // Only create if file doesn't exist
  if (!fs.existsSync(filePath)) {
    const buffer = Buffer.from(silentOggBase64.replace(/\s/g, ''), 'base64');
    fs.writeFileSync(filePath, buffer);
    console.log(`✅ Created ${name}.ogg (silent placeholder)`);
  } else {
    console.log(`⏭️  ${name}.ogg already exists, skipping...`);
  }
});

console.log('\n🎵 Placeholder sounds created!');
console.log('📝 These are SILENT files. Replace them with real sounds from:');
console.log('   https://kenney.nl/assets/digital-audio');
console.log('\n💡 See SOUNDS_README.md for detailed instructions');
