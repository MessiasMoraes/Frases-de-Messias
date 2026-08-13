from pathlib import Path
from PIL import Image

ROOT = Path("/home/ubuntu/Frases-de-Messias")
SOURCE = ROOT / "app-assets" / "icon-master.png"
RES_DIR = ROOT / "android" / "app" / "src" / "main" / "res"

# Dimensões padrão para ícones de launcher Android: legacy e camada de foreground adaptativa.
DENSITIES = {
    "mdpi": (48, 108),
    "hdpi": (72, 162),
    "xhdpi": (96, 216),
    "xxhdpi": (144, 324),
    "xxxhdpi": (192, 432),
}

with Image.open(SOURCE) as source:
    master = source.convert("RGBA")

for density, (legacy_size, adaptive_size) in DENSITIES.items():
    directory = RES_DIR / f"mipmap-{density}"
    directory.mkdir(parents=True, exist_ok=True)

    legacy = master.resize((legacy_size, legacy_size), Image.Resampling.LANCZOS)
    foreground = master.resize((adaptive_size, adaptive_size), Image.Resampling.LANCZOS)

    legacy.save(directory / "ic_launcher.png", "PNG", optimize=True)
    legacy.save(directory / "ic_launcher_round.png", "PNG", optimize=True)
    foreground.save(directory / "ic_launcher_foreground.png", "PNG", optimize=True)

print("Ícones Android gerados com sucesso.")
