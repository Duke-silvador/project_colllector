#!/usr/bin/env python3
# bureau-reglages : interface graphique de personnalisation du bureau XFCE.
# Pilote les commandes du projet (bureau-profil, bureau-wm, greeter-catppuccin.sh,
# fond-anime) et règle directement le thème, les icônes,
# le curseur, les polices, le fond d'écran et les effets de picom.

import hashlib
import json
import math
import os
import re
import shlex
import shutil
import socket
import subprocess
import time
import xml.etree.ElementTree as ET
from datetime import datetime

import cairo
import gi
gi.require_version("Gtk", "3.0")
gi.require_version("Gdk", "3.0")
gi.require_version("GdkPixbuf", "2.0")
from gi.repository import Gdk, GdkPixbuf, Gio, GLib, Gtk, Pango
try:
    gi.require_version("GdkX11", "3.0")
    from gi.repository import GdkX11
except (ValueError, ImportError):
    GdkX11 = None  # sans X11, l'aperçu des vidéos se limite à leur miniature

HOME = os.path.expanduser("~")
ICI = os.path.dirname(os.path.realpath(__file__))
CONFIG = GLib.get_user_config_dir()  # ~/.config, ou $XDG_CONFIG_HOME s'il est défini
PROFILS = os.path.join(CONFIG, "bureau-profils")
ANNULER = "_avant-load"  # état sauvegardé par bureau-profil avant chaque load
EXT_PROFIL = ".bureau-profil.tar.gz"  # archive d'un profil à partager (bureau-profil export / import)
MODE_WM = os.path.join(CONFIG, "bureau-wm")
AUTOSTART = os.path.join(CONFIG, "autostart")
PICOM_CONF = os.path.join(CONFIG, "picom", "picom.conf")
ALTTAB_CSS = os.path.join(CONFIG, "gtk-3.0", "gtk.css")
ALTTAB_OFF = ALTTAB_CSS + ".desactive"
VIDEO_ANIMEE = os.path.join(CONFIG, "fond-anime", "video")
PAUSE_AUTO = os.path.join(CONFIG, "fond-anime", "pause-auto")  # « off » : pas de pause automatique
PRISE_MPV = os.path.join(os.environ.get("XDG_RUNTIME_DIR") or os.path.join(CONFIG, "fond-anime"),
                         "fond-anime-mpv.sock")  # prise de commande du mpv du fond animé


def dossier_donnees(nom):
    """Dossier des images ou des vidéos proposées : celui du logiciel s'il est modifiable (copie
    de git), sinon ~/.local/share/bureau-reglages/ (logiciel installé en lecture seule, dans /usr)."""
    dans_logiciel = os.path.join(ICI, nom)
    if os.access(dans_logiciel if os.path.isdir(dans_logiciel) else ICI, os.W_OK):
        return dans_logiciel
    return os.path.join(GLib.get_user_data_dir(), "bureau-reglages", nom)


VIDEOS_FOND = dossier_donnees("fonds-animes")  # vidéos proposées pour le fond animé
FONDS = dossier_donnees("fonds")  # images proposées pour le fond d'écran
MODELES = os.path.join(ICI, "bin", "bureau-modeles")  # réglages de départ (config/), sans rien écraser
CACHE = os.path.join(GLib.get_user_cache_dir(), "bureau-reglages")  # miniatures et infos des vidéos
GREETER_SCRIPT = os.path.join(ICI, "greeter-catppuccin.sh")
GREETER_CONF = "/etc/lightdm/lightdm-gtk-greeter.conf"
GREETER_THEME = "Catppuccin-Mocha-Greeter"
GREETER_CSS = f"/usr/share/themes/{GREETER_THEME}/gtk-3.0/gtk.css"
# Éléments que greeter-catppuccin.sh prend s'ils sont installés (sinon il les remplace)
GREETER_GTK = "catppuccin-mocha-mauve-standard+default"
GREETER_CURSEURS = "catppuccin-mocha-dark-cursors"
GREETER_IMAGE = "catppuccin-mocha.png"
GREETER_FOND = f"/usr/share/backgrounds/catppuccin/{GREETER_IMAGE}"  # copie faite par le script
MEMO = os.path.join(ICI, "commandes-bureau.md")

# Thèmes intégrés à GTK, sans dossier dans /usr/share/themes (Adwaita, HighContrast…) : sur un
# système neuf, ce sont parfois les seuls (win32 ne sert que sous Windows)
try:
    THEMES_GTK_INTEGRES = {n.rstrip("/") for n in Gio.resources_enumerate_children("/org/gtk/libgtk/theme", 0)}
    THEMES_GTK_INTEGRES.discard("win32")
except GLib.Error:
    THEMES_GTK_INTEGRES = {"Adwaita"}
# Mêmes dossiers que GTK : ~/.themes ou ~/.icons, puis themes/ et icons/ de ~/.local/share et
# de chaque dossier de $XDG_DATA_DIRS (/usr/local/share, /usr/share…)
DONNEES = [GLib.get_user_data_dir(), *GLib.get_system_data_dirs()]
DOSSIERS_THEMES = list(dict.fromkeys([os.path.join(HOME, ".themes"), *(os.path.join(d, "themes") for d in DONNEES)]))
DOSSIERS_ICONES = list(dict.fromkeys([os.path.join(HOME, ".icons"), *(os.path.join(d, "icons") for d in DONNEES)]))
EXT_IMAGES = (".png", ".jpg", ".jpeg", ".webp", ".bmp", ".svg")
EXT_VIDEOS = (".mp4", ".webm", ".mkv", ".mov", ".m4v", ".avi", ".ogv", ".gif")

# Les commandes du projet (bureau-profil, fond-anime…) sont prises à côté de l'interface, où
# qu'elle soit installée : le PATH de la session n'a pas forcément ~/.local/bin
os.environ["PATH"] = os.path.join(ICI, "bin") + os.pathsep + os.environ.get("PATH", "")
# Sans accélération graphique, mpv se rabat sur sdl, qui ignore --wid et ouvre sa propre fenêtre :
# seulement des sorties qui s'intègrent, et le rendu logiciel accepté (comme fond-anime)
MPV_INTEGRE = ["--vo=gpu,gpu-next,x11", "--gpu-sw=yes"]  # ordre par défaut de mpv, sans sdl
# L'aperçu (mpv) reçoit SIGTERM si l'interface s'arrête brutalement
AVEC_PARENT = ["setpriv", "--pdeathsig", "TERM"] if shutil.which("setpriv") else []

# Programmes dont dépendent les réglages, avec le paquet Debian qui les fournit : ce qui
# manque est grisé dans l'interface, avec la commande pour l'installer
PAQUETS = {
    "xfconf-query": "xfconf", "xfwm4": "xfwm4", "xfdesktop": "xfdesktop4", "xfce4-panel": "xfce4-panel",
    "xfce4-appearance-settings": "xfce4-settings", "xrandr": "x11-xserver-utils",
    "picom": "picom", "mpv": "mpv", "ffmpeg": "ffmpeg",
    "compiz": "compiz-core", "gtk-window-decorator": "compiz-gnome", "ccsm": "compizconfig-settings-manager",
    "pkexec": "pkexec", "lightdm-gtk-greeter": "lightdm-gtk-greeter", "dm-tool": "lightdm",
}
# lightdm-gtk-greeter est rangé dans /usr/sbin, souvent absent du PATH d'un utilisateur
CHEMIN_PROGRAMMES = os.pathsep.join([os.environ["PATH"], "/usr/local/sbin", "/usr/sbin", "/sbin"])
COMPIZ = ("compiz", "gtk-window-decorator")
GREETER = ("pkexec", "lightdm-gtk-greeter")


def installe(commande):
    return bool(shutil.which(commande, path=CHEMIN_PROGRAMMES))


def a_installer(manquants):
    """« sudo apt install … » pour les programmes manquants (paquets sans doublon)."""
    paquets = dict.fromkeys(PAQUETS.get(c, c) for c in manquants)
    return "sudo apt install " + " ".join(paquets)


def probleme_session():
    """Texte d'avertissement si le bureau n'est pas XFCE sous X11 (None si tout va bien)."""
    bureau = os.environ.get("XDG_CURRENT_DESKTOP", "")
    type_session = os.environ.get("XDG_SESSION_TYPE", "")
    if type_session == "wayland" or (os.environ.get("WAYLAND_DISPLAY") and not os.environ.get("DISPLAY")):
        return ("Session Wayland : picom, Compiz et le fond animé ne marchent qu'en session X11. "
                "Choisis la session XFCE sous X11 sur l'écran de connexion.")
    if "XFCE" not in bureau.upper().split(":"):
        return (f"Ce bureau n'est pas XFCE ({bureau or 'bureau inconnu'}) : la plupart des réglages "
                "n'auront aucun effet.")
    if not installe("xfconf-query"):
        return f"xfconf-query est introuvable : les réglages d'XFCE ne peuvent pas être lus. {a_installer(['xfconf-query'])}"
    return None

# xfwm4 ne relit gtk.css (style du Alt+Tab) qu'à son démarrage. Comme dans bureau-wm,
# le panneau est relancé ensuite, sinon le dock se place en haut à gauche.
RELANCE_XFWM4 = """
setsid -f xfwm4 --replace >/dev/null 2>&1
sleep 2
# Sans panneau lancé, « xfce4-panel --quit » attend sans fin : on ne l'appelle que s'il tourne
if pgrep -u "$(id -u)" -x xfce4-panel >/dev/null; then xfce4-panel --quit >/dev/null 2>&1; fi
for _ in $(seq 30); do pgrep -u "$(id -u)" -x xfce4-panel >/dev/null || break; sleep 0.1; done
setsid -f xfce4-panel >/dev/null 2>&1
"""
# Relance du panneau : arrêt (s'il tourne) puis démarrage. « xfce4-panel -r » attend sans fin sans
# panneau, et sans gestionnaire de session pour le relancer, l'arrête sans le faire revenir
RELANCE_PANNEAU = """
if pgrep -u "$(id -u)" -x xfce4-panel >/dev/null; then
    xfce4-panel --quit >/dev/null 2>&1
    for _ in $(seq 30); do pgrep -u "$(id -u)" -x xfce4-panel >/dev/null || break; sleep 0.1; done
fi
setsid -f xfce4-panel >/dev/null 2>&1
"""
# relancer-picom relance aussi le panneau, sinon la zone de survol du dock part en haut à gauche
RELANCE_PICOM = "relancer-picom"
# Le fond animé change de mode avec picom (vidéo sous le vrai bureau, ou par-dessus sans picom)
SUIVRE_FOND_ANIME = "; fond-anime actualiser >/dev/null 2>&1 || true"
PICOM_ON = RELANCE_PICOM + SUIVRE_FOND_ANIME
PICOM_OFF = "relancer-picom arreter" + SUIVRE_FOND_ANIME

CSS = b"""
.barre-laterale { background-color: alpha(currentColor, 0.04); border-right: 1px solid alpha(currentColor, 0.1); }
.barre-laterale list { background-color: transparent; }
.barre-laterale row { padding: 9px 12px; margin: 1px 8px; border-radius: 10px; }
.carte { background-color: alpha(currentColor, 0.04); border: 1px solid alpha(currentColor, 0.1); border-radius: 14px; }
.carte > separator { margin: 0 14px; }
.badge { background-color: @theme_selected_bg_color; color: @theme_selected_fg_color; border-radius: 99px; padding: 0 8px; }
.avertissement { background-color: alpha(@warning_color, 0.15); border: 1px solid alpha(@warning_color, 0.5); border-radius: 14px; }
.galerie flowboxchild { padding: 6px; border-radius: 12px; }
.barre-statut { border-top: 1px solid alpha(currentColor, 0.1); }
"""


# --- Lecture de la configuration -------------------------------------------

def lire(chemin):
    try:
        with open(chemin, encoding="utf-8") as f:
            return f.read()
    except (OSError, UnicodeDecodeError):
        return ""


def ecrire(chemin, texte):
    with open(chemin, "w", encoding="utf-8") as f:
        f.write(texte)


