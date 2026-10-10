import argparse
import os
import random
import pretty_midi

# ----------------------------------------------------------------------------
# 0. Hiperparâmetros
# ----------------------------------------------------------------------------
PASSES_POR_CAMADA_PADRAO = 2   # quantas vezes o loop toca antes de entrar a próxima camada
BPM_MIN, BPM_MAX = 90, 100     # faixa padrão de sorteio de andamento (as duas referências rodam a 95-96 bpm)
LOOP_LEN = 32                  # 2 compassos x 16 semicolcheias — estrutural, não exposto
SLOT = 8                       # cada "acorde" do loop dura 8 semicolcheias — estrutural, não exposto


# ----------------------------------------------------------------------------
# 1. Vocabulário harmônico: tons e progressões (extraídas + genéricas)
# ----------------------------------------------------------------------------

TONICAS = {"Fm": 53, "Gm": 55, "Em": 52, "Dm": 50, "C#m": 49, "Bm": 47}
TONS = [("Fm", 0.25), ("C#m", 0.2), ("Gm", 0.15), ("Em", 0.15), ("Dm", 0.15), ("Bm", 0.1)]

PROGRESSOES = {
    "dont":     [(0, "m", 0), (0, "m", 7), (8, "M", 8), (10, "M", 10)],   # i, i/V, bVI, bVII  (Don't)
    "shape":    [(0, "m", 0), (5, "m", 5), (9, "M", 9), (11, "M", 11)],   # i, iv, VI, VII     (Shape of You)
    "popmenor": [(0, "m", 0), (8, "M", 8), (3, "M", 3), (10, "M", 10)],   # i, bVI, bIII, bVII
    "andaluza": [(0, "m", 0), (10, "M", 10), (8, "M", 8), (7, "M", 7)],   # i, bVII, bVI, V
}

PROGRESSOES_POR_FAMILIA = {
    "balada":   [("dont", 0.4), ("popmenor", 0.25), ("andaluza", 0.2), ("shape", 0.15)],
    "tropical": [("shape", 0.4), ("popmenor", 0.2), ("andaluza", 0.2), ("dont", 0.2)],
}

INTERVALOS = {"m": (0, 3, 7), "M": (0, 4, 7)}


def raiz_baixo(tonica, intervalo):
    r = tonica + intervalo
    return r - 12 if intervalo >= 5 else r

def ajustar_oitava(pitch, centro):
    return pitch + 12 * round((centro - pitch) / 12)

def voicing(tonica, acorde, centro):
    intervalo, qualidade = acorde
    base = [tonica + intervalo + i for i in INTERVALOS[qualidade]]
    melhor = None
    for inv in range(3):
        notas = base[inv:] + [p + 12 for p in base[:inv]]
        notas = [ajustar_oitava(p, centro) for p in notas]
        d = abs(sum(notas) / 3 - centro)
        if melhor is None or d < melhor[0]:
            melhor = (d, sorted(notas))
    return melhor[1]

def nota(camada, ini, pitch, dur, vel):
    return {"camada": camada, "ini": ini, "pitch": pitch, "dur": dur, "vel": vel}

def deslocar(notas, offset):
    return [dict(n, ini=n["ini"] + offset) for n in notas]


def filtrar(notas, camadas):
    return [n for n in notas if n["camada"] in camadas]

ROLE_OFFSET = {"root": lambda q: 0, "third": lambda q: 3 if q == "m" else 4, "fifth": lambda q: 7}

