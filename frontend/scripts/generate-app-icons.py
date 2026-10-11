"""Regenerate launcher assets from the exported canvas mark (requires Pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
images = root / 'assets' / 'images'
mark = Image.open(images / 'brand-mark.png').convert('RGBA')
icon = Image.alpha_composite(Image.new('RGBA', mark.size, 'white'), mark)
icon.convert('RGB').save(images / 'icon.png')
icon.resize((48, 48), Image.Resampling.LANCZOS).save(images / 'favicon.png')

# Adaptive foregrounds include Android's extra 108dp canvas around a 72dp icon.
foreground = Image.new('RGBA', (1536, 1536), (0, 0, 0, 0))
foreground.alpha_composite(mark, (256, 256))
foreground = foreground.resize((1024, 1024), Image.Resampling.LANCZOS)
foreground.save(images / 'adaptive-icon.png')

mask = Image.new('L', (4096, 4096), 0)
ImageDraw.Draw(mask).ellipse((0, 0, 4095, 4095), fill=255)
mask = mask.resize((1024, 1024), Image.Resampling.LANCZOS)
rounded = icon.copy()
rounded.putalpha(mask)
resources = root / 'android' / 'app' / 'src' / 'main' / 'res'
for density, size, foreground_size in [('mdpi', 48, 108), ('hdpi', 72, 162), ('xhdpi', 96, 216), ('xxhdpi', 144, 324), ('xxxhdpi', 192, 432)]:
    directory = resources / f'mipmap-{density}'
    directory.mkdir(parents=True, exist_ok=True)
    for name, artwork, dimension in [('ic_launcher', icon, size), ('ic_launcher_round', rounded, size), ('ic_launcher_foreground', foreground, foreground_size)]:
        artwork.resize((dimension, dimension), Image.Resampling.LANCZOS).save(directory / f'{name}.webp', 'WEBP', lossless=True)
print('Updated Expo icons and native Android launcher icons in all five densities.')
