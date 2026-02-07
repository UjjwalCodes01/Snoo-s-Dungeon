# Power-Up System

The game now features 8 different power-ups that drop from defeated enemies with a 10% chance!

## Power-Up Types

### ⚡ Speed Boost (Common - 25%)
- **Duration:** 8 seconds
- **Effect:** Increases movement speed by 50%
- **Visual:** Cyan star pickup

### 💥 Damage Boost (Common - 20%)
- **Duration:** 10 seconds
- **Effect:** Doubles all attack damage (2x multiplier)
- **Visual:** Red star pickup, attacks turn red

### ⚔️ Attack Speed (Common - 18%)
- **Duration:** 8 seconds
- **Effect:** Reduces attack cooldown by 50% (attack twice as fast)
- **Visual:** Orange star pickup

### 🛡️ Shield (Uncommon - 15%)
- **Duration:** 6 seconds
- **Effect:** Complete immunity to all damage with visual shield effect
- **Visual:** Purple star pickup, shield bubble on hit

### 🧲 Magnet (Uncommon - 12%)
- **Duration:** 12 seconds
- **Effect:** Attracts power-ups and health pickups from 3x further away (150px range)
- **Visual:** Lime star pickup

### ❄️ Freeze (Uncommon - 12%)
- **Duration:** 5 seconds
- **Effect:** Slows all enemies to 30% speed, enemies turn blue
- **Visual:** Blue star pickup

### 💚 Life Steal (Rare - 10%)
- **Duration:** 10 seconds
- **Effect:** Heal for 50% of damage dealt with each hit
- **Visual:** Pink star pickup, green healing numbers appear

### 🎯 Multi-Shot (Rare - 8%)
- **Duration:** 7 seconds
- **Effect:** Each attack fires 3 projectiles in a spread pattern
- **Visual:** Teal star pickup, 3 attack hitboxes

## Gameplay Mechanics

### Drop System
- **Drop Rate:** 10% chance on enemy death
- **Weighted Rarity:** More powerful effects are rarer
- **Lifetime:** Power-ups disappear after 15 seconds if not collected
- **Animation:** Rotating star with floating bounce effect

### Collection
- **Basic Range:** 50 pixels (walk near to collect)
- **Magnet Range:** 150 pixels (with Magnet power-up active)
- **Auto-attract:** Power-ups move toward player when in range
- **Notification:** Yellow text shows power-up name with emoji

### UI Display
- Active power-ups shown in top score bar with emoji and countdown timer
- Format: `⚡7s | 💥8s | 🛡️4s`
- Cooldown timers (Dash/Area) shown alongside power-ups
- Real-time countdown updates every frame

### Stacking
- **Same Type:** Refreshes duration (resets timer to full)
- **Different Types:** Multiple power-ups can be active simultaneously
- **Combos:** Stack Speed + Damage + Multi-Shot for maximum carnage!

## Strategy Tips

1. **Combo Power-ups:** Try to maintain multiple active effects for devastating combos
2. **Timing:** Save Shield for boss waves or when low on health
3. **Freeze Clutch:** Use Freeze on crowded waves to escape dangerous situations
4. **Life Steal + Damage:** Ultimate survival combo - high damage = high healing
5. **Multi-Shot + Attack Speed:** Rapid-fire triple attacks melt everything
6. **Magnet:** Makes collecting other power-ups much easier, grab it first!

## Visual Indicators

- **Star Shape:** 6-pointed star with white border
- **Color Coding:** Each power-up has unique color for easy identification
- **Rotation:** Continuously spins at 360°/2s
- **Float:** Smooth vertical bobbing animation
- **Fade Out:** Power-ups fade when expiring (last 5 seconds)

## Technical Details

- Power-ups use Phaser physics group for collision detection
- Visual elements (stars) follow pickup position every frame
- Freeze effect stores original enemy speeds to restore on expiration
- Speed multiplier applied dynamically to player velocity
- Damage multiplier calculated per-attack with power-up check
- Shield blocks collision callbacks entirely (no damage processed)
