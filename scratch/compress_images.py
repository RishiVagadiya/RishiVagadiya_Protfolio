import os
from PIL import Image

def convert_to_webp(source_path, target_path, quality=80):
    try:
        print(f"Converting {source_path} to {target_path}...")
        img = Image.open(source_path)
        img.save(target_path, "WEBP", quality=quality)
        orig_size = os.path.getsize(source_path)
        new_size = os.path.getsize(target_path)
        print(f"Done! Original size: {orig_size} bytes, WebP size: {new_size} bytes ({100 * new_size / orig_size:.2f}%)")
    except Exception as e:
        print(f"Error converting {source_path}: {e}")

convert_to_webp("assets/rr_chatboat.png", "assets/rr_chatboat.webp")
convert_to_webp("assets/rr_contact.png", "assets/rr_contact.webp")
