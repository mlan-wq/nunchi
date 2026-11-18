# Laura's second set: 12 banners, 24 characters, 18 food/snack/object tiles.
import sys, importlib.util
from PIL import Image
spec = importlib.util.spec_from_file_location("cs", "scripts/cut-sheets.py"); cs = importlib.util.module_from_spec(spec); spec.loader.exec_module(cs)
U = sys.argv[1]
def square(im, box, yfrac):
    x0,y0,x1,y1 = box; w, h = x1-x0, y1-y0; s = min(w, h) - 4
    cx = (x0+x1)/2; cy = y0 + 2 + (h - s) * yfrac + s/2
    return im.crop((int(cx-s/2), int(cy-s/2), int(cx+s/2), int(cy+s/2))).resize((320,320), Image.LANCZOS)
# banners
names = ["spring-palace","han-river-sunset","seaside-bus-stop","cafe-street","autumn-campus","snowy-bridge",
         "joseon-romance","spring-schoolmates","sunset-beach","yellow-umbrella","ramyeon-date","cherry-bench"]
k = 0
for f in ["498ace51","34bd951c"]:
    im, rows = cs.tiles(f"{U}/{f}-image.png")
    for r in rows:
        boxes = []
        for (x0,y0,x1,y1) in r:  # a faint gutter can merge two tiles
            if x1-x0 > 2.6*(y1-y0): m=(x0+x1)//2; boxes += [(x0,y0,m-2,y1),(m+2,y0,x1,y1)]
            else: boxes.append((x0,y0,x1,y1))
        for (x0,y0,x1,y1) in boxes:
            t = im.crop((x0+2,y0+2,x1-2,y1-2)); t = t.resize((1440, int(1440*t.height/t.width)), Image.LANCZOS)
            t.save(f"src/banners/{names[k]}.jpg", quality=84, optimize=True, progressive=True); k += 1
print("banners", k)
# food / snacks / objects
fnames = ["food-ramyeon","food-tteokbokki","food-kimbap","food-bibimbap","food-fried-chicken","snack-mango-bingsu","snack-banana-milk","food-hotteok","food-dalgona",
          "snack-macarons","snack-soju","snack-dalgona-coffee","obj-norigae-mirror","obj-diary","obj-camera","obj-headphones","obj-yellow-umbrella","obj-doctor-coat"]
im, rows = cs.tiles(f"{U}/231e5d7e-image.png"); k = 0
for r in rows:
    for b in r: square(im, b, .55).save(f"src/avatars/set2/{fnames[k]}.jpg", quality=86, optimize=True, progressive=True); k += 1
print("food", k)
# characters (one gutter in the middle row is too faint to detect: split that tile in two)
im, rows = cs.tiles(f"{U}/6b309133-image.png"); k = 0
for r in rows:
    fixed = []
    for (x0,y0,x1,y1) in r:
        if x1-x0 > 1.6*(y1-y0): m = (x0+x1)//2; fixed += [(x0,y0,m-3,y1),(m+3,y0,x1,y1)]
        else: fixed.append((x0,y0,x1,y1))
    for b in fixed: k += 1; square(im, b, .25).save(f"src/avatars/set2/char-{k:02d}.jpg", quality=86, optimize=True, progressive=True)
print("chars", k)
