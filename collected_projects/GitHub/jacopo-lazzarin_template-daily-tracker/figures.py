"""Instruction figures for the exercise sheets — bigger than the list icons, drawn as
1 → 2 frames (start → end) for movements or one annotated HOLD frame for static
stretches. Each symbol is a 240×130 viewBox; the moving part is amber.

Coordinates are hand-placed; keep the ground at y=112 and frame 2 offset by +120 on x."""

AMBER = "#d97706"
LABEL = "#8a877f"
BODY = 'fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"'


def head(cx, cy, r=7, amber=False):
    col = f' stroke="{AMBER}"' if amber else ""
    return f'<circle cx="{cx}" cy="{cy}" r="{r}"{col}/>'


def seg(points, amber=False, faint=False, w=None):
    d = "M" + " L".join(f"{x} {y}" for x, y in points)
    attrs = ""
    if amber:
        attrs += f' stroke="{AMBER}"'
    if faint:
        attrs += ' opacity=".45"'
    if w:
        attrs += f' stroke-width="{w}"'
    return f'<path d="{d}"{attrs}/>'


def curve(d, amber=False, dashed=False, w=None, arrow=False):
    attrs = f' stroke="{AMBER}"' if amber else ""
    if dashed:
        attrs += ' stroke-dasharray="3 4"'
    if w:
        attrs += f' stroke-width="{w}"'
    if arrow:
        attrs += ' marker-end="url(#ah)"'
    return f'<path d="{d}"{attrs}/>'


def arrow(d):
    return curve(d, amber=True, w=3, arrow=True)


def dashed(x1, y1, x2, y2, amber=False):
    return curve(f"M{x1} {y1} L{x2} {y2}", amber=amber, dashed=True, w=1.5)


def ground(x1=6, x2=114, y=112, dx=0):
    return f'<line x1="{x1 + dx}" y1="{y}" x2="{x2 + dx}" y2="{y}" stroke-width="2" opacity=".5"/>'


def label(text, dx=0, x=6, y=13):
    """Frame badge: a small numbered circle ("1 · ..." → 1). HOLD frames get no badge —
    the words live in CAPTIONS and are rendered as HTML under the figure."""
    n = text.split(" ")[0]
    if not n.isdigit():
        return ""
    return (f'<circle cx="{x + dx + 7}" cy="{y}" r="7" fill="{LABEL}" stroke="none"/>'
            f'<text x="{x + dx + 7}" y="{y + 3}" font-size="9" font-family="ui-monospace,Menlo,monospace" '
            f'font-weight="700" text-anchor="middle" fill="#fff" stroke="none">{n}</text>')


def divider():
    return f'<line x1="120" y1="8" x2="120" y2="122" stroke="{LABEL}" stroke-width="1" opacity=".35" stroke-dasharray="2 4"/>'


def symbol(name, *parts):
    return f'<symbol id="fig-{name}" viewBox="0 0 240 130"><g {BODY}>' + "".join(parts) + "</g></symbol>"


def quadruped(dx, spine, head_xy, near_arm, far_arm, near_leg, far_leg):
    """Shared all-fours skeleton; spine/limbs are passed in so each figure can pose them."""
    return "".join([
        ground(dx=dx), head(*head_xy),
        spine,
        seg(near_arm), seg(far_arm, faint=True),
        seg(near_leg), seg(far_leg, faint=True),
    ])


