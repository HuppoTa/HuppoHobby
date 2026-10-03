"""Offline, curated display cutouts; run with outputs/image-tools/venv/bin/python.

Originals remain untouched. Inspect every output before adding it to the display
mapping. This is not an automatic CMS upload pipeline or a general background
remover. White blister/card bodies are deliberately protected.
"""
from pathlib import Path
import argparse
from PIL import Image, ImageDraw, ImageFilter

PRODUCTS = (
    'aston-martin-f1.jpg', 'bmw-7-series.jpg', 'civic-eg.jpg',
    'fast-furious-5.jpg', 'ferrari-12cilindri.jpg', 'ferrari-dino-206.jpg',
    'ferrari-f2004.jpg', 'ferrari-sf90.jpg', 'honda-del-sol.jpg',
    'kick-sauber-f1.jpg', 'mercedes-500-sel.jpg', 'porsche-911-rallye.webp',
    'racing-bulls-f1.jpg',
)
ROOT = Path(__file__).resolve().parents[1]


def prepare(source: Path) -> Image.Image:
    original = Image.open(source).convert('RGBA')
    if original.getchannel('A').getextrema() != (255, 255):
        raise ValueError(f'Already has alpha: {source.name}; inspect instead of reprocessing')
    width, height = original.size
    pixels = original.load()
    mask = Image.new('L', original.size, 0)
    draw = ImageDraw.Draw(mask)
    loose_car = source.stem == 'bmw-7-series'
    threshold = 210 if loose_car else 242
    safety = 1 if loose_car else 2
    for y in range(height):
        xs = [x for x in range(width) if min(pixels[x, y][:3]) < threshold]
        if xs:
            draw.line((max(0, xs[0] - safety), y,
                       min(width - 1, xs[-1] + safety), y), fill=255)
    if loose_car:
        mask = mask.filter(ImageFilter.GaussianBlur(.6))
    else:
        mask = mask.filter(ImageFilter.MaxFilter(5))
        box = mask.getbbox()
        if not box:
            raise ValueError(f'No subject: {source.name}')
        left, top, right, bottom = box
        ImageDraw.Draw(mask).rectangle(
            (left + 4, top + int((bottom - top) * .48), right - 5, bottom - 5),
            fill=255,
        )
    original.putalpha(mask)
    return original


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path,
                        default=ROOT / 'outputs/image-tools/revision2/reproduced')
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for name in PRODUCTS:
        source = ROOT / 'public/products' / name
        image = prepare(source)
        assert image.convert('RGB').tobytes() == Image.open(source).convert('RGB').tobytes()
        target = args.output_dir / (source.stem + '.webp')
        image.save(target, format='WEBP', lossless=True, exact=True, method=6)
        assert Image.open(target).convert('RGBA').tobytes() == image.tobytes()
        print(target.name)


if __name__ == '__main__':
    main()
