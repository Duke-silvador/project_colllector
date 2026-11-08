#!/bin/bash
# Applique le style Catppuccin Mocha à l'écran de connexion LightDM (lightdm-gtk-greeter).
# Usage : sudo ./greeter-catppuccin.sh          -> installe
#         sudo ./greeter-catppuccin.sh restore  -> remet la config d'origine
#
# Marche sur n'importe quel Debian avec lightdm-gtk-greeter. Chaque élément est pris là où il
# est installé pour tout le système, sinon copié depuis le dossier personnel (le greeter tourne
# sous l'utilisateur lightdm, qui ne peut pas lire ~), sinon remplacé :
#   thème GTK Catppuccin           -> base Adwaita sombre, intégrée à GTK
#   icônes Papirus-Dark            -> Adwaita (paquet Debian : papirus-icon-theme)
#   curseurs Catppuccin            -> curseurs par défaut
#   image catppuccin-mocha.png     -> fond uni #1e1e2e (image cherchée dans fonds/ de l'interface)
#   police Inter                   -> police par défaut (paquet Debian : fonts-inter)
#
# Tests : RACINE=/un/dossier ./greeter-catppuccin.sh écrit sous ce dossier au lieu de /,
# sans être root, avec $HOME comme dossier personnel.
set -e

RACINE="${RACINE:-}"
U_HOME=""
if [ -n "$RACINE" ]; then
    U_HOME=$HOME
else
    [ "$(id -u)" -eq 0 ] || { echo "Lance ce script avec sudo."; exit 1; }
    # Utilisateur qui a lancé sudo (terminal) ou pkexec (bureau-reglages) ; sans lui, seuls
    # les éléments installés pour tout le système sont utilisés
    U_NAME=${SUDO_USER:-}
    [ -z "$U_NAME" ] && [ -n "${PKEXEC_UID:-}" ] && U_NAME=$(id -nu "$PKEXEC_UID")
    [ -z "$U_NAME" ] || U_HOME=$(getent passwd "$U_NAME" | cut -d: -f6)
fi
CONF=$RACINE/etc/lightdm/lightdm-gtk-greeter.conf
BACKUP=$CONF.avant-catppuccin

GTK_THEME=catppuccin-mocha-mauve-standard+default
GREETER_THEME=Catppuccin-Mocha-Greeter
CURSORS=catppuccin-mocha-dark-cursors
WALL=/usr/share/backgrounds/catppuccin/catppuccin-mocha.png

if [ "${1:-}" = "restore" ]; then
    if [ -f "$BACKUP" ]; then
        cp "$BACKUP" "$CONF" && echo "Config d'origine restaurée."
    else
        echo "Pas de sauvegarde ${BACKUP#"$RACINE"} : rien à restaurer."
    fi
    exit 0
fi

if [ -z "$RACINE" ] && [ ! -x /usr/sbin/lightdm-gtk-greeter ]; then
    echo "lightdm-gtk-greeter n'est pas installé. Lance : sudo apt install lightdm-gtk-greeter" >&2
    exit 1
fi

REMPLACES=()  # éléments introuvables, rappelés à la fin

# Dossier d'un thème (TYPE : themes ou icons) lisible par le greeter : installé pour tout le
# système, sinon copié depuis le dossier personnel. Affiche son chemin ; échoue s'il est introuvable.
trouver() {
    local type=$1 nom=$2 d
    for d in "/usr/local/share/$type" "/usr/share/$type"; do
        [ -d "$RACINE$d/$nom" ] && { echo "$d/$nom"; return 0; }
    done
    [ -n "$U_HOME" ] || return 1
    for d in "$U_HOME/.local/share/$type" "$U_HOME/.$type"; do
        [ -d "$d/$nom" ] || continue
        local note=""
        case $nom in Papirus*) note=" (~1 Go, patience)" ;; esac
        echo "Copie de $nom depuis ${d/#"$U_HOME"/\~}$note…" >&2
        mkdir -p "$RACINE/usr/share/$type" || return 1
        cp -a "$d/$nom" "$RACINE/usr/share/$type/" || return 1
        if [ -z "$RACINE" ]; then chown -R root:root "/usr/share/$type/$nom" || return 1; fi
        chmod -R a+rX "$RACINE/usr/share/$type/$nom" || return 1
        echo "/usr/share/$type/$nom"
        return 0
    done
    return 1
}

