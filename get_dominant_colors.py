import sys
from PIL import Image

def analyze_image(path):
    try:
        img = Image.open(path)
        img = img.convert('RGB')
        
        # sample a 50x50 block in the center
        w, h = img.size
        cx, cy = w // 2, h // 2
        crop = img.crop((cx - 25, cy - 25, cx + 25, cy + 25))
        
        colors = crop.getcolors(2500)
        colors.sort(reverse=True)
        print(f"Colors in center of {path}:")
        for count, c in colors[:5]:
            print(f"{count} pixels: #{c[0]:02x}{c[1]:02x}{c[2]:02x}")
    except Exception as e:
        print(f"Error analyzing {path}: {e}")

analyze_image('/home/vallabh-ghatge/.gemini/antigravity/brain/c1b02107-df2e-484a-8d46-5883871bd816/media__1786181765068.png')
