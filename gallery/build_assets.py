"""Optional preview assets; source JSON and original covers are never modified.
Run: uv run --with pillow --with fonttools --with brotli python gallery/build_assets.py
Optional font regeneration: append --font-source /path/to/NotoSerifCJKsc-Regular.otf
A newly added cover works without running this script (browser falls back to original).
"""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageOps

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--font-source', type=Path)
    args = parser.parse_args()
    data = json.loads((ROOT/'albums.json').read_text())
    thumbs = HERE/'thumbs'
    thumbs.mkdir(exist_ok=True)
    missing = []
    for a in data:
        filename = a.get('cover', '')
        if not filename or Path(filename).name != filename:
            missing.append(a['name'])
            continue
        source = ROOT/'covers'/filename
        if not source.is_file():
            missing.append(a['name'])
            continue
        target = thumbs/(filename+'.webp')
        if target.exists() and target.stat().st_mtime >= source.stat().st_mtime:
            continue
        with Image.open(source) as image:
            image = ImageOps.exif_transpose(image).convert('RGB')
            image.thumbnail((640, 640))
            image.save(target, 'WEBP', quality=84, method=6)
    if missing:
        raise SystemExit('Missing source covers: '+', '.join(missing))
    if args.font_source:
        from fontTools import subset
        from fontTools.ttLib import TTFont
        text = ''.join(a['name'] for a in data)
        text += ''.join(p.read_text() for p in HERE.iterdir() if p.suffix in {'.html', '.mjs'})
        text += ''.join(chr(n) for n in range(32, 127))
        font = TTFont(args.font_source)
        options = subset.Options()
        options.name_IDs = ['*']
        options.name_legacy = True
        options.name_languages = ['*']
        tool = subset.Subsetter(options=options)
        tool.populate(text=text)
        tool.subset(font)
        # A separately named subset retains the upstream copyright/license metadata.
        for record in font['name'].names:
            if record.nameID in {1, 4, 6, 16, 17}:
                value = 'DWGallerySerif' if record.nameID == 6 else ('Regular' if record.nameID == 17 else 'DW Gallery Serif')
                record.string = value.encode(record.getEncoding())
        if 'CFF ' in font:
            cff = font['CFF '].cff
            cff.fontNames = ['DWGallerySerif']
            cff.topDictIndex[0].FamilyName = 'DW Gallery Serif'
            cff.topDictIndex[0].FullName = 'DW Gallery Serif'
        font.flavor = 'woff2'
        dest = HERE/'fonts'
        dest.mkdir(exist_ok=True)
        font.save(dest/'gallery-serif.woff2')
        print('Font subset bytes:', (dest/'gallery-serif.woff2').stat().st_size)
    files = [thumbs/(a['cover']+'.webp') for a in data]
    print(json.dumps({'thumbnails':len(files),'bytes':sum(p.stat().st_size for p in files)}))

if __name__ == '__main__':
    main()