# 1. Thème GTK de base, icônes, curseurs, fond d'écran et police
if BASE=$(trouver themes "$GTK_THEME"); then
    IMPORT="@import url(\"$BASE/gtk-3.0/gtk.css\");"
else
    BASE=""
    IMPORT='@import url("resource:///org/gtk/libgtk/theme/Adwaita/gtk-contained-dark.css");'
    REMPLACES+=("thème GTK Catppuccin : base Adwaita sombre")
fi

# Papirus-Dark hérite de Papirus : il faut les deux
if trouver icons Papirus-Dark >/dev/null && trouver icons Papirus >/dev/null; then
    ICONES=Papirus-Dark
else
    ICONES=Adwaita
    REMPLACES+=("icônes Papirus : Adwaita (sudo apt install papirus-icon-theme)")
fi

if trouver icons "$CURSORS" >/dev/null; then
    CURSEUR=$CURSORS
else
    CURSEUR=""
    REMPLACES+=("curseurs Catppuccin : curseurs par défaut")
fi

# Image prise dans le dossier des fonds de l'interface : fonds/ du projet, ou
# ~/.local/share/bureau-reglages/fonds/ si le projet est installé en lecture seule ;
# l'ancien emplacement en secours, puis l'image copiée lors d'un passage précédent
ICI=$(dirname "$(realpath "$0")")
SOURCES=("$ICI/fonds")
[ -z "$U_HOME" ] || SOURCES+=("$U_HOME/.local/share/bureau-reglages/fonds" "$U_HOME/Pictures/Wallpapers")
for d in "${SOURCES[@]}"; do
    if [ -f "$d/catppuccin-mocha.png" ]; then
        mkdir -p "$RACINE$(dirname "$WALL")"
        cp "$d/catppuccin-mocha.png" "$RACINE$WALL"
        chmod a+rX "$RACINE$(dirname "$WALL")" "$RACINE$WALL"
        break
    fi
done
if [ -f "$RACINE$WALL" ]; then
    FOND=$WALL
else
    FOND="#1e1e2e"  # « base » de Catppuccin Mocha
    REMPLACES+=("image catppuccin-mocha.png : fond uni")
fi

# Le greeter ne voit que les polices installées pour tout le système
fc-list :family=Inter file 2>/dev/null | grep -q . ||
    REMPLACES+=("police Inter : police par défaut (sudo apt install fonts-inter)")

# 2. Thème dédié au greeter : la base + les retouches de la fenêtre de connexion
DOSSIER_GREETER=$RACINE/usr/share/themes/$GREETER_THEME
mkdir -p "$DOSSIER_GREETER/gtk-3.0"
cat > "$DOSSIER_GREETER/index.theme" <<EOF
[Desktop Entry]
Type=X-GNOME-Metatheme
Name=$GREETER_THEME
Comment=Catppuccin Mocha pour lightdm-gtk-greeter

[X-GNOME-Metatheme]
GtkTheme=$GREETER_THEME
IconTheme=$ICONES
EOF
[ -z "$CURSEUR" ] || echo "CursorTheme=$CURSEUR" >> "$DOSSIER_GREETER/index.theme"

{
    echo "$IMPORT"
    echo
    cat <<'EOF'
/* Palette Catppuccin Mocha */
@define-color ctp_base     #1e1e2e;
@define-color ctp_mantle   #181825;
@define-color ctp_crust    #11111b;
@define-color ctp_surface0 #313244;
@define-color ctp_surface1 #45475a;
@define-color ctp_text     #cdd6f4;
@define-color ctp_subtext  #a6adc8;
@define-color ctp_mauve    #cba6f7;
@define-color ctp_red      #f38ba8;

* { font-family: "Inter"; }

/* Barre du haut (horloge, session, langue, alimentation) */
#panel_window {
    background-color: alpha(@ctp_crust, 0.75);
    color: @ctp_text;
    border-bottom: 1px solid alpha(@ctp_mauve, 0.25);
}
#panel_window menubar,
#panel_window menubar > menuitem {
    background: transparent;
    color: @ctp_text;
    padding: 2px 6px;
}
#panel_window menubar > menuitem:hover {
    background-color: alpha(@ctp_mauve, 0.2);
    border-radius: 8px;
}
#clock_label { color: @ctp_text; font-weight: 600; }