def abrege(chemin):
    """Chemin à afficher : ~ à la place du dossier personnel."""
    return "~" + chemin[len(HOME):] if chemin == HOME or chemin.startswith(HOME + os.sep) else chemin


def entier(valeur, defaut):
    try:
        return int(valeur)
    except (TypeError, ValueError):
        return defaut


def processus(*motif):
    """Un processus de ce compte : un autre compte ouvert en même temps (changement
    d'utilisateur) a son propre picom et son propre fond animé."""
    try:
        return subprocess.run(["pgrep", "-u", str(os.getuid()), *motif], capture_output=True).returncode == 0
    except OSError:
        return False


def xfconf(canal):
    """Propriétés d'un canal xfconf : {chemin: valeur} (vide si xfconf manque)."""
    try:
        r = subprocess.run(["xfconf-query", "-c", canal, "-lv"], capture_output=True, text=True)
    except OSError:
        return {}
    props = {}
    for ligne in r.stdout.splitlines():
        prop, _, valeur = ligne.partition(" ")
        if prop.startswith("/"):
            props[prop] = valeur.strip()
    return props


def xfconf_regler(canal, prop, valeur, type_="string"):
    cmd = ["xfconf-query", "-c", canal, "-p", prop]
    try:
        if subprocess.run(cmd + ["-s", str(valeur)], capture_output=True).returncode:
            subprocess.run(cmd + ["-n", "-t", type_, "-s", str(valeur)], capture_output=True)
    except OSError:
        pass


def autostart_actif(nom, sans_fichier):
    """Entrée de démarrage automatique active ? (sans_fichier si elle n'existe pas)"""
    texte = lire(os.path.join(AUTOSTART, nom + ".desktop"))
    if not texte:
        return sans_fichier
    return not re.search(r"^Hidden\s*=\s*true", texte, re.M)


def autostart_regler(nom, actif):
    """Même principe que bureau-wm : Hidden=true désactive l'entrée."""
    chemin = os.path.join(AUTOSTART, nom + ".desktop")
    texte = lire(chemin)
    if not texte:
        return
    lignes = [l for l in texte.splitlines() if not l.startswith("Hidden=")]
    if not actif:
        lignes.append("Hidden=true")
    ecrire(chemin, "\n".join(lignes) + "\n")


def lister(dossiers):
    for d in dossiers:
        try:
            noms = os.listdir(d)
        except OSError:
            continue
        for n in noms:
            yield n, os.path.join(d, n)


def themes(contenu):
    """Thèmes qui contiennent ce fichier ou dossier (gtk-3.0/gtk.css, xfwm4…)."""
    noms = {n for n, p in lister(DOSSIERS_THEMES)
            if n != GREETER_THEME and os.path.exists(os.path.join(p, contenu))}
    if contenu == "gtk-3.0/gtk.css":
        noms |= THEMES_GTK_INTEGRES
    return sorted(noms, key=str.casefold)


def valeur_ini(texte, cle):
    m = re.search(rf"^{re.escape(cle)}\s*=\s*(.*?)\s*$", texte, re.M)
    return m.group(1) if m else ""


def police_systeme(famille):
    """Police installée pour tout le système ? L'écran de connexion ne voit pas celles de ~.
    True si on ne peut pas le savoir (fc-list absent)."""
    try:
        sortie = subprocess.run(["fc-list", f":family={famille}", "file"], capture_output=True, text=True).stdout
    except OSError:
        return True
    return any(l.strip() and not l.startswith(HOME + os.sep) for l in sortie.splitlines())


def rendu_greeter(actif):
    """Éléments du style de l'écran de connexion, et paquets Debian qui le compléteraient.
    Style actif : d'après sa configuration. Sinon : ce que greeter-catppuccin.sh trouvera
    (installé pour tout le système ou dans le dossier personnel, comme lui)."""
    if actif:
        conf = lire(GREETER_CONF)
        catppuccin = "Adwaita" not in lire(GREETER_CSS).split("\n", 1)[0]
        icones = valeur_ini(conf, "icon-theme-name") == "Papirus-Dark"
        curseurs = valeur_ini(conf, "cursor-theme-name") == GREETER_CURSEURS
        image = not valeur_ini(conf, "background").startswith("#")
    else:
        def present(dossiers, nom):
            return any(os.path.isdir(os.path.join(d, nom)) for d in dossiers)
        catppuccin = present(DOSSIERS_THEMES, GREETER_GTK)
        icones = present(DOSSIERS_ICONES, "Papirus-Dark") and present(DOSSIERS_ICONES, "Papirus")
        curseurs = present(DOSSIERS_ICONES, GREETER_CURSEURS)
        sources = (os.path.join(ICI, "fonds"), os.path.join(HOME, ".local", "share", "bureau-reglages", "fonds"),
                   os.path.join(HOME, "Pictures", "Wallpapers"))
        image = os.path.isfile(GREETER_FOND) or any(os.path.isfile(os.path.join(d, GREETER_IMAGE)) for d in sources)
    elements = ["thème Catppuccin" if catppuccin else "base Adwaita sombre",
                "icônes Papirus" if icones else "icônes Adwaita",
                *(["curseurs Catppuccin"] if curseurs else []),
                "fond Catppuccin" if image else "fond uni"]
    paquets = [p for p, ok in (("papirus-icon-theme", icones), ("fonts-inter", police_systeme("Inter"))) if not ok]
    return elements, paquets


def themes_icones():
    icones, curseurs = set(), set()
    for n, p in lister(DOSSIERS_ICONES):
        if n in ("default", "hicolor", "locolor") or not os.path.isdir(p):
            continue
        if os.path.isdir(os.path.join(p, "cursors")):
            curseurs.add(n)
        index = lire(os.path.join(p, "index.theme"))
        if re.search(r"^Directories\s*=", index, re.M) and not re.search(r"^Hidden\s*=\s*true", index, re.M):
            icones.add(n)
    return sorted(icones, key=str.casefold), sorted(curseurs, key=str.casefold)


def fonds_disponibles():
    try:
        noms = sorted(os.listdir(FONDS), key=str.casefold)
    except OSError:
        return []
    return [os.path.join(FONDS, n) for n in noms if n.lower().endswith(EXT_IMAGES)]


def script_copie(copies):
    """Commande bash qui copie chaque (source, destination)."""
    return " && ".join(f"cp -- {shlex.quote(src)} {shlex.quote(dest)}" for src, dest in copies)


def videos_disponibles():
    try:
        noms = sorted(os.listdir(VIDEOS_FOND), key=str.casefold)
    except OSError:
        return []
    return [os.path.join(VIDEOS_FOND, n) for n in noms if n.lower().endswith(EXT_VIDEOS)]


def video_en_pause():
    """Le mpv du fond animé est-il en pause (pause automatique) ? Question posée par sa prise IPC."""
    try:
        with socket.socket(socket.AF_UNIX) as s:
            s.settimeout(0.5)
            s.connect(PRISE_MPV)
            s.sendall(b'{"command": ["get_property", "pause"]}\n')
            recu = b""
            while b'"error"' not in recu:  # mpv peut envoyer des événements avant la réponse
                bloc = s.recv(4096)
                if not bloc:
                    return False
                recu += bloc
    except OSError:
        return False
    ligne = next((l for l in recu.splitlines() if b'"error"' in l), b"{}")
    try:
        return json.loads(ligne).get("data") is True
    except ValueError:
        return False


def meme_fichier(a, b):
    return bool(a and b) and os.path.realpath(a) == os.path.realpath(b)


def lire_json(chemin):
    try:
        return json.loads(lire(chemin) or "{}")
    except ValueError:
        return {}


def description_video(chemin, infos):
    """« 10 s · 1920×1080 · 15 Mo » d'après la sortie JSON de ffprobe."""
    morceaux = []
    try:
        duree = round(float((infos.get("format") or {}).get("duration") or 0))
    except (TypeError, ValueError):
        duree = 0
    if duree:
        morceaux.append(f"{duree} s" if duree < 60 else f"{duree // 60} min {duree % 60:02d} s")
    flux = (infos.get("streams") or [{}])[0]
    if flux.get("width"):
        morceaux.append(f"{flux['width']}×{flux['height']}")
    try:
        octets = os.path.getsize(chemin)
        morceaux.append(f"{octets / 1024 ** 3:.1f} Go".replace(".", ",") if octets >= 1024 ** 3
                        else f"{max(1, round(octets / 1024 ** 2))} Mo")
    except OSError:
        pass
    return " · ".join(morceaux)


def destination_libre(dossier, nom, prises=()):
    """Chemin dans dossier qui n'écrase rien : « vidéo (2).mp4 » si « vidéo.mp4 » existe."""
    base, ext = os.path.splitext(nom)
    chemin, n = os.path.join(dossier, nom), 2
    while os.path.exists(chemin) or chemin in prises:
        chemin = os.path.join(dossier, f"{base} ({n}){ext}")
        n += 1
    return chemin


def fond_principal(props):
    """Image de fond de l'écran principal parmi les propriétés de xfce4-desktop."""
    cles = [k for k in props if k.endswith("/last-image")]

    def rang(k):
        # monitoreDP passe avant les anciennes entrées monitor0, workspace0 avant les autres
        m = re.search(r"/monitor([^/]+)/workspace(\d+)/", k)
        return (m.group(1).isdigit(), m.group(2) != "0", k) if m else (True, True, k)
    return props[min(cles, key=rang)] if cles else ""


def proprietes_xml(chemin):
    """Propriétés d'un fichier xfconf enregistré dans un profil."""
    res = {}
    try:
        racine = ET.parse(chemin).getroot()
    except (OSError, ET.ParseError):
        return res

    def parcourir(noeud, prefixe):
        for p in noeud.findall("property"):
            c = prefixe + "/" + p.get("name", "")
            if p.get("value") is not None:
                res[c] = p.get("value")
            parcourir(p, c)
    parcourir(racine, "")
    return res


def noms_profils():
    try:
        return sorted(n for n in os.listdir(PROFILS)
                      if not n.startswith(".") and os.path.isdir(os.path.join(PROFILS, n)))
    except OSError:
        return []


def lire_reglages(chemin):
    """Profil « apparence seulement » (reglages.conf) : {(canal, propriété): valeur} et image du fond."""
    props, fond = {}, ""
    for ligne in lire(chemin).splitlines():
        champs = ligne.split(None, 3)
        if not champs or champs[0].startswith("#"):
            continue
        if champs[0] == "fond" and len(champs) >= 2:
            fond = ligne.split(None, 1)[1].strip()
        elif len(champs) == 4:
            props[(champs[0], champs[1])] = champs[3].strip()
    return props, fond


def lire_profil(nom):
    reglages = os.path.join(PROFILS, nom, "reglages.conf")
    if os.path.isfile(reglages):
        props, fond = lire_reglages(reglages)
        return {"gtk": props.get(("xsettings", "/Net/ThemeName"), ""),
                "icones": props.get(("xsettings", "/Net/IconThemeName"), ""),
                "curseur": props.get(("xsettings", "/Gtk/CursorThemeName"), ""),
                "wm": props.get(("xfwm4", "/general/theme"), ""), "fond": fond, "partiel": True}
    base = os.path.join(PROFILS, nom, "xfconf")
    xs = proprietes_xml(os.path.join(base, "xsettings.xml"))
    wm = proprietes_xml(os.path.join(base, "xfwm4.xml"))
    bureau = proprietes_xml(os.path.join(base, "xfce4-desktop.xml"))
    return {"gtk": xs.get("/Net/ThemeName", ""), "icones": xs.get("/Net/IconThemeName", ""),
            "curseur": xs.get("/Gtk/CursorThemeName", ""), "wm": wm.get("/general/theme", ""),
            "fond": fond_principal(bureau), "partiel": False}


