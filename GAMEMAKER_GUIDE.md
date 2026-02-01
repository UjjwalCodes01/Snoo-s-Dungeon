# GameMaker Implementation Guide - Complete Step-by-Step

> **⚠️ IMPORTANT:** This guide is for execution on **Windows**. GameMaker does not run on Linux.

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [Sprites Setup](#sprites-setup)
4. [Objects Setup](#objects-setup)
5. [Scripts Setup](#scripts-setup)
6. [Room Setup](#room-setup)
7. [Game Logic](#game-logic)
8. [API Integration](#api-integration)
9. [HTML5 Export](#html5-export)
10. [Hosting](#hosting)
11. [Integration with React App](#integration-with-react-app)
12. [Testing Checklist](#testing-checklist)

---

## Prerequisites

### What You Need:
1. **Windows computer** (GameMaker doesn't run on Linux natively)
2. **GameMaker Studio 2** or **GameMaker LTS** installed
   - Download from: https://gamemaker.io/en/download
   - Free version works for HTML5 export
3. **Your Devvit app deployed** (or local API running)

### Time Estimate:
- Setup: 30 minutes
- Sprites: 1 hour
- Objects: 2-3 hours
- Testing: 1-2 hours
- Export & Integration: 1 hour
- **Total: 5-8 hours**

---

## Project Setup

### Step 1: Create New Project
1. Open GameMaker Studio
2. Click **New** → **New Blank**
3. Name: `SnoosDungeon`
4. Save location: Your preferred folder

### Step 2: Configure Project Settings
1. Go to **Game Options** (gear icon) → **Main**
2. Set:
   - Game Name: `Snoo's Ever-Shifting Dungeon`
   - Version: `1.0.0`

3. Go to **Game Options** → **HTML5**
   - Output Name: `index`
   - Texture Page Size: `2048x2048`
   - WebGL: `Required`
   - Allow Fullscreen: `Yes`

### Step 3: Set Game Resolution
1. Go to **Rooms** → Double-click `room0`
2. In Room Settings:
   - Width: `640` (10 tiles × 64px)
   - Height: `640`
   - Speed: `60` (FPS)

---

## Sprites Setup

### Required Sprites:

Create these sprites in GameMaker (**Right-click Sprites → Create Sprite**):

| Sprite Name | Size | Description |
|------------|------|-------------|
| `spr_wall` | 64×64 | Dark gray/black tile |
| `spr_floor` | 64×64 | Orange/brown tile |
| `spr_player` | 48×48 | Player character |
| `spr_goblin` | 48×48 | Goblin enemy |
| `spr_skeleton` | 48×48 | Skeleton enemy |
| `spr_slime` | 48×48 | Slime enemy |
| `spr_dragon` | 64×64 | Dragon boss |
| `spr_ghost` | 32×32 | Death marker (semi-transparent) |
| `spr_attack` | 32×32 | Attack effect |

### Creating Sprites (Easy Method):

For each sprite:
1. Right-click **Sprites** → **Create Sprite**
2. Name it (e.g., `spr_wall`)
3. Click **Edit Image**
4. Set size (64×64 for tiles)
5. Use the paint tools to draw a simple colored square:
   - Wall: Dark gray (#333333)
   - Floor: Orange (#f97316)
   - Player: Blue (#3b82f6)
   - Goblin: Green (#22c55e)
   - Skeleton: White (#ffffff)
   - Slime: Lime (#84cc16)
   - Dragon: Red (#ef4444)
   - Ghost: Light purple (#c4b5fd) with 50% alpha
   - Attack: Yellow (#facc15)

### Sprite Origin Settings:
For all sprites, set **Origin** to **Middle Center** (click the center button in sprite editor).

---

## Objects Setup

Create these objects (**Right-click Objects → Create Object**):

### 1. obj_game_controller

**Purpose:** Manages game state, URL parameters, scoring

**Create Event:**
```gml
// Get URL parameters
global.layout_string = url_get_param("layout");
global.monster_type = url_get_param("monster");
global.modifier_type = url_get_param("modifier");

// Set defaults if empty
if (global.layout_string == "") {
    global.layout_string = "0000110000000011000000001100001111111111111111111100001100000000110000000011000000001100000000110000";
}
if (global.monster_type == "") {
    global.monster_type = "Goblin";
}
if (global.modifier_type == "") {
    global.modifier_type = "Normal";
}

// Game variables
global.score = 0;
global.start_time = current_time;
global.game_over = false;
global.player_won = false;

// Initialize request IDs
global.ghost_request_id = -1;
global.score_request_id = -1;

// Generate the level
generate_level();

// Fetch ghosts from API
fetch_ghosts();
```

**Step Event:**
```gml
// Update score based on time survived
if (!global.game_over) {
    global.score = floor((current_time - global.start_time) / 100);
}
```

**Draw GUI Event:**
```gml
// Draw HUD
draw_set_color(c_white);
draw_set_font(-1);
draw_set_halign(fa_left);

// Score
draw_text(10, 10, "Score: " + string(global.score));

// Monster type
draw_text(10, 30, "Monster: " + global.monster_type);

// Modifier
draw_text(10, 50, "Modifier: " + global.modifier_type);

// Player HP (if player exists)
if (instance_exists(obj_player)) {
    var hp_text = "HP: " + string(floor(obj_player.hp)) + "/" + string(obj_player.max_hp);
    draw_text(10, 70, hp_text);
}

// Game over text
if (global.game_over) {
    draw_set_halign(fa_center);
    draw_set_color(global.player_won ? c_lime : c_red);
    var msg = global.player_won ? "YOU WIN!" : "GAME OVER";
    draw_text(room_width/2, room_height/2 - 50, msg);
    draw_set_color(c_white);
    draw_text(room_width/2, room_height/2, "Final Score: " + string(global.score));
    draw_text(room_width/2, room_height/2 + 30, "Press R to restart");
}
```

**Key Press - R Event:**
```gml
if (global.game_over) {
    room_restart();
}
```

**Async - HTTP Event:**
```gml
var request_id = async_load[? "id"];
var status = async_load[? "status"];
var result = async_load[? "result"];

// Ghost response
if (request_id == global.ghost_request_id && status == 0) {
    show_debug_message("Ghosts received: " + result);
    
    // Parse JSON
    var json = json_parse(result);
    
    if (variable_struct_exists(json, "ghosts")) {
        var ghosts = json.ghosts;
        
        for (var i = 0; i < array_length(ghosts); i++) {
            var ghost_data = ghosts[i];
            var gx = ghost_data.x * 64 + 32;
            var gy = ghost_data.y * 64 + 32;
            
            var ghost = instance_create_layer(gx, gy, "Instances", obj_ghost);
            ghost.username = ghost_data.username;
        }
    }
}

// Score submission response
if (request_id == global.score_request_id && status == 0) {
    show_debug_message("Score response: " + result);
}
```

---

### 2. obj_wall

**Purpose:** Solid wall tile

**Create Event:**
```gml
// Wall is solid - no special code needed
```

**Properties:**
- Sprite: `spr_wall`
- Check **Solid** checkbox in object properties

---

### 3. obj_floor

**Purpose:** Walkable floor tile

**Create Event:**
```gml
// Optional: Add slight visual variation
image_index = irandom(0);
```

**Properties:**
- Sprite: `spr_floor`

---

### 4. obj_player

**Purpose:** Player character

**Create Event:**
```gml
// Stats
hp = 100;
max_hp = 100;
damage = 10;
move_speed = 4;
attack_cooldown = 0;
invincible = 0;

// Apply modifier
switch (global.modifier_type) {
    case "Speed Boost":
        move_speed = 6;
        break;
    case "Double Damage":
        damage = 20;
        break;
    case "Tank Mode":
        max_hp = 200;
        hp = 200;
        move_speed = 3;
        break;
    case "Glass Cannon":
        max_hp = 50;
        hp = 50;
        damage = 30;
        break;
    case "Regeneration":
        // Handled in step event
        break;
}
```

**Step Event:**
```gml
if (global.game_over) exit;

// Regeneration modifier
if (global.modifier_type == "Regeneration" && hp < max_hp) {
    hp += 0.05; // Slow regen
    hp = min(hp, max_hp);
}

// Movement
var move_x = keyboard_check(ord("D")) - keyboard_check(ord("A"));
var move_y = keyboard_check(ord("S")) - keyboard_check(ord("W"));

// Arrow keys alternative
if (move_x == 0) move_x = keyboard_check(vk_right) - keyboard_check(vk_left);
if (move_y == 0) move_y = keyboard_check(vk_down) - keyboard_check(vk_up);

// Normalize diagonal movement
if (move_x != 0 && move_y != 0) {
    move_x *= 0.707;
    move_y *= 0.707;
}

// Calculate new position
var new_x = x + (move_x * move_speed);
var new_y = y + (move_y * move_speed);

// Collision with walls
if (!place_meeting(new_x, y, obj_wall)) {
    x = new_x;
}
if (!place_meeting(x, new_y, obj_wall)) {
    y = new_y;
}

// Attack cooldown
if (attack_cooldown > 0) {
    attack_cooldown -= 1;
}

// Attack on space
if (keyboard_check_pressed(vk_space) && attack_cooldown <= 0) {
    var attack = instance_create_layer(x, y, "Instances", obj_attack);
    attack.damage = damage;
    attack_cooldown = 20; // 1/3 second at 60 FPS
}

// Invincibility frames
if (invincible > 0) {
    invincible -= 1;
    // Flicker effect
    visible = (invincible mod 4 < 2);
} else {
    visible = true;
}

// Death check
if (hp <= 0) {
    // Record death position
    var death_x = floor(x / 64);
    var death_y = floor(y / 64);
    
    // Submit score
    submit_score(global.score, death_x, death_y);
    
    global.game_over = true;
    global.player_won = false;
}
```

**Collision with obj_enemy Event:**
```gml
if (invincible <= 0) {
    hp -= other.damage;
    invincible = 60; // 1 second of invincibility
    
    // Knockback
    var dir = point_direction(other.x, other.y, x, y);
    var knock_x = x + lengthdir_x(32, dir);
    var knock_y = y + lengthdir_y(32, dir);
    
    if (!place_meeting(knock_x, knock_y, obj_wall)) {
        x = knock_x;
        y = knock_y;
    }
}
```

**Properties:**
- Sprite: `spr_player`
- Depth: -10 (renders above floor)

---

### 5. obj_enemy (Parent Object)

**Purpose:** Base enemy class

**Create Event:**
```gml
hp = 30;
damage = 10;
move_speed = 2;
attack_range = 150;
attack_cooldown = 0;
```

**Step Event:**
```gml
if (global.game_over) exit;

// Find player
var player = instance_nearest(x, y, obj_player);

if (player != noone) {
    var dist = point_distance(x, y, player.x, player.y);
    
    // Move toward player if in range
    if (dist < attack_range && dist > 40) {
        var dir = point_direction(x, y, player.x, player.y);
        var new_x = x + lengthdir_x(move_speed, dir);
        var new_y = y + lengthdir_y(move_speed, dir);
        
        if (!place_meeting(new_x, new_y, obj_wall)) {
            x = new_x;
            y = new_y;
        }
    }
}

// Attack cooldown
if (attack_cooldown > 0) {
    attack_cooldown -= 1;
}

// Death
if (hp <= 0) {
    global.score += 100; // Bonus for killing enemy
    instance_destroy();
    
    // Check if all enemies dead = win
    if (instance_number(obj_enemy) <= 1) { // 1 because this one still exists
        global.game_over = true;
        global.player_won = true;
        submit_score(global.score, -1, -1); // -1 means survived
    }
}
```

**Properties:**
- Sprite: `spr_goblin` (default)
- Parent: None (this IS the parent)

---

### 6. obj_goblin

**Purpose:** Fast but weak enemy

**Create Event:**
```gml
event_inherited();
hp = 25;
damage = 8;
move_speed = 3;
```

**Properties:**
- Sprite: `spr_goblin`
- Parent: `obj_enemy`

---

### 7. obj_skeleton

**Purpose:** Balanced enemy

**Create Event:**
```gml
event_inherited();
hp = 40;
damage = 12;
move_speed = 2;
```

**Properties:**
- Sprite: `spr_skeleton`
- Parent: `obj_enemy`

---

### 8. obj_slime

**Purpose:** Tanky but slow enemy

**Create Event:**
```gml
event_inherited();
hp = 60;
damage = 5;
move_speed = 1;
```

**Properties:**
- Sprite: `spr_slime`
- Parent: `obj_enemy`

---

### 9. obj_dragon

**Purpose:** Boss enemy

**Create Event:**
```gml
event_inherited();
hp = 150;
damage = 20;
move_speed = 1.5;
attack_range = 200;
```

**Properties:**
- Sprite: `spr_dragon`
- Parent: `obj_enemy`

---

### 10. obj_attack

**Purpose:** Player attack hitbox

**Create Event:**
```gml
damage = 10;
lifetime = 10;
```

**Step Event:**
```gml
// Check collision with enemies
var enemy = instance_place(x, y, obj_enemy);
if (enemy != noone) {
    enemy.hp -= damage;
    instance_destroy();
    exit;
}

// Destroy after lifetime
lifetime -= 1;
if (lifetime <= 0) {
    instance_destroy();
}
```

**Draw Event:**
```gml
// Draw attack circle
draw_set_alpha(0.5);
draw_set_color(c_yellow);
draw_circle(x, y, 24, false);
draw_set_alpha(1);
```

**Properties:**
- Sprite: `spr_attack` (or none, uses custom draw)
- Depth: -5

---

### 11. obj_ghost

**Purpose:** Shows where other players died

**Create Event:**
```gml
username = "";
alpha_val = 0.5;
```

**Draw Event:**
```gml
draw_set_alpha(alpha_val);
draw_sprite(spr_ghost, 0, x, y);
draw_set_alpha(1);

// Draw username on hover
var mx = mouse_x;
var my = mouse_y;
if (point_distance(mx, my, x, y) < 32) {
    draw_set_color(c_white);
    draw_set_halign(fa_center);
    draw_text(x, y - 30, username);
}
```

**Properties:**
- Sprite: `spr_ghost`
- Depth: 5 (renders below player)

---

## Scripts Setup

Create these scripts (**Right-click Scripts → Create Script**):

### 1. scr_generate_level

```gml
/// @function generate_level()
/// @description Generates the dungeon from the layout string

function generate_level() {
    var layout = global.layout_string;
    var grid_size = 10;
    var tile_size = 64;
    
    // Clear any existing instances
    with (obj_wall) instance_destroy();
    with (obj_floor) instance_destroy();
    with (obj_player) instance_destroy();
    with (obj_enemy) instance_destroy();
    
    var floor_tiles = [];
    
    // Generate tiles
    for (var i = 0; i < 100; i++) {
        var char = string_char_at(layout, i + 1); // GML is 1-indexed
        var grid_x = (i mod grid_size);
        var grid_y = floor(i / grid_size);
        var pos_x = grid_x * tile_size + (tile_size / 2);
        var pos_y = grid_y * tile_size + (tile_size / 2);
        
        if (char == "0") {
            // Wall
            instance_create_layer(pos_x, pos_y, "Instances", obj_wall);
        } else {
            // Floor
            instance_create_layer(pos_x, pos_y, "Instances", obj_floor);
            array_push(floor_tiles, {x: pos_x, y: pos_y});
        }
    }
    
    // Place player on first floor tile
    if (array_length(floor_tiles) > 0) {
        var start = floor_tiles[0];
        instance_create_layer(start.x, start.y, "Instances", obj_player);
    }
    
    // Place enemies on random floor tiles
    var enemy_count = 3; // Base enemy count
    var enemy_obj = obj_goblin;
    
    // Select enemy type based on monster
    switch (global.monster_type) {
        case "Goblin":
            enemy_obj = obj_goblin;
            break;
        case "Skeleton":
            enemy_obj = obj_skeleton;
            break;
        case "Slime":
            enemy_obj = obj_slime;
            break;
        case "Dragon":
            enemy_obj = obj_dragon;
            enemy_count = 1; // Only one dragon
            break;
    }
    
    // Spawn enemies (not on player spawn)
    var placed = 0;
    var attempts = 0;
    while (placed < enemy_count && attempts < 50) {
        var idx = irandom(array_length(floor_tiles) - 1);
        if (idx > 0) { // Not player spawn
            var tile = floor_tiles[idx];
            instance_create_layer(tile.x, tile.y, "Instances", enemy_obj);
            placed++;
        }
        attempts++;
    }
}
```

---

### 2. scr_submit_score

```gml
/// @function submit_score(score, death_x, death_y)
/// @description Submits the player's score to the API
/// @param {real} score - The player's score
/// @param {real} death_x - Grid X where player died (-1 if survived)
/// @param {real} death_y - Grid Y where player died (-1 if survived)

function submit_score(score, death_x, death_y) {
    // ===== UPDATE THIS URL =====
    // Replace with your actual Devvit app URL when deployed
    var api_url = "https://your-devvit-app.reddit.com/api/submit-score";
    // ===========================
    
    // Build JSON body
    var json_body = "{\"score\":" + string(score);
    
    if (death_x >= 0 && death_y >= 0) {
        json_body += ",\"deathPosition\":{\"x\":" + string(death_x) + ",\"y\":" + string(death_y) + "}";
    }
    
    json_body += ",\"survived\":" + (death_x < 0 ? "true" : "false");
    json_body += "}";
    
    // Create headers
    var headers = ds_map_create();
    ds_map_add(headers, "Content-Type", "application/json");
    
    // Send request
    var request_id = http_request(api_url, "POST", headers, json_body);
    
    // Store request ID for async handling
    global.score_request_id = request_id;
    
    // Cleanup
    ds_map_destroy(headers);
    
    show_debug_message("Score submitted: " + string(score));
}
```

---

### 3. scr_fetch_ghosts

```gml
/// @function fetch_ghosts()
/// @description Fetches ghost positions from the API

function fetch_ghosts() {
    // ===== UPDATE THIS URL =====
    // Replace with your actual Devvit app URL when deployed
    var api_url = "https://your-devvit-app.reddit.com/api/ghosts";
    // ===========================
    
    // Send GET request
    var request_id = http_get(api_url);
    
    // Store request ID
    global.ghost_request_id = request_id;
    
    show_debug_message("Fetching ghosts...");
}
```

---

## Room Setup

### Configure room0:

1. Double-click `room0` in the Rooms folder
2. **Room Settings:**
   - Name: `rm_game`
   - Width: `640`
   - Height: `640`
   - Speed: `60`

3. **Layers:** Create these layers (in order from top to bottom):
   - `Instances` (Instance layer) - All game objects go here
   - `Background` (Background layer) - Set color to dark gray (#1f2937)

4. **Initial Instances:**
   - Drag `obj_game_controller` onto the `Instances` layer (anywhere)
   - Don't place any other objects - they're created by the controller

---

## HTML5 Export

### Step 1: Configure HTML5 Settings
1. Go to **Game Options** → **HTML5**
2. Set:
   - Output Name: `index`
   - Allow Fullscreen: `Yes`
   - Interpolate Colours: `Yes`
   - WebGL: `Required`
   - Texture Page Size: `2048x2048`

### Step 2: Build
1. Go to **Build** → **Create Executable**
2. Select **HTML5**
3. Choose output folder
4. Click **OK**
5. Wait for build to complete

### Step 3: Test Locally
1. Navigate to the output folder
2. The files you need:
   - `index.html`
   - `html5game/` folder (contains all assets)
3. Start a local server to test (browsers block local file requests):
   ```bash
   cd your-export-folder
   python -m http.server 8000
   ```
4. Open `http://localhost:8000/index.html` in browser

### Step 4: Test with URL Parameters
```
http://localhost:8000/index.html?layout=0000110000000011000000001100001111111111111111111100001100000000110000000011000000001100000000110000&monster=Dragon&modifier=Speed%20Boost
```

---

## Hosting

### Option A: GitHub Pages (Free) ⭐ Recommended

1. Create new GitHub repository (e.g., `snoos-dungeon-game`)
2. Upload the HTML5 export files:
   - `index.html`
   - `html5game/` folder
3. Go to **Settings** → **Pages**
4. Source: `main` branch, `/ (root)`
5. Save
6. Your game URL: `https://yourusername.github.io/snoos-dungeon-game/`

### Option B: Netlify (Free)

1. Go to https://netlify.com
2. Drag & drop your HTML5 export folder
3. Get instant URL
4. Optional: Set custom domain

### Option C: Vercel (Free)

1. Go to https://vercel.com
2. Import from folder or Git
3. Deploy instantly

---

## Integration with React App

### Step 1: Update GameEmbed.tsx

Once your game is hosted, update this file:

**File:** `src/client/game/GameEmbed.tsx`

Find this line:
```typescript
const gameUrl = ''; // Set this after GameMaker export
```

Change to:
```typescript
const gameUrl = 'https://yourusername.github.io/snoos-dungeon-game/index.html';
```

### Step 2: Rebuild
```bash
npm run build
```

### Step 3: Deploy to Reddit
```bash
npx devvit upload
```

---

## Testing Checklist

### ✅ Before Export (In GameMaker):
- [ ] Player can move with WASD/arrows
- [ ] Player can attack with Space
- [ ] Enemies chase and damage player
- [ ] Player can kill enemies
- [ ] Killing all enemies = win
- [ ] Player dying = game over
- [ ] R key restarts game
- [ ] Score displays correctly
- [ ] HUD shows monster/modifier
- [ ] Layout generates from string
- [ ] Invincibility frames work after taking damage
- [ ] Knockback works

### ✅ After Export (In Browser):
- [ ] Game loads in browser
- [ ] URL parameters work: `?layout=...&monster=...&modifier=...`
- [ ] No console errors
- [ ] WebGL works
- [ ] 60 FPS performance

### ✅ API Integration:
- [ ] Score submits to API
- [ ] Ghosts load from API
- [ ] Check Network tab for requests

### ✅ In Reddit App:
- [ ] Game iframe loads
- [ ] Dungeon data passes to game via URL
- [ ] Leaderboard updates after play
- [ ] Works on mobile
- [ ] Works in dark mode
- [ ] Ghost markers appear

---

## Troubleshooting

### "url_get_param is undefined"
This function only works in HTML5 export, not in the GameMaker IDE. For testing in IDE, the defaults will be used.

### "HTTP request failed" / "CORS error"
- Check your API URL is correct
- Ensure your server has CORS headers set
- Test API with curl/Postman first:
```bash
curl https://your-app.reddit.com/api/ghosts
```

### "Layout looks wrong"
- Layout string must be exactly 100 characters
- GML uses 1-indexed strings (first char is position 1, not 0)
- `0` = wall, `1` = floor

### "Enemies not spawning"
- Check enemy objects have `obj_enemy` as parent
- Verify floor tiles exist in layout (enough `1`s)
- Check the `generate_level()` function

### "Game is blank"
- Check `obj_game_controller` is placed in the room
- Verify `generate_level()` is being called in Create event
- Check for console errors (F12 in browser)

### "Score not updating on leaderboard"
- Verify API URL is correct
- Check the submit_score function is being called
- Look at Network tab for request/response

---

## Quick Reference Card

### Controls:
| Key | Action |
|-----|--------|
| WASD / Arrows | Move |
| Space | Attack |
| R | Restart (after game over) |

### Modifiers:
| Modifier | Effect |
|----------|--------|
| Normal | No changes |
| Speed Boost | 50% faster movement |
| Double Damage | 2x attack damage |
| Tank Mode | 2x HP, slower movement |
| Glass Cannon | Half HP, 3x damage |
| Regeneration | Slow HP regen |

### Monsters:
| Monster | HP | Damage | Speed | Count |
|---------|-----|--------|-------|-------|
| Goblin | 25 | 8 | Fast | 3 |
| Skeleton | 40 | 12 | Medium | 3 |
| Slime | 60 | 5 | Slow | 3 |
| Dragon | 150 | 20 | Medium | 1 (Boss) |

### API Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ghosts` | Fetch death markers |
| POST | `/api/submit-score` | Submit score |
| GET | `/api/leaderboard` | Get leaderboard |
| GET | `/api/daily-dungeon` | Get today's dungeon |

---

## Final Notes

### Order of Operations:
1. ✅ Complete this guide in GameMaker (Windows)
2. ✅ Export to HTML5
3. ✅ Test locally
4. ✅ Host on GitHub Pages
5. ✅ Update GameEmbed.tsx with hosted URL
6. ✅ Rebuild and deploy Devvit app
7. ✅ Test full flow end-to-end
8. 🎉 Submit to hackathon!

### Files to Update After Hosting:
1. `src/client/game/GameEmbed.tsx` - Add your game URL
2. `GAMEMAKER_GUIDE.md` - Update API URLs with actual endpoints

### GameMaker Sponsor Prize Tips:
- Show off GameMaker features (particles, shaders, etc.)
- Mention GameMaker in your submission
- Credit GameMaker in the game/README
- Make gameplay fun and polished

---

**You have everything you need! Boot into Windows, follow this guide step-by-step, and you'll have a working game. 🎮**

**Good luck with the hackathon! 🏆**
