"""Gera os ícones provisórios do PWA (fundo grafite com a inicial "P" em serifa).

Provisório: devem ser substituídos pelo selo oficial (guilloché) extraído de wealth.pdf,
conforme o manual de identidade — nunca redesenhar a marca.
Uso: python scripts/gerar_icones.py   (requer Pillow)
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

PASTA = Path(__file__).resolve().parents[1] / "public" / "icons"
GRAFITE = (0x22, 0x1F, 0x20)
BRANCO = (255, 255, 255)
FONTES_SERIFADAS = ["georgia.ttf", "DejaVuSerif.ttf", "times.ttf"]


def fonte(tamanho: int) -> ImageFont.ImageFont:
    for nome in FONTES_SERIFADAS:
        try:
            return ImageFont.truetype(nome, tamanho)
        except OSError:
            continue
    return ImageFont.load_default(tamanho)


def icone(tamanho: int, margem_segura: float = 0.0) -> Image.Image:
    imagem = Image.new("RGB", (tamanho, tamanho), GRAFITE)
    desenho = ImageDraw.Draw(imagem)
    letra = fonte(int(tamanho * (0.55 - margem_segura)))
    desenho.text((tamanho / 2, tamanho / 2), "P", font=letra, fill=BRANCO, anchor="mm")
    return imagem


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    icone(192).save(PASTA / "icone-192.png")
    icone(512).save(PASTA / "icone-512.png")
    icone(512, margem_segura=0.15).save(PASTA / "icone-maskable-512.png")
    icone(180).save(PASTA / "apple-touch-icon.png")


if __name__ == "__main__":
    main()
