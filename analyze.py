from PIL import Image
import numpy as np

img = Image.open('/home/vallabh-ghatge/.gemini/antigravity/brain/c1b02107-df2e-484a-8d46-5883871bd816/media__1786181765068.png')
# resize to small to print in ascii
img = img.resize((80, 40))
pixels = np.array(img)
for row in pixels:
    line = ""
    for r,g,b,*a in row:
        if max(r,g,b) > 200:
            line += "O"
        elif max(r,g,b) > 100:
            line += "o"
        elif max(r,g,b) > 50:
            line += "."
        else:
            line += " "
    print(line)
