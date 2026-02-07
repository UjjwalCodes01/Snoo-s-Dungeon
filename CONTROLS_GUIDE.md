# 🎮 Game Controls & Scoring Guide

## Basic Controls

### Movement
- **WASD Keys** or **Arrow Keys** - Move your character in 8 directions
  - W/↑ - Move Up
  - A/← - Move Left
  - S/↓ - Move Down
  - D/→ - Move Right

### Combat
- **SPACE** - Basic Attack (333ms cooldown, 166ms with Attack Speed power-up)
  - Creates a melee hitbox around your character
  - Deals 10 damage (20 with Damage Boost power-up)
  - Works with Multi-Shot power-up for 3 simultaneous attacks

## Special Abilities

### 🌀 Dash (Shift Key)
- **Cooldown:** 2 seconds
- **Effect:** Quick 200-pixel dash in movement direction
- **Bonus:** 300ms invincibility during dash
- **Visual:** Blue trail effect
- **Tip:** Great for dodging boss attacks or escaping crowds

### 💥 Area Attack (E Key)
- **Cooldown:** 5 seconds
- **Effect:** Damages ALL enemies within 150-pixel radius
- **Damage:** 1.5x your normal attack damage
- **Bonus:** Knockback + screen shake
- **Visual:** Large yellow explosion circle
- **Tip:** Use when surrounded or to finish off multiple low-HP enemies

### 🔄 Restart (R Key)
- Press when game over to restart the game
- Resets all stats, waves, and power-ups

## Power-Ups (Collect on Touch)

Power-ups drop from defeated enemies with **10% chance** and appear as rotating colored stars:

1. **⚡ Speed Boost** (Cyan) - Move 50% faster
2. **🛡️ Shield** (Purple) - Complete damage immunity
3. **💥 Damage Boost** (Red) - 2x attack damage
4. **⚔️ Attack Speed** (Orange) - Attack twice as fast
5. **💚 Life Steal** (Pink) - Heal 50% of damage dealt
6. **🎯 Multi-Shot** (Teal) - Fire 3 attacks at once
7. **🧲 Magnet** (Lime) - Attract pickups from further away
8. **❄️ Freeze** (Blue) - Slow all enemies to 30% speed

### Power-Up Mechanics
- Walk near a power-up to collect it (50px range, 150px with Magnet)
- Active power-ups show in top UI with countdown timer
- Multiple different power-ups can be active simultaneously
- Same power-up refreshes/resets the timer
- Power-ups disappear after 15 seconds if not collected

## 💰 Scoring System

### Points Per Kill
```
Base Score = 100 × Current Wave × Combo Multiplier
```

### Combo System
- **Combo Window:** 3 seconds between kills
- **Combo Multiplier:** Up to 5x (caps at 5 combo)
- **Combo Display:** Shows "NxCOMBO!" in red text at bottom center
- **Example Scoring:**
  - Wave 1, 1 kill: 100 × 1 × 1 = **100 points**
  - Wave 1, 3-combo: 100 × 1 × 3 = **300 points**
  - Wave 5, 5-combo: 100 × 5 × 5 = **2,500 points**
  - Wave 10, 5-combo: 100 × 10 × 5 = **5,000 points**

### High Score Strategy
1. **Maintain Combos** - Kill enemies rapidly (within 3 seconds)
2. **Survive Longer** - Higher waves = more points per kill
3. **Use Area Attack** - Can hit multiple enemies for instant combo
4. **Freeze Power-up** - Slows enemies, easier to chase for combos
5. **Speed Boost** - Chase down enemies before combo timer expires

## 🏆 Achievements

Achievements unlock automatically and award bonus recognition:

- **Survivor** - Reach Wave 5
- **Veteran** - Reach Wave 10
- **Champion** - Reach Wave 20
- **Combo Master** - Achieve 5x combo
- **High Scorer** - Reach 10,000 points

## 📊 UI Elements

### Top Left Display
- **HP Bar** - Current/Max health (increases +20 per wave)
- **Score** - Total points earned
- **Cooldowns** - Active ability cooldowns (Dash, Area)
- **Power-ups** - Active power-up timers with emoji icons
- **Wave Counter** - Current wave number (yellow text)

### Center Display
- **Combo Text** - Appears at bottom when combo > 1
- **Damage Numbers** - Red numbers show damage dealt to enemies
- **Heal Numbers** - Green numbers show HP restored (Life Steal/pickups)
- **Power-up Names** - Yellow text when collecting power-ups
- **Achievements** - Gold trophy notifications

### Enemy Health Bars
- **Green** - HP > 50%
- **Orange** - HP 25-50%
- **Red** - HP < 25%

## 💡 Pro Tips

### Combat
1. Circle-strafe enemies while attacking (move in circles)
2. Use dash to reset enemy pursuit AI
3. Area attack has no friendly fire - use freely!
4. Basic attack has no knockback - position carefully

### Survival
1. Health pickups drop 15% of the time (green circles)
2. Boss waves every 10 waves - save abilities!
3. Each wave increases enemy HP by 15%
4. Shield power-up blocks ALL damage - use when critical

### Power-up Combos
- **Speed + Magnet** = Collect everything easily
- **Damage + Multi-Shot + Attack Speed** = Maximum DPS
- **Life Steal + Damage** = Tank through anything
- **Freeze + Area Attack** = Safe crowd control
- **Shield + aggressive play** = Risk-free pushing

### Scoring
- Don't let combo timer expire - be aggressive!
- Area attack on groups = instant multi-kill combo
- Higher waves are worth more - focus on survival
- 5x combo cap means quality > quantity for late game

## 🎯 Quick Reference

| Action | Key | Cooldown |
|--------|-----|----------|
| Move | WASD/Arrows | - |
| Attack | Space | 0.33s |
| Dash | Shift | 2s |
| Area Attack | E | 5s |
| Restart | R | - |

### Score Formula
`Points = 100 × Wave × min(Combo, 5)`

### Power-up Drop Rates
- Health Pickup: 15%
- Power-up: 10%
- Boss drops guaranteed from boss enemies

---

**Good luck in Snoo's Dungeon!** 🏰⚔️
