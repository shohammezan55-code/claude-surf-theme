"""Rebuild the breaking end of the wave in hooks/scene.ts: a clean curl and
whitewater in place of the traced blob and the blurred foam glows.
Run: python3 tools/curl_patch.py [preview.svg]   (idempotent)"""
import math, random, re, sys

START, END = '<g id="curl">', '</g><!--curl-->'

def blob(rnd, cx, cy, rx, ry, n=10):
    """An irregular flat polygon, like the traced shapes around it."""
    pts = []
    for i in range(n):
        ang = 2 * math.pi * i / n
        k = 0.72 + rnd.random() * 0.5
        pts.append(f'{cx + math.cos(ang) * rx * k:.0f},{cy + math.sin(ang) * ry * k:.0f}')
    return 'M' + ' L'.join(pts) + ' Z'

def patch() -> str:
    rnd = random.Random(11)
    p = []
    a = p.append
    # Wave face painted over the traced hollow, in the face's own blue.
    a('<path d="M1262,650 L1296,640 L1340,634 L1380,638 L1408,652 L1414,716 L1300,716 L1262,700 Z" fill="#4884c1"/>')
    # A shallow hollow under the lip, in two close tones.
    a('<path d="M1296,684 L1308,668 L1332,658 L1362,658 L1384,668 L1390,686 L1372,698 L1330,700 Z" fill="#3a70ab"/>')
    a('<path d="M1318,684 L1330,670 L1356,666 L1374,674 L1376,688 L1352,694 Z" fill="#2f6099"/>')
    # The lip throwing over it: a slate band with a pale edge.
    a('<path d="M1250,654 L1290,640 L1336,630 L1378,633 L1404,648 L1410,668 L1400,690 L1394,668 L1376,652 L1338,645 L1294,650 L1252,660 Z" fill="#8ea6c3"/>')
    a('<path d="M1292,640 L1336,630 L1378,633 L1402,647 L1374,640 L1336,637 Z" fill="#cdd9e6"/>')
    # Whitewater: a low mound in the haze's greys, built from flat patches.
    a('<path d="M1374,716 L1378,690 L1390,664 L1412,646 L1446,636 L1492,633 L1542,641 L1600,650 L1600,712 L1560,720 L1520,714 L1478,722 L1436,715 L1400,721 Z" fill="#c3cfdd"/>')
    tones = ['#dfe6ee', '#d2dce7', '#ebf0f5', '#b9c8d9', '#e6ecf2']
    for i in range(22):
        cx = 1392 + rnd.random() * 215
        top = 640 + (cx - 1392) * 0.045
        cy = top + 6 + rnd.random() * 62
        a(f'<path d="{blob(rnd, cx, cy, 16 + rnd.random() * 22, 6 + rnd.random() * 9)}" fill="{tones[i % len(tones)]}"/>')
    # A brighter cap where it tumbles off the lip.
    for cx, cy, rx, ry in [(1408, 652, 20, 9), (1436, 642, 24, 8), (1396, 672, 14, 10)]:
        a(f'<path d="{blob(rnd, cx, cy, rx, ry)}" fill="#f1f4f8"/>')
    return START + ''.join(p) + END

def main():
    path = 'hooks/scene.ts'
    src = open(path).read()
    body = src.replace('\\"', '"')
    if START in body:
        body = body[:body.index(START)] + body[body.index(END) + len(END):]
    else:
        old = re.search(r'<g fill="url\(#ww\)" opacity="\.5">.*?</g>', body, re.S)
        assert old, 'foam glow group not found'
        body = body[:old.start()] + body[old.end():]
    anchor = '<path d="M0,1000 L0,876'
    i = body.index(anchor)
    body = body[:i] + patch() + body[i:]
    # Re-escape: only the quotes inside the exported string.
    a, b = body.index('"<svg') if '"<svg' in body else body.index("<svg"), body.rindex('</svg>') + 6
    svg = body[body.index('<svg'):b]
    head, tail = src[:src.index('<svg')], src[src.rindex('</svg>') + 6:]
    open(path, 'w').write(head + svg.replace('"', '\\"') + tail)
    if len(sys.argv) > 1:
        open(sys.argv[1], 'w').write(svg)
    print(len(svg))

main()
