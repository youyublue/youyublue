"""Packs the film and a poster frame into one self-contained index.html.
Usage: python3 pack.py film.mp4 poster.jpg out.html"""
import base64, pathlib, sys

film, poster, out = (pathlib.Path(p) for p in sys.argv[1:4])
tpl = (pathlib.Path(__file__).parent / 'player.html').read_text(encoding='utf-8')
html = tpl.replace('{{POSTER}}', base64.b64encode(poster.read_bytes()).decode()) \
          .replace('{{REEL}}', base64.b64encode(film.read_bytes()).decode())
out.write_text(html, encoding='utf-8')
print(f'{out}: {out.stat().st_size / 1e6:.1f} MB')
