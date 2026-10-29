# Builds the Android launcher icons and splash screens from icons/logo-1024.png (the checkered tomato).
# Usage: python3 tools/make-android-icons.py   (run after `npx cap add android`)
from PIL import Image, ImageDraw
import os, glob
RES='android/app/src/main/res'
logo=Image.open('icons/logo-1024.png').convert('RGBA')
CREAM=(255,248,231,255); TOMATO=(255,99,71,255)
def fit(size,scale,bg=None,circle=False):
    c=Image.new('RGBA',(size,size),(0,0,0,0))
    if bg:
        d=ImageDraw.Draw(c)
        if circle: d.ellipse((0,0,size-1,size-1),fill=bg)
        else: d.rounded_rectangle((0,0,size-1,size-1),radius=int(size*.22),fill=bg)
    s=int(size*scale);l=logo.resize((s,s),Image.LANCZOS);c.alpha_composite(l,((size-s)//2,(size-s)//2));return c
dens={'mdpi':1,'hdpi':1.5,'xhdpi':2,'xxhdpi':3,'xxxhdpi':4}
for name,k in dens.items():
    d=f'{RES}/mipmap-{name}'
    fit(int(48*k),.78,CREAM).save(f'{d}/ic_launcher.png',optimize=True)
    fit(int(48*k),.74,CREAM,circle=True).save(f'{d}/ic_launcher_round.png',optimize=True)
    fit(int(108*k),.50).save(f'{d}/ic_launcher_foreground.png',optimize=True)  # adaptive: 72dp safe zone inside 108dp
open(f'{RES}/values/ic_launcher_background.xml','w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#FFF8E7</color>\n</resources>\n')
for f in glob.glob(f'{RES}/drawable*/splash.png'):
    w,h=Image.open(f).size;c=Image.new('RGBA',(w,h),TOMATO);s=int(min(w,h)*.38);l=logo.resize((s,s),Image.LANCZOS);c.alpha_composite(l,((w-s)//2,(h-s)//2));c.convert('RGB').save(f,optimize=True)
print('icons and splash screens written')
