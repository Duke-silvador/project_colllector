"""Ferramentas de coleta (PLANO_COLETA.md). Uso:
  python coleta.py normalizar   # dados/coleta/lista_*.csv, jurados_*.csv, categorias_edicao.csv → dados/*.csv (preserva enriquecimentos)
  python coleta.py wikidata     # pré-preenche gênero/nascimento de pessoas sem QID; candidatos em dados/coleta/wikidata_candidatos.csv
  python coleta.py aplicar_pessoas  # incorpora dados/coleta/pessoas_*.csv (pesquisa de nascimento e raça)
  python coleta.py verificar    # confere se cada raca_trecho aparece na página de raca_fonte
  python coleta.py midia        # foto (Commons, licença livre) e verbete da pt.wikipedia das pessoas com QID → dados/pessoa_midia.csv
  python coleta.py malha        # limites das UFs (IBGE, malha mínima) → web/br-uf.json
"""
import csv
import glob
import html
import json
import re
import subprocess
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).parent
DADOS = RAIZ / "dados"
BRUTO = DADOS / "coleta"
UA = "Literadados/0.1 (pesquisa sobre o Prêmio Jabuti)"

CAMPOS = {
    "pessoa": ["id", "nome", "wikidata", "genero", "genero_fonte", "genero_evidencia", "raca", "raca_evidencia", "raca_fonte", "raca_trecho", "raca_busca",
               "ano_nascimento", "municipio_nascimento", "uf_nascimento", "nascimento_fonte", "revisado_em"],
    "editora": ["id", "nome", "grupo", "municipio_sede", "uf_sede"],
    "obra": ["id", "titulo", "editora_id", "ano_publicacao"],
    "autoria": ["obra_id", "pessoa_id", "papel"],
    "categoria_edicao": ["ano", "nome_original", "categoria", "vagas_lista", "vagas_curta", "vagas_premio", "fonte"],
    "indicacao": ["ano", "nome_original", "obra_id", "lista_curta", "colocacao", "fonte"],
    "jurado": ["ano", "nome_original", "pessoa_id", "fonte"],
    "obra_capa": ["obra_id", "capa_url", "fonte", "pagina"],
}


