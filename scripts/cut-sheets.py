# Cuts Laura's sheets (tiles separated by white gutters) into separate images.
import sys, numpy as np
from PIL import Image
def runs(flags, minlen):
    out=[]; s=None
    for i,f in enumerate(list(flags)+[False]):
        if f and s is None: s=i
        if not f and s is not None:
            if i-s>=minlen: out.append((s,i))
            s=None
    return out
def tiles(path):
    im = Image.open(path).convert("RGB"); a = np.asarray(im).astype(int)
    white = (a.min(axis=2) > 232)
    rows = runs(white.mean(axis=1) < 0.985, 60)
    res = []
    for (y0,y1) in rows:
        band = white[y0:y1]
        cols = runs(band.mean(axis=0) < 0.985, 60)
        res.append([(x0,y0,x1,y1) for (x0,x1) in cols])
    return im, res
if __name__ == "__main__":
    im, res = tiles(sys.argv[1])
    for r in res: print(len(r), [ (b[2]-b[0], b[3]-b[1]) for b in r])