class ConfigPicom:
    """Réglages du niveau principal de picom.conf (les règles ne sont pas touchées)."""

    def __init__(self):
        self.texte = lire(PICOM_CONF)

    def valeur(self, cle):
        m = re.search(rf"^{re.escape(cle)}\s*=\s*([^;]*);", self.texte, re.M)
        return m.group(1).strip() if m else None

    def regler(self, cle, valeur):
        motif = re.compile(rf"^{re.escape(cle)}\s*=\s*[^;]*;", re.M)
        ligne = f"{cle} = {valeur};"
        if motif.search(self.texte):
            self.texte = motif.sub(ligne, self.texte, count=1)
        else:
            self.texte = self.texte.rstrip("\n") + f"\n{ligne}\n"

    # Le bloc « animations = ( … ); » est désactivé en préfixant ses lignes par « #- »
    def animations(self):
        if re.search(r"^#- animations\s*=", self.texte, re.M):
            return False
        if re.search(r"^animations\s*=", self.texte, re.M):
            return True
        return None

    def regler_animations(self, actif):
        sortie, dans_bloc = [], False
        for ligne in self.texte.split("\n"):
            brute = ligne[3:] if ligne.startswith("#- ") else ligne
            if re.match(r"animations\s*=", brute):
                dans_bloc = True
            if dans_bloc:
                ligne = brute if actif else "#- " + brute
                if re.match(r"\s*\);", brute) or brute.rstrip().endswith(");"):
                    dans_bloc = False
            sortie.append(ligne)
        self.texte = "\n".join(sortie)

    def enregistrer(self):
        ecrire(PICOM_CONF, self.texte)


class Etat:
    """Photo de la configuration actuelle du bureau."""

    def __init__(self):
        self.xs = xfconf("xsettings")
        self.xfwm4 = xfconf("xfwm4")
        self.bureau = xfconf("xfce4-desktop")
        self.actuel = {
            "gtk": self.xs.get("/Net/ThemeName", ""),
            "icones": self.xs.get("/Net/IconThemeName", ""),
            "curseur": self.xs.get("/Gtk/CursorThemeName", ""),
            "wm": self.xfwm4.get("/general/theme", ""),
            "fond": fond_principal(self.bureau),
        }
        self.mode = lire(MODE_WM).strip() or "xfwm4"
        self.profils = {nom: lire_profil(nom) for nom in noms_profils()}
        self.profil_actif = self.trouver_profil_actif()
        self.picom_en_cours = processus("-x", "picom")
        self.picom_actif = autostart_actif("picom", self.picom_en_cours) and (self.picom_en_cours or installe("picom"))
        self.picom = ConfigPicom()
        self.alttab = "xfwm-tabwin" in lire(ALTTAB_CSS)
        self.alttab_dispo = self.alttab or os.path.exists(ALTTAB_OFF)
        self.greeter = bool(re.search(rf"^theme-name\s*=\s*{GREETER_THEME}\s*$", lire(GREETER_CONF), re.M))
        self.fond_anime = processus("-f", "^mpv .*fond-anime-mp[v]")
        # Vidéo sous le bureau : fond-anime-video lancé sans --type-bureau (la géométrie vient en premier)
        self.fond_anime_bureau = processus("-f", "^python3 [^ ]*/fond-anime-vide[o] [0-9]")
        self.fond_anime_auto = autostart_actif("fond-anime", False)
        self.pause_auto = lire(PAUSE_AUTO).strip() != "off"
        self.video_en_pause = self.fond_anime and video_en_pause()
        self.video = lire(VIDEO_ANIMEE).strip()
        self.videos = videos_disponibles()
        # Programmes présents, relus à chaque actualisation : un paquet installé entre-temps est vu
        self.programmes = {c: installe(c) for c in PAQUETS}

    def manquants(self, *commandes):
        return [c for c in commandes if not self.programmes[c]]

    def raison_fond_anime(self):
        """Pourquoi le fond animé ne peut pas se lancer (None s'il le peut)."""
        if not self.programmes["mpv"]:
            return f"Il faut mpv pour lire la vidéo : {a_installer(['mpv'])}"
        return None

    def pourquoi_par_dessus(self):
        """Pourquoi la vidéo ne passera pas sous le bureau (None si elle le peut) : fond-anime la pose
        alors sur le bureau, et ses icônes sont en lecture seule."""
        if self.mode == "compiz":
            return "avec Compiz, picom ne tourne pas"
        if not self.programmes["picom"]:
            return f"picom n'est pas installé ({a_installer(['picom'])})"
        if (self.picom.valeur("backend") or "").strip('"') == "xrender":
            return "picom est en xrender, faute d’accélération 3D (la vidéo sous le bureau demande glx)"
        if not self.picom_actif:
            return "picom est désactivé"
        return None

    def trouver_profil_actif(self):
        """Profil dont le thème, les icônes et la barre de titre sont ceux du bureau."""
        meilleur, score_max = None, -1
        for nom, p in self.profils.items():
            if nom == ANNULER or any(p[k] != self.actuel[k] for k in ("gtk", "icones", "wm")):
                continue
            score = sum(p[k] == self.actuel[k] for k in self.actuel)
            if score > score_max:
                meilleur, score_max = nom, score
        return meilleur


# --- Petits éléments d'interface ---------------------------------------------

