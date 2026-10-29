"""Rebuild the share QR when the public Gallery URL changes.
Run: uv run --no-project --with 'qrcode[pil]' python3 gallery/build_share_qr.py
"""
from pathlib import Path
from typing import cast
from PIL import Image, ImageDraw, ImageFont
import qrcode
from qrcode.constants import ERROR_CORRECT_H

SITE = 'https://imartinw29.github.io/DouWei_Albums_Library/gallery/'
OUTPUT = Path(__file__).with_name('share-qr.png')
FONT = Path.home() / '.fonts/NotoSansCJKsc-Regular.otf'
if not FONT.is_file():
    raise SystemExit(f'Missing CJK font: {FONT}')

qr = qrcode.QRCode(error_correction=ERROR_CORRECT_H, box_size=12, border=4)
qr.add_data(SITE)
qr.make(fit=True)
img = cast(Image.Image, qr.make_image(fill_color='#18211d', back_color='#fffdf8')).convert('RGB')
draw = ImageDraw.Draw(img)
w, h = img.size
# Leave the quiet zone intact; a compact central label preserves a scan margin.
label_w, label_h = 198, 116
x, y = (w-label_w)//2, (h-label_h)//2
draw.rounded_rectangle((x,y,x+label_w,y+label_h), radius=12, fill='#fffdf8')
font = ImageFont.truetype(str(FONT), 45)
for line, baseline in [('窦唯',y+8),('作品展',y+58)]:
    draw.text((w//2,baseline),line,font=font,fill='#18211d',anchor='mt')
img.save(OUTPUT)
print(f'{OUTPUT} {img.size} QR version {qr.version}: {SITE}')
