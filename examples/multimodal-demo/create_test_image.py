#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont

# Create a simple test image
img = Image.new('RGB', (400, 300), color='white')
draw = ImageDraw.Draw(img)

# Draw a simple diagram
draw.rectangle([50, 50, 350, 250], outline='blue', width=3)
draw.text((80, 100), "AI Workflow CLI", fill='black')
draw.text((80, 140), "Multimodal Support", fill='blue')
draw.ellipse([150, 180, 250, 220], fill='lightblue', outline='blue')
draw.text((165, 190), "Images", fill='black')

img.save('test-image.png')
print("Created test-image.png")
