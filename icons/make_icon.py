from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).parent
SCALE = 4
SIZE = 128 * SCALE
FONT_PATHS = [
    Path("C:/Windows/Fonts/seguisb.ttf"),
    Path("C:/Windows/Fonts/segoeuib.ttf"),
]
FONT_PATH = next((path for path in FONT_PATHS if path.exists()), None)
if FONT_PATH is None:
    raise SystemExit("Segoe UI font was not found")

image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)
for y in range(SIZE):
    t = y / (SIZE - 1)
    color = tuple(round(a + (b - a) * t) for a, b in zip((22, 128, 121), (12, 85, 85)))
    draw.line((0, y, SIZE, y), fill=color)

mask = Image.new("L", image.size, 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, SIZE - 1, SIZE - 1), radius=32 * SCALE, fill=255)
image.putalpha(mask)
draw = ImageDraw.Draw(image)
font = ImageFont.truetype(str(FONT_PATH), 66 * SCALE)
box = draw.textbbox((0, 0), "e×", font=font, stroke_width=0)
width, height = box[2] - box[0], box[3] - box[1]
x = (SIZE - width) / 2 - box[0] - 3 * SCALE
y = (SIZE - height) / 2 - box[1] - 1 * SCALE
draw.text((round(x), round(y)), "e×", font=font, fill=(255, 255, 255, 255), stroke_width=0)

for size in (16, 32, 48, 128):
    image.resize((size, size), Image.Resampling.LANCZOS).save(ROOT / f"icon{size}.png", optimize=True)