CELULAS = {
    # "reto": semicolcheias repetidas com síncope — sensação do sax de "Don't"
    "reto": [
        [(0, "fifth", 0), (1, "fifth", 0), (2, "fifth", 0), (3, "fifth", 0), (4, "third", 0), (5, "third", 0), (6, "third", 0)],
        [(0, "fifth", 0), (2, "fifth", 0), (3, "fifth", 0), (4, "third", 0), (6, "third", 0)],
        [(0, "root", 0), (1, "root", 0), (2, "root", 0), (3, "root", 0), (5, "third", 0), (6, "fifth", 0)],
        [(0, "fifth", 0), (3, "third", 0), (4, "root", 0), (6, "third", 0), (7, "fifth", 0)],
        [(0, "third", 0), (1, "third", 0), (2, "third", 0), (4, "fifth", 0), (6, "root", 0)],
    ],
    # "tresillo": padrão 3+3+2 — o riff de marimba de "Shape of You"
    "tresillo": [
        [(0, "root", 0), (3, "root", 0), (6, "root", 1)],
        [(0, "root", 1), (3, "root", 0), (6, "root", 1)],
        [(0, "root", 0), (3, "root", 1), (6, "root", 0)],
        [(0, "root", 0), (3, "fifth", 0), (6, "root", 1)],
        [(0, "root", 1), (3, "third", 1), (6, "root", 1)],
    ],
    # "coro": resposta curta perto do fim do slot (inspirada no Chorus de "Shape of You")
    "coro": [
        [(4, "fifth", 0), (5, "third", 0), (6, "root", 0)],
        [(5, "root", 0), (6, "third", 0)],
        [(3, "third", 0), (6, "fifth", 0)],
    ],
}


def gerar_camada_melodica(ctx, feel, camada, transp=0, vel=100):
    notas = []
    for slot in range(4):
        offset, qualidade, _ = ctx["progressao"][slot]
        celula = sortear([(c, 1) for c in CELULAS[feel]])
        for i, (pos, papel, oitava) in enumerate(celula):
            proxima = celula[i + 1][0] if i + 1 < len(celula) else SLOT
            dur = proxima - pos
            pitch = ctx["tonica"] + offset + ROLE_OFFSET[papel](qualidade) + 24 * oitava + transp
            notas.append(nota(camada, slot * SLOT + pos, pitch, dur, vel))
    return notas


# ----------------------------------------------------------------------------
# 3. Baixo, pad/strings e stabs — genéricos, parametrizados pela progressão
# ----------------------------------------------------------------------------

PADROES_BAIXO = {
    "balada":   [[0, 2, 7], [0, 3, 6], [0, 2, 5, 7], [0, 4, 7]],
    "tropical": [[0], [0, 4]],
}


def gerar_baixo(ctx, vel=95):
    familia = ctx["familia"]
    padrao = sortear([(p, 1) for p in PADROES_BAIXO[familia]])
    dobrar = familia == "balada"
    notas = []
    for slot in range(4):
        _, _, bass_off = ctx["progressao"][slot]
        raiz = raiz_baixo(ctx["tonica"], bass_off)
        for i, onset in enumerate(padrao):
            proxima = padrao[i + 1] if i + 1 < len(padrao) else SLOT
            dur = proxima - onset
            notas.append(nota("baixo", slot * SLOT + onset, raiz, dur, vel))
            if dobrar:
                notas.append(nota("baixo", slot * SLOT + onset, raiz - 12, dur, vel))
    return notas


def gerar_sub(ctx):
    """Synth bass duas oitavas abaixo, só no refrão da balada."""
    notas = []
    for slot in range(4):
        _, _, bass_off = ctx["progressao"][slot]
        raiz = raiz_baixo(ctx["tonica"], bass_off) - 12
        notas.append(nota("sub", slot * SLOT, raiz, SLOT, 95))
    return notas


def gerar_pad(ctx, camada, centro, dur, vel, dyad_only=False):
    notas = []
    for slot in range(4):
        offset, qualidade, _ = ctx["progressao"][slot]
        if dyad_only:
            tons = [ajustar_oitava(ctx["tonica"] + offset, centro), ajustar_oitava(ctx["tonica"] + offset + 7, centro)]
        else:
            tons = voicing(ctx["tonica"], (offset, qualidade), centro)
        notas += [nota(camada, slot * SLOT, p, dur, vel) for p in tons]
    return notas


