"""Soften the breaking end of the wave in hooks/scene.ts, keeping the traced
shapes: the near-black hollow under the lip becomes a light shadow on the face,
and the blurred foam glows beside it are turned down.
Run once on the traced scene: python3 tools/curl_patch.py [preview.svg]"""
import sys

path = 'hooks/scene.ts'
src = open(path).read()
q = '\\"'
# The hollow: the one traced shape of this colour that sits under the lip.
hollow = f'<path fill={q}#124868{q} d={q}'
shadow = f'<path fill={q}#2B648C{q} d={q}'
glow = f'<g fill={q}url(#ww){q} opacity={q}.5{q}>'
i = src.index(hollow, 40000)
assert 45000 < i < 60000, i
src = src[:i] + shadow + src[i + len(hollow):]
assert glow in src
src = src.replace(glow, glow.replace('.5', '.26'), 1)
open(path, 'w').write(src)
if len(sys.argv) > 1:
    body = src[src.index('<svg'):src.rindex('</svg>') + 6].replace(q, '"')
    open(sys.argv[1], 'w').write(body)
print('ok')
