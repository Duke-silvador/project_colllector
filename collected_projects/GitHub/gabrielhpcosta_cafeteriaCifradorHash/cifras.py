import unicodedata

ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
OUTROS_PERMITIDOS = " .,;:!?-()'\"\n0123456789"
TAMANHO_MAXIMO = 2000


def remover_acentos(texto):
    texto = unicodedata.normalize("NFD", texto)
    return "".join(c for c in texto if unicodedata.category(c) != "Mn")


def validar_mensagem(texto):
    if not texto.strip():
        return "Digite uma mensagem."
    if len(texto) > TAMANHO_MAXIMO:
        return f"A mensagem pode ter no máximo {TAMANHO_MAXIMO} caracteres."
    for c in texto:
        if c.upper() not in ALFABETO and c not in OUTROS_PERMITIDOS:
            return f'Caractere inválido: "{c}"'
    return None


def validar_chave(metodo, chave):
    chave = chave.strip()
    if not chave:
        return "Digite a chave."

    if metodo == "cesar":
        if not chave.lstrip("-").isdigit():
            return "Na Cifra de César a chave tem que ser um número."
        if not 1 <= int(chave) <= 25:
            return "Na Cifra de César a chave tem que ser entre 1 e 25."

    elif metodo in ("substituicao", "transposicao"):
        if not chave.isalpha() or any(c.upper() not in ALFABETO for c in chave):
            return "A palavra-chave só pode ter letras, sem acento e sem espaço."
        if metodo == "transposicao" and len(chave) < 2:
            return "Na Transposição a palavra-chave precisa ter pelo menos 2 letras."
        if len(chave) > 26:
            return "A palavra-chave pode ter no máximo 26 letras."

    else:
        return "Método inválido."

    return None


def trocar_letras(texto, origem, destino):
    resultado = ""
    for c in texto:
        if c.upper() in origem:
            nova = destino[origem.index(c.upper())]
            resultado += nova if c.isupper() else nova.lower()
        else:
            resultado += c
    return resultado


def cesar(texto, deslocamento, decifrar=False):
    if decifrar:
        deslocamento = -deslocamento
    deslocado = ALFABETO[deslocamento % 26:] + ALFABETO[:deslocamento % 26]
    return trocar_letras(texto, ALFABETO, deslocado)


def alfabeto_da_chave(palavra):
    # depois da palavra, o resto do alfabeto vai invertido (Z, Y, X...)
    # senão muita letra ficaria igual a ela mesma
    chave = ""
    for letra in palavra.upper() + ALFABETO[::-1]:
        if letra not in chave:
            chave += letra
    return chave


def substituicao(texto, palavra, decifrar=False):
    chave = alfabeto_da_chave(palavra)
    if decifrar:
        return trocar_letras(texto, chave, ALFABETO)
    return trocar_letras(texto, ALFABETO, chave)


def ordem_das_colunas(palavra):
    palavra = palavra.upper()
    return sorted(range(len(palavra)), key=lambda i: (palavra[i], i))


def transposicao(texto, palavra, decifrar=False):
    n = len(palavra)
    ordem = ordem_das_colunas(palavra)

    if not decifrar:
        return "".join(texto[col::n] for col in ordem)

    # cada coluna tem o mesmo tamanho que tinha na hora de cifrar
    tamanhos = [len(texto[col::n]) for col in range(n)]
    colunas = [""] * n
    inicio = 0
    for col in ordem:
        colunas[col] = texto[inicio:inicio + tamanhos[col]]
        inicio += tamanhos[col]

    resultado = ""
    for i in range(len(texto)):
        resultado += colunas[i % n][i // n]
    return resultado


def processar(mensagem, metodo, chave, acao):
    mensagem = remover_acentos(mensagem.replace("\r\n", "\n"))
    chave = chave.strip()

    erro = validar_mensagem(mensagem) or validar_chave(metodo, chave)
    if erro:
        return None, erro

    decifrar = acao == "decifrar"
    if metodo == "cesar":
        return cesar(mensagem, int(chave), decifrar), None
    if metodo == "substituicao":
        return substituicao(mensagem, chave, decifrar), None
    return transposicao(mensagem, chave, decifrar), None
