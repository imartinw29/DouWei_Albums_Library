"""Fail publishing when any displayed Chinese character is absent from the serif subset."""
import json
import re
from pathlib import Path
from fontTools.ttLib import TTFont
ROOT=Path(__file__).resolve().parents[2]
def required_characters():
    gallery=ROOT/'gallery'
    text=''.join(p.read_text() for p in gallery.iterdir() if p.suffix in {'.html','.mjs'})
    text+=json.dumps(json.loads((ROOT/'albums.json').read_text()),ensure_ascii=False)
    return set(re.findall(r'[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]',text))
if __name__=='__main__':
    required=required_characters()
    cmap=TTFont(ROOT/'gallery/fonts/gallery-serif.woff2').getBestCmap()
    missing=sorted(ch for ch in required if ord(ch) not in cmap)
    assert not missing,'Font missing Chinese glyphs: '+''.join(missing)
    print(f'PASS: all {len(required)} required Chinese glyphs are present')
