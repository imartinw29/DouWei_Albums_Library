"""Serve only the public Gallery assets, never repository files or audio.
Usage: python3 gallery/preview_server.py --port 45031 --bind 0.0.0.0
"""
import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = {
    '/albums.json', '/gallery/index.html', '/gallery/works.html',
    '/gallery/work.html', '/gallery/app.mjs', '/gallery/data.mjs',
    '/gallery/share.mjs', '/gallery/share-qr.png',
    '/gallery/vendor/qrcode.mjs',
    '/gallery/gallery.css', '/gallery/fonts/gallery-serif.woff2',
    '/gallery/fonts/OFL.txt', '/photo/douwei-recording.jpg',
}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_head(self):
        path = unquote(urlsplit(self.path).path)
        if path in {'/', '/gallery', '/gallery/'}:
            self.send_response(302)
            self.send_header('Location', '/gallery/index.html')
            self.end_headers()
            return None
        target = ROOT / path.lstrip('/')
        safe = target.resolve().is_relative_to(ROOT) and '..' not in Path(path).parts
        is_cover = target.parent == ROOT/'covers' and target.suffix.lower() in {'.jpg','.jpeg','.png','.webp'}
        is_thumb = target.parent == ROOT/'gallery'/'thumbs' and target.suffix == '.webp'
        if not safe or not (path in PUBLIC or is_cover or is_thumb) or not target.is_file():
            self.send_error(404)
            return None
        return super().send_head()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port',type=int,default=45031)
    parser.add_argument('--bind',default='127.0.0.1')
    args = parser.parse_args()
    with ThreadingHTTPServer((args.bind,args.port),Handler) as server:
        print(f'Gallery preview: http://{args.bind}:{args.port}/gallery/',flush=True)
        server.serve_forever()