def gerar_stab(ctx, posicoes=(2, 4, 6), centro=76, vel=90):
    notas = []
    for slot in range(4):
        offset, qualidade, _ = ctx["progressao"][slot]
        tons = voicing(ctx["tonica"], (offset, qualidade), centro)
        for pos in posicoes:
            notas += [nota("stab", slot * SLOT + pos, p, 1, vel) for p in tons]
    return notas


# ----------------------------------------------------------------------------
# 4. Bateria — duas paletas distintas (seca/balada x tresillo/tropical)
# ----------------------------------------------------------------------------

KICK, SIDESTICK, SNARE, CLAP, HAT, OPENHAT = 35, 37, 40, 39, 42, 46
MARACAS, TAMB, STICKS, CASTANETS, CHINA, CRASH = 70, 54, 31, 85, 52, 49

KITS = {
    "balada":   [{"denso": False}, {"denso": True}],
    "tropical": [{"kick": {0, 8}, "clap": {4, 12}, "perc": {3, 4, 5, 6, 10, 11, 14}},
                 {"kick": {0, 8}, "clap": {4, 12}, "perc": {3, 4, 6, 10, 11, 13, 14}}],
}


def bateria_balada(variante, refrao):
    notas = []
    for c in (0, 1):
        base = 16 * c
        kicks = {0, 7, 10} if c == 0 else {0, 7, 10, 14}
        for p in range(0, 16, 2):
            forte = p % 4 == 0
            if refrao and ((c == 0 and p == 10) or (c == 1 and p == 12)):
                notas.append(nota("hat", base + p, OPENHAT, 2, 92))
            else:
                notas.append(nota("hat", base + p, HAT, 1, 90 if forte else 55))
            if refrao:
                notas.append(nota("shaker", base + p, MARACAS, 1, 90 if forte else 75))
        if refrao and variante.get("denso"):
            notas += [nota("hat", base + p, HAT, 1, 35) for p in range(1, 16, 2)]
        notas += [nota("kick", base + p, KICK, 1, 110) for p in kicks]
        for p in (4, 12):
            if refrao:
                notas += [nota("backbeat", base + p, SNARE, 1, 110), nota("backbeat", base + p, CLAP, 1, 105),
                          nota("backbeat", base + p, TAMB, 1, 95)]
            else:
                notas += [nota("backbeat", base + p, SIDESTICK, 1, 100), nota("backbeat", base + p, STICKS, 1, 90)]
        notas += [nota("tap", base + 15, STICKS, 1, 95), nota("tap", base + 15, CASTANETS, 1, 88)]
    return notas


def bateria_tropical(variante, refrao):
    notas = []
    for c in (0, 1):
        base = 16 * c
        notas += [nota("kick", base + p, KICK, 1, 108) for p in variante["kick"]]
        notas += [nota("clap", base + p, CLAP, 1, 105) for p in variante["clap"]]
        notas += [nota("perc", base + p, SIDESTICK, 1, 92) for p in variante["perc"]]
        if refrao:
            notas += [nota("openhat", base + p, OPENHAT, 2, 85) for p in (2, 10)]
            notas += [nota("shaker", base + p, MARACAS, 1, 70) for p in variante["perc"]]
    return notas


def bateria(ctx, refrao):
    familia = ctx["familia"]
    fn = bateria_balada if familia == "balada" else bateria_tropical
    return fn(ctx["kit_variante"], refrao)


# ----------------------------------------------------------------------------
# 5. Frases do loop (2 compassos) — montagem por família
# ----------------------------------------------------------------------------

def frase_verso(ctx):
    return bateria(ctx, refrao=False) + gerar_baixo(ctx) + gerar_camada_melodica(ctx, ctx["feel"], "riff")


def frase_refrao(ctx):
    notas = bateria(ctx, refrao=True) + gerar_baixo(ctx, vel=100) + gerar_camada_melodica(ctx, ctx["feel"], "riff")
    notas += gerar_camada_melodica(ctx, "coro", "coro", transp=24, vel=85)
    if ctx["familia"] == "balada":
        notas += gerar_pad(ctx, "pad", centro=61, dur=14, vel=75)
        notas += gerar_stab(ctx)
        notas += gerar_sub(ctx)
    else:
        notas += gerar_pad(ctx, "strings", centro=61, dur=SLOT, vel=75, dyad_only=True)
    return notas