def miniature(chemin, largeur, hauteur, rayon):
    """Image recadrée pour remplir largeur × hauteur, coins arrondis (None si illisible)."""
    try:
        fmt, w, h = GdkPixbuf.Pixbuf.get_file_info(chemin)
        if not fmt or not w or not h:
            return None
        echelle = max(largeur / w, hauteur / h)
        pix = GdkPixbuf.Pixbuf.new_from_file_at_scale(
            chemin, max(largeur, math.ceil(w * echelle)), max(hauteur, math.ceil(h * echelle)), False)
    except GLib.Error:
        return None
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, largeur, hauteur)
    cr = cairo.Context(surface)
    cr.new_sub_path()
    for x, y, angle in ((largeur - rayon, rayon, -math.pi / 2), (largeur - rayon, hauteur - rayon, 0),
                        (rayon, hauteur - rayon, math.pi / 2), (rayon, rayon, math.pi)):
        cr.arc(x, y, rayon, angle, angle + math.pi / 2)
    cr.close_path()
    cr.clip()
    Gdk.cairo_set_source_pixbuf(cr, pix, -(pix.get_width() - largeur) // 2, -(pix.get_height() - hauteur) // 2)
    cr.paint()
    return Gdk.pixbuf_get_from_surface(surface, 0, 0, largeur, hauteur)


class Apercu(Gtk.DrawingArea):
    """Lit une vidéo en boucle, sans le son, dans la fenêtre (mpv intégré avec --wid).
    mpv ne tourne que pendant que la zone est affichée : il s'arrête quand on change d'onglet."""

    def __init__(self, largeur, hauteur):
        super().__init__()
        self.set_size_request(largeur, hauteur)
        self.video = None
        self.image = None  # miniature dessinée en attendant mpv (ou à sa place sans X11)
        self.proc = None
        self.connect("map", lambda _w: self.demarrer())
        self.connect("unmap", lambda _w: self.arreter())
        self.connect("draw", self.dessiner)

    def lire(self, video, image=None):
        self.image = image
        if video != self.video:
            self.arreter()
            self.video = video
            self.demarrer()
        self.queue_draw()

    def demarrer(self):
        fenetre = self.get_window()
        if (self.proc or not self.video or not self.get_mapped() or GdkX11 is None
                or not isinstance(fenetre, GdkX11.X11Window) or not fenetre.ensure_native()):
            return
        try:
            self.proc = subprocess.Popen(
                # Pas de décodage matériel pour ce petit aperçu : en rendu logiciel, mpv se bloque
                # en cherchant un décodeur Vulkan (lavapipe)
                AVEC_PARENT + ["mpv", f"--wid={fenetre.get_xid()}", "--no-config", *MPV_INTEGRE, "--loop-file=inf", "--no-audio",
                               "--panscan=1.0", "--hwdec=no", "--no-osc", "--osd-level=0", "--input-cursor=no",
                               "--input-vo-keyboard=no", "--cursor-autohide=no", "--stop-screensaver=no",
                               "--really-quiet", self.video],
                stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except OSError:
            self.proc = None

    def arreter(self):
        if self.proc:
            self.proc.terminate()
            try:
                self.proc.wait(timeout=2)
            except subprocess.TimeoutExpired:
                self.proc.kill()
                self.proc.wait()
            self.proc = None
        self.queue_draw()

    def dessiner(self, _w, cr):
        largeur, hauteur = self.get_allocated_width(), self.get_allocated_height()
        cr.set_source_rgb(0.07, 0.07, 0.1)
        cr.paint()
        if self.image:
            Gdk.cairo_set_source_pixbuf(cr, self.image, (largeur - self.image.get_width()) / 2,
                                        (hauteur - self.image.get_height()) / 2)
            cr.paint()
        return False


def etiquette(texte, dim=False, markup=False):
    l = Gtk.Label(xalign=0, wrap=True)
    if markup:
        l.set_markup(texte)
    else:
        l.set_text(texte)
    if dim:
        l.get_style_context().add_class("dim-label")
    return l


def ligne(titre, description=None, *widgets):
    """Ligne de réglage : titre et description à gauche, widgets à droite."""
    b = Gtk.Box(spacing=12, margin_start=16, margin_end=16, margin_top=12, margin_bottom=12)
    textes = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2, valign=Gtk.Align.CENTER)
    textes.pack_start(etiquette(titre), False, False, 0)
    b.desc = None
    if description is not None:
        b.desc = etiquette(description, dim=True)
        textes.pack_start(b.desc, False, False, 0)
    b.pack_start(textes, True, True, 0)
    for w in widgets:
        w.set_valign(Gtk.Align.CENTER)
        b.pack_start(w, False, False, 0)
    return b


def bouton(texte, action, classe=None):
    b = Gtk.Button(label=texte)
    if classe:
        b.get_style_context().add_class(classe)
    b.connect("clicked", lambda _b: action())
    return b


def regler_combo(combo, valeur):
    if valeur and not combo.set_active_id(valeur):
        combo.append(valeur, valeur)
        combo.set_active_id(valeur)


# --- Fenêtre principale -------------------------------------------------------

class Fenetre(Gtk.ApplicationWindow):

    def __init__(self, appli):
        super().__init__(application=appli, title="Personnalisation du bureau")
        self.set_default_size(980, 700)
        self.set_icon_name("preferences-desktop-theme")
        css = Gtk.CssProvider()
        css.load_from_data(CSS)
        Gtk.StyleContext.add_provider_for_screen(self.get_screen(), css, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)

        self.maj = False       # True pendant qu'on recopie l'état dans les widgets
        self.travail = False   # True pendant qu'une commande tourne
        self.minuteurs = {}
        self.derniere_maj = 0
        self.etat = None
        self.sig_profils = None
        self.fichiers_galerie = None
        self.chemins_galerie = {}
        self.a_charger = []
        self.sig_videos = None
        self.chemins_videos = {}
        self.infos_videos = {}
        self.pngs_videos = {}
        self.video_choisie = None
        self.a_preparer = []
        self.preparation_en_cours = False

        self.pile = Gtk.Stack(transition_type=Gtk.StackTransitionType.CROSSFADE, transition_duration=150)
        pages = [
            ("profils", "Profils", "starred-symbolic", self.page_profils),
            ("apparence", "Apparence", "preferences-color-symbolic", self.page_apparence),
            ("fond", "Fond d'écran", "preferences-desktop-wallpaper-symbolic", self.page_fond),
            ("anime", "Fond animé", "video-x-generic-symbolic", self.page_anime),
            ("fenetres", "Fenêtres et effets", "window-new-symbolic", self.page_fenetres),
            ("connexion", "Écran de connexion", "system-lock-screen-symbolic", self.page_connexion),
            ("outils", "Outils", "applications-utilities-symbolic", self.page_outils),
        ]
        for *_, construire in pages:
            construire()

        corps = Gtk.Box()
        corps.pack_start(self.barre_laterale(pages), False, False, 0)
        corps.pack_start(self.pile, True, True, 0)
        racine = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        probleme = probleme_session()
        if probleme:
            racine.pack_start(self.bandeau(probleme), False, False, 0)
        racine.pack_start(corps, True, True, 0)
        racine.pack_start(self.barre_statut(), False, False, 0)
        self.add(racine)
        racine.show_all()

        self.connect("notify::is-active", self.au_retour)
        self.installer_modeles()
        self.actualiser()

    # --- Structure

    def barre_laterale(self, pages):
        boite = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        boite.get_style_context().add_class("barre-laterale")
        boite.set_size_request(230, -1)
        entete = Gtk.Box(spacing=10, margin_start=16, margin_end=16, margin_top=18, margin_bottom=10)
        entete.pack_start(Gtk.Image.new_from_icon_name("preferences-desktop-theme", Gtk.IconSize.DND), False, False, 0)
        entete.pack_start(etiquette("<b>Personnalisation</b>\n<small>du bureau XFCE</small>", markup=True),
                          False, False, 0)
        boite.pack_start(entete, False, False, 0)

        liste = Gtk.ListBox()
        for nom, texte, icone, _ in pages:
            rangee = Gtk.ListBoxRow()
            rangee.set_name(nom)
            contenu = Gtk.Box(spacing=12)
            contenu.pack_start(Gtk.Image.new_from_icon_name(icone, Gtk.IconSize.MENU), False, False, 0)
            contenu.pack_start(Gtk.Label(label=texte, xalign=0), True, True, 0)
            rangee.add(contenu)
            liste.add(rangee)
        liste.connect("row-selected", lambda _l, r: r and self.pile.set_visible_child_name(r.get_name()))
        liste.select_row(liste.get_row_at_index(0))
        boite.pack_start(liste, True, True, 0)
        self.liste_pages = liste
        return boite

    def aller(self, nom):
        for rangee in self.liste_pages.get_children():
            if rangee.get_name() == nom:
                self.liste_pages.select_row(rangee)
                rangee.grab_focus()  # sinon l'ancienne ligne garde l'aspect « survolée »

    def barre_statut(self):
        barre = Gtk.Box()
        barre.get_style_context().add_class("barre-statut")
        contenu = Gtk.Box(spacing=8, margin_start=14, margin_end=14, margin_top=7, margin_bottom=7)
        self.spinner = Gtk.Spinner(no_show_all=True)
        self.icone_statut = Gtk.Image(no_show_all=True)
        self.texte_statut = Gtk.Label(xalign=0, ellipsize=Pango.EllipsizeMode.END)
        self.texte_statut.get_style_context().add_class("dim-label")
        for w in (self.spinner, self.icone_statut):
            contenu.pack_start(w, False, False, 0)
        contenu.pack_start(self.texte_statut, True, True, 0)
        barre.pack_start(contenu, True, True, 0)
        return barre

    def surveiller(self, dossier):
        """Crée le dossier et relit l'état quand on y ajoute ou retire des fichiers à la main
        (Thunar, terminal…). Le moniteur renvoyé doit être gardé (None si c'est impossible)."""
        try:
            os.makedirs(dossier, exist_ok=True)
            moniteur = Gio.File.new_for_path(dossier).monitor_directory(Gio.FileMonitorFlags.NONE, None)
        except (OSError, GLib.Error):
            return None
        moniteur.connect("changed", lambda *_: self.plus_tard(dossier, 800, self.actualiser))
        return moniteur

    def bandeau(self, texte):
        """Avertissement en haut de la fenêtre (session qui n'est pas XFCE sous X11…)."""
        boite = Gtk.Box(spacing=12, margin_start=12, margin_end=12, margin_top=10, margin_bottom=4)
        boite.get_style_context().add_class("avertissement")
        contenu = Gtk.Box(spacing=12, margin_start=16, margin_end=16, margin_top=10, margin_bottom=10)
        contenu.pack_start(Gtk.Image.new_from_icon_name("dialog-warning-symbolic", Gtk.IconSize.MENU), False, False, 0)
        contenu.pack_start(etiquette(texte), True, True, 0)
        boite.pack_start(contenu, True, True, 0)
        return boite

    def page(self, nom, titre, description):
        boite = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=14,
                        margin_start=32, margin_end=32, margin_top=26, margin_bottom=28)
        boite.pack_start(etiquette(f'<span size="xx-large" weight="bold">{GLib.markup_escape_text(titre)}</span>',
                                   markup=True), False, False, 0)
        boite.pack_start(etiquette(description, dim=True), False, False, 0)
        defil = Gtk.ScrolledWindow(hscrollbar_policy=Gtk.PolicyType.NEVER)
        defil.add(boite)
        self.pile.add_named(defil, nom)
        return boite

    def section(self, boite, titre, description=None):
        entete = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2, margin_top=10)
        entete.pack_start(etiquette(f"<b>{GLib.markup_escape_text(titre)}</b>", markup=True), False, False, 0)
        if description:
            entete.pack_start(etiquette(description, dim=True), False, False, 0)
        boite.pack_start(entete, False, False, 0)

    def carte(self, boite, *lignes):
        c = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        c.get_style_context().add_class("carte")
        for i, l in enumerate(lignes):
            if i:
                c.pack_start(Gtk.Separator(), False, False, 0)
            c.pack_start(l, False, False, 0)
        boite.pack_start(c, False, False, 0)
        return c

    def interrupteur(self, action):
        s = Gtk.Switch()
        s.connect("notify::active", lambda w, _p: None if self.maj else action(w.get_active()))
        return s

    def combo(self, valeurs, action):
        c = Gtk.ComboBoxText()
        cellule = c.get_cells()[0]
        cellule.set_property("ellipsize", Pango.EllipsizeMode.END)
        cellule.set_property("max-width-chars", 30)
        for v in valeurs:
            c.append(v, v)
        c.connect("changed", lambda w: None if self.maj or not w.get_active_id() else action(w.get_active_id()))
        return c

    def police(self, action):
        f = Gtk.FontButton(use_font=True)
        f.connect("font-set", lambda w: action(w.get_font()))
        return f

    # --- Page Profils

    def page_profils(self):
        b = self.page("profils", "Profils",
                      "Un profil garde tout le look du bureau : thème, icônes, curseur, polices, barres de titre, "
                      "panneaux et dock, fond d'écran, terminal, style du Alt+Tab et réglages de picom.")
        self.liste_profils = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        self.liste_profils.get_style_context().add_class("carte")
        b.pack_start(self.liste_profils, False, False, 0)

        self.nom_profil = Gtk.Entry(placeholder_text="nom du profil", width_chars=16)
        self.nom_profil.connect("activate", lambda _e: self.enregistrer_profil())
        self.ligne_annuler = ligne("Annuler le dernier chargement", "",
                                   bouton("Annuler", lambda: self.charger_profil(ANNULER)))
        self.section(b, "Enregistrer, importer et annuler")
        self.carte(b,
                   ligne("Enregistrer l'apparence actuelle",
                         "Crée un profil avec le look du moment, ou remplace celui qui porte ce nom.",
                         self.nom_profil, bouton("Enregistrer", self.enregistrer_profil)),
                   ligne("Importer un profil",
                         f"Ajoute un profil reçu (archive {EXT_PROFIL}), avec ses thèmes et ses images, "
                         "sans l'appliquer. Pour en partager un, utilise le bouton d'export de sa ligne.",
                         bouton("Importer…", self.importer_profil)),
                   self.ligne_annuler)

    def ligne_profil(self, nom, p, actif):
        b = Gtk.Box(spacing=14, margin_start=12, margin_end=16, margin_top=10, margin_bottom=10)
        image = Gtk.Image()
        pix = miniature(p["fond"], 112, 63, 8) if p["fond"] else None
        if pix:
            image.set_from_pixbuf(pix)
        else:
            image.set_from_icon_name("image-x-generic-symbolic", Gtk.IconSize.DIALOG)
            image.set_size_request(112, 63)
        b.pack_start(image, False, False, 0)

        textes = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4, valign=Gtk.Align.CENTER)
        titre = Gtk.Box(spacing=8)
        titre.pack_start(etiquette(f"<b>{GLib.markup_escape_text(nom)}</b>", markup=True), False, False, 0)
        if actif:
            badge = Gtk.Label(valign=Gtk.Align.CENTER)
            badge.set_markup("<small><b>Actif</b></small>")
            badge.get_style_context().add_class("badge")
            titre.pack_start(badge, False, False, 0)
        textes.pack_start(titre, False, False, 0)
        # Profil d'exemple : il ne change que l'apparence (thèmes, polices, fond)
        champs = ["apparence seulement"] if p["partiel"] else []
        champs += [x for x in (p["gtk"], p["icones"], os.path.basename(p["fond"])) if x]
        details = Gtk.Label(xalign=0, ellipsize=Pango.EllipsizeMode.END, label=" · ".join(champs))
        details.get_style_context().add_class("dim-label")
        textes.pack_start(details, False, False, 0)
        b.pack_start(textes, True, True, 0)

        appliquer = bouton("Réappliquer" if actif else "Appliquer", lambda: self.charger_profil(nom),
                           None if actif else "suggested-action")
        exporter = Gtk.Button.new_from_icon_name("document-send-symbolic", Gtk.IconSize.BUTTON)
        exporter.set_tooltip_text("Exporter ce profil dans une archive à partager (thèmes et images compris)")
        exporter.connect("clicked", lambda _b: self.exporter_profil(nom))
        corbeille = Gtk.Button.new_from_icon_name("user-trash-symbolic", Gtk.IconSize.BUTTON)
        corbeille.set_tooltip_text("Mettre ce profil à la corbeille")
        corbeille.connect("clicked", lambda _b: self.supprimer_profil(nom))
        for w in (appliquer, exporter, corbeille):
            w.set_valign(Gtk.Align.CENTER)
            b.pack_start(w, False, False, 0)
        return b

    def remplir_profils(self, e):
        signature = (repr(e.profils), e.profil_actif)
        if signature != self.sig_profils:
            self.sig_profils = signature
            for enfant in self.liste_profils.get_children():
                enfant.destroy()
            noms = [n for n in e.profils if n != ANNULER]
            if not noms:
                self.liste_profils.pack_start(ligne("Aucun profil enregistré",
                                                    "Enregistre l'apparence actuelle ci-dessous."), False, False, 0)
            for i, nom in enumerate(noms):
                if i:
                    self.liste_profils.pack_start(Gtk.Separator(), False, False, 0)
                self.liste_profils.pack_start(self.ligne_profil(nom, e.profils[nom], nom == e.profil_actif),
                                              False, False, 0)
            self.liste_profils.show_all()

        sauvegarde = os.path.join(PROFILS, ANNULER)
        if os.path.isdir(sauvegarde):
            quand = datetime.fromtimestamp(os.path.getmtime(sauvegarde)).strftime("%d/%m à %H:%M")
            self.ligne_annuler.desc.set_text(f"Remet l'apparence d'avant le dernier chargement de profil "
                                             f"(gardée le {quand}).")
        else:
            self.ligne_annuler.desc.set_text("Aucun chargement à annuler pour l'instant.")
        self.ligne_annuler.set_sensitive(os.path.isdir(sauvegarde))

    def charger_profil(self, nom):
        message = "Retour à l'apparence précédente…" if nom == ANNULER else f"Application du profil « {nom} »…"
        self.lancer(message, ["bureau-profil", "load", nom])

    def enregistrer_profil(self):
        nom = self.nom_profil.get_text().strip()
        if not re.fullmatch(r"[^\W_][\w.-]*", nom):
            self.erreur("Nom de profil invalide",
                        "Utilise des lettres, des chiffres, des tirets ou des points, sans espace "
                        "(ex. « catppuccin-perso »).")
            return
        if nom in self.etat.profils and not self.confirmer(
                f"Remplacer le profil « {nom} » ?", "Il sera écrasé par l'apparence actuelle.", "Remplacer"):
            return
        self.lancer(f"Enregistrement du profil « {nom} »…", ["bureau-profil", "save", nom],
                    apres=lambda: self.nom_profil.set_text(""))

    def exporter_profil(self, nom):
        chemin = self.choisir_archive_export(nom)
        if chemin:
            self.lancer(f"Export du profil « {nom} »…", ["bureau-profil", "export", nom, chemin], details=True)

    def choisir_archive_export(self, nom):
        """Archive où exporter le profil (dossier Documents proposé), ou None."""
        d = Gtk.FileChooserDialog(title=f"Exporter le profil « {nom} »", transient_for=self,
                                  action=Gtk.FileChooserAction.SAVE, do_overwrite_confirmation=True)
        d.add_buttons("Annuler", Gtk.ResponseType.CANCEL, "Exporter", Gtk.ResponseType.ACCEPT)
        dossier = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOCUMENTS) or HOME
        if os.path.isdir(dossier):
            d.set_current_folder(dossier)
        d.set_current_name(nom + EXT_PROFIL)
        chemin = d.get_filename() if d.run() == Gtk.ResponseType.ACCEPT else None
        d.destroy()
        return chemin

    def importer_profil(self):
        chemin = self.choisir_archive_import()
        if chemin:
            self.lancer("Import du profil…", ["bureau-profil", "import", chemin], details=True)

    def choisir_archive_import(self):
        """Archive de profil à importer (dossier Téléchargements proposé), ou None."""
        d = Gtk.FileChooserDialog(title="Importer un profil", transient_for=self, action=Gtk.FileChooserAction.OPEN)
        d.add_buttons("Annuler", Gtk.ResponseType.CANCEL, "Importer", Gtk.ResponseType.ACCEPT)
        for nom_filtre, motif in ((f"Profils ({EXT_PROFIL})", "*" + EXT_PROFIL), ("Archives .tar.gz", "*.tar.gz")):
            filtre = Gtk.FileFilter()
            filtre.set_name(nom_filtre)
            filtre.add_pattern(motif)
            d.add_filter(filtre)
        dossier = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOWNLOAD)
        if dossier and os.path.isdir(dossier):
            d.set_current_folder(dossier)
        chemin = d.get_filename() if d.run() == Gtk.ResponseType.ACCEPT else None
        d.destroy()
        return chemin

    def supprimer_profil(self, nom):
        if not self.confirmer(f"Mettre le profil « {nom} » à la corbeille ?",
                              "Tu pourras le récupérer depuis la corbeille.", "Mettre à la corbeille"):
            return
        try:
            Gio.File.new_for_path(os.path.join(PROFILS, nom)).trash(None)
        except GLib.Error as err:
            self.erreur(f"Impossible de supprimer « {nom} »", err.message)
            return
        self.statut(f"Profil « {nom} » mis à la corbeille", "user-trash-symbolic")
        self.actualiser()

    # --- Page Apparence

    def page_apparence(self):
        b = self.page("apparence", "Apparence",
                      "Les changements s'appliquent tout de suite. Pour les garder sous un nom, "
                      "enregistre-les ensuite dans un profil.")
        icones, curseurs = themes_icones()
        self.combo_gtk = self.combo(themes("gtk-3.0/gtk.css"), lambda v: self.regler_xfconf(
            "xsettings", "/Net/ThemeName", v, f"Thème des applications : {v}", compiz=True))
        self.combo_wm = self.combo(themes("xfwm4"), lambda v: self.regler_xfconf(
            "xfwm4", "/general/theme", v, f"Barre de titre : {v}"))
        self.combo_icones = self.combo(icones, lambda v: self.regler_xfconf(
            "xsettings", "/Net/IconThemeName", v, f"Icônes : {v}"))
        self.combo_curseur = self.combo(curseurs, lambda v: self.regler_xfconf(
            "xsettings", "/Gtk/CursorThemeName", v, f"Curseur : {v}"))
        self.taille_curseur = Gtk.SpinButton.new_with_range(16, 96, 8)
        self.taille_curseur.set_tooltip_text("Taille du curseur en pixels")
        self.taille_curseur.connect("value-changed", lambda w: None if self.maj else self.plus_tard(
            "curseur", 500, lambda: self.regler_xfconf(
                "xsettings", "/Gtk/CursorThemeSize", w.get_value_as_int(),
                f"Taille du curseur : {w.get_value_as_int()} px", "int")))
        self.ligne_wm = ligne("Barre de titre des fenêtres", "", self.combo_wm)
        self.carte(b,
                   ligne("Thème des applications", "Couleurs et style des fenêtres, boutons et menus (GTK).",
                         self.combo_gtk),
                   self.ligne_wm,
                   ligne("Icônes", None, self.combo_icones),
                   ligne("Curseur", "Taille en pixels à droite. Certaines applications le prennent à leur "
                                    "prochain lancement.", self.combo_curseur, self.taille_curseur))

        self.section(b, "Polices")
        self.police_ui = self.police(lambda v: self.regler_xfconf(
            "xsettings", "/Gtk/FontName", v, f"Police de l'interface : {v}"))
        self.police_mono = self.police(lambda v: self.regler_xfconf(
            "xsettings", "/Gtk/MonospaceFontName", v, f"Police à chasse fixe : {v}"))
        self.police_titre = self.police(lambda v: self.regler_xfconf(
            "xfwm4", "/general/title_font", v, f"Police des titres : {v}", compiz=True))
        self.carte(b,
                   ligne("Interface", "Menus, boutons et textes des applications.", self.police_ui),
                   ligne("Chasse fixe", "Terminaux et éditeurs de code qui suivent la police du système.",
                         self.police_mono),
                   ligne("Titres des fenêtres", None, self.police_titre))

    def maj_apparence(self, e):
        regler_combo(self.combo_gtk, e.actuel["gtk"])
        regler_combo(self.combo_wm, e.actuel["wm"])
        regler_combo(self.combo_icones, e.actuel["icones"])
        regler_combo(self.combo_curseur, e.actuel["curseur"])
        self.taille_curseur.set_value(entier(e.xs.get("/Gtk/CursorThemeSize"), 24))
        for bouton_police, valeur in ((self.police_ui, e.xs.get("/Gtk/FontName")),
                                      (self.police_mono, e.xs.get("/Gtk/MonospaceFontName")),
                                      (self.police_titre, e.xfwm4.get("/general/title_font"))):
            if valeur:
                bouton_police.set_font(valeur)
        compiz = e.mode == "compiz"
        self.combo_wm.set_sensitive(not compiz)
        self.ligne_wm.desc.set_text("Avec Compiz, la barre de titre suit le thème des applications." if compiz
                                    else "Bordures et boutons des fenêtres dessinés par xfwm4.")

    def regler_xfconf(self, canal, prop, valeur, message, type_="string", compiz=False):
        xfconf_regler(canal, prop, valeur, type_)
        # Compiz dessine ses barres de titre d'après le thème GTK et la police d'xfwm4
        if compiz and self.etat.mode == "compiz":
            self.detacher("bureau-wm", "theme")
        self.statut(message, "emblem-ok-symbolic")
        self.actualiser()

    # --- Page Fond d'écran

    def page_fond(self):
        b = self.page("fond", "Fond d'écran",
                      "Clique sur une image pour la mettre en fond sur tous les écrans et espaces de travail. "
                      f"Les images sont rangées dans {abrege(FONDS)}.")
        self.alerte_anime = Gtk.Box(spacing=12, no_show_all=True)
        self.alerte_anime.get_style_context().add_class("avertissement")
        contenu = Gtk.Box(spacing=12, margin_start=16, margin_end=12, margin_top=10, margin_bottom=10)
        contenu.pack_start(Gtk.Image.new_from_icon_name("dialog-warning-symbolic", Gtk.IconSize.MENU), False, False, 0)
        contenu.pack_start(etiquette("Le fond animé est lancé : il recouvre l'image choisie ici."), True, True, 0)
        contenu.pack_start(bouton("Fond animé…", lambda: self.aller("anime")), False, False, 0)
        contenu.pack_start(bouton("Arrêter le fond animé", lambda: self.regler_fond_anime(False)), False, False, 0)
        contenu.show_all()
        self.alerte_anime.pack_start(contenu, True, True, 0)
        b.pack_start(self.alerte_anime, False, False, 0)

        self.galerie = Gtk.FlowBox(homogeneous=True, min_children_per_line=2, max_children_per_line=4,
                                   row_spacing=6, column_spacing=6, activate_on_single_click=True,
                                   selection_mode=Gtk.SelectionMode.SINGLE,
                                   margin_start=8, margin_end=8, margin_top=8, margin_bottom=8)
        self.galerie.get_style_context().add_class("galerie")
        self.galerie.connect("child-activated", lambda _g, enfant: self.choisir_fond(self.chemins_galerie[enfant]))
        actions = Gtk.Box(spacing=8, margin_start=14, margin_end=14, margin_top=10, margin_bottom=10)
        actions.pack_end(bouton("Ajouter des images…", self.ajouter_fonds), False, False, 0)
        actions.pack_end(bouton("Ouvrir le dossier", lambda: self.detacher("xdg-open", FONDS)), False, False, 0)
        self.carte(b, self.galerie, actions)

        self.moniteur_fonds = self.surveiller(FONDS)

    def remplir_galerie(self, e):
        fichiers = fonds_disponibles()
        actuel = e.actuel["fond"]
        if actuel and actuel not in fichiers and os.path.isfile(actuel):
            fichiers.insert(0, actuel)
        if fichiers != self.fichiers_galerie:
            self.fichiers_galerie = fichiers
            for enfant in self.galerie.get_children():
                enfant.destroy()
            self.chemins_galerie, self.a_charger = {}, []
            for chemin in fichiers:
                boite = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
                image = Gtk.Image()
                image.set_size_request(176, 99)
                nom = Gtk.Label(label=os.path.splitext(os.path.basename(chemin))[0],
                                ellipsize=Pango.EllipsizeMode.END, max_width_chars=20)
                boite.pack_start(image, False, False, 0)
                boite.pack_start(nom, False, False, 0)
                enfant = Gtk.FlowBoxChild()
                enfant.set_tooltip_text(chemin)
                enfant.add(boite)
                self.galerie.add(enfant)
                self.chemins_galerie[enfant] = chemin
                self.a_charger.append((image, chemin))
            self.galerie.show_all()
            GLib.idle_add(self.charger_miniature)
        choisi = next((enf for enf, ch in self.chemins_galerie.items() if ch == actuel), None)
        if choisi:
            self.galerie.select_child(choisi)
        else:
            self.galerie.unselect_all()

    def charger_miniature(self):
        """Une miniature par passage, pour ne pas figer l'ouverture de la fenêtre."""
        if self.a_charger:
            image, chemin = self.a_charger.pop(0)
            pix = miniature(chemin, 176, 99, 10)
            if pix:
                image.set_from_pixbuf(pix)
            else:
                image.set_from_icon_name("image-missing", Gtk.IconSize.DIALOG)
        return bool(self.a_charger)

    def maj_fond(self, e):
        self.remplir_galerie(e)
        self.alerte_anime.set_visible(e.fond_anime)

    def choisir_fond(self, chemin):
        # Clés existantes, plus celles qu'xfdesktop 4.20 lit : écran à son nom (xrandr) et un fond
        # par espace de travail. Sur un compte neuf, seules d'anciennes clés « monitor0 » existent.
        cles = {k for k in self.etat.bureau if k.endswith("/last-image")}
        try:
            sortie = subprocess.run(["xrandr", "--listmonitors"], capture_output=True, text=True).stdout
        except OSError:
            sortie = ""
        nb = entier(self.etat.xfwm4.get("/general/workspace_count"), 1)
        for nom in re.findall(r"^\s*\d+:.*\s(\S+)$", sortie, re.M):
            cles |= {f"/backdrop/screen0/monitor{nom}/workspace{n}/last-image" for n in range(nb)}
        for cle in sorted(cles):
            xfconf_regler("xfce4-desktop", cle, chemin)
        self.statut(f"Fond d'écran : {os.path.basename(chemin)}", "emblem-ok-symbolic")
        self.actualiser()

    def ajouter_fonds(self):
        """Copie les images choisies dans le dossier des fonds ; une seule image devient le fond."""
        fichiers, copies = self.choisir_copies("Ajouter des images", "Images", "image/*",
                                               GLib.UserDirectory.DIRECTORY_PICTURES, FONDS)
        if len(fichiers) == 1 and not copies:  # image déjà rangée dans le dossier
            self.choisir_fond(fichiers[0])
        elif copies:
            n, s = len(copies), "s" if len(copies) > 1 else ""
            self.lancer(f"Copie de {n} image{s} dans le dossier…", ["bash", "-c", script_copie(copies)],
                        fini=f"{n} image{s} ajoutée{s}",
                        apres=(lambda: self.choisir_fond(copies[0][1])) if len(fichiers) == 1 else None)

    def choisir_copies(self, titre, nom_filtre, mime, depart, cible):
        """Fichiers choisis, et (source, destination) de ceux à copier dans le dossier cible."""
        d = Gtk.FileChooserDialog(title=titre, transient_for=self,
                                  action=Gtk.FileChooserAction.OPEN, select_multiple=True)
        d.add_buttons("Annuler", Gtk.ResponseType.CANCEL, "Ajouter", Gtk.ResponseType.ACCEPT)
        filtre = Gtk.FileFilter()
        filtre.set_name(nom_filtre)
        filtre.add_mime_type(mime)
        d.add_filter(filtre)
        # Dossier Images ou Vidéos de l'utilisateur, quel que soit son nom (~/Images, ~/Pictures…)
        dossier = GLib.get_user_special_dir(depart)
        if dossier and os.path.isdir(dossier):
            d.set_current_folder(dossier)
        fichiers = d.get_filenames() if d.run() == Gtk.ResponseType.ACCEPT else []
        d.destroy()
        copies = []
        for source in fichiers:
            if os.path.dirname(os.path.realpath(source)) != os.path.realpath(cible):
                copies.append((source, destination_libre(cible, os.path.basename(source),
                                                         [dest for _, dest in copies])))
        return fichiers, copies

    # --- Page Fond animé

    def page_anime(self):
        b = self.page("anime", "Fond animé",
                      "Une vidéo en boucle, sans le son, à la place du fond d'écran, derrière les icônes du bureau.")
        self.switch_anime = self.interrupteur(self.regler_fond_anime)
        self.switch_anime_auto = self.interrupteur(lambda actif: self.lancer(
            "Réglage du démarrage automatique…", ["fond-anime", "auto", "on" if actif else "off"],
            fini="Fond animé lancé à chaque ouverture de session" if actif
            else "Fond animé plus lancé au démarrage"))
        self.switch_pause_auto = self.interrupteur(lambda actif: self.lancer(
            "Réglage de la pause automatique…", ["fond-anime", "pause-auto", "on" if actif else "off"],
            fini="Pause automatique activée" if actif else "Pause automatique désactivée"))
        self.ligne_anime = ligne("Fond animé", "", self.switch_anime)
        self.carte(b, self.ligne_anime,
                   ligne("Lancer à l'ouverture de session", None, self.switch_anime_auto),
                   ligne("Pause automatique",
                         "La vidéo s'arrête quand une fenêtre est en plein écran ou agrandie, quand l'écran "
                         "s'éteint ou que la session est verrouillée, et reprend dès que le bureau se revoit. "
                         "Économise le processeur, la carte graphique et la batterie.",
                         self.switch_pause_auto))

        # Aperçu de la vidéo choisie dans la liste
        self.apercu = Apercu(384, 216)
        self.nom_apercu = etiquette("", markup=True)
        self.infos_apercu = etiquette("", dim=True)
        self.badge_apercu = Gtk.Label(halign=Gtk.Align.START, no_show_all=True)
        self.badge_apercu.set_markup("<small><b>Vidéo du fond animé</b></small>")
        self.badge_apercu.get_style_context().add_class("badge")
        self.bouton_utiliser = bouton("Mettre en fond d'écran", lambda: self.utiliser_video(self.video_choisie),
                                      "suggested-action")
        self.bouton_retirer = Gtk.Button.new_from_icon_name("user-trash-symbolic", Gtk.IconSize.BUTTON)
        self.bouton_retirer.set_tooltip_text("Mettre cette vidéo à la corbeille")
        self.bouton_retirer.connect("clicked", lambda _b: self.retirer_video())
        actions = Gtk.Box(spacing=8, margin_top=8)
        actions.pack_start(self.bouton_utiliser, False, False, 0)
        actions.pack_start(self.bouton_retirer, False, False, 0)
        details = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        for w in (self.nom_apercu, self.infos_apercu, self.badge_apercu, actions):
            details.pack_start(w, False, False, 0)
        contenu = Gtk.Box(spacing=18, margin=14)
        contenu.pack_start(self.apercu, False, False, 0)
        contenu.pack_start(details, True, True, 0)
        self.carte(b, contenu)

        self.section(b, "Vidéos disponibles",
                     f"Rangées dans {abrege(VIDEOS_FOND)}. Un clic pour l'aperçu, "
                     "un double-clic pour la mettre en fond d'écran.")
        self.galerie_videos = Gtk.FlowBox(homogeneous=True, min_children_per_line=2, max_children_per_line=4,
                                          row_spacing=6, column_spacing=6, activate_on_single_click=False,
                                          selection_mode=Gtk.SelectionMode.SINGLE,
                                          margin_start=8, margin_end=8, margin_top=8, margin_bottom=8)
        self.galerie_videos.get_style_context().add_class("galerie")
        self.galerie_videos.connect("selected-children-changed", self.video_selectionnee)
        self.galerie_videos.connect("child-activated",
                                    lambda _g, enfant: self.utiliser_video(self.chemins_videos[enfant]))
        self.aucune_video = etiquette("Aucune vidéo pour l'instant : ajoute-en avec le bouton ci-dessous, "
                                      "ou copie-les dans le dossier.", dim=True)
        self.aucune_video.set_no_show_all(True)
        for cote in ("start", "end", "top", "bottom"):
            getattr(self.aucune_video, f"set_margin_{cote}")(16)
        liste = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        liste.pack_start(self.aucune_video, False, False, 0)
        liste.pack_start(self.galerie_videos, False, False, 0)
        boutons = Gtk.Box(spacing=8, margin_start=14, margin_end=14, margin_top=10, margin_bottom=10)
        boutons.pack_end(bouton("Ajouter des vidéos…", self.ajouter_videos), False, False, 0)
        boutons.pack_end(bouton("Ouvrir le dossier", lambda: self.detacher("xdg-open", VIDEOS_FOND)), False, False, 0)
        self.carte(b, liste, boutons)

        self.moniteur_videos = self.surveiller(VIDEOS_FOND)

    def maj_anime(self, e):
        self.switch_anime.set_active(e.fond_anime)
        self.switch_anime_auto.set_active(e.fond_anime_auto)
        self.switch_pause_auto.set_active(e.pause_auto)
        nom = os.path.basename(e.video) if e.video else ""
        par_dessus = e.pourquoi_par_dessus()
        if e.fond_anime:
            if e.fond_anime_bureau:
                texte = f"Lancé avec « {nom} » : icônes du bureau utilisables normalement."
            else:
                texte = f"Lancé avec « {nom} », par-dessus le bureau : icônes en lecture seule" + \
                    (f", car {par_dessus}." if par_dessus else ".")
            if e.video_en_pause:
                texte += " En pause tant que le bureau est caché."
        elif e.raison_fond_anime():
            texte = f"Indisponible. {e.raison_fond_anime()}"
        else:
            texte = f"Arrêté. À l'activation : « {nom} »." if nom else "Arrêté. Choisis une vidéo ci-dessous."
            if par_dessus:
                texte += f" Icônes du bureau en lecture seule pendant la vidéo, car {par_dessus}."
        if not e.programmes["ffmpeg"]:
            texte += ("" if texte.endswith(".") else ".") + \
                f" Sans ffmpeg, pas de miniatures ni de couleur de fond assortie : {a_installer(['ffmpeg'])}"
        self.ligne_anime.desc.set_text(texte)
        # Un fond animé qui tourne peut toujours être arrêté
        possible = e.fond_anime or not e.raison_fond_anime()
        self.switch_anime.set_sensitive(possible)
        self.switch_anime_auto.set_sensitive(possible or e.fond_anime_auto)
        self.remplir_videos(e)

    def remplir_videos(self, e):
        videos = list(e.videos)
        if e.video and os.path.isfile(e.video) and not any(meme_fichier(v, e.video) for v in videos):
            videos.insert(0, e.video)  # vidéo du fond animé rangée hors du dossier
        signature = [e.video]
        for v in videos:
            try:
                signature.append((v, os.path.getsize(v), os.path.getmtime(v)))
            except OSError:
                pass
        if signature != self.sig_videos:
            self.sig_videos = signature
            for enfant in self.galerie_videos.get_children():
                enfant.destroy()
            self.chemins_videos, taches = {}, []
            for chemin in videos:
                enfant, image, infos = self.vignette_video(chemin, meme_fichier(chemin, e.video))
                self.galerie_videos.add(enfant)
                self.chemins_videos[enfant] = chemin
                taches.append((chemin, image, infos))
            self.galerie_videos.show_all()
            self.preparer_videos(taches)
        # Garde la vidéo regardée ; sinon celle du fond animé, sinon la première
        if self.video_choisie not in videos:
            self.video_choisie = next((v for v in videos if meme_fichier(v, e.video)), videos[0] if videos else None)
        choisi = next((enf for enf, ch in self.chemins_videos.items() if ch == self.video_choisie), None)
        if choisi:
            self.galerie_videos.select_child(choisi)
        self.galerie_videos.set_visible(bool(videos))
        self.aucune_video.set_visible(not videos)
        self.maj_apercu()

    def vignette_video(self, chemin, actuelle):
        image = Gtk.Image()
        image.set_size_request(176, 99)
        superpose = Gtk.Overlay(halign=Gtk.Align.CENTER)
        superpose.add(image)
        if actuelle:
            badge = Gtk.Label(halign=Gtk.Align.START, valign=Gtk.Align.START, margin_start=6, margin_top=6)
            badge.set_markup("<small><b>Actuelle</b></small>")
            badge.get_style_context().add_class("badge")
            superpose.add_overlay(badge)
        nom = Gtk.Label(label=os.path.splitext(os.path.basename(chemin))[0],
                        ellipsize=Pango.EllipsizeMode.END, max_width_chars=22)
        infos = Gtk.Label(ellipsize=Pango.EllipsizeMode.END)
        infos.get_style_context().add_class("dim-label")
        boite = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        for w in (superpose, nom, infos):
            boite.pack_start(w, False, False, 0)
        enfant = Gtk.FlowBoxChild()
        enfant.set_tooltip_text(chemin)
        enfant.add(boite)
        return enfant, image, infos

    def preparer_videos(self, taches):
        """Miniature et infos de chaque vidéo (ffmpeg, ffprobe), une à la fois, gardées en cache."""
        self.a_preparer = list(taches)
        if not self.preparation_en_cours:
            self.preparer_suivante()

    def preparer_suivante(self):
        while self.a_preparer:
            chemin, image, infos = self.a_preparer.pop(0)
            try:
                st = os.stat(chemin)
            except OSError:
                continue
            cle = hashlib.sha1(f"{chemin}|{st.st_size}|{st.st_mtime_ns}".encode()).hexdigest()
            png, info = os.path.join(CACHE, cle + ".png"), os.path.join(CACHE, cle + ".json")
            if lire_json(info):
                self.video_prete(chemin, image, infos, png, info)
                continue
            script = ('ffmpeg -v error -y -i "$1" -vf "thumbnail=60,scale=352:-2" -frames:v 1 "$2"; '
                      'ffprobe -v error -select_streams v:0 -show_entries stream=width,height:format=duration '
                      '-of json "$1" > "$3"')
            try:
                os.makedirs(CACHE, exist_ok=True)
                proc = Gio.Subprocess.new(["bash", "-c", script, "bash", chemin, png, info],
                                          Gio.SubprocessFlags.STDOUT_SILENCE | Gio.SubprocessFlags.STDERR_SILENCE)
            except (GLib.Error, OSError):
                self.video_prete(chemin, image, infos, png, info)
                continue
            self.preparation_en_cours = True

            def fini(*_):
                self.preparation_en_cours = False
                self.video_prete(chemin, image, infos, png, info)
                self.preparer_suivante()
            proc.wait_async(None, fini)
            return

    def video_prete(self, chemin, image, infos, png, info):
        pix = miniature(png, 176, 99, 10) if os.path.isfile(png) else None
        if pix:
            image.set_from_pixbuf(pix)
        else:
            image.set_from_icon_name("video-x-generic", Gtk.IconSize.DIALOG)
        self.pngs_videos[chemin] = png if pix else None
        self.infos_videos[chemin] = description_video(chemin, lire_json(info))
        infos.set_text(self.infos_videos[chemin])
        if chemin == self.video_choisie:
            self.maj_apercu()

    def video_selectionnee(self, galerie):
        choisis = galerie.get_selected_children()
        if choisis and choisis[0] in self.chemins_videos:
            self.video_choisie = self.chemins_videos[choisis[0]]
            self.maj_apercu()

    def maj_apercu(self):
        e, chemin = self.etat, self.video_choisie
        dispo = bool(chemin) and os.path.isfile(chemin)
        en_fond = False
        if dispo:
            nom = os.path.splitext(os.path.basename(chemin))[0]
            self.nom_apercu.set_markup(f'<span size="large"><b>{GLib.markup_escape_text(nom)}</b></span>')
            self.infos_apercu.set_text(self.infos_videos.get(chemin, ""))
            actuelle = meme_fichier(chemin, e.video)
            en_fond = actuelle and e.fond_anime
            self.badge_apercu.set_visible(actuelle)
            png = self.pngs_videos.get(chemin)
            self.apercu.lire(chemin, miniature(png, 384, 216, 0) if png else None)
        else:
            self.nom_apercu.set_markup("<b>Aucune vidéo</b>")
            self.infos_apercu.set_text("Choisis une vidéo dans la liste pour la voir ici.")
            self.badge_apercu.hide()
            self.apercu.lire(None)
        self.bouton_utiliser.set_label("Déjà en fond d'écran" if en_fond else "Mettre en fond d'écran")
        self.bouton_utiliser.set_sensitive(dispo and not en_fond and not e.raison_fond_anime())
        self.bouton_utiliser.set_tooltip_text(e.raison_fond_anime())
        # Seules les vidéos du dossier peuvent partir à la corbeille depuis ici
        self.bouton_retirer.set_sensitive(
            dispo and os.path.dirname(os.path.realpath(chemin)) == os.path.realpath(VIDEOS_FOND))

    def utiliser_video(self, chemin):
        if chemin and self.etat.raison_fond_anime():  # double-clic dans la liste
            self.erreur("Fond animé indisponible", self.etat.raison_fond_anime())
        elif chemin:
            self.lancer("Lancement du fond animé…", ["fond-anime", chemin],
                        fini=f"Fond animé : {os.path.basename(chemin)}")

    def regler_fond_anime(self, actif):
        if not actif:
            self.lancer("Arrêt du fond animé…", ["fond-anime", "stop"], fini="Fond animé arrêté")
        elif self.etat.video and os.path.isfile(self.etat.video):
            self.lancer("Lancement du fond animé…", ["fond-anime"],
                        fini=f"Fond animé : {os.path.basename(self.etat.video)}")
        elif self.video_choisie:
            self.utiliser_video(self.video_choisie)
        else:
            self.erreur("Aucune vidéo à lancer", "Ajoute d'abord une vidéo dans le dossier des fonds animés.")
            self.actualiser()

    def retirer_video(self):
        chemin = self.video_choisie
        if not chemin:
            return
        details = "Tu pourras la récupérer depuis la corbeille."
        if meme_fichier(chemin, self.etat.video):
            details = "C'est la vidéo du fond animé : choisis-en une autre pour le prochain lancement. " + details
        if not self.confirmer(f"Mettre « {os.path.basename(chemin)} » à la corbeille ?", details,
                              "Mettre à la corbeille"):
            return
        try:
            Gio.File.new_for_path(chemin).trash(None)
        except GLib.Error as err:
            self.erreur(f"Impossible de retirer « {os.path.basename(chemin)} »", err.message)
            return
        self.video_choisie = None
        self.statut(f"« {os.path.basename(chemin)} » mise à la corbeille", "user-trash-symbolic")
        self.actualiser()

    def ajouter_videos(self):
        _, copies = self.choisir_copies("Ajouter des vidéos", "Vidéos", "video/*",
                                        GLib.UserDirectory.DIRECTORY_VIDEOS, VIDEOS_FOND)
        if not copies:
            return
        n, s = len(copies), "s" if len(copies) > 1 else ""
        self.lancer(f"Copie de {n} vidéo{s} dans le dossier…", ["bash", "-c", script_copie(copies)],
                    fini=f"{n} vidéo{s} ajoutée{s}", apres=lambda: setattr(self, "video_choisie", copies[-1][1]))

    # --- Page Fenêtres et effets

    def page_fenetres(self):
        b = self.page("fenetres", "Fenêtres et effets",
                      "Le gestionnaire de fenêtres choisi est gardé au prochain démarrage.")
        self.radio_xfwm4, l_xfwm4 = self.choix_wm(
            None, "xfwm4", "xfwm4 + picom",
            "Gestionnaire d'XFCE : glissement vers le dock à la réduction, coins arrondis, Alt+Tab stylisé.")
        self.radio_compiz, l_compiz = self.choix_wm(
            self.radio_xfwm4, "compiz", "Compiz", "Effet Génie (Magic Lamp) quand on réduit une fenêtre.")
        self.carte(b, l_xfwm4, l_compiz)

        self.section(b, "Effets", "Avec xfwm4 uniquement.")
        self.switch_picom = self.interrupteur(self.regler_picom)

        def effet(messages, changement):
            return self.interrupteur(lambda actif: self.modifier_picom(
                lambda conf: changement(conf, actif), messages[0] if actif else messages[1]))
        self.switch_animations = effet(("Animations activées", "Animations désactivées"),
                                       lambda c, a: c.regler_animations(a))
        self.switch_ombres = effet(("Ombres activées", "Ombres désactivées"),
                                   lambda c, a: c.regler("shadow", "true" if a else "false"))
        self.switch_fondu = effet(("Fondu activé", "Fondu désactivé"),
                                  lambda c, a: c.regler("fading", "true" if a else "false"))
        self.arrondi = Gtk.SpinButton.new_with_range(0, 30, 1)
        self.arrondi.connect("value-changed", lambda w: None if self.maj else self.plus_tard(
            "arrondi", 600, lambda: self.modifier_picom(
                lambda c: c.regler("corner-radius", w.get_value_as_int()),
                f"Arrondi des coins : {w.get_value_as_int()} px")))
        self.switch_alttab = self.interrupteur(self.regler_alttab)

        self.ligne_animations = ligne("Animations", "Glissement vers le dock à la réduction, zoom à l'ouverture "
                                                    "et à la fermeture.", self.switch_animations)
        self.ligne_ombres = ligne("Ombres des fenêtres", None, self.switch_ombres)
        self.ligne_fondu = ligne("Fondu des menus et bulles", None, self.switch_fondu)
        self.ligne_arrondi = ligne("Arrondi des coins", "En pixels, 0 pour des coins droits.", self.arrondi)
        self.ligne_alttab = ligne("Alt+Tab stylisé", "", self.switch_alttab)
        self.ligne_picom = ligne("Picom", "", self.switch_picom)
        self.carte_effets = self.carte(
            b, self.ligne_picom, self.ligne_animations, self.ligne_ombres, self.ligne_fondu, self.ligne_arrondi, self.ligne_alttab)

        self.section(b, "Compiz", "Avec Compiz uniquement.")
        self.ligne_ccsm = ligne("Réglages avancés", "", bouton("Ouvrir", lambda: self.detacher("ccsm")))
        self.carte_compiz = self.carte(
            b,
            ligne("Barre de titre", "Recale la décoration de Compiz sur le thème, les boutons et la police "
                                    "d'xfwm4.",
                  bouton("Recaler", lambda: self.lancer("Mise à jour de la barre de titre…", ["bureau-wm", "theme"],
                                                        fini="Barre de titre recalée sur le thème"))),
            self.ligne_ccsm)

    def choix_wm(self, groupe, mode, titre, description):
        radio = Gtk.RadioButton.new_from_widget(groupe)
        textes = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2, margin_start=6)
        textes.pack_start(etiquette(f"<b>{titre}</b>", markup=True), False, False, 0)
        radio.desc = etiquette(description, dim=True)
        radio.description = description  # remise quand le programme manquant est installé
        textes.pack_start(radio.desc, False, False, 0)
        radio.add(textes)
        radio.connect("toggled", self.radio_wm, mode, titre)
        boite = Gtk.Box(margin_start=16, margin_end=16, margin_top=12, margin_bottom=12)
        boite.pack_start(radio, True, True, 0)
        return radio, boite

    def radio_wm(self, radio, mode, titre):
        if radio.get_active() and not self.maj:
            self.lancer(f"Passage à {titre}…", ["bureau-wm", mode])

    def maj_fenetres(self, e):
        compiz = e.mode == "compiz"
        (self.radio_compiz if compiz else self.radio_xfwm4).set_active(True)
        for radio, programmes in ((self.radio_xfwm4, ("xfwm4",)), (self.radio_compiz, COMPIZ)):
            manque = e.manquants(*programmes)
            radio.set_sensitive(not manque or radio.get_active())
            radio.desc.set_text(f"Pas installé : {a_installer(manque)}" if manque else radio.description)
        self.carte_effets.set_sensitive(not compiz)
        self.carte_compiz.set_sensitive(compiz)
        self.ligne_ccsm.set_sensitive(e.programmes["ccsm"])
        self.ligne_ccsm.desc.set_text("Effets, durées et raccourcis de Compiz (ccsm)." if e.programmes["ccsm"]
                                      else f"Pas installé : {a_installer(['ccsm'])}")
        conf = e.picom
        self.switch_picom.set_active(e.picom_actif)
        # picom arrêté et pas installé : rien à allumer (s'il tourne encore, on peut l'arrêter)
        self.ligne_picom.set_sensitive(e.programmes["picom"] or e.picom_en_cours)
        self.ligne_picom.desc.set_text(
            "Compositeur qui dessine ombres, coins arrondis et animations. Désactivé, xfwm4 reprend "
            "son compositeur intégré." if e.programmes["picom"]
            else f"Pas installé : xfwm4 garde son compositeur intégré. {a_installer(['picom'])}")
        self.switch_animations.set_active(bool(conf.animations()))
        self.switch_ombres.set_active(conf.valeur("shadow") == "true")
        self.switch_fondu.set_active(conf.valeur("fading") == "true")
        self.arrondi.set_value(entier(conf.valeur("corner-radius"), 0))
        self.ligne_animations.set_sensitive(e.picom_actif and conf.animations() is not None)
        for l in (self.ligne_ombres, self.ligne_fondu, self.ligne_arrondi):
            l.set_sensitive(e.picom_actif and bool(conf.texte))
        self.switch_alttab.set_active(e.alttab)
        self.ligne_alttab.desc.set_text(
            f"Sélecteur de fenêtres aux couleurs du profil ({abrege(ALTTAB_CSS)})." if e.alttab_dispo else
            f"Ton {abrege(ALTTAB_CSS)} a déjà son propre style : celui du projet n'y est pas mis.")
        self.ligne_alttab.set_sensitive(e.alttab_dispo)

    def regler_picom(self, actif):
        autostart_regler("picom", actif)
        if actif:
            self.lancer("Démarrage de picom…", ["bash", "-c", PICOM_ON],
                        fini="Picom activé (aussi au prochain démarrage)")
        else:
            self.lancer("Arrêt de picom…", ["bash", "-c", PICOM_OFF],
                        fini="Picom désactivé : xfwm4 reprend son compositeur intégré")

    def modifier_picom(self, changement, message):
        conf = ConfigPicom()
        if not conf.texte:
            self.erreur("Configuration de picom introuvable", PICOM_CONF)
            self.actualiser()
            return
        changement(conf)
        try:
            conf.enregistrer()
        except OSError as err:
            self.erreur("Impossible d'enregistrer la configuration de picom", str(err))
            return
        if self.etat.picom_en_cours:
            # picom relit sa configuration en redémarrant ; relancer-picom remet ensuite le panneau
            self.lancer("Application du réglage de picom…", ["relancer-picom"], fini=message)
            return
        self.statut(message, "emblem-ok-symbolic")
        self.actualiser()

    def regler_alttab(self, actif):
        try:
            if actif and not os.path.exists(ALTTAB_CSS):
                os.rename(ALTTAB_OFF, ALTTAB_CSS)
            elif not actif and os.path.exists(ALTTAB_CSS):
                os.replace(ALTTAB_CSS, ALTTAB_OFF)
        except OSError as err:
            self.erreur("Impossible de changer le style du Alt+Tab", str(err))
            self.actualiser()
            return
        self.lancer("Relance de xfwm4…", ["bash", "-c", RELANCE_XFWM4],
                    fini="Alt+Tab stylisé activé" if actif else "Alt+Tab d'origine remis")

    # --- Page Écran de connexion

    def page_connexion(self):
        b = self.page("connexion", "Écran de connexion",
                      "Style de la fenêtre de connexion LightDM. Chaque changement demande ton mot de passe "
                      "(droits administrateur).")
        self.switch_greeter = self.interrupteur(self.regler_greeter)
        self.ligne_greeter = ligne("Style Catppuccin Mocha", "", self.switch_greeter)
        self.ligne_verrou = ligne("Aperçu", "", bouton("Verrouiller", lambda: self.detacher("dm-tool", "lock")))
        self.carte(b, self.ligne_greeter, self.ligne_verrou)

    def maj_connexion(self, e):
        manque = e.manquants(*GREETER)
        # Gestionnaire de connexion choisi sur ce système (gdm3, sddm… ne lisent pas ce style)
        dm = os.path.basename(lire("/etc/X11/default-display-manager").strip())
        autre_dm = dm not in ("", "lightdm")
        dispo = os.path.isfile(GREETER_SCRIPT) and not manque and (not autre_dm or e.greeter)
        self.switch_greeter.set_active(e.greeter)
        self.ligne_greeter.set_sensitive(dispo)
        if not os.path.isfile(GREETER_SCRIPT):
            texte = f"Script introuvable : {GREETER_SCRIPT}"
        elif autre_dm and not e.greeter:
            texte = f"L'écran de connexion de ce système est {dm}, pas LightDM : ce style ne s'y applique pas."
        elif manque:
            texte = f"Le style s'applique à l'écran de connexion LightDM (lightdm-gtk-greeter). {a_installer(manque)}"
        else:
            elements, paquets = rendu_greeter(e.greeter)
            if e.greeter:
                texte = f"Activé : fenêtre arrondie à bordure mauve, {', '.join(elements)}."
            else:
                texte = f"Désactivé : style d'origine. À l'activation : {', '.join(elements)}."
            if paquets:
                texte += (f" Pour le rendu complet : {a_installer(paquets)}"
                          + (", puis désactive et réactive le style." if e.greeter else "."))
        self.ligne_greeter.desc.set_text(texte)
        self.ligne_verrou.set_sensitive(e.programmes["dm-tool"])
        self.ligne_verrou.desc.set_text("Verrouille la session pour afficher l'écran de connexion."
                                        if e.programmes["dm-tool"] else
                                        "Demande LightDM (commande dm-tool) comme écran de connexion.")

    def regler_greeter(self, actif):
        self.lancer("Écran de connexion : en attente du mot de passe…",
                    ["pkexec", GREETER_SCRIPT] + ([] if actif else ["restore"]),
                    fini="Écran de connexion : style Catppuccin appliqué" if actif
                    else "Écran de connexion : style d'origine remis")

    # --- Page Outils

    def page_outils(self):
        b = self.page("outils", "Outils", "Pour remettre le bureau d'aplomb si quelque chose s'affiche mal.")
        self.ligne_relance_picom = ligne(
            "Relancer picom", "Si les animations ou les ombres ne s'affichent plus.",
            bouton("Relancer", lambda: self.lancer("Relance de picom…", ["bash", "-c", RELANCE_PICOM],
                                                   fini="Picom relancé")))
        self.carte(b,
                   ligne("Relancer les panneaux", "Si le dock est mal placé ou n'affiche plus ses lanceurs.",
                         bouton("Relancer", lambda: self.lancer("Relance des panneaux…", ["bash", "-c", RELANCE_PANNEAU],
                                                                fini="Panneaux relancés"))),
                   ligne("Relancer le gestionnaire de fenêtres", "xfwm4 ou Compiz, selon le mode choisi.",
                         bouton("Relancer", self.relancer_wm)),
                   self.ligne_relance_picom)
        self.ligne_memo = ligne("Mémo des commandes", MEMO, bouton("Ouvrir", lambda: self.detacher("xdg-open", MEMO)))
        self.ligne_param_xfce = ligne("Paramètres d'apparence d'XFCE", "Tous les réglages d'origine d'XFCE.",
                                      bouton("Ouvrir", lambda: self.detacher("xfce4-appearance-settings")))
        # Le mémo n'existe que dans le dossier de développement : ni publié, ni dans le paquet
        self.carte(b, self.ligne_param_xfce, *([self.ligne_memo] if os.path.isfile(MEMO) else []))

    def maj_outils(self, e):
        self.ligne_relance_picom.set_sensitive(e.mode != "compiz" and e.picom_actif)
        self.ligne_param_xfce.set_sensitive(e.programmes["xfce4-appearance-settings"])
        self.ligne_memo.set_sensitive(os.path.isfile(MEMO))

    def relancer_wm(self):
        if self.etat.mode == "compiz":
            self.lancer("Relance de Compiz…", ["bureau-wm", "compiz"], fini="Compiz relancé")
        else:
            self.lancer("Relance de xfwm4…", ["bash", "-c", RELANCE_XFWM4], fini="xfwm4 relancé")

    # --- État, commandes et messages

    def installer_modeles(self):
        """Réglages de départ du projet qui manquent (premier lancement) : rien n'est écrasé."""
        try:
            r = subprocess.run([MODELES], capture_output=True, text=True, timeout=10)
        except (OSError, subprocess.TimeoutExpired):
            return
        ajouts = [l for l in r.stdout.splitlines() if l.startswith("Ajouté")]
        if ajouts:
            n = len(ajouts)
            self.statut(f"{n} réglage{'s' if n > 1 else ''} de départ mis en place : "
                        + ", ".join(os.path.basename(l.split(": ", 1)[-1]) for l in ajouts),
                        "emblem-ok-symbolic")

    def actualiser(self):
        """Relit la configuration du bureau et la recopie dans les widgets."""
        if self.travail:
            return
        e = self.etat = Etat()
        self.maj = True
        try:
            self.remplir_profils(e)
            self.maj_apparence(e)
            self.maj_fond(e)
            self.maj_anime(e)
            self.maj_fenetres(e)
            self.maj_connexion(e)
            self.maj_outils(e)
        finally:
            self.maj = False
        self.derniere_maj = time.monotonic()
        if "statut" not in self.minuteurs:
            self.statut_repos()

    def au_retour(self, *_):
        # Réglages changés ailleurs (terminal, paramètres d'XFCE) pendant que la fenêtre était en arrière-plan
        if self.is_active() and time.monotonic() - self.derniere_maj > 2:
            self.actualiser()

    def lancer(self, message, argv, fini=None, apres=None, details=False):
        """Exécute une commande sans figer la fenêtre, puis relit l'état du bureau. details : en cas
        de réussite, tout ce que la commande a écrit est montré dans une fenêtre."""
        try:
            proc = Gio.Subprocess.new(argv, Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_MERGE)
        except GLib.Error as err:
            self.erreur(f"Impossible de lancer {argv[0]}", err.message)
            self.actualiser()
            return
        self.occupe(True, message)

        def termine(p, resultat):
            try:
                _, sortie, _ = p.communicate_finish(resultat)
                texte = sortie.get_data().decode(errors="replace").strip() if sortie else ""
            except GLib.Error as err:
                texte = err.message
            code = p.get_exit_status() if p.get_if_exited() else -1
            self.occupe(False)
            if code == 0:
                self.statut(fini or (texte.splitlines() or ["Terminé"])[-1], "emblem-ok-symbolic")
                if details and texte:
                    self.information(texte.splitlines()[-1], "\n".join(texte.splitlines()[:-1]))
                if apres:
                    apres()
            elif argv[0] == "pkexec" and code in (126, 127):
                self.statut("Mot de passe non validé : rien n'a changé", "dialog-information-symbolic")
            else:
                titre = message.rstrip("…") + " : échec"
                self.statut(titre, "dialog-error-symbolic")
                self.erreur(titre, texte or f"Code de sortie : {code}")
            self.actualiser()

        proc.communicate_async(None, None, termine)

    def detacher(self, *cmd):
        """Lance un programme qui continue de tourner indépendamment de la fenêtre."""
        try:
            GLib.spawn_async(list(cmd), flags=GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.STDOUT_TO_DEV_NULL
                             | GLib.SpawnFlags.STDERR_TO_DEV_NULL)
        except GLib.Error as err:
            self.erreur(f"Impossible de lancer {cmd[0]}", err.message)

    def occupe(self, oui, message=""):
        self.travail = oui
        self.pile.set_sensitive(not oui)
        if oui:
            self.annuler_minuteur("statut")
            self.icone_statut.hide()
            self.texte_statut.set_text(message)
            self.spinner.show()
            self.spinner.start()
        else:
            self.spinner.stop()
            self.spinner.hide()

    def statut(self, texte, icone=None):
        """Message temporaire en bas de la fenêtre."""
        if icone:
            self.icone_statut.set_from_icon_name(icone, Gtk.IconSize.MENU)
        self.icone_statut.set_visible(bool(icone))
        self.texte_statut.set_text(texte)
        self.plus_tard("statut", 8000, self.statut_repos)

    def statut_repos(self):
        e = self.etat
        if not e or self.travail:
            return
        fenetres = "Compiz" if e.mode == "compiz" else "xfwm4 + picom" if e.picom_actif else "xfwm4"
        profil = e.profil_actif or "aucun (apparence modifiée)"
        self.icone_statut.hide()
        self.texte_statut.set_text(f"Profil actif : {profil}    ·    Fenêtres : {fenetres}")

    def plus_tard(self, cle, delai_ms, action):
        """Lance action après delai_ms ; un nouvel appel avec la même clé repousse le délai."""
        self.annuler_minuteur(cle)

        def declencher():
            self.minuteurs.pop(cle, None)
            action()
            return False
        self.minuteurs[cle] = GLib.timeout_add(delai_ms, declencher)

    def annuler_minuteur(self, cle):
        if cle in self.minuteurs:
            GLib.source_remove(self.minuteurs.pop(cle))

    def confirmer(self, question, details, action):
        d = Gtk.MessageDialog(transient_for=self, modal=True, message_type=Gtk.MessageType.QUESTION, text=question)
        d.format_secondary_text(details)
        d.add_buttons("Annuler", Gtk.ResponseType.CANCEL, action, Gtk.ResponseType.OK)
        d.set_default_response(Gtk.ResponseType.OK)
        reponse = d.run()
        d.destroy()
        return reponse == Gtk.ResponseType.OK

    def information(self, titre, details=""):
        d = Gtk.MessageDialog(transient_for=self, modal=True, message_type=Gtk.MessageType.INFO,
                              buttons=Gtk.ButtonsType.CLOSE, text=titre)
        if details:
            d.format_secondary_text("\n".join(details.strip().splitlines()[-25:]))
        d.run()
        d.destroy()

    def erreur(self, titre, details=""):
        d = Gtk.MessageDialog(transient_for=self, modal=True, message_type=Gtk.MessageType.ERROR,
                              buttons=Gtk.ButtonsType.CLOSE, text=titre)
        if details:
            d.format_secondary_text("\n".join(details.strip().splitlines()[-15:]))
        d.run()
        d.destroy()


class Appli(Gtk.Application):

    def __init__(self):
        super().__init__(application_id="fr.bureau.Reglages")
        self.fenetre = None

    def do_activate(self):
        if self.fenetre is None:
            self.fenetre = Fenetre(self)
        self.fenetre.present()


if __name__ == "__main__":
    GLib.set_prgname("bureau-reglages")
    GLib.set_application_name("Personnalisation du bureau")
    raise SystemExit(Appli().run(None))
