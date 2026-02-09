from PIL import Image
chars = {
    'Soldier': ('src/client/public/sprites/Tiny RPG Character Asset Pack v1.03 -Free Soldier&Orc/Characters(100x100)/Soldier/Soldier with shadows/Soldier-Idle.png', 100, 100),
    'Orc': ('src/client/public/sprites/Tiny RPG Character Asset Pack v1.03 -Free Soldier&Orc/Characters(100x100)/Orc/Orc with shadows/Orc-Idle.png', 100, 100),
    'Rogue': ('src/client/public/sprites/Rogue.png', 80, 80),
    'DK-walk': ('src/client/public/sprites/dark-knight/dark_knight_walk-Sheet.png', 48, 32),
    'DK-atk': ('src/client/public/sprites/dark-knight/dark_knight_attack1-Sheet.png', 80, 32),
    'Skeleton': ('src/client/public/sprites/skeleton/enemies-skeleton1_idle.png', 32, 32),
    'Vampire': ('src/client/public/sprites/vampire/enemies-vampire_idle.png', 32, 32),
}
for name, (path, fw, fh) in chars.items():
    img = Image.open(path)
    frame = img.crop((0, 0, fw, fh))
    if frame.mode == 'RGBA':
        bbox = frame.split()[3].getbbox()
        if bbox:
            cw, ch = bbox[2]-bbox[0], bbox[3]-bbox[1]
            print(f'{name}: frame={fw}x{fh}, content={cw}x{ch}, start=({bbox[0]},{bbox[1]})')
