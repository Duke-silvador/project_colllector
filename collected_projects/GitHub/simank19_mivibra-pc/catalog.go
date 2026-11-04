package main

import "strings"

// Catálogo en línea: programas comunes que se instalan con winget (gestor oficial de Windows).
type CatalogItem struct {
	WingetID string `json:"wingetId"`
	Name     string `json:"name"`
	Category string `json:"category"`
	Desc     string `json:"desc"`
	Source   string `json:"source,omitempty"` // winget | msstore
	Match    string `json:"match,omitempty"`  // texto para detectar si ya está instalado
}

var catalog = []CatalogItem{
	{"Google.Chrome", "Google Chrome", "Navegadores", "Navegar por internet; sincroniza contraseñas y favoritos con tu cuenta Google", "", "Google Chrome"},
	{"Mozilla.Firefox", "Mozilla Firefox", "Navegadores", "Navegar por internet con más privacidad; libre y sin rastreo", "", "Mozilla Firefox"},
	{"Brave.Brave", "Brave", "Navegadores", "Navegar sin anuncios ni rastreadores, más rápido en equipos lentos", "", "Brave"},
	{"Opera.Opera", "Opera", "Navegadores", "Navegar con VPN gratis y WhatsApp/Instagram en la barra lateral", "", "Opera Stable"},

	{"7zip.7zip", "7-Zip", "Compresión", "Abrir y crear archivos comprimidos (ZIP, RAR, 7z); gratis y liviano", "", "7-Zip"},
	{"RARLab.WinRAR", "WinRAR", "Compresión", "Abrir y crear archivos RAR y ZIP, reparar comprimidos dañados", "", "WinRAR"},

	{"TheDocumentFoundation.LibreOffice", "LibreOffice", "Oficina", "Hacer documentos, hojas de cálculo y presentaciones gratis (alternativa a Office)", "", "LibreOffice"},
	{"Adobe.Acrobat.Reader.64-bit", "Adobe Acrobat Reader", "Oficina", "Abrir, firmar y llenar formularios PDF", "", "Adobe Acrobat"},
	{"SumatraPDF.SumatraPDF", "Sumatra PDF", "Oficina", "Leer PDF, ePub y cómics muy rápido, ideal para equipos lentos", "", "SumatraPDF"},
	{"Notepad++.Notepad++", "Notepad++", "Oficina", "Editar texto y código con colores, pestañas y buscar/reemplazar", "", "Notepad++"},

	{"VideoLAN.VLC", "VLC", "Multimedia", "Reproducir cualquier video o música sin instalar códecs", "", "VLC media player"},
	{"CodecGuide.K-LiteCodecPack.Standard", "K-Lite Codec Pack", "Multimedia", "Hacer que Windows reproduzca todos los formatos de video y audio", "", "K-Lite Codec Pack"},
	{"Spotify.Spotify", "Spotify", "Multimedia", "Escuchar música y podcasts en streaming", "", "Spotify"},
	{"OBSProject.OBSStudio", "OBS Studio", "Multimedia", "Grabar la pantalla y transmitir en vivo (YouTube, TikTok, Twitch)", "", "OBS Studio"},
	{"Audacity.Audacity", "Audacity", "Multimedia", "Grabar y editar audio: cortar, limpiar ruido, unir pistas", "", "Audacity"},
	{"GIMP.GIMP.3", "GIMP", "Diseño", "Editar fotos y crear imágenes (alternativa gratis a Photoshop)", "", "GIMP"},
	{"Inkscape.Inkscape", "Inkscape", "Diseño", "Diseñar logos e ilustraciones vectoriales (alternativa a Illustrator)", "", "Inkscape"},
	{"BlenderFoundation.Blender", "Blender", "Diseño", "Modelar, animar y renderizar en 3D", "", "Blender"},

	{"Zoom.Zoom", "Zoom", "Comunicación", "Hacer videollamadas y reuniones en línea", "", "Zoom"},
	{"Microsoft.Teams", "Microsoft Teams", "Comunicación", "Reuniones, chat y archivos de trabajo en equipo", "", "Microsoft Teams"},
	{"Discord.Discord", "Discord", "Comunicación", "Chat de voz, video y texto por comunidades o grupos", "", "Discord"},
	{"Telegram.TelegramDesktop", "Telegram", "Comunicación", "Usar Telegram en el PC: chats, canales y archivos grandes", "", "Telegram"},
	{"9NKSQGP7F2NH", "WhatsApp", "Comunicación", "Usar WhatsApp en el PC con llamadas y videollamadas", "msstore", "WhatsApp"},

	{"AnyDesk.AnyDesk", "AnyDesk", "Acceso remoto", "Controlar otro computador a distancia para dar soporte", "", "AnyDesk"},
	{"TeamViewer.TeamViewer", "TeamViewer", "Acceso remoto", "Controlar otro computador a distancia y transferir archivos", "", "TeamViewer"},
	{"RustDesk.RustDesk", "RustDesk", "Acceso remoto", "Soporte remoto gratis y libre (alternativa a AnyDesk/TeamViewer)", "", "RustDesk"},

	{"Google.GoogleDrive", "Google Drive", "Nube", "Tener tus archivos de Google Drive como una carpeta del PC", "", "Google Drive"},
	{"Dropbox.Dropbox", "Dropbox", "Nube", "Guardar y sincronizar archivos en la nube", "", "Dropbox"},
	{"Microsoft.OneDrive", "OneDrive", "Nube", "Respaldar Escritorio y Documentos en la nube de Microsoft", "", "Microsoft OneDrive"},

	{"CPUID.CPU-Z", "CPU-Z", "Herramientas técnicas", "Ver modelo exacto de procesador, placa base y memoria RAM", "", "CPU-Z"},
	{"CPUID.HWMonitor", "HWMonitor", "Herramientas técnicas", "Ver temperaturas, voltajes y ventiladores en tiempo real", "", "HWMonitor"},
	{"REALiX.HWiNFO", "HWiNFO", "Herramientas técnicas", "Diagnóstico completo de hardware con sensores y reportes", "", "HWiNFO"},
	{"CrystalDewWorld.CrystalDiskInfo", "CrystalDiskInfo", "Herramientas técnicas", "Ver la salud SMART y temperatura de discos y SSD", "", "CrystalDiskInfo"},
	{"CrystalDewWorld.CrystalDiskMark", "CrystalDiskMark", "Herramientas técnicas", "Medir la velocidad real de lectura y escritura de un disco", "", "CrystalDiskMark"},
	{"Rufus.Rufus", "Rufus", "Herramientas técnicas", "Crear una USB booteable para instalar Windows o Linux", "", "Rufus"},
	{"Ventoy.Ventoy", "Ventoy", "Herramientas técnicas", "Crear una USB que arranca varias ISO (Windows, Linux, rescate)", "", "Ventoy"},
	{"Google.PlatformTools", "Android Platform Tools", "Herramientas técnicas", "ADB y Fastboot: comandos para reparar y flashear celulares Android", "", "Platform Tools"},
	{"voidtools.Everything", "Everything", "Herramientas técnicas", "Encontrar cualquier archivo del PC al instante", "", "Everything"},
	{"Microsoft.PowerToys", "PowerToys", "Herramientas técnicas", "Utilidades extra de Windows: renombrar en lote, ventanas, selector de color", "", "PowerToys"},
	{"ShareX.ShareX", "ShareX", "Herramientas técnicas", "Capturar y grabar pantalla con edición y subida rápida", "", "ShareX"},
	{"qBittorrent.qBittorrent", "qBittorrent", "Herramientas técnicas", "Descargar archivos torrent sin publicidad", "", "qBittorrent"},

	{"Malwarebytes.Malwarebytes", "Malwarebytes", "Seguridad", "Detectar y eliminar virus, adware y programas maliciosos", "", "Malwarebytes"},
	{"Bitwarden.Bitwarden", "Bitwarden", "Seguridad", "Guardar todas tus contraseñas de forma segura y sincronizada", "", "Bitwarden"},

	{"Microsoft.VCRedist.2015+.x64", "Visual C++ 2015-2022 (x64)", "Librerías del sistema", "Librería que muchos programas y juegos necesitan para abrir (64 bits)", "", "Visual C++ 2015-2022 Redistributable (x64)"},
	{"Microsoft.VCRedist.2015+.x86", "Visual C++ 2015-2022 (x86)", "Librerías del sistema", "La misma librería para programas de 32 bits", "", "Visual C++ 2015-2022 Redistributable (x86)"},
	{"Microsoft.DotNet.DesktopRuntime.8", ".NET Desktop Runtime 8", "Librerías del sistema", "Necesario para abrir programas modernos hechos en .NET", "", "Windows Desktop Runtime - 8"},
	{"Microsoft.DirectX", "DirectX (Runtime)", "Librerías del sistema", "Componentes que juegos antiguos necesitan para funcionar", "", "DirectX"},
	{"Oracle.JavaRuntimeEnvironment", "Java (JRE)", "Librerías del sistema", "Ejecutar programas hechos en Java", "", "Java 8"},

	{"Valve.Steam", "Steam", "Juegos", "Comprar, descargar y jugar juegos de PC", "", "Steam"},
	{"EpicGames.EpicGamesLauncher", "Epic Games Launcher", "Juegos", "Juegos de Epic (y los gratis de cada semana)", "", "Epic Games Launcher"},

	{"Microsoft.VisualStudioCode", "Visual Studio Code", "Desarrollo", "Editor de código para programar en cualquier lenguaje", "", "Microsoft Visual Studio Code"},
	{"Git.Git", "Git", "Desarrollo", "Control de versiones para proyectos de programación", "", "Git"},
	{"OpenJS.NodeJS.LTS", "Node.js LTS", "Desarrollo", "Ejecutar JavaScript fuera del navegador y crear apps web", "", "Node.js"},
	{"Python.Python.3.12", "Python 3.12", "Desarrollo", "Lenguaje de programación para scripts, automatización y ciencia de datos", "", "Python 3.12"},
}

