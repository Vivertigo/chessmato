# Builds the app icons from icons/logo-1024.png (transparent PNG).
# Run from the app folder: python3 tools/make-icons.py
from PIL import Image
logo=Image.open('icons/logo-1024.png').convert('RGBA')
def fit(size,scale=1.0,bg=None):
    canvas=Image.new('RGBA',(size,size),bg or (0,0,0,0))
    s=round(size*scale);im=logo.resize((s,s),Image.LANCZOS)
    canvas.alpha_composite(im,((size-s)//2,(size-s)//2));return canvas
for n in (32,48,180,192,512):fit(n).save(f'icons/icon-{n}.png',optimize=True)
fit(512,0.72,(255,248,231,255)).save('icons/icon-maskable-512.png',optimize=True)  # full-bleed for Android masks
fit(180,0.86,(255,248,231,255)).convert('RGB').save('icons/apple-touch-icon.png',optimize=True)