/* Fenêtre de connexion */
#login_window,
#power_window {
    background-color: alpha(@ctp_base, 0.92);
    color: @ctp_text;
    border: 2px solid alpha(@ctp_mauve, 0.6);
    border-radius: 18px;
    box-shadow: 0 10px 40px alpha(@ctp_crust, 0.8);
}
#login_window #content_frame,
#login_window #buttonbox_frame {
    background: transparent;
    border: none;
    padding: 0;
}
/* Espace sous l'avatar pour que les boutons ne le chevauchent pas */
#login_window #content_frame { padding: 6px 16px 22px 16px; }
#login_window #buttonbox_frame { padding: 10px 24px 22px 24px; }
#login_window #buttonbox_frame button { margin-left: 8px; }
#login_window #greeter_infobar { border-radius: 10px; }

#login_window label { color: @ctp_text; }
#login_window #message_label { color: @ctp_subtext; }

/* Avatar */
#login_window #user_image_border {
    background: transparent;
    border: 2px solid @ctp_mauve;
    border-radius: 50%;
    padding: 0;
    margin-bottom: 6px;
}

/* Liste des utilisateurs et champ mot de passe */
#login_window combobox button,
#login_window entry {
    background-color: @ctp_surface0;
    color: @ctp_text;
    border: 1px solid @ctp_surface1;
    border-radius: 10px;
    min-height: 34px;
    padding: 0 10px;
    box-shadow: none;
}
#login_window entry:focus {
    border-color: @ctp_mauve;
    box-shadow: 0 0 0 2px alpha(@ctp_mauve, 0.3);
}

/* Bouton « Se connecter » */
#login_window #login_button {
    background-image: none;
    background-color: @ctp_mauve;
    color: @ctp_crust;
    font-weight: 700;
    border: none;
    border-radius: 10px;
    min-height: 34px;
    padding: 0 18px;
}
#login_window #login_button:hover { background-color: shade(@ctp_mauve, 1.1); }

#login_window #cancel_button,
#power_window #cancel_button {
    background-image: none;
    background-color: @ctp_surface0;
    color: @ctp_text;
    border-radius: 10px;
}

/* Fenêtre Redémarrer / Éteindre */
#power_window label { color: @ctp_text; }
#power_window #power_ok_button {
    background-image: none;
    background-color: @ctp_red;
    color: @ctp_crust;
    font-weight: 700;
    border: none;
    border-radius: 10px;
}
EOF
    # Sans le thème Catppuccin, la base Adwaita garde ses menus gris : on les recolore
    [ -n "$BASE" ] || cat <<'EOF'

/* Base Adwaita sombre : menus, listes déroulantes et bulles aux couleurs Catppuccin */
menu, .menu, .context-menu {
    background-color: @ctp_mantle;
    color: @ctp_text;
    border: 1px solid @ctp_surface0;
}
menu menuitem:hover, .menu menuitem:hover {
    background-color: alpha(@ctp_mauve, 0.25);
    color: @ctp_text;
}
#login_window combobox button:hover { background-color: @ctp_surface1; }
tooltip, tooltip * { background-color: @ctp_crust; color: @ctp_text; }
EOF
} > "$DOSSIER_GREETER/gtk-3.0/gtk.css"
chmod -R a+rX "$DOSSIER_GREETER"

# 3. Configuration du greeter (sauvegarde de l'original une seule fois)
mkdir -p "$(dirname "$CONF")"
if [ ! -f "$BACKUP" ] && [ -f "$CONF" ]; then cp "$CONF" "$BACKUP"; fi
cat > "$CONF" <<EOF
# Style Catppuccin Mocha — généré par greeter-catppuccin.sh
# Original : ${BACKUP#"$RACINE"}
[greeter]
background=$FOND
user-background=false
theme-name=$GREETER_THEME
icon-theme-name=$ICONES
EOF
[ -z "$CURSEUR" ] || printf 'cursor-theme-name=%s\ncursor-theme-size=24\n' "$CURSEUR" >> "$CONF"
cat >> "$CONF" <<EOF
font-name=Inter 11
xft-antialias=true
xft-hintstyle=hintslight
xft-rgba=rgb
indicators=~host;~spacer;~clock;~spacer;~session;~language;~a11y;~power
clock-format=%A %d %B   %H:%M
position=50%,center 50%,center
round-user-image=true
EOF

echo
echo "Écran de connexion configuré en Catppuccin Mocha."
if [ ${#REMPLACES[@]} -gt 0 ]; then
    echo "Remplacé, faute d'être installé :"
    printf '  - %s\n' "${REMPLACES[@]}"
fi
echo "Aperçu sans redémarrer : verrouille ta session (Ctrl+Alt+Suppr ou xflock4) ou déconnecte-toi."