// Software libre publicado en GitHub: se instala siempre la última versión oficial del proyecto.
type GHItem struct {
	Repo     string
	Name     string
	Category string
	Desc     string
	Stars    int    // estrellas aproximadas (se actualizan en vivo desde GitHub)
	Match    string // nombre con el que aparece en "Programas instalados"
	Pattern  string // expresión para elegir el archivo cuando el nombre no es estándar
	Portable string // programa sin instalador: nombre del .exe principal dentro del .zip
	ISO      bool   // imagen de arranque: va al kit "USB de rescate" y a la USB Ventoy
}

const artcraftCat = "ArtCraft (software libre)"

// Seleccionados por calificación (estrellas) entre los proyectos libres que publican versión para Windows.
// No se incluyen activadores/cracks, herramientas de proxy ni los que ya están en el catálogo winget
// (PowerToys, RustDesk, OBS, Audacity, ShareX, Rufus, Ventoy, Notepad++, Git…).
var ghCatalog = []GHItem{
	{Repo: "storytold/craft-launcher", Name: "ArtCraft Launcher", Category: artcraftCat, Desc: "Instala y actualiza todas las apps ArtCraft"},
	{Repo: "storytold/photocraft", Name: "PhotoCraft", Category: artcraftCat, Desc: "Editor de imágenes · alfa"},
	{Repo: "storytold/pdfcraft", Name: "PdfCraft", Category: artcraftCat, Desc: "Leer, unir, dividir y proteger PDF · alfa"},
	{Repo: "storytold/vectorcraft", Name: "VectorCraft", Category: artcraftCat, Desc: "Ilustración vectorial · en desarrollo"},
	{Repo: "storytold/filmcraft", Name: "FilmCraft", Category: artcraftCat, Desc: "Edición de video · en desarrollo"},
	{Repo: "storytold/lightcraft", Name: "LightCraft", Category: artcraftCat, Desc: "Biblioteca de fotos y revelado RAW · en desarrollo"},
	{Repo: "storytold/effectcraft", Name: "EffectCraft", Category: artcraftCat, Desc: "Motion graphics y efectos · en desarrollo"},
	{Repo: "storytold/designcraft", Name: "DesignCraft", Category: artcraftCat, Desc: "Diagramación y publicaciones · en desarrollo"},
	{Repo: "storytold/wordcraft", Name: "WordCraft", Category: artcraftCat, Desc: "Procesador de texto · en desarrollo"},
	{Repo: "storytold/soundcraft", Name: "SoundCraft", Category: artcraftCat, Desc: "Grabación y edición de audio · en desarrollo"},
	{Repo: "storytold/deckcraft", Name: "DeckCraft", Category: artcraftCat, Desc: "Presentaciones · en desarrollo"},
	{Repo: "storytold/cadcraft", Name: "CADCraft", Category: artcraftCat, Desc: "Diseño asistido (CAD) · en desarrollo"},
	{Repo: "storytold/gridcraft", Name: "GridCraft", Category: artcraftCat, Desc: "Hojas de cálculo · en desarrollo"},

	// Celulares y USB (ideal para el taller)
	{Repo: "Genymobile/scrcpy", Name: "scrcpy", Category: "Libre · Celulares y USB", Desc: "Ver y controlar el celular Android desde el PC", Stars: 125000, Portable: "scrcpy.exe", Pattern: `(?i)^scrcpy-win64-v[\d.]+\.zip$`},
	{Repo: "Universal-Debloater-Alliance/universal-android-debloater-next-generation", Name: "Universal Android Debloater", Category: "Libre · Celulares y USB", Desc: "Quita apps basura del celular por ADB (sin root)", Stars: 6000, Portable: "uad-ng-windows.exe", Pattern: `(?i)^uad-ng-windows\.exe$`},
	{Repo: "balena-io/etcher", Name: "balenaEtcher", Category: "Libre · Celulares y USB", Desc: "Grabar imágenes ISO/IMG en USB y memorias SD", Stars: 32000, Match: "balenaEtcher"},
	{Repo: "raspberrypi/rpi-imager", Name: "Raspberry Pi Imager", Category: "Libre · Celulares y USB", Desc: "Preparar memorias SD para Raspberry Pi", Stars: 2500, Pattern: `(?i)^imager-[\d.]+\.exe$`},
	{Repo: "localsend/localsend", Name: "LocalSend", Category: "Libre · Celulares y USB", Desc: "Pasar archivos entre celular y PC por WiFi, sin cables", Stars: 70000},

	// Hardware y mantenimiento
	{Repo: "LibreHardwareMonitor/LibreHardwareMonitor", Name: "Libre Hardware Monitor", Category: "Libre · Hardware y sistema", Desc: "Temperaturas, voltajes y ventiladores en vivo", Stars: 6500, Portable: "LibreHardwareMonitor.exe", Pattern: `(?i)librehardwaremonitor.*\.zip$`},
	{Repo: "Klocman/Bulk-Crap-Uninstaller", Name: "Bulk Crap Uninstaller", Category: "Libre · Hardware y sistema", Desc: "Desinstala muchos programas y sus restos de una vez", Stars: 14000, Match: "BCUninstaller", Pattern: `(?i)setup.*\.exe$`},
	{Repo: "lostindark/DriverStoreExplorer", Name: "Driver Store Explorer", Category: "Libre · Hardware y sistema", Desc: "Ver y limpiar drivers viejos de Windows", Stars: 9000, Portable: "Rapr.exe", Pattern: `(?i)\.zip$`},
	{Repo: "Open-Shell/Open-Shell-Menu", Name: "Open-Shell", Category: "Libre · Hardware y sistema", Desc: "Menú Inicio clásico para Windows 10/11", Stars: 15000, Pattern: `(?i)^openshellsetup.*\.exe$`},
	{Repo: "henrypp/memreduct", Name: "Mem Reduct", Category: "Libre · Hardware y sistema", Desc: "Libera memoria RAM con un clic", Stars: 4500, Pattern: `(?i)setup\.exe$`},
	{Repo: "xanderfrangos/twinkle-tray", Name: "Twinkle Tray", Category: "Libre · Hardware y sistema", Desc: "Brillo de monitores externos desde la barra de tareas", Stars: 9000, Pattern: `(?i)^twinkle\.tray.*\.exe$`},

	// Herramientas
	{Repo: "flameshot-org/flameshot", Name: "Flameshot", Category: "Libre · Herramientas", Desc: "Capturas de pantalla con anotaciones", Stars: 27000},
	{Repo: "NickeManarin/ScreenToGif", Name: "ScreenToGif", Category: "Libre · Herramientas", Desc: "Graba la pantalla y guarda en GIF o video", Stars: 25000},
	{Repo: "peazip/PeaZip", Name: "PeaZip", Category: "Libre · Herramientas", Desc: "Compresor libre (ZIP, RAR, 7z y 200 formatos)", Stars: 5000},
	{Repo: "Tichau/FileConverter", Name: "File Converter", Category: "Libre · Herramientas", Desc: "Convierte archivos con clic derecho (video, audio, imagen, PDF)", Stars: 9000},
	{Repo: "WinMerge/winmerge", Name: "WinMerge", Category: "Libre · Herramientas", Desc: "Compara carpetas y archivos", Stars: 7000},
	{Repo: "agalwood/Motrix", Name: "Motrix", Category: "Libre · Herramientas", Desc: "Gestor de descargas rápido", Stars: 50000},
	{Repo: "AutoHotkey/AutoHotkey", Name: "AutoHotkey", Category: "Libre · Herramientas", Desc: "Automatiza teclado y mouse con atajos", Stars: 11000, Pattern: `(?i)setup\.exe$`},

	// Oficina, notas y seguridad
	{Repo: "AppFlowy-IO/AppFlowy", Name: "AppFlowy", Category: "Libre · Oficina y notas", Desc: "Alternativa libre a Notion", Stars: 64000},
	{Repo: "laurent22/joplin", Name: "Joplin", Category: "Libre · Oficina y notas", Desc: "Notas y tareas con sincronización", Stars: 50000},
	{Repo: "siyuan-note/siyuan", Name: "SiYuan", Category: "Libre · Oficina y notas", Desc: "Gestor de conocimiento y notas", Stars: 38000},
	{Repo: "logseq/logseq", Name: "Logseq", Category: "Libre · Oficina y notas", Desc: "Notas enlazadas y diario", Stars: 38000},
	{Repo: "marktext/marktext", Name: "MarkText", Category: "Libre · Oficina y notas", Desc: "Editor de Markdown sencillo", Stars: 52000},
	{Repo: "keepassxreboot/keepassxc", Name: "KeePassXC", Category: "Libre · Oficina y notas", Desc: "Gestor de contraseñas sin nube", Stars: 25000},

	// Multimedia y diseño
	{Repo: "upscayl/upscayl", Name: "Upscayl", Category: "Libre · Multimedia y diseño", Desc: "Mejora y amplía fotos con IA", Stars: 38000},
	{Repo: "HandBrake/HandBrake", Name: "HandBrake", Category: "Libre · Multimedia y diseño", Desc: "Convierte y comprime videos", Stars: 21000},
	{Repo: "FreeCAD/FreeCAD", Name: "FreeCAD", Category: "Libre · Multimedia y diseño", Desc: "Modelado 3D paramétrico (CAD)", Stars: 25000},
	{Repo: "clsid2/mpc-hc", Name: "MPC-HC", Category: "Libre · Multimedia y diseño", Desc: "Reproductor de video liviano", Stars: 13000, Match: "MPC-HC"},
	{Repo: "mltframework/shotcut", Name: "Shotcut", Category: "Libre · Multimedia y diseño", Desc: "Editor de video", Stars: 12000},
	{Repo: "darktable-org/darktable", Name: "darktable", Category: "Libre · Multimedia y diseño", Desc: "Revelado de fotos RAW", Stars: 11000},

	// Juegos
	{Repo: "LizardByte/Sunshine", Name: "Sunshine", Category: "Libre · Juegos", Desc: "Transmite juegos del PC a otros equipos", Stars: 28000},
	{Repo: "moonlight-stream/moonlight-qt", Name: "Moonlight", Category: "Libre · Juegos", Desc: "Juega desde otro equipo (cliente de Sunshine)", Stars: 14000},
	{Repo: "JosefNemec/Playnite", Name: "Playnite", Category: "Libre · Juegos", Desc: "Une las bibliotecas de Steam, Epic, GOG y más", Stars: 13000, Pattern: `(?i)^playnite\d+\.exe$`},

	// Navegadores
	{Repo: "zen-browser/desktop", Name: "Zen Browser", Category: "Libre · Navegadores", Desc: "Navegador basado en Firefox, rápido y privado", Stars: 35000, Pattern: `(?i)^zen\.installer\.exe$`},

	// IA local
	{Repo: "ollama/ollama", Name: "Ollama", Category: "Libre · IA en tu PC", Desc: "Ejecuta modelos de IA sin internet", Stars: 150000, Pattern: `(?i)^ollamasetup\.exe$`},
	{Repo: "janhq/jan", Name: "Jan", Category: "Libre · IA en tu PC", Desc: "Chat de IA privado, funciona sin conexión", Stars: 39000},

	// Desarrollo
	{Repo: "neovim/neovim", Name: "Neovim", Category: "Libre · Desarrollo", Desc: "Editor de texto para programadores", Stars: 92000},
	{Repo: "Eugeny/tabby", Name: "Tabby", Category: "Libre · Desarrollo", Desc: "Terminal moderna con SSH y pestañas", Stars: 66000},
	{Repo: "alacritty/alacritty", Name: "Alacritty", Category: "Libre · Desarrollo", Desc: "Terminal muy rápida (GPU)", Stars: 66000},
	{Repo: "PowerShell/PowerShell", Name: "PowerShell 7", Category: "Libre · Desarrollo", Desc: "La versión moderna de PowerShell", Stars: 55000},
	{Repo: "WerWolv/ImHex", Name: "ImHex", Category: "Libre · Desarrollo", Desc: "Editor hexadecimal para ingeniería inversa", Stars: 55000},
	{Repo: "dbeaver/dbeaver", Name: "DBeaver", Category: "Libre · Desarrollo", Desc: "Cliente universal de bases de datos", Stars: 45000},
	{Repo: "usebruno/bruno", Name: "Bruno", Category: "Libre · Desarrollo", Desc: "Probar APIs (alternativa a Postman)", Stars: 38000},
	{Repo: "VSCodium/vscodium", Name: "VSCodium", Category: "Libre · Desarrollo", Desc: "VS Code sin telemetría de Microsoft", Stars: 28000, Pattern: `(?i)^vscodium-x64-[\d.]+\.msi$`},
	{Repo: "HeidiSQL/HeidiSQL", Name: "HeidiSQL", Category: "Libre · Desarrollo", Desc: "Administrar MySQL, MariaDB y SQL Server", Stars: 5000},
	// Taller: más herramientas técnicas
	{Repo: "zhongyang219/TrafficMonitor", Name: "TrafficMonitor", Category: "Libre · Hardware y sistema", Desc: "Red, CPU y RAM en vivo en la barra de tareas", Stars: 40000, Portable: "TrafficMonitor.exe", Pattern: `(?i)^trafficmonitor_v[\d.]+_x64\.zip$`},
	{Repo: "sandboxie-plus/Sandboxie", Name: "Sandboxie-Plus", Category: "Libre · Hardware y sistema", Desc: "Abre programas sospechosos aislados del sistema", Stars: 15000, Pattern: `(?i)^sandboxie-plus-(x64|arm64)-v[\d.]+\.exe$`},
	{Repo: "winsiderss/systeminformer", Name: "System Informer", Category: "Libre · Hardware y sistema", Desc: "Administrador de tareas avanzado: procesos, servicios y red", Stars: 12000},
	{Repo: "namazso/OpenHashTab", Name: "OpenHashTab", Category: "Libre · Hardware y sistema", Desc: "Verifica la huella (hash) de archivos con clic derecho", Stars: 3500},
	{Repo: "barry-ran/QtScrcpy", Name: "QtScrcpy", Category: "Libre · Celulares y USB", Desc: "Controla varios Android a la vez, con botones", Stars: 23000, Portable: "QtScrcpy.exe", Pattern: `(?i)qtscrcpy.*win.*x64.*\.zip$`},
	{Repo: "viarotel-org/escrcpy", Name: "Escrcpy", Category: "Libre · Celulares y USB", Desc: "scrcpy con interfaz gráfica y en español", Stars: 6000},

	// Kit USB de rescate (imágenes para arrancar con Ventoy)
	{Repo: "memtest86plus/memtest86plus", Name: "Memtest86+", Category: "Libre · USB de rescate", Desc: "Prueba la memoria RAM a fondo al arrancar", Stars: 1500, ISO: true, Match: "mt86plus", Pattern: `(?i)64.*\.iso(\.zip)?$`},
	{Repo: "rescuezilla/rescuezilla", Name: "Rescuezilla", Category: "Libre · USB de rescate", Desc: "Clona, respalda y recupera discos sin abrir Windows", Stars: 5000, ISO: true, Match: "rescuezilla", Pattern: `(?i)64bit.*\.iso$`},

	// Oficina y negocio
	{Repo: "ONLYOFFICE/DesktopEditors", Name: "ONLYOFFICE", Category: "Libre · Oficina y notas", Desc: "Documentos, hojas y presentaciones muy compatibles con Office", Stars: 6500, Match: "ONLYOFFICE"},
	{Repo: "ferdium/ferdium-app", Name: "Ferdium", Category: "Libre · Comunicación", Desc: "WhatsApp, Telegram, Gmail e Instagram en una ventana", Stars: 4000},
	{Repo: "QL-Win/QuickLook", Name: "QuickLook", Category: "Libre · Herramientas", Desc: "Vista previa de archivos con la barra espaciadora", Stars: 19000},
	{Repo: "Flow-Launcher/Flow.Launcher", Name: "Flow Launcher", Category: "Libre · Herramientas", Desc: "Buscador y lanzador rápido (Alt + Espacio)", Stars: 11000, Match: "Flow Launcher"},
	{Repo: "espanso/espanso", Name: "Espanso", Category: "Libre · Herramientas", Desc: "Textos automáticos: escribe ;garantia y se pega tu mensaje", Stars: 12000},
	{Repo: "d2phap/ImageGlass", Name: "ImageGlass", Category: "Libre · Multimedia y diseño", Desc: "Visor de imágenes rápido", Stars: 12000},

	// Libros
	{Repo: "koodo-reader/koodo-reader", Name: "Koodo Reader", Category: "Libre · Libros", Desc: "Biblioteca y lector de EPUB, PDF y MOBI", Stars: 22000, Pattern: `(?i)^koodo-reader-[\d.]+(-x64)?(-setup)?\.exe$`},
	{Repo: "edrlab/thorium-reader", Name: "Thorium Reader", Category: "Libre · Libros", Desc: "Lector de EPUB accesible, con lectura en voz alta", Stars: 2500, Match: "Thorium"},

	// Multimedia
	{Repo: "musescore/MuseScore", Name: "MuseScore Studio", Category: "Libre · Multimedia y diseño", Desc: "Escribe y reproduce partituras", Stars: 13000, Match: "MuseScore"},
	{Repo: "LMMS/lmms", Name: "LMMS", Category: "Libre · Multimedia y diseño", Desc: "Producción musical (beats, sintetizadores)", Stars: 9000},
	{Repo: "PintaProject/Pinta", Name: "Pinta", Category: "Libre · Multimedia y diseño", Desc: "Editor de imágenes sencillo, tipo Paint mejorado", Stars: 4500, Pattern: `(?i)pinta.*\.exe$`},
	{Repo: "jellyfin/jellyfin-media-player", Name: "Jellyfin Media Player", Category: "Libre · Multimedia y diseño", Desc: "Tu propio Netflix casero (cliente de Jellyfin)", Stars: 3500, Match: "Jellyfin Media Player"},

	// IA
	{Repo: "nomic-ai/gpt4all", Name: "GPT4All", Category: "Libre · IA en tu PC", Desc: "Chat con IA local, también lee tus documentos", Stars: 72000},
	{Repo: "CherryHQ/cherry-studio", Name: "Cherry Studio", Category: "Libre · IA en tu PC", Desc: "Chat con varias IA (locales o con tus claves)", Stars: 32000},
	{Repo: "chidiwilliams/buzz", Name: "Buzz", Category: "Libre · IA en tu PC", Desc: "Transcribe audio y video a texto sin internet", Stars: 15000},
	{Repo: "Comfy-Org/desktop", Name: "ComfyUI Desktop", Category: "Libre · IA en tu PC", Desc: "Genera imágenes con IA (requiere tarjeta NVIDIA)", Stars: 2000, Match: "ComfyUI"},
	{Repo: "LykosAI/StabilityMatrix", Name: "Stability Matrix", Category: "Libre · IA en tu PC", Desc: "Instala y administra programas de imágenes con IA", Stars: 6000, Portable: "StabilityMatrix.exe", Pattern: `(?i)stabilitymatrix.*win.*x64.*\.zip$`},

	// Desarrollo web
	{Repo: "coreybutler/nvm-windows", Name: "nvm for Windows", Category: "Libre · Desarrollo", Desc: "Varias versiones de Node.js en el mismo PC", Stars: 42000, Match: "NVM for Windows", Pattern: `(?i)^nvm-setup\.exe$`},
	{Repo: "DevToys-app/DevToys", Name: "DevToys", Category: "Libre · Desarrollo", Desc: "JSON, Base64, JWT, colores y 30 utilidades más", Stars: 30000},
	{Repo: "Kong/insomnia", Name: "Insomnia", Category: "Libre · Desarrollo", Desc: "Probar APIs REST y GraphQL", Stars: 36000, Pattern: `(?i)^insomnia\.core-[\d.]+\.exe$`},
	{Repo: "beekeeper-studio/beekeeper-studio", Name: "Beekeeper Studio", Category: "Libre · Desarrollo", Desc: "Cliente de bases de datos fácil de usar", Stars: 21000},
	{Repo: "podman-desktop/podman-desktop", Name: "Podman Desktop", Category: "Libre · Desarrollo", Desc: "Contenedores (alternativa libre a Docker Desktop)", Stars: 6000},
	{Repo: "zed-industries/zed", Name: "Zed", Category: "Libre · Desarrollo", Desc: "Editor de código muy rápido, con IA", Stars: 60000},

	// Personalizar Windows
	{Repo: "ramensoftware/windhawk", Name: "Windhawk", Category: "Libre · Personalizar Windows", Desc: "Mods para ajustar Windows (barra, menú, ventanas)", Stars: 3500},
	{Repo: "rocksdanister/lively", Name: "Lively Wallpaper", Category: "Libre · Personalizar Windows", Desc: "Fondos de pantalla animados", Stars: 16000, Match: "Lively", Pattern: `(?i)^lively_setup.*\.exe$`},
	{Repo: "rainmeter/rainmeter", Name: "Rainmeter", Category: "Libre · Personalizar Windows", Desc: "Widgets de escritorio (reloj, clima, CPU)", Stars: 5000, Pattern: `(?i)^rainmeter-[\d.]+(-r\d+)?\.exe$`},
	{Repo: "moudey/Shell", Name: "Nilesoft Shell", Category: "Libre · Personalizar Windows", Desc: "Menú de clic derecho más completo y ordenado", Stars: 4500},

	// Juegos
	{Repo: "Heroic-Games-Launcher/HeroicGamesLauncher", Name: "Heroic Games Launcher", Category: "Libre · Juegos", Desc: "Juegos de Epic, GOG y Amazon en un solo lugar", Stars: 10000, Match: "Heroic"},
	{Repo: "PrismLauncher/PrismLauncher", Name: "Prism Launcher", Category: "Libre · Juegos", Desc: "Minecraft con varias versiones y mods", Stars: 7000},
}

var ghByRepo = func() map[string]*GHItem {
	m := map[string]*GHItem{}
	for i := range ghCatalog {
		m[strings.ToLower(ghCatalog[i].Repo)] = &ghCatalog[i]
	}
	return m
}()

func ghItem(repo string) *GHItem { return ghByRepo[strings.ToLower(repo)] }