FIGURES = "".join([
    # ---- posture routine
    symbol("curlup",
        label("1 · LYING FLAT"), ground(),
        head(18, 102), seg([(26, 104), (80, 104)]), seg([(80, 104), (116, 106)]),
        seg([(80, 104), (96, 80), (108, 106)]), seg([(30, 104), (46, 100), (62, 107)]),
        divider(),
        label("2 · LIFT HEAD + SHOULDERS 2–3 CM", 120), ground(dx=120),
        head(138, 92, amber=True), curve("M146 96 Q166 102 200 104", amber=True, w=4.5),
        seg([(200, 104), (236, 106)]), seg([(200, 104), (216, 80), (228, 106)]),
        seg([(150, 98), (166, 100), (182, 107)]), arrow("M128 90 L128 76"),
    ),
    symbol("sideplank",
        label("HOLD · ELBOW UNDER SHOULDER · HIPS TALL · ONE LINE"), ground(10, 230),
        head(56, 44), seg([(66, 52), (128, 80), (196, 110)]), seg([(196, 110), (208, 110)]),
        seg([(66, 52), (66, 110)]), seg([(66, 110), (96, 110)]), seg([(66, 52), (98, 54), (120, 72)]),
        dashed(66, 52, 66, 110, amber=True), dashed(40, 40, 214, 118, amber=True),
        arrow("M134 104 L134 90"),
    ),
    symbol("birddog",
        label("1 · ALL FOURS, SPINE LEVEL"),
        quadruped(0, seg([(96, 60), (52, 62)]), (106, 70),
                  [(94, 62), (96, 110)], [(88, 62), (86, 110)],
                  [(52, 62), (48, 110), (20, 110)], [(58, 64), (56, 110), (30, 110)]),
        divider(),
        label("2 · OPPOSITE ARM + LEG, HOLD 1″", 120),
        quadruped(120, seg([(216, 60), (172, 62)]), (226, 70),
                  [(214, 62), (216, 110)], [(210, 62), (238, 54)],
                  [(172, 62), (168, 110), (140, 110)], [(178, 64), (130, 58)]),
        seg([(210, 62), (238, 54)], amber=True), seg([(178, 64), (130, 58)], amber=True),
        dashed(128, 60, 236, 60, amber=True),
    ),
    symbol("stand",
        label("1 · THE HANG: HIPS FORWARD, HEAD FORWARD"), ground(), dashed(52, 20, 52, 116),
        seg([(52, 112), (58, 90), (64, 70)]), seg([(64, 70), (52, 36)]), seg([(52, 36), (60, 26)]),
        head(64, 18), seg([(52, 40), (58, 76)]), curve("M78 70 L70 70", amber=True, w=2.5, arrow=True),
        divider(),
        label("2 · STACKED: EAR · SHOULDER · HIP · ANKLE", 120), ground(dx=120), dashed(172, 8, 172, 116, amber=True),
        seg([(172, 112), (172, 90), (172, 70)], amber=True), seg([(172, 70), (172, 36)], amber=True),
        seg([(172, 36), (172, 28)], amber=True), head(172, 20, amber=True), seg([(172, 40), (176, 76)]),
    ),
    # ---- stretch routine
    symbol("catcamel",
        label("1 · ROUND THE SPINE UP (CAT)"),
        quadruped(0, curve("M50 66 Q73 38 96 64", amber=True, w=4.5), (104, 74),
                  [(96, 64), (98, 110)], [(90, 64), (88, 110)],
                  [(50, 66), (46, 110), (18, 110)], [(56, 66), (54, 110), (28, 110)]),
        arrow("M73 66 L73 52"),
        divider(),
        label("2 · LET IT SAG DOWN (CAMEL)", 120),
        quadruped(120, curve("M170 62 Q193 88 216 60", amber=True, w=4.5), (226, 50),
                  [(216, 60), (218, 110)], [(210, 60), (208, 110)],
                  [(170, 62), (166, 110), (138, 110)], [(176, 62), (174, 110), (148, 110)],
        ),
        arrow("M193 84 L193 98"),
    ),
    symbol("wallstack",
        label("1"), ground(6, 100), seg([(100, 6), (100, 112)], w=3),
        seg([(90, 112), (74, 112)]), seg([(90, 112), (86, 92), (92, 70)]), seg([(92, 70), (90, 36)]),
        seg([(90, 36), (90, 28)]), head(90, 20), seg([(90, 42), (84, 76)]),
        '<circle cx="98" cy="72" r="3.5" fill="#d97706" stroke="none"/><circle cx="98" cy="46" r="3.5" fill="#d97706" stroke="none"/><circle cx="98" cy="20" r="3.5" fill="#d97706" stroke="none"/>',
        arrow("M66 20 L80 20"),
        divider(),
        label("2", 120), ground(dx=120), curve("M220 6 L220 112", dashed=True, w=2),
        dashed(172, 8, 172, 116, amber=True),
        seg([(172, 112), (158, 112)]), seg([(172, 112), (170, 90), (172, 70)], amber=True),
        seg([(172, 70), (172, 36)], amber=True), seg([(172, 36), (172, 28)], amber=True), head(172, 20, amber=True),
        seg([(172, 42), (166, 76)]),
    ),
    symbol("kneehold",
        ground(60, 200), seg([(88, 8), (88, 112)], w=3), dashed(120, 8, 120, 116, amber=True),
        seg([(120, 112), (134, 112)]), seg([(120, 112), (122, 90), (120, 68)]), seg([(120, 68), (120, 36)]),
        seg([(120, 36), (120, 28)]), head(120, 20), seg([(120, 42), (92, 52)]),
        seg([(120, 68), (150, 58), (148, 88)], amber=True), arrow("M162 76 L162 58"),
    ),
    symbol("textension",
        label("1"), ground(), '<circle cx="66" cy="104" r="8" fill="#efede7"/>',
        head(20, 98), seg([(34, 100), (24, 88)]), seg([(34, 100), (66, 96), (96, 104)]),
        seg([(96, 104), (108, 82), (116, 110)]),
        divider(),
        label("2", 120), ground(dx=120), '<circle cx="186" cy="104" r="8" fill="#efede7"/>',
        head(144, 108, amber=True), seg([(152, 106), (146, 94)]), curve("M216 104 Q186 82 154 106", amber=True, w=4.5),
        seg([(216, 104), (228, 82), (236, 110)]), arrow("M160 82 L150 94"),
    ),
    symbol("9090",
        '<rect x="6" y="12" width="108" height="108" rx="6" fill="#efede7" stroke="none"/>',
        label("1 · FROM ABOVE"),
        seg([(42, 58), (78, 58)]), head(60, 60, 9),
        seg([(60, 68), (60, 98), (26, 98)]), seg([(60, 68), (94, 68), (94, 34)]),
        divider(),
        '<rect x="126" y="12" width="108" height="108" rx="6" fill="#efede7" stroke="none"/>',
        label("2 · SWING", 120),
        seg([(162, 58), (198, 58)]), head(180, 60, 9),
        seg([(180, 68), (180, 98), (214, 98)], amber=True), seg([(180, 68), (146, 68), (146, 34)], amber=True),
        arrow("M150 112 Q180 126 210 112"),
    ),
    symbol("hamfloss",
        label("1 · HANDS BEHIND THIGH, KNEE BENT"), ground(),
        head(16, 104), seg([(24, 106), (72, 106)]), seg([(72, 106), (114, 108)]),
        seg([(72, 106), (72, 66)]), seg([(72, 66), (100, 64)]), seg([(28, 104), (48, 92), (64, 82)]),
        divider(),
        label("2 · STRAIGHTEN THE KNEE, FLEX THE ANKLE", 120), ground(dx=120),
        head(136, 104), seg([(144, 106), (192, 106)]), seg([(192, 106), (234, 108)]),
        seg([(192, 106), (192, 66)]), seg([(192, 66), (194, 26)], amber=True), seg([(194, 26), (184, 24)], amber=True),
        seg([(148, 104), (168, 92), (184, 82)]), arrow("M224 60 Q222 40 206 30"),
    ),
    symbol("openbook",
        '<rect x="6" y="12" width="108" height="108" rx="6" fill="#efede7" stroke="none"/>',
        label("1 · FROM ABOVE · ARMS STACKED IN FRONT"),
        head(26, 62), seg([(34, 62), (80, 62)]), seg([(80, 62), (92, 90), (114, 80)]),
        seg([(40, 62), (46, 104)]), seg([(43, 61), (50, 102)], faint=True),
        divider(),
        '<rect x="126" y="12" width="108" height="108" rx="6" fill="#efede7" stroke="none"/>',
        label("2 · SWEEP THE TOP ARM OPEN, EYES FOLLOW", 120),
        head(164, 62), seg([(172, 62), (218, 62)]), seg([(218, 62), (230, 90), (238, 78)]),
        seg([(178, 62), (184, 100)]), seg([(178, 62), (184, 24)], amber=True),
        curve("M184 100 A38 38 0 0 1 184 24", amber=True, dashed=True, w=1.5, arrow=True),
    ),
    symbol("childpose",
        label("HOLD 60″ · SIT BACK ON THE HEELS, ARMS LONG, LONG EXHALES"), ground(20, 220),
        seg([(132, 110), (180, 110)]), seg([(132, 110), (154, 84)]),
        curve("M154 84 Q120 66 88 90"), head(70, 100), seg([(88, 90), (36, 108)]),
        arrow("M150 64 Q178 66 176 94"),
    ),
])