def slug(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def ler(nome: str) -> list[dict]:
    p = DADOS / f"{nome}.csv"
    return list(csv.DictReader(p.open(encoding="utf-8"))) if p.exists() else []


def gravar(nome: str, linhas: list[dict]):
    with (DADOS / f"{nome}.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CAMPOS[nome], extrasaction="ignore")
        w.writeheader()
        w.writerows(linhas)


def nomes(campo: str) -> list[str]:
    return [n.strip() for n in (campo or "").split("|") if n.strip()]


def normalizar():
    pessoas = {p["id"]: p for p in ler("pessoa")}
    editoras = {e["id"]: e for e in ler("editora")}
    obras, autoria, indicacoes, jurados = {}, set(), {}, {}

    def pessoa(nome: str) -> str:
        pid = slug(nome)
        pessoas.setdefault(pid, {"id": pid, "nome": nome, "genero": "nao_identificado", "raca": "sem_declaracao"})
        return pid

    cats = list(csv.DictReader((BRUTO / "categorias_edicao.csv").open(encoding="utf-8")))
    gravar("categoria_edicao", cats)

    # 2010+ primeiro: os ids de obra dessas edições não mudam quando entra a série histórica (um título antigo igual
    # recebe o sufixo -ano, não o contrário).
    for arq in sorted(glob.glob(str(BRUTO / "lista_*.csv")), key=lambda f: (int(re.search(r"(\d{4})", Path(f).name).group(1)) < 2010, f)):
        for r in csv.DictReader(open(arq, encoding="utf-8")):
            autores = nomes(r["autores"])
            ed_nome = nomes(r["editora"])[0] if nomes(r["editora"]) else ""
            ed_id = slug(ed_nome) if ed_nome else ""
            if ed_id:
                editoras.setdefault(ed_id, {"id": ed_id, "nome": ed_nome})
            oid = slug(r["titulo"])
            # mesmo título com autores diferentes = obras diferentes
            if oid in obras and obras[oid]["_autores"] != autores:
                oid = f"{oid}-{r['ano']}"
            obras.setdefault(oid, {"id": oid, "titulo": r["titulo"], "editora_id": ed_id, "_autores": autores})
            for n in autores:
                autoria.add((oid, pessoa(n), "autor"))
            for n in nomes(r["ilustradores"]):
                if n not in autores:
                    autoria.add((oid, pessoa(n), "ilustrador"))
            for n in nomes(r.get("organizadores")):  # fora das contagens (design D14)
                if n not in autores:
                    autoria.add((oid, pessoa(n), "organizador"))
            fonte = " ; ".join(f for f in (r["fonte_1"], r["fonte_2"]) if f)
            indicacoes[(r["ano"], r["nome_original"], oid)] = {
                "ano": r["ano"], "nome_original": r["nome_original"], "obra_id": oid,
                "lista_curta": r["lista_curta"], "colocacao": r["colocacao"], "fonte": fonte}

    for arq in sorted(glob.glob(str(BRUTO / "jurados_*.csv"))):
        for r in csv.DictReader(open(arq, encoding="utf-8")):
            pid = pessoa(r["nome"])
            jurados[(r["ano"], r["nome_original"], pid)] = {"ano": r["ano"], "nome_original": r["nome_original"], "pessoa_id": pid, "fonte": r["fonte"]}

    # Editoras: sede/grupo levantados à parte; `canonico` unifica duplicatas (ex.: "record" → "editora-record").
    enr_arq = BRUTO / "editoras_enriquecidas.csv"
    if enr_arq.exists():
        enr = {e["id"]: e for e in csv.DictReader(enr_arq.open(encoding="utf-8"))}
        alias = {i: e["canonico"] for i, e in enr.items() if e.get("canonico") and e["canonico"] != i}
        for o in obras.values():
            o["editora_id"] = alias.get(o["editora_id"], o["editora_id"])
        editoras = {i: {**e, **{k: enr[i][k] for k in ("nome", "grupo", "municipio_sede", "uf_sede")}} if i in enr else e
                    for i, e in editoras.items() if i not in alias}
        for i in set(alias.values()) - set(editoras):
            editoras[i] = {k: enr[i][k] for k in ("id", "nome", "grupo", "municipio_sede", "uf_sede")} if i in enr else {"id": i, "nome": i}

    gravar("pessoa", sorted(pessoas.values(), key=lambda p: p["id"]))
    gravar("editora", sorted(editoras.values(), key=lambda e: e["id"]))
    gravar("obra", sorted(obras.values(), key=lambda o: o["id"]))
    gravar("autoria", [{"obra_id": o, "pessoa_id": p, "papel": t} for o, p, t in sorted(autoria)])
    gravar("indicacao", sorted(indicacoes.values(), key=lambda i: (i["ano"], i["nome_original"], i["obra_id"])))
    gravar("jurado", sorted(jurados.values(), key=lambda j: (j["ano"], j["nome_original"], j["pessoa_id"])))
    print(f"{len(pessoas)} pessoas, {len(editoras)} editoras, {len(obras)} obras, {len(indicacoes)} indicações, {len(jurados)} jurados")


GENERO = {"Q6581072": "mulher", "Q1052281": "mulher", "Q6581097": "homem", "Q2449503": "homem", "Q48270": "nao_binario"}


def api(**params) -> dict:
    """API de entidades do Wikidata (www.wikidata.org/w/api.php). Não depende do WDQS, que vive com limite de taxa."""
    url = "https://www.wikidata.org/w/api.php?" + urllib.parse.urlencode({**params, "format": "json"})
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for tentativa in range(5):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code not in (429, 503) or tentativa == 4:
                raise
            time.sleep(int(e.headers.get("Retry-After") or 10))


def _claim(ent: dict, prop: str):
    for c in ent.get("claims", {}).get(prop, []):
        v = c.get("mainsnak", {}).get("datavalue", {}).get("value")
        if v is not None:
            return v
    return None


_ENT = {}


def entidades(ids: list[str]) -> dict:
    faltam = [i for i in dict.fromkeys(ids) if i and i not in _ENT]
    for k in range(0, len(faltam), 50):
        r = api(action="wbgetentities", ids="|".join(faltam[k:k + 50]), props="claims|labels|descriptions", languages="pt|pt-br|en")
        _ENT.update(r.get("entities", {}))
    return {i: _ENT.get(i, {}) for i in ids if i}


def _rotulo(ent: dict) -> str:
    for lang in ("pt", "pt-br", "en"):
        if lang in ent.get("labels", {}):
            return ent["labels"][lang]["value"]
    return ""


def uf_de(local: str, profundidade: int = 6) -> str:
    """Sobe por P131 (localizado em) até um item P31 = Q485258 (UF do Brasil) e devolve a sigla de P300."""
    atual = local
    for _ in range(profundidade):
        ent = entidades([atual]).get(atual, {})
        tipos = [c["mainsnak"].get("datavalue", {}).get("value", {}).get("id") for c in ent.get("claims", {}).get("P31", [])]
        if "Q485258" in tipos:
            return (_claim(ent, "P300") or "").replace("BR-", "")
        pai = _claim(ent, "P131")
        if not pai:
            return ""
        atual = pai["id"]
    return ""


def wikidata():
    pessoas = ler("pessoa")
    alvo = [p for p in pessoas if not p.get("wikidata")]
    linhas = []
    for n, p in enumerate(alvo, 1):
        achados = api(action="wbsearchentities", search=p["nome"], language="pt", uselang="pt", type="item", limit=7).get("search", [])
        ents = entidades([a["id"] for a in achados])
        humanos = {q: e for q, e in ents.items() if any(c["mainsnak"].get("datavalue", {}).get("value", {}).get("id") == "Q5" for c in e.get("claims", {}).get("P31", []))}
        for q, e in humanos.items():
            gen = (_claim(e, "P21") or {}).get("id", "")
            nasc = (_claim(e, "P569") or {}).get("time", "")
            local = (_claim(e, "P19") or {}).get("id", "")
            linhas.append({"pessoa_id": p["id"], "nome": p["nome"], "qid": q, "rotulo": _rotulo(e), "n_candidatos": len(humanos),
                           "descricao": (e.get("descriptions", {}).get("pt") or e.get("descriptions", {}).get("en") or {}).get("value", ""),
                           "genero": GENERO.get(gen, ""), "ano_nascimento": nasc[1:5] if nasc.startswith("+") else "",
                           "municipio_nascimento": _rotulo(entidades([local]).get(local, {})) if local else "",
                           "uf_nascimento": uf_de(local) if local else ""})
        if n % 20 == 0:
            print(f"  {n}/{len(alvo)}", flush=True)
    with (BRUTO / "wikidata_candidatos.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["pessoa_id", "nome", "qid", "rotulo", "n_candidatos", "descricao", "genero", "ano_nascimento", "municipio_nascimento", "uf_nascimento", "confirmado"])
        w.writeheader()
        w.writerows(linhas)
    com = {l["pessoa_id"] for l in linhas}
    unicos = sum(1 for p in alvo if sum(l["pessoa_id"] == p["id"] for l in linhas) == 1)
    print(f"{len(alvo)} pessoas sem QID; {len(com)} com algum candidato humano; {unicos} com candidato único")
    print("Confira, marque confirmado=1 e rode: python coleta.py aplicar_wikidata")


def aplicar_wikidata():
    pessoas = ler("pessoa")
    conf = {c["pessoa_id"]: c for c in csv.DictReader((BRUTO / "wikidata_candidatos.csv").open(encoding="utf-8")) if c.get("confirmado") == "1"}
    n = 0
    for p in pessoas:
        c = conf.get(p["id"])
        if not c:
            continue
        url = f"https://www.wikidata.org/wiki/{c['qid']}"
        p["wikidata"] = c["qid"]
        if p.get("genero", "nao_identificado") == "nao_identificado" and c["genero"]:
            p["genero"], p["genero_fonte"] = c["genero"], url
        if not p.get("uf_nascimento") and c["uf_nascimento"]:
            p["uf_nascimento"], p["municipio_nascimento"], p["nascimento_fonte"] = c["uf_nascimento"], c["municipio_nascimento"], url
        if not p.get("ano_nascimento") and c["ano_nascimento"]:
            p["ano_nascimento"] = c["ano_nascimento"]
            p["nascimento_fonte"] = p.get("nascimento_fonte") or url
        n += 1
    gravar("pessoa", pessoas)
    print(f"{n} pessoas atualizadas a partir do Wikidata")


def aplicar_pessoas():
    """Incorpora dados/coleta/pessoas_*.csv (pesquisa manual/assistida) em dados/pessoa.csv. Célula vazia não apaga dado."""
    from datetime import date
    pessoas = {p["id"]: p for p in ler("pessoa")}
    antes = {i: dict(p) for i, p in pessoas.items()}
    for arq in sorted(glob.glob(str(BRUTO / "pessoas_*.csv"))):
        for r in csv.DictReader(open(arq, encoding="utf-8")):
            p = pessoas.get(r["id"])
            if not p:
                print(f"  ignorado (id desconhecido): {r['id']} em {Path(arq).name}")
                continue
            for k in CAMPOS["pessoa"][2:-1]:
                if r.get(k, "").strip():
                    p[k] = r[k].strip()
            if r.get("genero_fonte", "").strip() and p.get("genero_evidencia"):  # fonte substitui gênero atribuído pelo nome (D16)
                p["genero_evidencia"] = ""
    n = 0
    for i, p in pessoas.items():
        if p != antes[i]:  # revisado_em só muda quando o resultado final muda
            p["revisado_em"] = date.today().isoformat()
            n += 1
    gravar("pessoa", sorted(pessoas.values(), key=lambda p: p["id"]))
    print(f"{n} pessoas atualizadas")


def _norm(s: str) -> str:
    s = html.unescape(re.sub(r"<[^>]+>", " ", s))  # páginas trazem entidades (&eacute;) e acentos em tags
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>|[^a-z0-9 ]", " ", s)).strip()


def verificar():
    """Confere cada trecho de raça contra a página citada. Resultado em dados/coleta/verificacao_raca.csv."""
    saida = []
    for p in ler("pessoa"):
        if p["raca"] == "sem_declaracao":
            continue
        status = "sem_trecho"
        if p.get("raca_trecho") and p.get("raca_fonte"):
            # curl e não urllib: o Python do python.org no macOS vem sem certificados (CERTIFICATE_VERIFY_FAILED)
            r = subprocess.run(["curl", "-sL", "--max-time", "40", "-A", "Mozilla/5.0 " + UA, "-w", "\n%{http_code} %{content_type}", p["raca_fonte"]],
                               capture_output=True)
            corpo, _, meta = r.stdout.rpartition(b"\n")
            codigo, _, tipo = meta.decode(errors="ignore").partition(" ")
            if r.returncode or not codigo.startswith("2"):
                status = f"erro: http {codigo or r.returncode}"  # fora do ar, bloqueio: conferência humana
            elif "pdf" in tipo:
                status = "pdf: conferir à mão"
            else:
                status = "confere" if _norm(p["raca_trecho"]) in _norm(corpo.decode("utf-8", "ignore")) else "nao_encontrado"
        saida.append({"pessoa_id": p["id"], "raca": p["raca"], "status": status, "fonte": p.get("raca_fonte", "")})
        print(f"{status:>16}  {p['id']}")
    with (BRUTO / "verificacao_raca.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["pessoa_id", "raca", "status", "fonte"])
        w.writeheader()
        w.writerows(saida)


# ---------- mídia e malha (interface narrativa, design D15) ----------

LICENCA_LIVRE = re.compile(r"^(cc[ -]by|cc0|public domain|pd\b|attribution$)", re.I)
NAO_RETRATO = re.compile(r"est[aá]tua|statue|busto|\bbust\b|assinatura|signature|t[uú]mulo|\bgrave\b", re.I)  # P18 que não é retrato


def _json(url: str) -> dict:
    """GET JSON via curl (certificados do sistema; urllib falha atrás de proxy com certificado próprio), com nova tentativa em 429/503."""
    for tentativa in range(5):
        r = subprocess.run(["curl", "-sL", "--max-time", "90", "-A", UA, "-w", "\n%{http_code}", url], capture_output=True)
        corpo, _, codigo = r.stdout.rpartition(b"\n")
        if r.returncode == 0 and codigo.startswith(b"2"):
            return json.loads(corpo)
        if codigo not in (b"429", b"503") or tentativa == 4:
            raise RuntimeError(f"GET {url[:80]}: curl {r.returncode}, http {codigo.decode() or '?'}")
        time.sleep(15)


def _texto(html_: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", html_ or ""))).strip()


def midia():
    """Para cada pessoa com QID: P18 (imagem) e verbete da pt.wikipedia; autoria e licença do arquivo no Commons."""
    pessoas = [p for p in ler("pessoa") if p.get("wikidata")]
    qids = sorted({p["wikidata"] for p in pessoas})
    ents = {}
    for k in range(0, len(qids), 50):
        r = api(action="wbgetentities", ids="|".join(qids[k:k + 50]), props="claims|sitelinks", sitefilter="ptwiki")
        ents.update(r.get("entities", {}))
    arquivos = {}
    for q, e in ents.items():
        img = _claim(e, "P18")
        if img:
            arquivos[q] = img
    meta = {}
    nomes_arq = sorted(set(arquivos.values()))
    for k in range(0, len(nomes_arq), 50):
        titulos = "|".join("File:" + a for a in nomes_arq[k:k + 50])
        r = _json("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(
            {"action": "query", "titles": titulos, "prop": "imageinfo", "iiprop": "extmetadata", "format": "json"}))
        norm = {n["to"]: n["from"] for n in r.get("query", {}).get("normalized", [])}
        for pg in r.get("query", {}).get("pages", {}).values():
            em = (pg.get("imageinfo") or [{}])[0].get("extmetadata", {})
            nome = norm.get(pg["title"], pg["title"]).removeprefix("File:")
            meta[nome] = {"autor": _texto(em.get("Artist", {}).get("value", "")),
                          "licenca": _texto(em.get("LicenseShortName", {}).get("value", "")),
                          "licenca_url": em.get("LicenseUrl", {}).get("value", "")}
    linhas, recusadas = [], []
    for p in sorted(pessoas, key=lambda p: p["id"]):
        e = ents.get(p["wikidata"], {})
        wiki = e.get("sitelinks", {}).get("ptwiki", {}).get("title", "")
        img = arquivos.get(p["wikidata"], "")
        m = meta.get(img, {}) if img else {}
        if img and (not (m.get("autor") and LICENCA_LIVRE.match(m.get("licenca", ""))) or NAO_RETRATO.search(img)):
            recusadas.append(f"{p['id']}: {img} ({m.get('licenca') or 'sem licença'}; autor: {m.get('autor') or '?'})")
            img, m = "", {}
        if img or wiki:
            linhas.append({"pessoa_id": p["id"], "imagem": img, "imagem_autor": m.get("autor", ""), "imagem_licenca": m.get("licenca", ""),
                           "imagem_licenca_url": m.get("licenca_url", ""), "wikipedia_pt": wiki})
    with (DADOS / "pessoa_midia.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["pessoa_id", "imagem", "imagem_autor", "imagem_licenca", "imagem_licenca_url", "wikipedia_pt"])
        w.writeheader()
        w.writerows(linhas)
    print(f"{len(pessoas)} pessoas com QID; {sum(1 for l in linhas if l['imagem'])} com foto livre; "
          f"{sum(1 for l in linhas if l['wikipedia_pt'])} com verbete na pt.wikipedia; {len(recusadas)} fotos recusadas")
    for r in recusadas:
        print("  recusada:", r)


IBGE_UF = {"11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO", "21": "MA", "22": "PI", "23": "CE",
           "24": "RN", "25": "PB", "26": "PE", "27": "AL", "28": "SE", "29": "BA", "31": "MG", "32": "ES", "33": "RJ", "35": "SP",
           "41": "PR", "42": "SC", "43": "RS", "50": "MS", "51": "MT", "52": "GO", "53": "DF"}


def malha():
    """Limites das UFs (IBGE, malha mínima) com a sigla em properties.uf e coordenadas com 3 casas."""
    g = _json("https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?" + urllib.parse.urlencode(
        {"formato": "application/vnd.geo+json", "qualidade": "minima", "intrarregiao": "UF"}))

    def arred(c):
        return [round(c[0], 3), round(c[1], 3)] if isinstance(c[0], (int, float)) else [arred(x) for x in c]

    feats = [{"type": "Feature", "properties": {"uf": IBGE_UF[f["properties"]["codarea"]]},
              "geometry": {"type": f["geometry"]["type"], "coordinates": arred(f["geometry"]["coordinates"])}}
             for f in g["features"]]
    saida = RAIZ / "web" / "br-uf.json"
    saida.write_text(json.dumps({"type": "FeatureCollection", "fonte": "IBGE, API de malhas v3 (qualidade mínima)",
                                 "features": sorted(feats, key=lambda f: f["properties"]["uf"])}, separators=(",", ":")), encoding="utf-8")
    print(f"{len(feats)} UFs em {saida.name} ({saida.stat().st_size // 1024} KB)")


FOTOS = RAIZ / "web" / "fotos"
LARGURAS_FOTO = (160, 480)  # anel e abertura (até 128 px na tela, 2x) · perfil (220 px na tela, 2x)


def _baixar(url: str) -> bytes:
    """GET binário via curl, com nova tentativa em 429/503 (mesma política de _json)."""
    for tentativa in range(5):
        r = subprocess.run(["curl", "-sL", "--max-time", "90", "-A", UA, "-w", "\n%{http_code}", url], capture_output=True)
        corpo, _, codigo = r.stdout.rpartition(b"\n")
        if r.returncode == 0 and codigo.startswith(b"2"):
            return corpo
        if codigo not in (b"429", b"503") or tentativa == 4:
            raise RuntimeError(f"GET {url[:80]}: curl {r.returncode}, http {codigo.decode() or '?'}")
        time.sleep(15)


def miniaturas():
    """Fotos livres do Commons → web/fotos/<pessoa_id>-<largura>.webp (RNF-08): o site serve as próprias miniaturas,
    sem cookies de terceiros. Só baixa o que falta; o build marca quem tem miniatura (midia.miniatura)."""
    import io
    from PIL import Image  # só esta coleta usa o Pillow
    FOTOS.mkdir(exist_ok=True)
    novas = falhas = 0
    for m in ler("pessoa_midia"):
        alvos = {w: FOTOS / f"{m['pessoa_id']}-{w}.webp" for w in LARGURAS_FOTO}
        if not m.get("imagem") or all(a.exists() for a in alvos.values()):
            continue
        try:
            im = Image.open(io.BytesIO(_baixar("https://commons.wikimedia.org/wiki/Special:FilePath/"
                                               + urllib.parse.quote(m["imagem"]) + f"?width={max(LARGURAS_FOTO)}")))
            im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
            for w, alvo in alvos.items():
                c = im.copy()
                c.thumbnail((w, w * 3), Image.LANCZOS)
                c.save(alvo, "WEBP", quality=72, method=6)
            novas += 1
        except Exception as e:  # uma foto ruim não para as outras; fica sem miniatura e o site usa o Commons
            falhas += 1
            print(f"  {m['pessoa_id']}: {e}")
        time.sleep(0.3)
    total = sum(f.stat().st_size for f in FOTOS.glob("*.webp"))
    print(f"{novas} pessoas com miniaturas novas, {falhas} falhas; web/fotos com {total // 1024} KB")


# ---------- capas das obras (RF-24) ----------
SEM_CAPA = DADOS / "coleta" / "capas_sem_resultado.txt"  # obras já procuradas sem capa que bata (não repete a busca)


def sobrenome(nome: str) -> str:
    """Último nome que identifica (pula Júnior, Filho, Neto…): "Itamar Vieira Junior" → "vieira"."""
    partes = [p for p in _norm(re.sub(r"\(.*?\)", "", nome)).split(" ") if p not in {"junior", "jr", "filho", "neto", "sobrinho", "segundo"}]
    return partes[-1] if partes else ""


def casa_capa(titulo: str, sobrenomes: list[str], cand_titulo: str, cand_autores: list[str]) -> bool:
    """Aceita a capa só se o título bate (igual, ou um é o outro mais subtítulo) e um sobrenome de autor aparece no candidato."""
    t, c = _norm(titulo), _norm(cand_titulo)
    if not t or not c or not (t == c or c.startswith(t + " ") or t.startswith(c + " ")):
        return False
    autores = " " + _norm(" ".join(cand_autores)) + " "
    return any(f" {s} " in autores for s in sobrenomes if s)


def _capa_google(titulo: str, sobrenomes: list[str]):
    q = urllib.parse.quote(f'intitle:"{titulo}"' + (f" inauthor:{sobrenomes[0]}" if sobrenomes else ""))
    r = _json(f"https://www.googleapis.com/books/v1/volumes?q={q}&maxResults=10&printType=books&langRestrict=pt")
    for it in r.get("items", []):
        v = it.get("volumeInfo", {})
        img = (v.get("imageLinks") or {}).get("thumbnail")
        cand = " ".join(filter(None, [v.get("title"), v.get("subtitle")]))
        if img and casa_capa(titulo, sobrenomes, cand, v.get("authors", [])):
            img = img.replace("http://", "https://").replace("&edge=curl", "")
            return {"capa_url": img, "fonte": "google_books", "pagina": (v.get("canonicalVolumeLink") or v.get("infoLink") or "").replace("http://", "https://") or None}
    return None


def _capa_openlibrary(titulo: str, sobrenomes: list[str]):
    q = urllib.parse.urlencode({"title": titulo, "author": sobrenomes[0] if sobrenomes else "", "fields": "key,title,author_name,cover_i", "limit": 10})
    for d in _json(f"https://openlibrary.org/search.json?{q}").get("docs", []):
        if not casa_capa(titulo, sobrenomes, d.get("title", ""), d.get("author_name", [])):
            continue
        # A capa da obra (cover_i) pode ser de uma tradução: vale só a de uma edição em português.
        for ed in _json(f"https://openlibrary.org{d['key']}/editions.json?limit=100").get("entries", []):
            if ed.get("covers") and ed["covers"][0] > 0 and any(l.get("key") == "/languages/por" for l in ed.get("languages", [])):
                return {"capa_url": f"https://covers.openlibrary.org/b/id/{ed['covers'][0]}-M.jpg", "fonte": "open_library", "pagina": f"https://openlibrary.org{ed['key']}"}
    return None


def capas():
    """Capa de cada obra indicada: Google Books e, se não achar (ou a cota acabar), Open Library. Só grava o que bate
    título + sobrenome de autor. Retoma de onde parou: pula quem já tem capa e quem está em capas_sem_resultado.txt."""
    pessoa = {p["id"]: p["nome"] for p in ler("pessoa")}
    autores: dict[str, list[str]] = {}
    for a in ler("autoria"):
        if a["papel"] == "autor":
            autores.setdefault(a["obra_id"], []).append(sobrenome(pessoa.get(a["pessoa_id"], "")))
    obras = {o["id"]: o for o in ler("obra")}
    feitas = {c["obra_id"]: c for c in ler("obra_capa")}
    sem = set(SEM_CAPA.read_text(encoding="utf-8").split()) if SEM_CAPA.exists() else set()
    fila = sorted({i["obra_id"] for i in ler("indicacao")} - set(feitas) - sem)
    google = True
    print(f"{len(fila)} obras a procurar")
    for k, oid in enumerate(fila, 1):
        o, sob = obras[oid], autores.get(oid, [])
        achou = None
        if google:
            try:
                achou = _capa_google(o["titulo"], sob)
            except RuntimeError as e:
                print(f"  Google Books parou ({e}); seguindo só com a Open Library")
                google = False
        if not achou:
            try:
                achou = _capa_openlibrary(o["titulo"], sob)
            except RuntimeError as e:
                print(f"  {oid}: {e}")
                continue  # erro de rede: tenta de novo na próxima execução
        if achou:
            feitas[oid] = {"obra_id": oid, **achou}
        elif google:  # só marca "sem capa" se as duas fontes responderam; sem a cota do Google, tenta de novo outro dia
            sem.add(oid)
        if k % 25 == 0 or k == len(fila):  # grava aos poucos: dá para interromper e retomar
            gravar("obra_capa", sorted(feitas.values(), key=lambda c: c["obra_id"]))
            SEM_CAPA.write_text("\n".join(sorted(sem)) + "\n", encoding="utf-8")
            print(f"  {k}/{len(fila)}: {len(feitas)} com capa, {len(sem)} sem")
        time.sleep(0.5)


if __name__ == "__main__":
    {"normalizar": normalizar, "wikidata": wikidata, "aplicar_wikidata": aplicar_wikidata,
     "aplicar_pessoas": aplicar_pessoas, "verificar": verificar, "midia": midia, "malha": malha, "miniaturas": miniaturas, "capas": capas}[sys.argv[1]]()