def frase(ctx, tipo):
    """Cada frase é gerada UMA vez por música e reutilizada (cache): é isso
    que faz a repetição soar como um loop de verdade."""
    if tipo not in ctx["frases"]:
        ctx["frases"][tipo] = frase_verso(ctx) if tipo == "verso" else frase_refrao(ctx)
    return ctx["frases"][tipo]


# ----------------------------------------------------------------------------
# 6. Gramática de macroestrutura
# ----------------------------------------------------------------------------

BUILD_ORDENS = {
    "balada": [
        ([["tap"], ["hat", "kick"], ["backbeat"], ["baixo"], ["riff"]], 0.45),
        ([["hat"], ["kick", "backbeat"], ["baixo"], ["tap"], ["riff"]], 0.35),
        ([["baixo"], ["hat", "kick"], ["backbeat", "tap"], ["riff"]], 0.20),
    ],
    "tropical": [
        ([["kick"], ["perc"], ["clap"], ["baixo"], ["riff"]], 0.35),
        ([["perc"], ["kick", "clap"], ["baixo"], ["riff"]], 0.30),
        ([["baixo"], ["kick"], ["perc", "clap"], ["riff"]], 0.15),
        ([["perc", "clap"], ["kick"], ["riff"], ["baixo"]], 0.2),
    ],
}

SECAO_REPS = {
    "Verso":     [(2, 0.5), (4, 0.5)],
    "Refrao":    [(4, 0.7), (2, 0.3)],
    "Breakdown": [(2, 1.0)],
}

ESTRUTURAS = {
    "Musica": [("balada", 0.5), ("tropical", 0.5)],
    "balada": [
        (["Build_Loop", "Verso", "Refrao", "Verso", "Refrao", "Breakdown", "Refrao", "Final"], 0.40),
        (["Build_Loop", "Verso", "Refrao", "Verso", "Refrao", "Final"], 0.35),
        (["Build_Loop", "Breakdown", "Refrao", "Verso", "Refrao", "Final"], 0.25)
    ],
    "tropical": [
        (["Build_Loop", "Verso", "Refrao", "Verso", "Refrao", "Breakdown", "Refrao", "Final"], 0.55),
        (["Build_Loop", "Verso", "Refrao", "Verso", "Refrao", "Final"], 0.45),
    ],
}


def sortear(regras):
    opcoes, pesos = zip(*regras)
    return random.choices(opcoes, weights=pesos, k=1)[0]


def gerar_build(ctx):
    base = frase(ctx, "verso")
    ordem = sortear(BUILD_ORDENS[ctx["familia"]])
    ctx["ordem_build"] = ordem
    ativas, notas, total = set(), [], 0
    for grupo in ordem:
        novas = [c for c in grupo if any(n["camada"] == c for n in base)]
        if not novas:
            continue
        ativas |= set(novas)
        for _ in range(ctx["passes"]):
            notas += deslocar(filtrar(base, ativas), total)
            total += LOOP_LEN
    return notas, total


def gerar_secao(ctx, nome):
    reps = sortear(SECAO_REPS[nome])
    if nome == "Verso":
        base = frase(ctx, "verso")
    elif nome == "Refrao":
        base = frase(ctx, "refrao")
    else:  # Breakdown: fica só a melodia sobre o pad/strings (camadas "saem do pedal")
        camadas = {"riff", "baixo", "coro"} | ({"pad"} if ctx["familia"] == "balada" else {"strings"})
        base = filtrar(frase(ctx, "refrao"), camadas)
    notas = []
    for i in range(reps):
        notas += deslocar(base, i * LOOP_LEN)
    if nome == "Refrao":
        notas.append(nota("cymbal", 0, CHINA if ctx["familia"] == "balada" else CRASH, 8, 110))
    return notas, reps * LOOP_LEN