MARKER = ('<marker id="ah" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="8" markerHeight="8" '
          f'markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="{AMBER}"/></marker>')

CAPTIONS = {
    "curlup": ["Disteso: mani sotto la lombare, un ginocchio piegato", "Solleva testa e spalle di 2–3 cm, senza piegare la colonna"],
    "sideplank": ["Tenuta: gomito sotto la spalla, anche alte, corpo in un'unica linea"],
    "birddog": ["A quattro zampe, colonna orizzontale", "Braccio e gamba opposti, tieni 6–8″, ritorno lento"],
    "wallstack": ["Talloni a 5–8 cm dal muro; sacro, dorso e nuca a contatto; costole giù — 10 chin tuck, 8 slide", "Allontanati e tieni la stessa impilatura 30″, ginocchia morbide"],
    "kneehold": ["Tieni 10″ per lato: alto sul filo a piombo, ginocchio sopra l'anca, senza inclinarti indietro — forza, non stretching"],
    "stand": ["L'appendersi: anche avanti, busto indietro, testa avanti", "Impilato: orecchio · spalla · anca · caviglia sulla stessa linea"],
    "catcamel": ["Inarca la colonna verso l'alto (gatto)", "Lasciala scendere verso il basso (cammello)"],
    "textension": ["Sulla schiena, tappetino arrotolato sotto il dorso, mani dietro la testa, ginocchia piegate", "Espira e inarca il dorso sopra il rullo, costole giù — 8 × 3″, poi sposta il rullo più su"],
    "9090": ["Dall'alto: entrambe le ginocchia a 90°, siedi alto", "Porta entrambe le ginocchia dall'altra parte"],
    "hamfloss": ["Sulla schiena, mani dietro la coscia, ginocchio piegato", "Distendi il ginocchio e fletti la caviglia, poi ripiega — ritmico"],
    "openbook": ["Dall'alto: sul fianco, ginocchia a 90°, braccia impilate davanti", "Apri il braccio di sopra, gli occhi seguono la mano"],
    "childpose": ["Tenuta 60″: ginocchia larghe, siedi sui talloni, fronte a terra, espirazioni lunghe"],
}
