# Cuts the round portraits out of Laura's two sheets into src/avatars/presets/*.jpg
import sys, json, numpy as np
from PIL import Image
def segments(profile, minlen):
    on = profile > 0; segs=[]; start=None
    for i,v in enumerate(on):
        if v and start is None: start=i
        if not v and start is not None:
            if i-start>=minlen: segs.append((start,i))
            start=None
    if start is not None and len(on)-start>=minlen: segs.append((start,len(on)))
    return segs
def cut(path, prefix, names, out, ncols=None):
    im = Image.open(path).convert("RGB"); a = np.asarray(im).astype(int)
    bg = np.median(np.concatenate([a[:6].reshape(-1,3), a[-6:].reshape(-1,3)]), axis=0)
    mask = (np.abs(a - bg).sum(axis=2) > 40)
    rows = segments((mask.sum(axis=1) > 20).astype(int), 80)
    cols = segments((mask.sum(axis=0) > 20).astype(int), 80)
    if ncols and len(cols) != ncols:  # circles touch: split the width evenly
        x0, x1 = cols[0][0], cols[-1][1]; w = (x1 - x0) / ncols
        cols = [(int(x0 + i*w), int(x0 + (i+1)*w)) for i in range(ncols)]
    print(path, "rows", len(rows), "cols", len(cols))
    k = 0; done = []
    for (y0,y1) in rows:
        for (x0,x1) in cols:
            cell = mask[y0:y1, x0:x1]
            ys, xs = np.where(cell)
            if len(xs) < 500: continue
            cy = (ys.min()+ys.max())/2 + y0; cx = (xs.min()+xs.max())/2 + x0
            d = (ys.max()-ys.min()) * 0.96
            box = (int(cx-d/2), int(cy-d/2), int(cx+d/2), int(cy+d/2))
            name = names[k] if k < len(names) else f"{prefix}-{k+1:02d}"
            im.crop(box).resize((320,320), Image.LANCZOS).save(f"{out}/{name}.jpg", quality=86, optimize=True, progressive=True)
            done.append(name); k += 1
    return done
out = sys.argv[1]
chars = [f"char-{i:02d}" for i in range(1,25)]
things = ["food-kimchi-stew","food-bibimbap","food-tteokbokki","food-kimbap","food-ramyeon","food-jajangmyeon","food-fried-chicken",
          "food-corn-dog","food-hotteok","food-bungeoppang","food-bingsu","food-dalgona","drink-soju","drink-makgeolli",
          "snack-banana-milk","snack-strawberry-milk","snack-pepero","snack-tteok-skewers","snack-cup-ramyeon","snack-samgak-kimbap","snack-strawberry-cake",
          "place-cherry-blossoms","place-palace","place-namsan-tower","thing-camera","thing-headphones","thing-kdrama-books","thing-clapperboard",
          "thing-umbrella","place-hanok","thing-varsity-jacket","thing-doctor-coat","thing-gavel","thing-crown","thing-lantern"]
a = cut(sys.argv[2], "char", chars, out, 6)
b = cut(sys.argv[3], "thing", things, out, 7)
print(len(a), len(b))