def gerar_final(ctx):
    t = ctx["tonica"]
    offset, qualidade, bass_off = ctx["progressao"][0]
    raiz = raiz_baixo(t, bass_off)
    notas = [nota("baixo", 0, raiz, 14, 100), nota("baixo", 0, raiz - 12, 14, 100),
             nota("kick", 0, KICK, 1, 110), nota("cymbal", 0, CHINA if ctx["familia"] == "balada" else CRASH, 8, 110)]
    if ctx["familia"] == "balada":
        notas.append(nota("riff", 0, t, 10, 100))
        notas += [nota("pad", 0, p, 14, 75) for p in voicing(t, (offset, qualidade), 61)]
    else:
        notas.append(nota("riff", 0, t + 24, 10, 100))
        notas += [nota("strings", 0, ajustar_oitava(p, 61), 14, 75) for p in (t + offset, t + offset + 7)]
    return notas, 16


def expandir(simbolo, ctx):
    if simbolo == "Build_Loop":
        return gerar_build(ctx)
    if simbolo == "Final":
        return gerar_final(ctx)
    return gerar_secao(ctx, simbolo)


def gerar_musica(tom=None, familia=None, passes_por_camada=None):
    familia = familia or sortear(ESTRUTURAS["Musica"])
    tom = tom or sortear(TONS)
    prog_nome = sortear(PROGRESSOES_POR_FAMILIA[familia])
    ctx = {
        "familia": familia, "tom": tom, "tonica": TONICAS[tom],
        "progressao": PROGRESSOES[prog_nome], "prog_nome": prog_nome,
        "feel": "tresillo" if familia == "tropical" else "reto",
        "kit_variante": sortear([(v, 1) for v in KITS[familia]]),
        "passes": passes_por_camada if passes_por_camada is not None else PASSES_POR_CAMADA_PADRAO,
        "frases": {},
    }
    escolha = sortear(ESTRUTURAS[familia])
    notas, total = [], 0
    for simbolo in escolha:
        n, tam = expandir(simbolo, ctx)
        notas += deslocar(n, total)
        total += tam
    return notas, ctx


# ----------------------------------------------------------------------------
# 7. Renderização MIDI — instrumentação por família
# ----------------------------------------------------------------------------

DESTINOS = {
    "balada": {
        "tap": ["bateria"], "hat": ["bateria"], "kick": ["bateria"], "backbeat": ["bateria"],
        "shaker": ["bateria"], "cymbal": ["bateria"], "baixo": ["baixo"], "sub": ["sub"],
        "riff": ["sax"], "pad": ["pad"], "stab": ["stab_piano", "stab_fx"], "coro": ["coro"],
    },
    "tropical": {
        "kick": ["bateria"], "clap": ["bateria"], "perc": ["bateria"], "openhat": ["bateria"],
        "shaker": ["bateria"], "cymbal": ["bateria"], "baixo": ["baixo"],
        "riff": ["riff"], "strings": ["strings"], "coro": ["coro"],
    },
}

PROGRAMAS = {
    "balada": {"bateria": (24, True), "sax": (65, False), "baixo": (32, False), "sub": (39, False),
               "pad": (90, False), "stab_piano": (0, False), "stab_fx": (99, False), "coro": (52, False)},
    "tropical": {"bateria": (25, True), "riff": (12, False), "baixo": (35, False),
                 "strings": (48, False), "coro": (85, False)},
}


def renderizar(notas, bpm, familia, caminho_saida):
    midi = pretty_midi.PrettyMIDI(initial_tempo=bpm)
    progs = PROGRAMAS[familia]
    dest = DESTINOS[familia]
    inst = {nome: pretty_midi.Instrument(program=prog, is_drum=drum, name=nome) for nome, (prog, drum) in progs.items()}

    semi = 60.0 / bpm / 4
    for n in notas:
        for destino in dest[n["camada"]]:
            e_bateria = progs[destino][1]
            inicio = max(0.0, n["ini"] * semi + random.uniform(-0.006, 0.006))
            dur = 0.1 if e_bateria else max(0.05, n["dur"] * semi * 0.95)
            vel = min(127, max(1, n["vel"] + random.randint(-5, 5)))
            inst[destino].notes.append(pretty_midi.Note(velocity=vel, pitch=n["pitch"], start=inicio, end=inicio + dur))

    for i in inst.values():
        midi.instruments.append(i)
    os.makedirs(os.path.dirname(caminho_saida), exist_ok=True)
    midi.write(caminho_saida)
    return midi.get_end_time()


