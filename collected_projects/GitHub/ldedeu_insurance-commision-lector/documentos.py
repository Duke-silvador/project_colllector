"""Extraccion de bloques de texto posicionados de un documento, sin importar si llega como
PDF con texto real, PDF escaneado, imagen suelta, o PDF con imagen incrustada: cada pagina se
reduce siempre al mismo formato ({'blocks': [...], 'text': str, 'image': PIL.Image}), igual al
que ya usan BASS/CRC GROUP via bass.ocr_paginas. Asi la deteccion de encabezados/filas/cheques
de un carrier no depende de como llego el documento, y un carrier nuevo puede recibir hibridos
(excel se maneja aparte, esto es solo para PDF/imagen) sin duplicar logica de extraccion.

Cuando la pagina tiene texto real se usa directo (exacto, sin OCR); solo se recurre a OCR local
(rapidocr) cuando la pagina no trae texto (escaneada) o el archivo es una imagen suelta."""
from io import BytesIO
from threading import Lock

OCR_LOCK = Lock()


def _bloques_ocr(imagen, engine):
    with OCR_LOCK:
        resultado = engine(imagen)
    bloques = []
    if resultado.boxes is not None:
        for caja, texto, confianza in zip(resultado.boxes, resultado.txts, resultado.scores):
            xs, ys = list(zip(*caja))
            bloques.append(dict(text=texto, confidence=float(confianza),
                                x=float(sum(xs) / len(xs) / imagen.width),
                                y=float(sum(ys) / len(ys) / imagen.height),
                                height=float((max(ys) - min(ys)) / imagen.height)))
    return bloques


def _bloques_texto_real(pagina, ancho_pt, alto_pt):
    textpage = pagina.get_textpage()
    try:
        bloques = []
        for indice in range(textpage.count_rects()):
            izquierda, abajo, derecha, arriba = textpage.get_rect(indice)
            texto = textpage.get_text_bounded(izquierda, abajo, derecha, arriba).strip()
            if texto:
                bloques.append({
                    'text': texto,
                    'x': ((izquierda + derecha) / 2) / ancho_pt,
                    'y': 1 - ((arriba + abajo) / 2) / alto_pt,
                    'height': (arriba - abajo) / alto_pt,
                })
        return bloques, textpage.count_chars()
    finally:
        textpage.close()


def paginas_documento(data, name, engine):
    import pypdfium2 as pdfium
    from PIL import Image
    paginas = []
    if name.lower().endswith('.pdf'):
        pdf = pdfium.PdfDocument(data)
        try:
            for indice in range(len(pdf)):
                pagina = pdf[indice]
                try:
                    ancho_pt, alto_pt = pagina.get_size()
                    bitmap = pagina.render(scale=2)
                    try:
                        imagen = bitmap.to_pil().copy()
                    finally:
                        bitmap.close()
                    bloques, caracteres = _bloques_texto_real(pagina, ancho_pt, alto_pt)
                    if caracteres <= 20:
                        bloques = _bloques_ocr(imagen, engine)
                    paginas.append({'blocks': bloques, 'text': '\n'.join(b['text'] for b in bloques), 'image': imagen})
                finally:
                    pagina.close()
        finally:
            pdf.close()
    else:
        with Image.open(BytesIO(data)) as original:
            imagen = original.convert('RGB').copy()
        bloques = _bloques_ocr(imagen, engine)
        paginas.append({'blocks': bloques, 'text': '\n'.join(b['text'] for b in bloques), 'image': imagen})
    return paginas
