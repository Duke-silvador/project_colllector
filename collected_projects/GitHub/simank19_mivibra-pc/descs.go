package main

import (
	"regexp"
	"strings"
)

// Descripción corta de "para qué sirve" para instaladores de la biblioteca local,
// reconocidos por el nombre del programa o del archivo.
var knownDescs = []struct {
	re   *regexp.Regexp
	desc string
}{
	// celulares y servicio técnico
	{regexp.MustCompile(`(?i)3utools`), "Administrar iPhone/iPad: respaldos, flashear iOS, ver estado de batería y piezas"},
	{regexp.MustCompile(`(?i)itunes|apple ?devices`), "Conectar iPhone al PC: respaldos, restaurar y actualizar iOS"},
	{regexp.MustCompile(`(?i)samsung.*usb|ssudsetup`), "Driver para que el PC reconozca celulares Samsung por USB"},
	{regexp.MustCompile(`(?i)smart ?switch`), "Pasar datos entre celulares Samsung y respaldarlos en el PC"},
	{regexp.MustCompile(`(?i)\bodin`), "Flashear firmware en celulares Samsung"},
	{regexp.MustCompile(`(?i)sp ?flash|flash_?tool`), "Flashear firmware en celulares con procesador MediaTek"},
	{regexp.MustCompile(`(?i)mtk|mediatek|vcom`), "Driver para conectar celulares MediaTek (MTK) en modo de servicio"},
	{regexp.MustCompile(`(?i)qualcomm|qdloader|qud`), "Driver para conectar celulares Qualcomm en modo de servicio (EDL)"},
	{regexp.MustCompile(`(?i)miflash|mi ?flash|xiaomi`), "Flashear ROM oficial en celulares Xiaomi, Redmi y POCO"},
	{regexp.MustCompile(`(?i)hisuite|huawei`), "Respaldar y actualizar celulares Huawei desde el PC"},
	{regexp.MustCompile(`(?i)rescue.*smart|motorola|lmsa`), "Restaurar y actualizar celulares Motorola y Lenovo"},
	{regexp.MustCompile(`(?i)lg ?bridge|lgmobile`), "Driver y respaldos para celulares LG"},
	{regexp.MustCompile(`(?i)adb|fastboot|platform-tools`), "Driver ADB/Fastboot para dar comandos a celulares Android"},
	{regexp.MustCompile(`(?i)unlocktool|chimera|hydra|z3x|octoplus|miracle|griffin`), "Herramienta de servicio técnico para celulares (flasheo y reparación)"},
	// drivers de PC
	{regexp.MustCompile(`(?i)nvidia|geforce`), "Driver de la tarjeta de video NVIDIA (juegos, video y pantallas)"},
	{regexp.MustCompile(`(?i)amd.*(radeon|adrenalin|software|chipset)|radeon`), "Driver de gráficos o chipset AMD"},
	{regexp.MustCompile(`(?i)intel.*(graphics|gfx|arc)`), "Driver de video Intel"},
	{regexp.MustCompile(`(?i)intel.*(wifi|wireless|bluetooth|bt)`), "Driver de WiFi o Bluetooth Intel"},
	{regexp.MustCompile(`(?i)intel.*(chipset|me|management|rst|serial io)`), "Driver del chipset Intel (estabilidad y ahorro de energía)"},
	{regexp.MustCompile(`(?i)realtek.*(audio|hd|sound)|rtkaudio`), "Driver de sonido Realtek"},
	{regexp.MustCompile(`(?i)realtek.*(lan|ethernet|pcie gbe)`), "Driver de red por cable Realtek"},
	{regexp.MustCompile(`(?i)realtek.*(wlan|wifi|wireless)|rtwlan`), "Driver de WiFi Realtek"},
	{regexp.MustCompile(`(?i)realtek.*(card|reader)`), "Driver del lector de memorias Realtek"},
	{regexp.MustCompile(`(?i)synaptics|elan|touchpad|precision`), "Driver del touchpad (gestos y desplazamiento)"},
	{regexp.MustCompile(`(?i)\b(hp|epson|canon|brother|xerox|ricoh|kyocera)\b.*(print|driver|smart|l\d{3,4}|g\d{3,4})|impresora|printer`), "Driver y utilidades de la impresora"},
	{regexp.MustCompile(`(?i)snappy|sdi_|driverpack|driver ?booster|driver ?easy`), "Encontrar e instalar drivers que le falten al equipo"},
	// sistema y librerías
	{regexp.MustCompile(`(?i)vc_?redist|visual c\+\+`), "Librería que muchos programas y juegos necesitan para abrir"},
	{regexp.MustCompile(`(?i)directx|dxsetup|dxwebsetup`), "Componentes que los juegos necesitan para funcionar"},
	{regexp.MustCompile(`(?i)dotnet|\.net|ndp\d`), "Necesario para abrir programas hechos en .NET"},
	{regexp.MustCompile(`(?i)\bjava|jre|jdk`), "Ejecutar programas hechos en Java"},
	{regexp.MustCompile(`(?i)mediacreationtool|windows ?11.*(install|assistant)|win11|windows10upgrade`), "Descargar Windows y crear una USB de instalación o actualizar"},
	{regexp.MustCompile(`(?i)rufus`), "Crear una USB booteable para instalar Windows o Linux"},
	{regexp.MustCompile(`(?i)ventoy`), "Crear una USB que arranca varias ISO"},
	{regexp.MustCompile(`(?i)\bwps`), "Suite de oficina gratis compatible con Word, Excel y PowerPoint"},
	{regexp.MustCompile(`(?i)onlyoffice`), "Documentos, hojas y presentaciones compatibles con Office"},
	{regexp.MustCompile(`(?i)office|setup.*o365|odt`), "Microsoft Office: Word, Excel y PowerPoint"},
	{regexp.MustCompile(`(?i)libreoffice`), "Documentos, hojas de cálculo y presentaciones gratis"},
	// utilidades
	{regexp.MustCompile(`(?i)winrar|\brar\b`), "Abrir y crear archivos comprimidos RAR y ZIP"},
	{regexp.MustCompile(`(?i)7-?zip|7z\d`), "Abrir y crear archivos comprimidos (ZIP, RAR, 7z)"},
	{regexp.MustCompile(`(?i)chrome`), "Navegador de Google"},
	{regexp.MustCompile(`(?i)firefox`), "Navegador libre de Mozilla"},
	{regexp.MustCompile(`(?i)\bbrave`), "Navegador sin anuncios"},
	{regexp.MustCompile(`(?i)\bopera`), "Navegador con VPN incluida"},
	{regexp.MustCompile(`(?i)acrobat|adobe ?reader|readerdc`), "Abrir, firmar y llenar documentos PDF"},
	{regexp.MustCompile(`(?i)foxit|sumatra`), "Leer y anotar documentos PDF"},
	{regexp.MustCompile(`(?i)anydesk`), "Controlar otro computador a distancia para dar soporte"},
	{regexp.MustCompile(`(?i)teamviewer`), "Controlar otro computador a distancia y pasar archivos"},
	{regexp.MustCompile(`(?i)rustdesk`), "Soporte remoto gratis y libre"},
	{regexp.MustCompile(`(?i)whatsapp`), "WhatsApp en el PC con llamadas"},
	{regexp.MustCompile(`(?i)telegram`), "Telegram en el PC"},
	{regexp.MustCompile(`(?i)zoom`), "Videollamadas y reuniones"},
	{regexp.MustCompile(`(?i)\bteams`), "Reuniones y chat de trabajo"},
	{regexp.MustCompile(`(?i)discord`), "Chat de voz y comunidades"},
	{regexp.MustCompile(`(?i)\bvlc`), "Reproducir cualquier video o música"},
	{regexp.MustCompile(`(?i)k-?lite|codec`), "Códecs para reproducir todos los formatos de video"},
	{regexp.MustCompile(`(?i)spotify`), "Música en streaming"},
	{regexp.MustCompile(`(?i)\bobs`), "Grabar la pantalla y transmitir en vivo"},
	{regexp.MustCompile(`(?i)capcut`), "Editar videos cortos para redes sociales"},
	{regexp.MustCompile(`(?i)canva`), "Diseñar publicaciones, logos y presentaciones"},
	{regexp.MustCompile(`(?i)photoshop`), "Editar fotos de forma profesional"},
	{regexp.MustCompile(`(?i)illustrator`), "Diseño vectorial profesional"},
	{regexp.MustCompile(`(?i)premiere`), "Edición de video profesional"},
	{regexp.MustCompile(`(?i)corel`), "Diseño gráfico e impresión (CorelDRAW)"},
	{regexp.MustCompile(`(?i)autocad`), "Planos y dibujo técnico (CAD)"},
	{regexp.MustCompile(`(?i)sketchup`), "Modelado 3D para arquitectura y muebles"},
	{regexp.MustCompile(`(?i)ccleaner`), "Limpiar archivos temporales y programas de inicio"},
	{regexp.MustCompile(`(?i)malwarebytes`), "Eliminar virus y programas maliciosos"},
	{regexp.MustCompile(`(?i)avast|avg|kaspersky|eset|nod32|norton|bitdefender|mcafee`), "Antivirus para proteger el equipo"},
	{regexp.MustCompile(`(?i)recuva|easeus.*recovery|photorec|disk ?drill`), "Recuperar archivos borrados"},
	{regexp.MustCompile(`(?i)partition|aomei|minitool`), "Crear, mover y redimensionar particiones del disco"},
	{regexp.MustCompile(`(?i)macrium|acronis|clonezilla|todo ?backup`), "Clonar discos y hacer copias de seguridad"},
	{regexp.MustCompile(`(?i)cpu-?z`), "Ver procesador, placa base y memoria RAM"},
	{regexp.MustCompile(`(?i)hwmonitor|hwinfo`), "Ver temperaturas y sensores del equipo"},
	{regexp.MustCompile(`(?i)crystaldiskinfo`), "Ver la salud SMART de los discos"},
	{regexp.MustCompile(`(?i)crystaldiskmark`), "Medir la velocidad del disco"},
	{regexp.MustCompile(`(?i)steam`), "Tienda y biblioteca de juegos"},
	{regexp.MustCompile(`(?i)epic ?games`), "Tienda de juegos de Epic"},
	{regexp.MustCompile(`(?i)vscode|visual ?studio ?code|vscodium`), "Editor de código"},
	{regexp.MustCompile(`(?i)python`), "Lenguaje de programación Python"},
	{regexp.MustCompile(`(?i)node-?v|nodejs`), "JavaScript fuera del navegador"},
	{regexp.MustCompile(`(?i)\bgit-`), "Control de versiones para programar"},
	{regexp.MustCompile(`(?i)xampp|laragon|wamp`), "Servidor web local (Apache, PHP y MySQL) para desarrollo"},
	{regexp.MustCompile(`(?i)craft`), "App de la suite libre ArtCraft"},
}

var catDescs = []struct {
	re   *regexp.Regexp
	desc string
}{
	{regexp.MustCompile(`(?i)driver|controlador`), "Driver para que Windows reconozca y aproveche el hardware"},
	{regexp.MustCompile(`(?i)celular|m[oó]vil|android|iphone`), "Herramienta para celulares"},
	{regexp.MustCompile(`(?i)oficina`), "Programa de oficina"},
	{regexp.MustCompile(`(?i)multimedia`), "Programa de audio o video"},
	{regexp.MustCompile(`(?i)navegador`), "Navegador de internet"},
	{regexp.MustCompile(`(?i)herramienta|t[eé]cnic`), "Herramienta técnica"},
	{regexp.MustCompile(`(?i)juego`), "Juego o complemento para juegos"},
}

// localDesc devuelve la descripción conocida, o una genérica según la carpeta (categoría).
func localDesc(name, file, product, category string) string {
	hay := strings.Join([]string{name, file, product}, " ")
	for _, k := range knownDescs {
		if k.re.MatchString(hay) {
			return k.desc
		}
	}
	for _, k := range catDescs {
		if k.re.MatchString(category) {
			return k.desc
		}
	}
	return ""
}