def _parse_args():
    p = argparse.ArgumentParser(
        description="Gerador de músicas simbólicas estilo Ed Sheeran (gramática generativa). "
                     "Qualquer hiperparâmetro que não for passado é sorteado pela gramática, "
                     "exatamente como se nenhuma flag existisse.")
    p.add_argument("--bpm", type=int, default=None,
                    help="andamento fixo, em bpm. Sem isso, sorteia entre --bpm-min e --bpm-max.")
    p.add_argument("--bpm-min", type=int, default=BPM_MIN,
                    help=f"piso do sorteio de bpm quando --bpm não é passado (padrão {BPM_MIN}).")
    p.add_argument("--bpm-max", type=int, default=BPM_MAX,
                    help=f"teto do sorteio de bpm quando --bpm não é passado (padrão {BPM_MAX}).")
    p.add_argument("--tom", choices=sorted(TONICAS), default=None,
                    help="tonalidade fixa. Sem isso, sorteia conforme os pesos de TONS.")
    p.add_argument("--familia", choices=("balada", "tropical"), default=None,
                    help="estilo fixo. Sem isso, sorteia conforme ESTRUTURAS['Musica'].")
    p.add_argument("--passes", type=int, default=None,
                    help="quantas vezes o loop toca antes de cada nova camada entrar no build "
                         f"(padrão {PASSES_POR_CAMADA_PADRAO}; aceito 1-4).")
    p.add_argument("--seed", type=int, default=None,
                    help="semente para reproduzir a geração aleatória.")
    return p.parse_args()


if __name__ == "__main__":
    # Uso: python SongGenerator.py [--bpm N] [--bpm-min N] [--bpm-max N] [--tom TOM] [--familia F] [--passes N]
    # Nenhuma flag obrigatória — sem argumentos, gera igual à versão anterior (tudo sorteado).
    args = _parse_args()
    if args.seed is not None:
        random.seed(args.seed)

    bpm_min, bpm_max = sorted((args.bpm_min, args.bpm_max))
    bpm_min, bpm_max = max(40, bpm_min), min(220, bpm_max)
    bpm = args.bpm if args.bpm is not None else random.randint(bpm_min, bpm_max)
    bpm = max(40, min(220, bpm))

    passes = args.passes if args.passes is not None else PASSES_POR_CAMADA_PADRAO
    passes_ajustado = max(1, min(4, passes))
    if passes_ajustado != passes:
        print(f"   (--passes {passes} fora da faixa seguro (1-4); usando {passes_ajustado})")

    notas, ctx = gerar_musica(args.tom, args.familia, passes_ajustado)
    run_id = random.randint(1000, 9999)
    identificador = f"seed{args.seed}" if args.seed is not None else str(run_id)
    caminho = f"Samples/SongGenerator_{ctx['familia']}_{ctx['tom']}_{bpm}bpm_{identificador}.mid"
    duracao = renderizar(notas, bpm, ctx["familia"], caminho)

    ordem = " > ".join("+".join(g) for g in ctx["ordem_build"])
    print("🎵 Música gerada!")
    print(f"   Família: {ctx['familia']} | Tom: {ctx['tom']} | Progressão: {ctx['prog_nome']} | BPM: {bpm} | Passes/camada: {passes_ajustado} | Duração: {duracao:.0f}s")
    print(f"   Ordem do build: {ordem}")
    if args.seed is not None:
        print(f"   Semente: {args.seed}")
    print(f"   Arquivo: {caminho}")