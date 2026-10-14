const LANG_KEY = "ljsportmind_lang";
let currentLang = localStorage.getItem(LANG_KEY) || "en";

const I18N = {
  en: {
    tagline: "Discover Your Path. Create Your Impact.",
    tabPassport: "Sports Passport",
    tabCreator: "Creator Studio",
    pNameLabel: "Name",
    pNamePlaceholder: "e.g. Luis Juarez",
    pLocationLabel: "Location",
    pLocationPlaceholder: "e.g. Los Angeles, CA",
    pRoleLabel: "Current role / experience",
    rolePlayer: "Player",
    roleFormerPlayer: "Former Player",
    roleCoach: "Coach",
    roleStudent: "Student",
    roleContentCreator: "Content Creator",
    roleFan: "Fan / Enthusiast",
    roleOther: "Other",
    skillsLabel: "Skills (select all that apply)",
    skillVideoEditing: "Video Editing",
    skillWriting: "Writing",
    skillCoaching: "Coaching",
    skillDataAnalytics: "Data & Analytics",
    skillSocialMedia: "Social Media",
    skillPlayingExperience: "Playing Experience",
    skillEventManagement: "Event Management",
    skillMarketingSales: "Marketing & Sales",
    skillPhotographyDesign: "Photography / Design",
    skillBroadcasting: "Broadcasting / On-Camera",
    interestsLabel: "Interests (select all that apply)",
    interestContentCreation: "Content Creation",
    interestCoachingDev: "Coaching & Player Development",
    interestScouting: "Scouting & Analytics",
    interestJournalism: "Journalism & Broadcasting",
    interestMarketing: "Marketing & Sponsorship",
    interestEventOps: "Event Operations",
    interestFrontOffice: "Front Office / Team Ops",
    interestPersonalBrand: "Personal Brand Building",
    pGoalLabel: "Career goal",
    goalMedia: "Break into sports media / content",
    goalCoach: "Become a coach",
    goalFrontOffice: "Work in a team front office",
    goalBrand: "Build my own personal brand",
    goalAnalytics: "Become a scout / analyst",
    goalExplore: "Still exploring",
    findMyFit: "Find My Fit",
    yourPassport: "Your Sports Passport",
    teamALabel: "Team A",
    teamAPlaceholder: "e.g. Arsenal",
    teamBLabel: "Team B",
    teamBPlaceholder: "e.g. Chelsea",
    scoreALabel: "Score A",
    scoreBLabel: "Score B",
    sportLabel: "Sport",
    sportSoccer: "Soccer",
    sportBasketball: "Basketball",
    sportFootball: "Football",
    sportBaseball: "Baseball",
    sportOther: "Other",
    momentTypeLabel: "What kind of moment was it?",
    momentComeback: "Comeback",
    momentBlowout: "Blowout",
    momentBuzzer: "Last-Minute / Buzzer-Beater Winner",
    momentUpset: "Upset",
    momentControversial: "Controversial Call",
    momentMilestone: "Milestone / Record",
    momentClose: "Close, Back-and-Forth Game",
    momentOther: "Other",
    keyMomentLabel: "Key moment",
    keyMomentPlaceholder: "e.g. 89th-minute equalizer off a corner kick",
    observationLabel: "Your take / observation (optional)",
    observationPlaceholder: "e.g. Their defense fell apart after the red card",
    generateContent: "Generate Content Ideas",
    regenerate: "Regenerate",
    contentHook: "Content Hook",
    videoIdea: "Short-Form Video Idea",
    engagementQuestion: "Engagement Question",
    captionLabel: "Caption",
    voiceoverScript: "Voiceover Script",
    playVoiceover: "▶ Play Voiceover",
    stopVoiceover: "■ Stop",
    copyScript: "Copy Script",
    ttsWarning: "Your browser doesn't support built-in text-to-speech playback. You can still read/copy the script above.",
    nextStepLabel: "Next step:",
    matchedOnLabel: "Matched on:",
    selectMoreSkills: "Select a few more skills or interests to see career path matches.",
    copiedLabel: "Copied!",
    youFallback: "You",
    beatHook: "Hook",
    beatSetup: "Setup",
    beatMoment: "The Moment",
    beatYourTake: "Your Take",
    beatCTA: "CTA",
    tailoredFor: "Tailored for {name} — {goal}",
    defaultTakeLine: "This is exactly the kind of moment that decides games.",
    setupLine: "{teamA} {scoreA} - {scoreB} {teamB}. Here's what happened.",
    resumeImportTitle: "Import from your resume (optional)",
    resumePrivacy: "Read on your device. Never uploaded.",
    resumeLabel: "Or paste your resume text",
    resumePlaceholder: "Paste the text of your resume or LinkedIn profile here…",
    resumeFileLabel: "Upload your resume (PDF or .txt)",
    resumeUploaded: "Uploaded:",
    resumeRemove: "Remove file",
    showOpenings: "Show live openings",
    loadingOpenings: "Loading openings…",
    openingsNotConfigured: "Live openings aren't enabled yet. Use the search links above.",
    openingsError: "Couldn't load openings right now. Use the search links above.",
    openingsNone: "No recent openings found. Try the search links above or broaden your location.",
    resumeAnalyze: "Analyze Resume",
    resumeTip: "Tip: on LinkedIn, More → Save to PDF.",
    resumeDetectedSkills: "Skills detected",
    resumeDetectedInterests: "Interests detected",
    resumeFound: "Found:",
    resumeNothingFound: "No matching skills found. Try pasting more of your resume, or select your skills manually below.",
    resumeApplied: "These were added to the Sports Passport form below. Your existing selections were kept.",
    resumeGoToPassport: "Review my Sports Passport",
    resumeUnsupportedFile: "Please upload a PDF or .txt file. For Word resumes, open the file, copy the text and paste it above.",
    resumePdfError: "Couldn't read text from this PDF (it may be a scanned image). Try copying and pasting the text instead.",
    resumeReading: "Reading file…",
    resumeEmpty: "Paste your resume text or upload a file first.",
    jobSearchLabel: "Search jobs:",
    jobBoardsLabel: "Sports job boards:"
  },
  es: {
    tagline: "Descubre Tu Camino. Crea Tu Impacto.",
    tabPassport: "Pasaporte Deportivo",
    tabCreator: "Estudio Creativo",
    pNameLabel: "Nombre",
    pNamePlaceholder: "ej. Luis Juárez",
    pLocationLabel: "Ubicación",
    pLocationPlaceholder: "ej. Los Ángeles, CA",
    pRoleLabel: "Rol / experiencia actual",
    rolePlayer: "Jugador",
    roleFormerPlayer: "Ex-Jugador",
    roleCoach: "Entrenador",
    roleStudent: "Estudiante",
    roleContentCreator: "Creador de Contenido",
    roleFan: "Aficionado",
    roleOther: "Otro",
    skillsLabel: "Habilidades (selecciona todas las que apliquen)",
    skillVideoEditing: "Edición de Video",
    skillWriting: "Escritura",
    skillCoaching: "Entrenamiento",
    skillDataAnalytics: "Datos y Análisis",
    skillSocialMedia: "Redes Sociales",
    skillPlayingExperience: "Experiencia como Jugador",
    skillEventManagement: "Gestión de Eventos",
    skillMarketingSales: "Marketing y Ventas",
    skillPhotographyDesign: "Fotografía / Diseño",
    skillBroadcasting: "Locución / Frente a Cámara",
    interestsLabel: "Intereses (selecciona todos los que apliquen)",
    interestContentCreation: "Creación de Contenido",
    interestCoachingDev: "Entrenamiento y Desarrollo de Jugadores",
    interestScouting: "Scouting y Análisis",
    interestJournalism: "Periodismo y Locución",
    interestMarketing: "Marketing y Patrocinios",
    interestEventOps: "Operaciones de Eventos",
    interestFrontOffice: "Front Office / Operaciones de Equipo",
    interestPersonalBrand: "Construcción de Marca Personal",
    pGoalLabel: "Objetivo profesional",
    goalMedia: "Entrar en medios deportivos / contenido",
    goalCoach: "Convertirme en entrenador",
    goalFrontOffice: "Trabajar en la oficina de un equipo",
    goalBrand: "Construir mi propia marca personal",
    goalAnalytics: "Convertirme en scout / analista",
    goalExplore: "Aún explorando",
    findMyFit: "Encontrar Mi Camino",
    yourPassport: "Tu Pasaporte Deportivo",
    teamALabel: "Equipo A",
    teamAPlaceholder: "ej. Arsenal",
    teamBLabel: "Equipo B",
    teamBPlaceholder: "ej. Chelsea",
    scoreALabel: "Marcador A",
    scoreBLabel: "Marcador B",
    sportLabel: "Deporte",
    sportSoccer: "Fútbol",
    sportBasketball: "Baloncesto",
    sportFootball: "Fútbol Americano",
    sportBaseball: "Béisbol",
    sportOther: "Otro",
    momentTypeLabel: "¿Qué tipo de momento fue?",
    momentComeback: "Remontada",
    momentBlowout: "Paliza",
    momentBuzzer: "Victoria de Último Minuto",
    momentUpset: "Sorpresa",
    momentControversial: "Jugada Polémica",
    momentMilestone: "Hito / Récord",
    momentClose: "Partido Cerrado y Reñido",
    momentOther: "Otro",
    keyMomentLabel: "Momento clave",
    keyMomentPlaceholder: "ej. Empate al minuto 89 de tiro de esquina",
    observationLabel: "Tu opinión / observación (opcional)",
    observationPlaceholder: "ej. Su defensa se desmoronó tras la tarjeta roja",
    generateContent: "Generar Ideas de Contenido",
    regenerate: "Regenerar",
    contentHook: "Gancho de Contenido",
    videoIdea: "Idea de Video Corto",
    engagementQuestion: "Pregunta de Interacción",
    captionLabel: "Descripción",
    voiceoverScript: "Guion de Voz en Off",
    playVoiceover: "▶ Reproducir Voz en Off",
    stopVoiceover: "■ Detener",
    copyScript: "Copiar Guion",
    ttsWarning: "Tu navegador no admite la reproducción de voz integrada. Aún puedes leer/copiar el guion de arriba.",
    nextStepLabel: "Siguiente paso:",
    matchedOnLabel: "Coincide con:",
    selectMoreSkills: "Selecciona algunas habilidades o intereses más para ver coincidencias de carreras.",
    copiedLabel: "¡Copiado!",
    youFallback: "Tú",
    beatHook: "Gancho",
    beatSetup: "Contexto",
    beatMoment: "El Momento",
    beatYourTake: "Tu Opinión",
    beatCTA: "Llamado a la Acción",
    tailoredFor: "Personalizado para {name} — {goal}",
    defaultTakeLine: "Este es exactamente el tipo de momento que decide los partidos.",
    setupLine: "{teamA} {scoreA} - {scoreB} {teamB}. Esto es lo que pasó.",
    resumeImportTitle: "Importar desde tu currículum (opcional)",
    resumePrivacy: "Se lee en tu dispositivo. Nunca se sube.",
    resumeLabel: "O pega el texto de tu currículum",
    resumePlaceholder: "Pega aquí el texto de tu currículum o perfil de LinkedIn…",
    resumeFileLabel: "Sube tu currículum (PDF o .txt)",
    resumeUploaded: "Subido:",
    resumeRemove: "Quitar archivo",
    showOpenings: "Ver ofertas en vivo",
    loadingOpenings: "Cargando ofertas…",
    openingsNotConfigured: "Las ofertas en vivo aún no están activadas. Usa los enlaces de búsqueda de arriba.",
    openingsError: "No se pudieron cargar las ofertas ahora. Usa los enlaces de búsqueda de arriba.",
    openingsNone: "No se encontraron ofertas recientes. Prueba los enlaces de búsqueda de arriba o amplía tu ubicación.",
    resumeAnalyze: "Analizar Currículum",
    resumeTip: "Consejo: en LinkedIn, Más → Guardar en PDF.",
    resumeDetectedSkills: "Habilidades detectadas",
    resumeDetectedInterests: "Intereses detectados",
    resumeFound: "Encontrado:",
    resumeNothingFound: "No se encontraron habilidades coincidentes. Prueba pegando más de tu currículum o selecciona tus habilidades manualmente abajo.",
    resumeApplied: "Se agregaron al formulario del Pasaporte Deportivo de abajo. Se conservaron tus selecciones existentes.",
    resumeGoToPassport: "Revisar mi Pasaporte Deportivo",
    resumeUnsupportedFile: "Sube un archivo PDF o .txt. Para currículums en Word, abre el archivo, copia el texto y pégalo arriba.",
    resumePdfError: "No se pudo leer el texto de este PDF (puede ser una imagen escaneada). Prueba copiando y pegando el texto.",
    resumeReading: "Leyendo archivo…",
    resumeEmpty: "Primero pega el texto de tu currículum o sube un archivo.",
    jobSearchLabel: "Buscar empleos:",
    jobBoardsLabel: "Portales de empleo deportivo:"
  },
  zh: {
    tagline: "发现你的方向，创造你的影响力。",
    tabPassport: "体育护照",
    tabCreator: "创作工作室",
    pNameLabel: "姓名",
    pNamePlaceholder: "例如：路易斯·华雷斯",
    pLocationLabel: "所在地",
    pLocationPlaceholder: "例如：洛杉矶，加利福尼亚州",
    pRoleLabel: "当前身份/经历",
    rolePlayer: "球员",
    roleFormerPlayer: "退役球员",
    roleCoach: "教练",
    roleStudent: "学生",
    roleContentCreator: "内容创作者",
    roleFan: "球迷/爱好者",
    roleOther: "其他",
    skillsLabel: "技能（可多选）",
    skillVideoEditing: "视频剪辑",
    skillWriting: "写作",
    skillCoaching: "教练指导",
    skillDataAnalytics: "数据与分析",
    skillSocialMedia: "社交媒体",
    skillPlayingExperience: "球员经验",
    skillEventManagement: "赛事管理",
    skillMarketingSales: "市场与销售",
    skillPhotographyDesign: "摄影/设计",
    skillBroadcasting: "解说/镜头表现",
    interestsLabel: "兴趣（可多选）",
    interestContentCreation: "内容创作",
    interestCoachingDev: "教练与球员发展",
    interestScouting: "球探与数据分析",
    interestJournalism: "新闻与解说",
    interestMarketing: "市场与赞助",
    interestEventOps: "赛事运营",
    interestFrontOffice: "球队管理层/运营",
    interestPersonalBrand: "打造个人品牌",
    pGoalLabel: "职业目标",
    goalMedia: "进入体育媒体/内容行业",
    goalCoach: "成为教练",
    goalFrontOffice: "在球队管理层工作",
    goalBrand: "打造我自己的个人品牌",
    goalAnalytics: "成为球探/分析师",
    goalExplore: "还在探索中",
    findMyFit: "找到我的方向",
    yourPassport: "你的体育护照",
    teamALabel: "球队 A",
    teamAPlaceholder: "例如：阿森纳",
    teamBLabel: "球队 B",
    teamBPlaceholder: "例如：切尔西",
    scoreALabel: "比分 A",
    scoreBLabel: "比分 B",
    sportLabel: "运动项目",
    sportSoccer: "足球",
    sportBasketball: "篮球",
    sportFootball: "美式橄榄球",
    sportBaseball: "棒球",
    sportOther: "其他",
    momentTypeLabel: "这是什么类型的时刻？",
    momentComeback: "逆转",
    momentBlowout: "大胜",
    momentBuzzer: "绝杀/最后一刻取胜",
    momentUpset: "爆冷",
    momentControversial: "争议判罚",
    momentMilestone: "里程碑/纪录",
    momentClose: "势均力敌的胶着比赛",
    momentOther: "其他",
    keyMomentLabel: "关键时刻",
    keyMomentPlaceholder: "例如：第89分钟角球扳平比分",
    observationLabel: "你的看法/观察（可选）",
    observationPlaceholder: "例如：红牌之后他们的防线崩溃了",
    generateContent: "生成内容创意",
    regenerate: "重新生成",
    contentHook: "内容开场白",
    videoIdea: "短视频创意",
    engagementQuestion: "互动问题",
    captionLabel: "文案",
    voiceoverScript: "配音脚本",
    playVoiceover: "▶ 播放配音",
    stopVoiceover: "■ 停止",
    copyScript: "复制脚本",
    ttsWarning: "你的浏览器不支持内置语音朗读。你仍然可以阅读/复制上面的脚本。",
    nextStepLabel: "下一步：",
    matchedOnLabel: "匹配依据：",
    selectMoreSkills: "请再选择一些技能或兴趣，以查看职业方向匹配结果。",
    copiedLabel: "已复制！",
    youFallback: "你",
    beatHook: "开场",
    beatSetup: "背景",
    beatMoment: "关键时刻",
    beatYourTake: "你的看法",
    beatCTA: "行动号召",
    tailoredFor: "为{name}定制 — {goal}",
    defaultTakeLine: "这正是决定比赛走向的关键时刻。",
    setupLine: "{teamA} {scoreA} - {scoreB} {teamB}。事情是这样的。",
    resumeImportTitle: "从简历导入（可选）",
    resumePrivacy: "只在你的设备上读取，绝不上传。",
    resumeLabel: "或粘贴你的简历文本",
    resumePlaceholder: "在此粘贴你的简历或领英（LinkedIn）个人资料文本……",
    resumeFileLabel: "上传你的简历（PDF 或 .txt）",
    resumeUploaded: "已上传：",
    resumeRemove: "移除文件",
    showOpenings: "查看实时职位",
    loadingOpenings: "正在加载职位……",
    openingsNotConfigured: "实时职位功能尚未启用。请使用上方的搜索链接。",
    openingsError: "暂时无法加载职位。请使用上方的搜索链接。",
    openingsNone: "未找到近期职位。请尝试上方的搜索链接或扩大地点范围。",
    resumeAnalyze: "分析简历",
    resumeTip: "提示：在 LinkedIn 点“更多”→“存为 PDF”。",
    resumeDetectedSkills: "识别到的技能",
    resumeDetectedInterests: "识别到的兴趣",
    resumeFound: "匹配内容：",
    resumeNothingFound: "未找到匹配的技能。请尝试粘贴更多简历内容，或在下方手动选择技能。",
    resumeApplied: "已添加到下方的体育护照表单，你原有的选择已保留。",
    resumeGoToPassport: "查看我的体育护照",
    resumeUnsupportedFile: "请上传 PDF 或 .txt 文件。Word 简历请打开文件，复制文本并粘贴到上方。",
    resumePdfError: "无法读取此 PDF 中的文字（可能是扫描图片）。请尝试复制并粘贴文本。",
    resumeReading: "正在读取文件……",
    resumeEmpty: "请先粘贴简历文本或上传文件。",
    jobSearchLabel: "搜索职位：",
    jobBoardsLabel: "体育招聘网站："
  },
  ar: {
    tagline: "اكتشف طريقك. اصنع تأثيرك.",
    tabPassport: "جواز السفر الرياضي",
    tabCreator: "استوديو الإبداع",
    pNameLabel: "الاسم",
    pNamePlaceholder: "مثال: لويس خواريز",
    pLocationLabel: "الموقع",
    pLocationPlaceholder: "مثال: لوس أنجلوس، كاليفورنيا",
    pRoleLabel: "الدور / الخبرة الحالية",
    rolePlayer: "لاعب",
    roleFormerPlayer: "لاعب سابق",
    roleCoach: "مدرب",
    roleStudent: "طالب",
    roleContentCreator: "صانع محتوى",
    roleFan: "مشجع / هاوٍ",
    roleOther: "أخرى",
    skillsLabel: "المهارات (اختر كل ما ينطبق)",
    skillVideoEditing: "مونتاج الفيديو",
    skillWriting: "الكتابة",
    skillCoaching: "التدريب",
    skillDataAnalytics: "البيانات والتحليل",
    skillSocialMedia: "وسائل التواصل الاجتماعي",
    skillPlayingExperience: "خبرة اللعب",
    skillEventManagement: "إدارة الفعاليات",
    skillMarketingSales: "التسويق والمبيعات",
    skillPhotographyDesign: "التصوير / التصميم",
    skillBroadcasting: "الإذاعة / الظهور أمام الكاميرا",
    interestsLabel: "الاهتمامات (اختر كل ما ينطبق)",
    interestContentCreation: "صناعة المحتوى",
    interestCoachingDev: "التدريب وتطوير اللاعبين",
    interestScouting: "الكشف عن المواهب والتحليل",
    interestJournalism: "الصحافة والإذاعة",
    interestMarketing: "التسويق والرعاية",
    interestEventOps: "تنظيم الفعاليات",
    interestFrontOffice: "الإدارة التنفيذية / عمليات الفريق",
    interestPersonalBrand: "بناء العلامة الشخصية",
    pGoalLabel: "الهدف المهني",
    goalMedia: "الدخول إلى الإعلام الرياضي / المحتوى",
    goalCoach: "أن أصبح مدربًا",
    goalFrontOffice: "العمل في الإدارة التنفيذية لفريق",
    goalBrand: "بناء علامتي الشخصية",
    goalAnalytics: "أن أصبح كشّاف مواهب / محلل",
    goalExplore: "ما زلت أستكشف",
    findMyFit: "اكتشف مسيرتي",
    yourPassport: "جواز سفرك الرياضي",
    teamALabel: "الفريق أ",
    teamAPlaceholder: "مثال: أرسنال",
    teamBLabel: "الفريق ب",
    teamBPlaceholder: "مثال: تشيلسي",
    scoreALabel: "نتيجة أ",
    scoreBLabel: "نتيجة ب",
    sportLabel: "الرياضة",
    sportSoccer: "كرة القدم",
    sportBasketball: "كرة السلة",
    sportFootball: "كرة القدم الأمريكية",
    sportBaseball: "البيسبول",
    sportOther: "أخرى",
    momentTypeLabel: "ما نوع اللحظة؟",
    momentComeback: "عودة قوية",
    momentBlowout: "فوز ساحق",
    momentBuzzer: "فوز في اللحظات الأخيرة",
    momentUpset: "مفاجأة",
    momentControversial: "قرار مثير للجدل",
    momentMilestone: "إنجاز / رقم قياسي",
    momentClose: "مباراة متقاربة ومتبادلة",
    momentOther: "أخرى",
    keyMomentLabel: "اللحظة الفاصلة",
    keyMomentPlaceholder: "مثال: تعادل في الدقيقة 89 من ركلة ركنية",
    observationLabel: "رأيك / ملاحظتك (اختياري)",
    observationPlaceholder: "مثال: انهار دفاعهم بعد البطاقة الحمراء",
    generateContent: "توليد أفكار المحتوى",
    regenerate: "إعادة التوليد",
    contentHook: "مقدمة جذابة",
    videoIdea: "فكرة فيديو قصير",
    engagementQuestion: "سؤال تفاعلي",
    captionLabel: "التعليق",
    voiceoverScript: "نص التعليق الصوتي",
    playVoiceover: "▶ تشغيل التعليق الصوتي",
    stopVoiceover: "■ إيقاف",
    copyScript: "نسخ النص",
    ttsWarning: "متصفحك لا يدعم تشغيل التحويل الصوتي المدمج. لا يزال بإمكانك قراءة/نسخ النص أعلاه.",
    nextStepLabel: "الخطوة التالية:",
    matchedOnLabel: "التطابق حسب:",
    selectMoreSkills: "اختر بعض المهارات أو الاهتمامات الإضافية لرؤية مسارات مهنية مطابقة.",
    copiedLabel: "تم النسخ!",
    youFallback: "أنت",
    beatHook: "المقدمة",
    beatSetup: "الخلفية",
    beatMoment: "اللحظة",
    beatYourTake: "رأيك",
    beatCTA: "دعوة للتفاعل",
    tailoredFor: "مخصص لـ {name} — {goal}",
    defaultTakeLine: "هذه بالضبط اللحظة التي تحسم المباريات.",
    setupLine: "{teamA} {scoreA} - {scoreB} {teamB}. إليك ما حدث.",
    resumeImportTitle: "الاستيراد من سيرتك الذاتية (اختياري)",
    resumePrivacy: "يُقرأ على جهازك فقط ولا يُرفع أبدًا.",
    resumeLabel: "أو الصق نص سيرتك الذاتية",
    resumePlaceholder: "الصق هنا نص سيرتك الذاتية أو ملفك الشخصي على لينكدإن…",
    resumeFileLabel: "ارفع سيرتك الذاتية (PDF أو .txt)",
    resumeUploaded: "تم الرفع:",
    resumeRemove: "إزالة الملف",
    showOpenings: "عرض الوظائف المتاحة الآن",
    loadingOpenings: "جارٍ تحميل الوظائف…",
    openingsNotConfigured: "الوظائف المباشرة غير مفعّلة بعد. استخدم روابط البحث أعلاه.",
    openingsError: "تعذّر تحميل الوظائف الآن. استخدم روابط البحث أعلاه.",
    openingsNone: "لم يتم العثور على وظائف حديثة. جرّب روابط البحث أعلاه أو وسّع نطاق الموقع.",
    resumeAnalyze: "تحليل السيرة الذاتية",
    resumeTip: "نصيحة: في لينكدإن، المزيد ← حفظ بصيغة PDF.",
    resumeDetectedSkills: "المهارات المكتشفة",
    resumeDetectedInterests: "الاهتمامات المكتشفة",
    resumeFound: "تم العثور على:",
    resumeNothingFound: "لم يتم العثور على مهارات مطابقة. جرّب لصق المزيد من سيرتك الذاتية، أو اختر مهاراتك يدويًا أدناه.",
    resumeApplied: "تمت إضافتها إلى نموذج جواز السفر الرياضي أدناه، وتم الاحتفاظ باختياراتك السابقة.",
    resumeGoToPassport: "مراجعة جواز سفري الرياضي",
    resumeUnsupportedFile: "يرجى رفع ملف PDF أو .txt. بالنسبة لملفات Word، افتح الملف وانسخ النص والصقه أعلاه.",
    resumePdfError: "تعذّرت قراءة النص من ملف PDF هذا (قد يكون صورة ممسوحة ضوئيًا). جرّب نسخ النص ولصقه.",
    resumeReading: "جارٍ قراءة الملف…",
    resumeEmpty: "الصق نص سيرتك الذاتية أو ارفع ملفًا أولاً.",
    jobSearchLabel: "ابحث عن وظائف:",
    jobBoardsLabel: "مواقع الوظائف الرياضية:"
  }
};

const I18N_PROFILE = {
  en: {
    strengthLabel: "Profile strength",
    strengthNext: "Next, add:",
    strengthFull: "Your profile is complete. Keep adding achievements as they happen.",
    updatedLabel: "Last updated",
    pEduLabel: "Education",
    eduNotSet: "Prefer not to say",
    eduHighSchool: "High school",
    eduCollege: "Currently in college",
    eduBachelors: "Bachelor's degree",
    eduGraduate: "Graduate degree",
    pAchLabel: "Achievements & experiences (one per line)",
    pAchPlaceholder: "e.g. Captain of the varsity soccer team\nRan Instagram for my club (2,000 followers)",
    fitLabel: "{n}% fit",
    whyLabel: "Why it matches:",
    haveLabel: "What you already have:",
    gapsLabel: "Gaps to work on:",
    whyBase: "Your profile already shows {have}, which are core to this path.",
    whyGoal: "It also supports your goal: {goal}.",
    whyAch: "Your achievements point to {ach}.",
    haveEdu: "Education: {edu}",
    fromAch: "(from your achievements)",
    noGaps: "No skill gaps. You cover every skill we track for this path.",
    gapAdvice: "Build {skills} to raise your fit.",
    oppTitle: "Check an opportunity",
    oppPlaceholder: "Paste the job or opportunity description here…",
    oppButton: "Check My Fit",
    oppEmpty: "Paste a job or opportunity description first.",
    oppNoSignals: "We couldn't find any skills we track in that text. Try pasting the full description.",
    oppFit: "Fit with your profile: {n}%",
    oppStrong: "Strong match.",
    oppMedium: "Partial match.",
    oppLow: "Stretch opportunity.",
    oppWhy: "You already cover {n} of the {total} skills this posting asks for.",
    oppAsks: "This opportunity asks for:",
    oppDegreeOk: "Degree: the posting mentions a degree and your profile lists one.",
    oppDegreeGap: "Degree: the posting mentions a degree; your profile doesn't list one yet.",
    creatorNote: "Using your Sports Profile: {name}, goal: {goal}.",
    creatorAngle: "Content angle from your profile: lean on your {skill}."
  },
  es: {
    strengthLabel: "Fortaleza del perfil",
    strengthNext: "Siguiente, agrega:",
    strengthFull: "Tu perfil está completo. Sigue agregando logros a medida que ocurran.",
    updatedLabel: "Última actualización",
    pEduLabel: "Educación",
    eduNotSet: "Prefiero no decirlo",
    eduHighSchool: "Preparatoria / secundaria",
    eduCollege: "Cursando la universidad",
    eduBachelors: "Licenciatura",
    eduGraduate: "Posgrado",
    pAchLabel: "Logros y experiencias (uno por línea)",
    pAchPlaceholder: "p. ej. Capitán del equipo universitario de fútbol\nManejé el Instagram de mi club (2,000 seguidores)",
    fitLabel: "{n}% de ajuste",
    whyLabel: "Por qué coincide:",
    haveLabel: "Lo que ya tienes:",
    gapsLabel: "Brechas por trabajar:",
    whyBase: "Tu perfil ya muestra {have}, que son clave para este camino.",
    whyGoal: "También apoya tu objetivo: {goal}.",
    whyAch: "Tus logros apuntan a {ach}.",
    haveEdu: "Educación: {edu}",
    fromAch: "(de tus logros)",
    noGaps: "Sin brechas de habilidades. Cubres todas las habilidades que evaluamos para este camino.",
    gapAdvice: "Desarrolla {skills} para mejorar tu ajuste.",
    oppTitle: "Revisa una oportunidad",
    oppPlaceholder: "Pega aquí la descripción del empleo u oportunidad…",
    oppButton: "Revisar mi ajuste",
    oppEmpty: "Primero pega la descripción de un empleo u oportunidad.",
    oppNoSignals: "No encontramos habilidades que evaluemos en ese texto. Prueba pegando la descripción completa.",
    oppFit: "Ajuste con tu perfil: {n}%",
    oppStrong: "Coincidencia fuerte.",
    oppMedium: "Coincidencia parcial.",
    oppLow: "Oportunidad de reto.",
    oppWhy: "Ya cubres {n} de las {total} habilidades que pide esta oferta.",
    oppAsks: "Esta oportunidad pide:",
    oppDegreeOk: "Título: la oferta menciona un título y tu perfil incluye uno.",
    oppDegreeGap: "Título: la oferta menciona un título; tu perfil aún no incluye uno.",
    creatorNote: "Usando tu Perfil Deportivo: {name}, objetivo: {goal}.",
    creatorAngle: "Enfoque de contenido según tu perfil: apóyate en tu {skill}."
  },
  zh: {
    strengthLabel: "档案完整度",
    strengthNext: "下一步，请补充：",
    strengthFull: "你的档案已完整。有新成就时请继续添加。",
    updatedLabel: "最近更新",
    pEduLabel: "学历",
    eduNotSet: "不愿透露",
    eduHighSchool: "高中",
    eduCollege: "在读大学生",
    eduBachelors: "本科学位",
    eduGraduate: "研究生学位",
    pAchLabel: "成就与经历（每行一条）",
    pAchPlaceholder: "例如：校足球队队长\n为俱乐部运营Instagram（2,000名粉丝）",
    fitLabel: "匹配度 {n}%",
    whyLabel: "匹配原因：",
    haveLabel: "你已具备：",
    gapsLabel: "需要提升：",
    whyBase: "你的档案已体现{have}，这些是该方向的核心能力。",
    whyGoal: "这也符合你的目标：{goal}。",
    whyAch: "你的成就体现了{ach}。",
    haveEdu: "学历：{edu}",
    fromAch: "（来自你的成就）",
    noGaps: "没有技能缺口。你已覆盖该方向我们评估的所有技能。",
    gapAdvice: "提升{skills}可提高匹配度。",
    oppTitle: "检查一个机会",
    oppPlaceholder: "在此粘贴职位或机会描述…",
    oppButton: "检查匹配度",
    oppEmpty: "请先粘贴职位或机会描述。",
    oppNoSignals: "在该文本中没有找到我们评估的技能。请尝试粘贴完整描述。",
    oppFit: "与你的档案匹配度：{n}%",
    oppStrong: "高度匹配。",
    oppMedium: "部分匹配。",
    oppLow: "有挑战的机会。",
    oppWhy: "该职位要求的 {total} 项技能中，你已具备 {n} 项。",
    oppAsks: "该机会要求：",
    oppDegreeOk: "学位：职位提到学位要求，你的档案中有学历。",
    oppDegreeGap: "学位：职位提到学位要求，你的档案中尚未填写学历。",
    creatorNote: "正在使用你的体育档案：{name}，目标：{goal}。",
    creatorAngle: "根据你的档案的内容角度：发挥你的{skill}。"
  },
  ar: {
    strengthLabel: "قوة الملف",
    strengthNext: "التالي، أضف:",
    strengthFull: "ملفك مكتمل. استمر في إضافة إنجازاتك عند حدوثها.",
    updatedLabel: "آخر تحديث",
    pEduLabel: "التعليم",
    eduNotSet: "أفضّل عدم الذكر",
    eduHighSchool: "المرحلة الثانوية",
    eduCollege: "أدرس حاليًا في الجامعة",
    eduBachelors: "درجة البكالوريوس",
    eduGraduate: "دراسات عليا",
    pAchLabel: "الإنجازات والخبرات (واحد في كل سطر)",
    pAchPlaceholder: "مثال: قائد فريق كرة القدم الجامعي\nأدرت حساب إنستغرام لناديي (2,000 متابع)",
    fitLabel: "توافق {n}%",
    whyLabel: "سبب التوافق:",
    haveLabel: "ما لديك بالفعل:",
    gapsLabel: "فجوات تحتاج إلى العمل عليها:",
    whyBase: "يُظهر ملفك بالفعل {have}، وهي أساسية لهذا المسار.",
    whyGoal: "كما أنه يدعم هدفك: {goal}.",
    whyAch: "تشير إنجازاتك إلى {ach}.",
    haveEdu: "التعليم: {edu}",
    fromAch: "(من إنجازاتك)",
    noGaps: "لا توجد فجوات في المهارات. أنت تغطي كل المهارات التي نقيّمها لهذا المسار.",
    gapAdvice: "طوّر {skills} لرفع مستوى التوافق.",
    oppTitle: "افحص فرصة",
    oppPlaceholder: "الصق وصف الوظيفة أو الفرصة هنا…",
    oppButton: "افحص توافقي",
    oppEmpty: "الصق وصف وظيفة أو فرصة أولًا.",
    oppNoSignals: "لم نجد مهارات نقيّمها في هذا النص. جرّب لصق الوصف الكامل.",
    oppFit: "التوافق مع ملفك: {n}%",
    oppStrong: "توافق قوي.",
    oppMedium: "توافق جزئي.",
    oppLow: "فرصة تحدٍّ.",
    oppWhy: "أنت تغطي {n} من أصل {total} مهارات يطلبها هذا الإعلان.",
    oppAsks: "تطلب هذه الفرصة:",
    oppDegreeOk: "الشهادة: يذكر الإعلان شهادة جامعية وملفك يتضمن واحدة.",
    oppDegreeGap: "الشهادة: يذكر الإعلان شهادة جامعية ولم يتضمن ملفك واحدة بعد.",
    creatorNote: "باستخدام ملفك الرياضي: {name}، الهدف: {goal}.",
    creatorAngle: "زاوية المحتوى من ملفك: اعتمد على {skill}."
  }
};

const I18N_AI = {
  en: {
    aiUsingProfile: "Using your Sports Profile: {role}, goal: {goal}.",
    aiNoProfile: "Build your Sports Profile first so answers are about you, not generic advice.",
    aiSuggest1: "What should I do next?",
    aiSuggest2: "Which match fits me best and why?",
    aiSuggest3: "How do I close my biggest gap?",
    aiPlaceholder: "e.g. What should I do this month to get closer to my goal?",
    aiAsk: "Ask",
    aiClear: "Clear conversation",
    aiThinking: "Thinking…",
    aiYou: "You",
    aiCoach: "AI Coach",
    aiPrivacy: "Private: your questions aren't stored.",
    aiEmpty: "Type a question first.",
    aiErrNotEnabled: "AI answers aren't enabled yet.",
    aiErrBusy: "Too many requests right now. Try again in a few minutes.",
    aiErrRefused: "The AI couldn't answer that. Try rephrasing your question.",
    aiErrGeneric: "Something went wrong. Try again.",
    aiWriteBtn: "Write with AI",
    aiWriteTitle: "AI-written draft",
    aiWriteNeedsGame: "Fill in both teams, the scores and the key moment first."
  },
  es: {
    aiUsingProfile: "Usando tu Perfil Deportivo: {role}, objetivo: {goal}.",
    aiNoProfile: "Crea primero tu Perfil Deportivo para que las respuestas hablen de ti, no de consejos genéricos.",
    aiSuggest1: "¿Qué debería hacer ahora?",
    aiSuggest2: "¿Qué coincidencia me va mejor y por qué?",
    aiSuggest3: "¿Cómo cierro mi mayor carencia?",
    aiPlaceholder: "p. ej. ¿Qué debería hacer este mes para acercarme a mi objetivo?",
    aiAsk: "Preguntar",
    aiClear: "Borrar conversación",
    aiThinking: "Pensando…",
    aiYou: "Tú",
    aiCoach: "Coach IA",
    aiPrivacy: "Privado: tus preguntas no se guardan.",
    aiEmpty: "Escribe una pregunta primero.",
    aiErrNotEnabled: "Las respuestas con IA aún no están activadas.",
    aiErrBusy: "Demasiadas solicitudes ahora mismo. Inténtalo de nuevo en unos minutos.",
    aiErrRefused: "La IA no pudo responder a eso. Prueba a reformular la pregunta.",
    aiErrGeneric: "Algo salió mal. Inténtalo de nuevo.",
    aiWriteBtn: "Escribir con IA",
    aiWriteTitle: "Borrador escrito con IA",
    aiWriteNeedsGame: "Primero completa ambos equipos, el marcador y la jugada clave."
  },
  zh: {
    aiUsingProfile: "正在使用你的体育档案：{role}，目标：{goal}。",
    aiNoProfile: "请先建立你的体育档案，这样回答才会针对你，而不是泛泛而谈。",
    aiSuggest1: "我下一步该做什么？",
    aiSuggest2: "哪个匹配最适合我？为什么？",
    aiSuggest3: "我该如何弥补最大的差距？",
    aiPlaceholder: "例如：这个月我该做什么来更接近目标？",
    aiAsk: "提问",
    aiClear: "清除对话",
    aiThinking: "思考中…",
    aiYou: "你",
    aiCoach: "AI 教练",
    aiPrivacy: "隐私：你的提问不会被保存。",
    aiEmpty: "请先输入问题。",
    aiErrNotEnabled: "AI 回答功能尚未启用。",
    aiErrBusy: "当前请求过多，请几分钟后再试。",
    aiErrRefused: "AI 无法回答这个问题，请换个说法再试。",
    aiErrGeneric: "出了点问题，请重试。",
    aiWriteBtn: "用 AI 撰写",
    aiWriteTitle: "AI 撰写的草稿",
    aiWriteNeedsGame: "请先填写两支球队、比分和关键时刻。"
  },
  ar: {
    aiUsingProfile: "باستخدام ملفك الرياضي: {role}، الهدف: {goal}.",
    aiNoProfile: "أنشئ ملفك الرياضي أولًا لتكون الإجابات عنك أنت، لا نصائح عامة.",
    aiSuggest1: "ماذا أفعل بعد ذلك؟",
    aiSuggest2: "أي توافق يناسبني أكثر ولماذا؟",
    aiSuggest3: "كيف أسد أكبر فجوة لدي؟",
    aiPlaceholder: "مثال: ماذا أفعل هذا الشهر لأقترب من هدفي؟",
    aiAsk: "اسأل",
    aiClear: "مسح المحادثة",
    aiThinking: "جارٍ التفكير…",
    aiYou: "أنت",
    aiCoach: "مدرب الذكاء الاصطناعي",
    aiPrivacy: "خاص: لا تُحفظ أسئلتك.",
    aiEmpty: "اكتب سؤالًا أولًا.",
    aiErrNotEnabled: "إجابات الذكاء الاصطناعي غير مفعّلة بعد.",
    aiErrBusy: "طلبات كثيرة الآن. حاول مرة أخرى بعد بضع دقائق.",
    aiErrRefused: "تعذّر على الذكاء الاصطناعي الإجابة. جرّب صياغة سؤالك بطريقة أخرى.",
    aiErrGeneric: "حدث خطأ ما. حاول مرة أخرى.",
    aiWriteBtn: "اكتب بالذكاء الاصطناعي",
    aiWriteTitle: "مسودة مكتوبة بالذكاء الاصطناعي",
    aiWriteNeedsGame: "املأ الفريقين والنتيجة واللحظة الحاسمة أولًا."
  }
};
const I18N_ACCOUNT = {
  en: {
    accSignIn: "Sign in",
    accEmailLabel: "Email",
    accEmailPlaceholder: "you@example.com",
    accSendLink: "Email me a sign-in link",
    accLinkSent: "Check your email for a sign-in link.",
    accEmailInvalid: "Enter a valid email address.",
    accSignedInAs: "Signed in as {email}",
    accSignOut: "Sign out",
    accError: "Something went wrong. Try again.",
    accDelete: "Delete my saved profile",
    accDeleteConfirm: "Delete your Sports Profile from your account and this device? This can't be undone.",
    accDeleted: "Your saved profile was deleted.",
    syncLocal: "Saved on this device only. Sign in to keep it on every device.",
    syncSaving: "Saving to your account…",
    syncSaved: "Saved to your account.",
    syncLoaded: "Loaded your profile from your account.",
    syncFailed: "Couldn't save to your account. It's still saved on this device."
  },
  es: {
    accSignIn: "Iniciar sesión",
    accEmailLabel: "Correo electrónico",
    accEmailPlaceholder: "tu@ejemplo.com",
    accSendLink: "Envíame un enlace para entrar",
    accLinkSent: "Revisa tu correo: te enviamos un enlace para entrar.",
    accEmailInvalid: "Escribe un correo electrónico válido.",
    accSignedInAs: "Sesión iniciada como {email}",
    accSignOut: "Cerrar sesión",
    accError: "Algo salió mal. Inténtalo de nuevo.",
    accDelete: "Eliminar mi perfil guardado",
    accDeleteConfirm: "¿Eliminar tu Perfil Deportivo de tu cuenta y de este dispositivo? No se puede deshacer.",
    accDeleted: "Tu perfil guardado se eliminó.",
    syncLocal: "Guardado solo en este dispositivo. Inicia sesión para tenerlo en todos tus dispositivos.",
    syncSaving: "Guardando en tu cuenta…",
    syncSaved: "Guardado en tu cuenta.",
    syncLoaded: "Se cargó tu perfil desde tu cuenta.",
    syncFailed: "No se pudo guardar en tu cuenta. Sigue guardado en este dispositivo."
  },
  zh: {
    accSignIn: "登录",
    accEmailLabel: "电子邮箱",
    accEmailPlaceholder: "you@example.com",
    accSendLink: "给我发送登录链接",
    accLinkSent: "请查收邮件中的登录链接。",
    accEmailInvalid: "请输入有效的电子邮箱地址。",
    accSignedInAs: "已登录：{email}",
    accSignOut: "退出登录",
    accError: "出了点问题，请重试。",
    accDelete: "删除我保存的档案",
    accDeleteConfirm: "要从你的账户和此设备中删除你的体育档案吗？此操作无法撤销。",
    accDeleted: "你保存的档案已删除。",
    syncLocal: "仅保存在此设备上。登录后即可在所有设备上使用。",
    syncSaving: "正在保存到你的账户…",
    syncSaved: "已保存到你的账户。",
    syncLoaded: "已从你的账户加载档案。",
    syncFailed: "无法保存到你的账户，但仍保存在此设备上。"
  },
  ar: {
    accSignIn: "تسجيل الدخول",
    accEmailLabel: "البريد الإلكتروني",
    accEmailPlaceholder: "you@example.com",
    accSendLink: "أرسل لي رابط تسجيل الدخول",
    accLinkSent: "تحقق من بريدك الإلكتروني للحصول على رابط تسجيل الدخول.",
    accEmailInvalid: "أدخل عنوان بريد إلكتروني صالحًا.",
    accSignedInAs: "تم تسجيل الدخول باسم {email}",
    accSignOut: "تسجيل الخروج",
    accError: "حدث خطأ ما. حاول مرة أخرى.",
    accDelete: "حذف ملفي المحفوظ",
    accDeleteConfirm: "هل تريد حذف ملفك الرياضي من حسابك ومن هذا الجهاز؟ لا يمكن التراجع عن ذلك.",
    accDeleted: "تم حذف ملفك المحفوظ.",
    syncLocal: "محفوظ على هذا الجهاز فقط. سجّل الدخول للاحتفاظ به على كل أجهزتك.",
    syncSaving: "جارٍ الحفظ في حسابك…",
    syncSaved: "تم الحفظ في حسابك.",
    syncLoaded: "تم تحميل ملفك من حسابك.",
    syncFailed: "تعذّر الحفظ في حسابك. لا يزال محفوظًا على هذا الجهاز."
  }
};
const I18N_BRAND = {
  en: {
    brandByline: "by LJSOCCER · @ljsoccer01",
    proOpen: "Go Pro",
    proSee: "See Pro",
    proTitle: "LJSportMind Pro",
    proIntro: "Unlock the AI Coach and AI-written posts for $4.99 a month. Free while in early access — join the waitlist.",
    proColFeature: "Feature",
    proColFree: "Free",
    proColPro: "Pro · $4.99/mo",
    proRowProfile: "Sports Profile and account sync",
    proRowMatches: "Career matches and opportunity check",
    proRowTemplates: "Creator Studio templates",
    proRowCoach: "AI Coach",
    proRowDrafts: "Write with AI drafts",
    proEarly: "Free in early access",
    proJoin: "Join the Pro waitlist",
    proJoined: "You're on the list. We'll email you when Pro launches.",
    proAlready: "You're already on the list.",
    proNoWaitlist: "The waitlist opens soon. Follow @ljsoccer01 on TikTok for the launch.",
    proBrandTitle: "Made by LJSOCCER",
    proBrandBody: "Follow @ljsoccer01 on TikTok for soccer content, app tips and the Pro launch.",
    proSponsor: "Brands: to sponsor LJSOCCER, message @ljsoccer01 on TikTok.",
    footerFollow: "Follow @ljsoccer01 on TikTok",
    footerBy: "LJSportMind by LJSOCCER",
    creditText: "Made with LJSportMind by @ljsoccer01",
    studioKicker: "Creator Studio",
    fpTitle: "Your Sports Fingerprint",
    fpBody: "Yours alone. Each ring turns gold as you add a skill or interest.",
    fpId: "Fingerprint ID: {id}",
    readyTitle: "Ready for what?",
    readyGoal: "Your goal: {goal} → {path}",
    readyLevel: "Readiness: {n}%",
    readyHave: "You have:",
    readyGaps: "Still to build:",
    readyStageBuilding: "Building: work on one gap at a time.",
    readyStageClose: "Close: a few gaps left before you're ready.",
    readyStageReady: "Ready: you cover what this goal asks for.",
    memTitle: "Since your baseline",
    memBaseline: "Baseline set {date}. Save again as you grow to see your progress.",
    memSince: "Compared with your baseline from {date}:",
    memNewTags: "+{n} new skills or interests: {list}",
    memAch: "{n} achievements",
    memStrength: "Profile strength {a}% → {b}%",
    memReady: "Readiness {a}% → {b}%",
    memNoChange: "No change yet. Add a new skill or achievement and save.",
    memSaves: "{n} saved snapshots",
    studioTitle: "Turn one moment into a post that hits.",
    copyCaption: "Copy Caption",
    aiEarlyAccess: "Free in early access.",
    proIntroLive: "Unlock the AI Coach and AI-written posts for $4.99 a month. Every subscription backs LJSOCCER.",
    proBuyTitle: "Upgrade to Pro",
    proBuyBody: "Pay securely with Stripe. Cancel anytime from Manage subscription.",
    proBuyBtn: "Upgrade to Pro · $4.99/month",
    proSignInFirst: "Sign in first so Pro is linked to your account.",
    proSignInBtn: "Sign in to upgrade",
    proIsProTitle: "You're Pro",
    proIsPro: "You're on Pro. Thanks for supporting LJSOCCER!",
    proManage: "Manage subscription",
    proRedirecting: "Opening secure checkout…",
    proActivating: "Payment received. Activating Pro…",
    proWelcome: "Welcome to Pro!",
    proCanceled: "Checkout canceled. You weren't charged.",
    proBadge: "Pro ✓",
    aiProOnly: "AI Coach is part of Pro.",
    aiErrSignIn: "Sign in and join Pro to use the AI Coach.",
    aiErrPro: "The AI Coach is part of Pro. Upgrade on the Pro page."
  },
  es: {
    brandByline: "por LJSOCCER · @ljsoccer01",
    proOpen: "Hazte Pro",
    proSee: "Ver Pro",
    proTitle: "LJSportMind Pro",
    proIntro: "Desbloquea el Coach IA y los posts escritos con IA por $4.99 al mes. Gratis durante el acceso anticipado: únete a la lista.",
    proColFeature: "Función",
    proColFree: "Gratis",
    proColPro: "Pro · $4.99/mes",
    proRowProfile: "Perfil Deportivo y sincronización de cuenta",
    proRowMatches: "Coincidencias profesionales y revisión de oportunidades",
    proRowTemplates: "Plantillas del Estudio de Creadores",
    proRowCoach: "Coach IA",
    proRowDrafts: "Borradores con IA",
    proEarly: "Gratis en acceso anticipado",
    proJoin: "Unirme a la lista de espera de Pro",
    proJoined: "Ya estás en la lista. Te escribiremos cuando salga Pro.",
    proAlready: "Ya estabas en la lista.",
    proNoWaitlist: "La lista de espera abre pronto. Sigue a @ljsoccer01 en TikTok para enterarte del lanzamiento.",
    proBrandTitle: "Hecho por LJSOCCER",
    proBrandBody: "Sigue a @ljsoccer01 en TikTok para ver contenido de fútbol, consejos de la app y el lanzamiento de Pro.",
    proSponsor: "Marcas: para patrocinar a LJSOCCER, escribe a @ljsoccer01 en TikTok.",
    footerFollow: "Sigue a @ljsoccer01 en TikTok",
    footerBy: "LJSportMind por LJSOCCER",
    creditText: "Hecho con LJSportMind por @ljsoccer01",
    studioKicker: "Estudio de Creadores",
    fpTitle: "Tu Huella Deportiva",
    fpBody: "Solo tuya. Cada anillo se vuelve dorado al sumar una habilidad o interés.",
    fpId: "ID de huella: {id}",
    readyTitle: "¿Listo para qué?",
    readyGoal: "Tu objetivo: {goal} → {path}",
    readyLevel: "Preparación: {n}%",
    readyHave: "Ya tienes:",
    readyGaps: "Te falta desarrollar:",
    readyStageBuilding: "Construyendo: trabaja una carencia a la vez.",
    readyStageClose: "Cerca: te quedan pocas carencias.",
    readyStageReady: "Listo: cubres lo que pide este objetivo.",
    memTitle: "Desde tu punto de partida",
    memBaseline: "Punto de partida: {date}. Guarda de nuevo a medida que creces para ver tu progreso.",
    memSince: "Comparado con tu punto de partida del {date}:",
    memNewTags: "+{n} habilidades o intereses nuevos: {list}",
    memAch: "{n} logros",
    memStrength: "Fuerza del perfil {a}% → {b}%",
    memReady: "Preparación {a}% → {b}%",
    memNoChange: "Sin cambios todavía. Añade una habilidad o un logro y guarda.",
    memSaves: "{n} registros guardados",
    studioTitle: "Convierte una jugada en un post que pega.",
    copyCaption: "Copiar Caption",
    aiEarlyAccess: "Gratis en acceso anticipado.",
    proIntroLive: "Desbloquea el Coach IA y los posts escritos con IA por $4.99 al mes. Cada suscripción apoya a LJSOCCER.",
    proBuyTitle: "Hazte Pro",
    proBuyBody: "Paga de forma segura con Stripe. Cancela cuando quieras desde Gestionar suscripción.",
    proBuyBtn: "Hazte Pro · $4.99/mes",
    proSignInFirst: "Inicia sesión primero para que Pro quede vinculado a tu cuenta.",
    proSignInBtn: "Inicia sesión para mejorar",
    proIsProTitle: "Eres Pro",
    proIsPro: "Tienes Pro. ¡Gracias por apoyar a LJSOCCER!",
    proManage: "Gestionar suscripción",
    proRedirecting: "Abriendo el pago seguro…",
    proActivating: "Pago recibido. Activando Pro…",
    proWelcome: "¡Bienvenido a Pro!",
    proCanceled: "Pago cancelado. No se te cobró nada.",
    proBadge: "Pro ✓",
    aiProOnly: "El Coach IA es parte de Pro.",
    aiErrSignIn: "Inicia sesión y hazte Pro para usar el Coach IA.",
    aiErrPro: "El Coach IA es parte de Pro. Mejora tu plan en la página Pro."
  },
  zh: {
    brandByline: "LJSOCCER 出品 · @ljsoccer01",
    proOpen: "升级 Pro",
    proSee: "查看 Pro",
    proTitle: "LJSportMind Pro",
    proIntro: "每月 $4.99 解锁 AI 教练和 AI 撰写内容。抢先体验期间免费——加入候补名单。",
    proColFeature: "功能",
    proColFree: "免费",
    proColPro: "Pro · $4.99/月",
    proRowProfile: "体育档案与账户同步",
    proRowMatches: "职业匹配与机会检查",
    proRowTemplates: "创作工作室模板",
    proRowCoach: "AI 教练",
    proRowDrafts: "AI 撰写草稿",
    proEarly: "抢先体验期间免费",
    proJoin: "加入 Pro 候补名单",
    proJoined: "你已加入名单。Pro 上线时我们会发邮件通知你。",
    proAlready: "你已经在名单上了。",
    proNoWaitlist: "候补名单即将开放。关注 TikTok @ljsoccer01 获取上线消息。",
    proBrandTitle: "LJSOCCER 出品",
    proBrandBody: "在 TikTok 关注 @ljsoccer01，获取足球内容、应用技巧和 Pro 上线消息。",
    proSponsor: "品牌合作：想赞助 LJSOCCER，请在 TikTok 私信 @ljsoccer01。",
    footerFollow: "在 TikTok 关注 @ljsoccer01",
    footerBy: "LJSportMind · LJSOCCER 出品",
    creditText: "由 @ljsoccer01 的 LJSportMind 制作",
    studioKicker: "创作工作室",
    fpTitle: "你的体育指纹",
    fpBody: "独属于你。每增加一项技能或兴趣，就有一圈变成金色。",
    fpId: "指纹 ID：{id}",
    readyTitle: "为什么做好准备？",
    readyGoal: "你的目标：{goal} → {path}",
    readyLevel: "准备度：{n}%",
    readyHave: "你已具备：",
    readyGaps: "仍需提升：",
    readyStageBuilding: "积累中：一次专注弥补一个差距。",
    readyStageClose: "接近了：只差几项。",
    readyStageReady: "已就绪：你已覆盖这个目标的要求。",
    memTitle: "与你的起点相比",
    memBaseline: "基线：{date}。成长后再次保存即可查看进步。",
    memSince: "与你 {date} 的起点相比：",
    memNewTags: "新增 {n} 项技能或兴趣：{list}",
    memAch: "成就 {n}",
    memStrength: "档案完整度 {a}% → {b}%",
    memReady: "准备度 {a}% → {b}%",
    memNoChange: "暂无变化。添加新技能或成就后保存。",
    memSaves: "已保存 {n} 次快照",
    studioTitle: "把一个精彩瞬间变成爆款内容。",
    copyCaption: "复制文案",
    aiEarlyAccess: "抢先体验期间免费。",
    proIntroLive: "每月 $4.99 解锁 AI 教练和 AI 撰写内容。每份订阅都在支持 LJSOCCER。",
    proBuyTitle: "升级到 Pro",
    proBuyBody: "通过 Stripe 安全付款。可随时在“管理订阅”中取消。",
    proBuyBtn: "升级到 Pro · $4.99/月",
    proSignInFirst: "请先登录，这样 Pro 会绑定到你的账户。",
    proSignInBtn: "登录后升级",
    proIsProTitle: "你是 Pro 会员",
    proIsPro: "你正在使用 Pro。感谢支持 LJSOCCER！",
    proManage: "管理订阅",
    proRedirecting: "正在打开安全付款页面…",
    proActivating: "已收到付款，正在开通 Pro…",
    proWelcome: "欢迎加入 Pro！",
    proCanceled: "已取消付款，你没有被扣费。",
    proBadge: "Pro ✓",
    aiProOnly: "AI 教练是 Pro 功能。",
    aiErrSignIn: "请登录并加入 Pro 后使用 AI 教练。",
    aiErrPro: "AI 教练是 Pro 功能。请在 Pro 页面升级。"
  },
  ar: {
    brandByline: "من LJSOCCER · @ljsoccer01",
    proOpen: "اشترك في Pro",
    proSee: "اعرض Pro",
    proTitle: "LJSportMind Pro",
    proIntro: "افتح مدرب الذكاء الاصطناعي والمنشورات المكتوبة بالذكاء الاصطناعي مقابل ‎$4.99 شهريًا. مجاني خلال الوصول المبكر — انضم إلى القائمة.",
    proColFeature: "الميزة",
    proColFree: "مجاني",
    proColPro: "Pro · ‎$4.99 شهريًا",
    proRowProfile: "الملف الرياضي ومزامنة الحساب",
    proRowMatches: "التوافقات المهنية وفحص الفرص",
    proRowTemplates: "قوالب استوديو المبدعين",
    proRowCoach: "مدرب الذكاء الاصطناعي",
    proRowDrafts: "مسودات بالذكاء الاصطناعي",
    proEarly: "مجاني خلال الوصول المبكر",
    proJoin: "انضم إلى قائمة انتظار Pro",
    proJoined: "أنت على القائمة. سنراسلك عند إطلاق Pro.",
    proAlready: "أنت على القائمة بالفعل.",
    proNoWaitlist: "قائمة الانتظار تفتح قريبًا. تابع ‎@ljsoccer01 على تيك توك لمعرفة موعد الإطلاق.",
    proBrandTitle: "من صنع LJSOCCER",
    proBrandBody: "تابع ‎@ljsoccer01 على تيك توك لمحتوى كرة القدم ونصائح التطبيق وإطلاق Pro.",
    proSponsor: "للعلامات التجارية: لرعاية LJSOCCER، راسل ‎@ljsoccer01 على تيك توك.",
    footerFollow: "تابع ‎@ljsoccer01 على تيك توك",
    footerBy: "LJSportMind من LJSOCCER",
    creditText: "صُنع باستخدام LJSportMind من ‎@ljsoccer01",
    studioKicker: "استوديو المبدعين",
    fpTitle: "بصمتك الرياضية",
    fpBody: "خاصة بك وحدك. تصبح كل حلقة ذهبية عندما تضيف مهارة أو اهتمامًا.",
    fpId: "معرّف البصمة: {id}",
    readyTitle: "جاهز لماذا؟",
    readyGoal: "هدفك: {goal} ← {path}",
    readyLevel: "الجاهزية: {n}%",
    readyHave: "لديك:",
    readyGaps: "ما زال عليك بناؤه:",
    readyStageBuilding: "قيد البناء: اعمل على فجوة واحدة في كل مرة.",
    readyStageClose: "قريب: بقيت فجوات قليلة.",
    readyStageReady: "جاهز: أنت تغطي ما يتطلبه هذا الهدف.",
    memTitle: "منذ نقطة بدايتك",
    memBaseline: "نقطة البداية: {date}. احفظ مجددًا كلما تطورت لترى تقدمك.",
    memSince: "مقارنةً بنقطة بدايتك في {date}:",
    memNewTags: "+{n} مهارات أو اهتمامات جديدة: {list}",
    memAch: "{n} إنجازات",
    memStrength: "قوة الملف {a}% ← {b}%",
    memReady: "الجاهزية {a}% ← {b}%",
    memNoChange: "لا تغيير بعد. أضف مهارة أو إنجازًا جديدًا واحفظ.",
    memSaves: "{n} لقطات محفوظة",
    studioTitle: "حوّل لحظة واحدة إلى منشور مؤثر.",
    copyCaption: "نسخ النص",
    aiEarlyAccess: "مجاني خلال الوصول المبكر.",
    proIntroLive: "افتح مدرب الذكاء الاصطناعي والمنشورات المكتوبة بالذكاء الاصطناعي مقابل ‎$4.99 شهريًا. كل اشتراك يدعم LJSOCCER.",
    proBuyTitle: "اشترك في Pro",
    proBuyBody: "ادفع بأمان عبر Stripe. ألغِ في أي وقت من إدارة الاشتراك.",
    proBuyBtn: "اشترك في Pro · ‎$4.99 شهريًا",
    proSignInFirst: "سجّل الدخول أولًا ليرتبط Pro بحسابك.",
    proSignInBtn: "سجّل الدخول للترقية",
    proIsProTitle: "أنت مشترك في Pro",
    proIsPro: "أنت مشترك في Pro. شكرًا لدعمك LJSOCCER!",
    proManage: "إدارة الاشتراك",
    proRedirecting: "جارٍ فتح صفحة الدفع الآمنة…",
    proActivating: "تم استلام الدفع. جارٍ تفعيل Pro…",
    proWelcome: "مرحبًا بك في Pro!",
    proCanceled: "تم إلغاء الدفع. لم يتم خصم أي مبلغ.",
    proBadge: "Pro ✓",
    aiProOnly: "مدرب الذكاء الاصطناعي جزء من Pro.",
    aiErrSignIn: "سجّل الدخول واشترك في Pro لاستخدام مدرب الذكاء الاصطناعي.",
    aiErrPro: "مدرب الذكاء الاصطناعي جزء من Pro. قم بالترقية من صفحة Pro."
  }
};
const I18N_SIMPLE = {
  en: {
    toolsTitle: "Put your Passport to work",
    toolCoach: "Ask your AI Coach",
    toolCoachSub: "Advice built on your profile, matches and progress",
    toolOpp: "Check an opportunity",
    toolOppSub: "Paste a job and see how well you fit",
    toolMoveSub: "AI body scan + 2 quick exercises · 1 minute",
    studioTitle: "Last night's game. Today's post.",
    get1: "Hook", get1Sub: "first 2 seconds that stop the scroll",
    get2: "Video plan", get2Sub: "what to film and show",
    get3: "Caption", get3Sub: "with hashtags, ready to paste",
    get4: "Comment starter", get4Sub: "a question fans can't ignore",
    get5: "Voiceover", get5Sub: "a timed script you can play",
    studioTry: "See an example",
    stepGame: "The game",
    stepMoment: "The moment",
    createPost: "Create my post",
    resultsReady: "Your post is ready",
    previewLabel: "Post preview",
    behindPost: "How to make it",
    sharpenAi: "Sharpen with AI",
    exampleMoment: "89th-minute winner off a corner kick",
    exampleTake: "They looked beaten at half-time, then the subs changed everything"
  },
  es: {
    toolsTitle: "Pon tu Pasaporte a trabajar",
    toolCoach: "Pregunta a tu Coach IA",
    toolCoachSub: "Consejos basados en tu perfil, coincidencias y progreso",
    toolOpp: "Revisa una oportunidad",
    toolOppSub: "Pega una oferta y mira cuánto encajas",
    toolMoveSub: "Escaneo corporal con IA + 2 ejercicios rápidos · 1 minuto",
    studioTitle: "El partido de anoche. El post de hoy.",
    get1: "Gancho", get1Sub: "los 2 primeros segundos que frenan el scroll",
    get2: "Plan de video", get2Sub: "qué grabar y mostrar",
    get3: "Caption", get3Sub: "con hashtags, listo para pegar",
    get4: "Pregunta para comentarios", get4Sub: "una pregunta que los fans no pueden ignorar",
    get5: "Voz en off", get5Sub: "un guion con tiempos que puedes reproducir",
    studioTry: "Ver un ejemplo",
    stepGame: "El partido",
    stepMoment: "La jugada",
    createPost: "Crear mi post",
    resultsReady: "Tu post está listo",
    previewLabel: "Vista previa del post",
    behindPost: "Cómo hacerlo",
    sharpenAi: "Mejorar con IA",
    exampleMoment: "Gol de la victoria en el minuto 89 tras un córner",
    exampleTake: "Parecían derrotados en el descanso y los cambios lo cambiaron todo"
  },
  zh: {
    toolsTitle: "让你的档案发挥作用",
    toolCoach: "问问你的 AI 教练",
    toolCoachSub: "基于你的档案、匹配结果和进步给出建议",
    toolOpp: "检查一个机会",
    toolOppSub: "粘贴职位，看看你有多匹配",
    toolMoveSub: "AI 身体扫描 + 2 个快速练习 · 1 分钟",
    studioTitle: "昨晚的比赛，今天的爆款。",
    get1: "开头", get1Sub: "前 2 秒就让人停下滑动",
    get2: "视频方案", get2Sub: "拍什么、展示什么",
    get3: "文案", get3Sub: "带话题标签，直接粘贴",
    get4: "评论引子", get4Sub: "球迷忍不住回答的问题",
    get5: "配音", get5Sub: "可直接播放的分段脚本",
    studioTry: "看一个示例",
    stepGame: "比赛",
    stepMoment: "关键时刻",
    createPost: "生成我的内容",
    resultsReady: "你的内容已就绪",
    previewLabel: "内容预览",
    behindPost: "怎么拍",
    sharpenAi: "用 AI 润色",
    exampleMoment: "第 89 分钟角球破门绝杀",
    exampleTake: "半场时看起来已经输了，换人改变了一切"
  },
  ar: {
    toolsTitle: "اجعل جوازك يعمل لك",
    toolCoach: "اسأل مدربك بالذكاء الاصطناعي",
    toolCoachSub: "نصائح مبنية على ملفك وتوافقاتك وتقدمك",
    toolOpp: "افحص فرصة",
    toolOppSub: "الصق وظيفة واعرف مدى توافقك",
    toolMoveSub: "مسح للجسم بالذكاء الاصطناعي + تمرينان سريعان · دقيقة واحدة",
    studioTitle: "مباراة الأمس. منشور اليوم.",
    get1: "الافتتاحية", get1Sub: "أول ثانيتين توقفان التمرير",
    get2: "خطة الفيديو", get2Sub: "ماذا تصوّر وتعرض",
    get3: "نص المنشور", get3Sub: "مع الوسوم، جاهز للصق",
    get4: "سؤال للتعليقات", get4Sub: "سؤال لا يستطيع المشجعون تجاهله",
    get5: "التعليق الصوتي", get5Sub: "نص بتوقيتات يمكنك تشغيله",
    studioTry: "شاهد مثالًا",
    stepGame: "المباراة",
    stepMoment: "اللحظة",
    createPost: "أنشئ منشوري",
    resultsReady: "منشورك جاهز",
    previewLabel: "معاينة المنشور",
    behindPost: "كيف تصنعه",
    sharpenAi: "حسّنه بالذكاء الاصطناعي",
    exampleMoment: "هدف الفوز في الدقيقة 89 من ركلة ركنية",
    exampleTake: "بدوا مهزومين بين الشوطين، ثم غيّرت التبديلات كل شيء"
  }
};
Object.keys(I18N_PROFILE).forEach((lang) => Object.assign(I18N[lang], I18N_PROFILE[lang], I18N_AI[lang], I18N_ACCOUNT[lang], I18N_BRAND[lang], I18N_SIMPLE[lang]));

function tf(key, vars) {
  return Object.entries(vars || {}).reduce((str, [k, v]) => str.split("{" + k + "}").join(v), t(key));
}

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || I18N.en[key] || key;
}

const TEMPLATES = {
  en: {
    comeback: {
      hook: [
        "Nobody expected {teamA} to walk away with this one after going down early.",
        "{teamA} looked finished — until they weren't.",
        "This is how you erase a deficit: {teamA} vs {teamB}."
      ],
      video: [
        "Frame-by-frame breakdown of the exact moment {teamA} flipped the game around.",
        "\"The Turning Point\" — a 45-second recap of {keyMoment}.",
        "React to the comeback: play the clip of {keyMoment} and freeze on the reactions."
      ],
      question: [
        "Did {teamB} choke, or did {teamA} just want it more?",
        "What was the real turning point — {keyMoment}, or something earlier?"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}. Down and out? Not this time. 🔥 #{teamATag} #{teamBTag} #Comeback"
      ]
    },
    blowout: {
      hook: [
        "{teamA} didn't just beat {teamB} — they sent a message.",
        "{scoreA} - {scoreB}. There's no other way to say it: a statement win for {teamA}."
      ],
      video: [
        "Top 3 plays from {teamA}'s domination, built around {keyMoment}.",
        "\"How did this get so out of hand?\" — quick explainer on {keyMoment}."
      ],
      question: [
        "Is {teamB} in trouble after a result like this, or was this just an off night?",
        "Was {keyMoment} the moment this game got out of reach?"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}. Total domination. #{teamATag} #{teamBTag} #Highlights"
      ]
    },
    buzzer: {
      hook: [
        "With seconds left, {teamA} did the unthinkable.",
        "{teamA} vs {teamB} came down to the final possession — and it did not disappoint."
      ],
      video: [
        "Slow-motion replay of {keyMoment} with a countdown clock overlay.",
        "\"Where were you when this happened?\" — react to {keyMoment}."
      ],
      question: [
        "Best last-minute moment you've seen this season — does {keyMoment} top your list?",
        "Was {teamB}'s defense on that final play a coaching issue or just bad luck?"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}. Down to the wire. 😱 #{teamATag} #{teamBTag} #ClutchTime"
      ]
    },
    upset: {
      hook: [
        "Nobody had {teamA} winning this one. Nobody.",
        "{teamA} just shocked everyone by taking down {teamB}."
      ],
      video: [
        "\"The Upset\" — recap video built around {keyMoment}.",
        "Reaction video: watching {teamB} fans process {keyMoment} live."
      ],
      question: [
        "Biggest upset of the season so far — does this result change how you rank these teams?",
        "Was {teamB} overrated all along?"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}. Did NOT see that coming. #{teamATag} #{teamBTag} #Upset"
      ]
    },
    controversial: {
      hook: [
        "This call is going to be the only thing anyone talks about from {teamA} vs {teamB}.",
        "Forget the score for a second — {keyMoment} is what everyone's arguing about."
      ],
      video: [
        "Multi-angle breakdown of {keyMoment} — let the audience decide.",
        "\"Was this the right call?\" — slow-motion review of {keyMoment}."
      ],
      question: [
        "Right call or robbery? Give me your honest take on {keyMoment}.",
        "Does {keyMoment} change the result if the refs get it right?"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}. Everyone's talking about {keyMoment}. 👀 #{teamATag} #{teamBTag} #Controversy"
      ]
    },
    milestone: {
      hook: [
        "History was made in {teamA} vs {teamB}.",
        "This is a moment {teamA} fans will remember for a long time."
      ],
      video: [
        "Career-highlight style edit built around {keyMoment}.",
        "\"A Moment in History\" — short documentary-style clip on {keyMoment}."
      ],
      question: [
        "Where does {keyMoment} rank among the best moments you've seen this season?",
        "Does this milestone change how we should talk about this team/player?"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}. A moment for the history books. 🏆 #{teamATag} #{teamBTag} #Milestone"
      ]
    },
    close: {
      hook: [
        "{teamA} vs {teamB} went right down to the wire.",
        "Nobody could separate {teamA} and {teamB} until the very end."
      ],
      video: [
        "Back-and-forth recap: every key swing in {teamA} vs {teamB}, centered on {keyMoment}.",
        "\"How close was this game?\" — breakdown of {keyMoment} and what it meant."
      ],
      question: [
        "Did the right team win, or should this one have gone the other way?",
        "What was the real difference-maker — {keyMoment}, or something else?"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}. Instant classic. #{teamATag} #{teamBTag} #CloseGame"
      ]
    },
    other: {
      hook: [
        "{teamA} vs {teamB} gave us plenty to talk about.",
        "Here's what stood out from {teamA} vs {teamB}."
      ],
      video: [
        "Quick recap centered on {keyMoment}.",
        "Breakdown video: why {keyMoment} mattered."
      ],
      question: [
        "What did you make of {keyMoment}?",
        "How big of a deal is {keyMoment} in the bigger picture?"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}. #{teamATag} #{teamBTag} #Highlights"
      ]
    }
  },
  es: {
    comeback: {
      hook: [
        "Nadie esperaba que {teamA} se llevara la victoria después de ir perdiendo temprano.",
        "{teamA} parecía acabado... hasta que no lo estuvo.",
        "Así se remonta un marcador: {teamA} vs {teamB}."
      ],
      video: [
        "Análisis cuadro por cuadro del momento exacto en que {teamA} le dio la vuelta al partido.",
        "\"El Punto de Quiebre\" — un resumen de 45 segundos de {keyMoment}.",
        "Reacciona a la remontada: reproduce el video de {keyMoment} y congela las reacciones."
      ],
      question: [
        "¿{teamB} se vino abajo, o {teamA} simplemente lo quiso más?",
        "¿Cuál fue el verdadero punto de quiebre — {keyMoment}, o algo anterior?"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}. ¿Fuera del partido? Esta vez no. 🔥 #{teamATag} #{teamBTag} #Remontada"
      ]
    },
    blowout: {
      hook: [
        "{teamA} no solo venció a {teamB} — mandó un mensaje.",
        "{scoreA} - {scoreB}. No hay otra forma de decirlo: una victoria contundente para {teamA}."
      ],
      video: [
        "Las 3 mejores jugadas de la dominación de {teamA}, centradas en {keyMoment}.",
        "\"¿Cómo se salió tanto de control?\" — explicación rápida de {keyMoment}."
      ],
      question: [
        "¿{teamB} está en problemas después de un resultado así, o fue solo una mala noche?",
        "¿Fue {keyMoment} el momento en que el partido se les escapó?"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}. Dominio total. #{teamATag} #{teamBTag} #Highlights"
      ]
    },
    buzzer: {
      hook: [
        "Con segundos restantes, {teamA} hizo lo impensable.",
        "{teamA} vs {teamB} se decidió en la última jugada — y no decepcionó."
      ],
      video: [
        "Repetición en cámara lenta de {keyMoment} con cronómetro en pantalla.",
        "\"¿Dónde estabas cuando pasó esto?\" — reacciona a {keyMoment}."
      ],
      question: [
        "El mejor momento de último minuto que has visto esta temporada — ¿{keyMoment} está en tu top?",
        "¿La defensa de {teamB} en esa última jugada fue un error táctico o solo mala suerte?"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}. Hasta el final. 😱 #{teamATag} #{teamBTag} #MomentoClutch"
      ]
    },
    upset: {
      hook: [
        "Nadie tenía a {teamA} ganando este partido. Nadie.",
        "{teamA} sorprendió a todos al vencer a {teamB}."
      ],
      video: [
        "\"La Sorpresa\" — video resumen centrado en {keyMoment}.",
        "Video de reacción: viendo a los fanáticos de {teamB} procesar {keyMoment} en vivo."
      ],
      question: [
        "La sorpresa más grande de la temporada hasta ahora — ¿este resultado cambia cómo clasificas a estos equipos?",
        "¿{teamB} estaba sobrevalorado desde el principio?"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}. NADIE lo vio venir. #{teamATag} #{teamBTag} #Sorpresa"
      ]
    },
    controversial: {
      hook: [
        "Esta jugada va a ser lo único de lo que hable todo el mundo sobre {teamA} vs {teamB}.",
        "Olvida el marcador por un segundo — {keyMoment} es de lo que todos están discutiendo."
      ],
      video: [
        "Análisis desde múltiples ángulos de {keyMoment} — que decida la audiencia.",
        "\"¿Fue la decisión correcta?\" — repetición en cámara lenta de {keyMoment}."
      ],
      question: [
        "¿Decisión correcta o robo? Dame tu opinión honesta sobre {keyMoment}.",
        "¿{keyMoment} cambia el resultado si el árbitro lo hace bien?"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}. Todos hablan de {keyMoment}. 👀 #{teamATag} #{teamBTag} #Polémica"
      ]
    },
    milestone: {
      hook: [
        "Se hizo historia en {teamA} vs {teamB}.",
        "Este es un momento que los fanáticos de {teamA} recordarán por mucho tiempo."
      ],
      video: [
        "Video estilo destacados de carrera centrado en {keyMoment}.",
        "\"Un Momento Histórico\" — clip corto tipo documental sobre {keyMoment}."
      ],
      question: [
        "¿Dónde ubicas a {keyMoment} entre los mejores momentos que has visto esta temporada?",
        "¿Este hito cambia cómo deberíamos hablar de este equipo/jugador?"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}. Un momento para los libros de historia. 🏆 #{teamATag} #{teamBTag} #Hito"
      ]
    },
    close: {
      hook: [
        "{teamA} vs {teamB} se definió hasta el final.",
        "Nadie pudo separar a {teamA} y {teamB} hasta el último momento."
      ],
      video: [
        "Resumen de ida y vuelta: cada cambio clave en {teamA} vs {teamB}, centrado en {keyMoment}.",
        "\"¿Qué tan cerrado estuvo este partido?\" — análisis de {keyMoment} y lo que significó."
      ],
      question: [
        "¿Ganó el equipo correcto, o debió haber sido al revés?",
        "¿Cuál fue la verdadera diferencia — {keyMoment}, u otra cosa?"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}. Un clásico instantáneo. #{teamATag} #{teamBTag} #PartidoCerrado"
      ]
    },
    other: {
      hook: [
        "{teamA} vs {teamB} nos dejó mucho de qué hablar.",
        "Esto es lo que más destacó de {teamA} vs {teamB}."
      ],
      video: [
        "Resumen rápido centrado en {keyMoment}.",
        "Video análisis: por qué {keyMoment} importó."
      ],
      question: [
        "¿Qué opinas de {keyMoment}?",
        "¿Qué tan importante es {keyMoment} en el panorama general?"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}. #{teamATag} #{teamBTag} #Highlights"
      ]
    }
  },
  zh: {
    comeback: {
      hook: [
        "没人想到{teamA}在早早落后的情况下还能笑到最后。",
        "{teamA}看起来已经出局了——直到他们没有。",
        "这就是如何逆转比分：{teamA} 对阵 {teamB}。"
      ],
      video: [
        "逐帧解析{teamA}扭转比赛的关键瞬间。",
        "《转折点》——{keyMoment}的45秒回顾。",
        "回看逆转时刻：播放{keyMoment}的片段并定格球迷反应。"
      ],
      question: [
        "是{teamB}崩盘了，还是{teamA}更想赢？",
        "真正的转折点是{keyMoment}，还是更早之前？"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}。就这么放弃？这次不会。🔥 #{teamATag} #{teamBTag} #逆转"
      ]
    },
    blowout: {
      hook: [
        "{teamA}不只是击败了{teamB}——他们传递了一个信号。",
        "{scoreA} - {scoreB}。没有别的说法：{teamA}拿下了一场统治级的胜利。"
      ],
      video: [
        "{teamA}统治全场的三大高光时刻，围绕{keyMoment}展开。",
        "《怎么会输这么多？》——关于{keyMoment}的快速解析。"
      ],
      question: [
        "这样的比分之后，{teamB}是不是遇到麻烦了，还是只是状态不好的一晚？",
        "{keyMoment}是不是比赛失控的开始？"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}。全面碾压。#{teamATag} #{teamBTag} #精彩集锦"
      ]
    },
    buzzer: {
      hook: [
        "在最后几秒，{teamA}做到了不可思议的事情。",
        "{teamA} 对阵 {teamB} 一直战到最后一攻——毫不让人失望。"
      ],
      video: [
        "{keyMoment}的慢动作回放，配上倒计时效果。",
        "《这一刻你在哪里？》——回看{keyMoment}的反应。"
      ],
      question: [
        "本赛季你见过的最佳绝杀时刻——{keyMoment}排得上号吗？",
        "{teamB}在最后一攻的防守是战术失误还是纯粹运气不好？"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}。惊险到最后一刻。😱 #{teamATag} #{teamBTag} #绝杀时刻"
      ]
    },
    upset: {
      hook: [
        "没有人认为{teamA}会赢下这场比赛。没有人。",
        "{teamA}击败{teamB}，震惊了所有人。"
      ],
      video: [
        "《爆冷时刻》——围绕{keyMoment}制作的回顾视频。",
        "反应视频：看{teamB}球迷如何面对{keyMoment}。"
      ],
      question: [
        "本赛季目前为止最大的爆冷——这个结果会改变你对这两支球队的排名吗？",
        "{teamB}是不是一直都被高估了？"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}。完全没想到。#{teamATag} #{teamBTag} #爆冷"
      ]
    },
    controversial: {
      hook: [
        "这个判罚将成为{teamA}对{teamB}比赛后唯一的话题。",
        "先别管比分——大家都在争论{keyMoment}。"
      ],
      video: [
        "多角度解析{keyMoment}——让观众自己判断。",
        "《判罚正确吗？》——{keyMoment}的慢动作回看。"
      ],
      question: [
        "判罚正确还是抢劫？说说你对{keyMoment}的真实看法。",
        "如果裁判判对了，{keyMoment}会改变结果吗？"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}。大家都在讨论{keyMoment}。👀 #{teamATag} #{teamBTag} #争议判罚"
      ]
    },
    milestone: {
      hook: [
        "{teamA}对{teamB}的比赛中诞生了历史性的一刻。",
        "这是{teamA}球迷会长久铭记的时刻。"
      ],
      video: [
        "围绕{keyMoment}制作的生涯高光式剪辑。",
        "《历史性的一刻》——关于{keyMoment}的纪录片风格短片。"
      ],
      question: [
        "{keyMoment}在你本赛季看过的最佳时刻中排第几？",
        "这个里程碑会改变我们谈论这支球队/球员的方式吗？"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}。载入史册的一刻。🏆 #{teamATag} #{teamBTag} #里程碑"
      ]
    },
    close: {
      hook: [
        "{teamA}对{teamB}的比赛一直战到最后。",
        "直到最后一刻，谁都无法拉开{teamA}和{teamB}的差距。"
      ],
      video: [
        "拉锯战回顾：{teamA}对{teamB}的每一个关键转折，聚焦{keyMoment}。",
        "《这场比赛有多胶着？》——解析{keyMoment}及其意义。"
      ],
      question: [
        "赢球的是应该赢的一方，还是结果本该相反？",
        "真正的分水岭是{keyMoment}，还是别的原因？"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}。经典一战。#{teamATag} #{teamBTag} #胶着比赛"
      ]
    },
    other: {
      hook: [
        "{teamA}对{teamB}的比赛给了我们很多话题。",
        "这是{teamA}对{teamB}比赛中最突出的地方。"
      ],
      video: [
        "围绕{keyMoment}的快速回顾。",
        "解析视频：为什么{keyMoment}很重要。"
      ],
      question: [
        "你怎么看{keyMoment}？",
        "从大局来看，{keyMoment}有多重要？"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}。#{teamATag} #{teamBTag} #精彩集锦"
      ]
    }
  },
  ar: {
    comeback: {
      hook: [
        "لم يتوقع أحد أن يخرج {teamA} فائزًا بعدما تأخر مبكرًا.",
        "بدا {teamA} منتهيًا — إلى أن لم يكن كذلك.",
        "هكذا يتم محو الفارق: {teamA} ضد {teamB}."
      ],
      video: [
        "تحليل لقطة بلقطة للحظة التي قلب فيها {teamA} مجرى المباراة.",
        "\"نقطة التحول\" — ملخص لمدة 45 ثانية عن {keyMoment}.",
        "تفاعل مع العودة القوية: شغّل مقطع {keyMoment} وتوقف عند ردود الأفعال."
      ],
      question: [
        "هل انهار {teamB}، أم أن {teamA} أراد الفوز أكثر؟",
        "ما هي نقطة التحول الحقيقية — {keyMoment}، أم شيء أبكر؟"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}. خارج المباراة؟ ليس هذه المرة. 🔥 #{teamATag} #{teamBTag} #عودة_قوية"
      ]
    },
    blowout: {
      hook: [
        "{teamA} لم يكتفِ بهزيمة {teamB} — بل أرسل رسالة.",
        "{scoreA} - {scoreB}. لا توجد طريقة أخرى لقولها: فوز كاسح لـ{teamA}."
      ],
      video: [
        "أفضل 3 لقطات من سيطرة {teamA}، مبنية حول {keyMoment}.",
        "\"كيف خرج الأمر عن السيطرة هكذا؟\" — شرح سريع لـ{keyMoment}."
      ],
      question: [
        "هل {teamB} في ورطة بعد نتيجة كهذه، أم أنها كانت مجرد ليلة سيئة؟",
        "هل كانت {keyMoment} اللحظة التي انفلتت فيها المباراة؟"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}. سيطرة كاملة. #{teamATag} #{teamBTag} #أبرز_اللحظات"
      ]
    },
    buzzer: {
      hook: [
        "في الثواني الأخيرة، فعل {teamA} ما لا يُصدَّق.",
        "حُسمت مباراة {teamA} ضد {teamB} في آخر هجمة — ولم تخيّب الآمال."
      ],
      video: [
        "إعادة بطيئة لـ{keyMoment} مع عداد تنازلي على الشاشة.",
        "\"أين كنت عندما حدث هذا؟\" — تفاعل مع {keyMoment}."
      ],
      question: [
        "أفضل لحظة حاسمة شاهدتها هذا الموسم — هل تتصدر {keyMoment} قائمتك؟",
        "هل كان دفاع {teamB} في تلك اللحظة الأخيرة خطأ تكتيكيًا أم مجرد حظ سيئ؟"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}. حتى اللحظة الأخيرة. 😱 #{teamATag} #{teamBTag} #لحظة_حاسمة"
      ]
    },
    upset: {
      hook: [
        "لم يكن أحد يتوقع فوز {teamA} في هذه المباراة. لا أحد.",
        "فاجأ {teamA} الجميع بهزيمة {teamB}."
      ],
      video: [
        "\"المفاجأة\" — فيديو ملخص مبني حول {keyMoment}.",
        "فيديو ردود أفعال: مشاهدة جمهور {teamB} وهم يستوعبون {keyMoment} مباشرة."
      ],
      question: [
        "أكبر مفاجأة هذا الموسم حتى الآن — هل تغيّر هذه النتيجة ترتيبك لهذين الفريقين؟",
        "هل كان {teamB} مبالغًا في تقديره طوال الوقت؟"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}. لم يكن أحد يتوقع هذا. #{teamATag} #{teamBTag} #مفاجأة"
      ]
    },
    controversial: {
      hook: [
        "هذا القرار سيكون الحديث الوحيد بعد مباراة {teamA} ضد {teamB}.",
        "انسَ النتيجة للحظة — {keyMoment} هو ما يتجادل فيه الجميع."
      ],
      video: [
        "تحليل من زوايا متعددة لـ{keyMoment} — دع الجمهور يقرر.",
        "\"هل كان القرار صحيحًا؟\" — إعادة بطيئة لـ{keyMoment}."
      ],
      question: [
        "قرار صحيح أم سرقة؟ أعطني رأيك الصريح في {keyMoment}.",
        "هل تتغير النتيجة لو صحح الحكام قرارهم بشأن {keyMoment}؟"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}. الجميع يتحدث عن {keyMoment}. 👀 #{teamATag} #{teamBTag} #جدل"
      ]
    },
    milestone: {
      hook: [
        "صُنع التاريخ في مباراة {teamA} ضد {teamB}.",
        "هذه لحظة سيتذكرها جمهور {teamA} طويلًا."
      ],
      video: [
        "فيديو بأسلوب أبرز محطات المسيرة مبني حول {keyMoment}.",
        "\"لحظة في التاريخ\" — مقطع قصير بأسلوب وثائقي عن {keyMoment}."
      ],
      question: [
        "أين تضع {keyMoment} ضمن أفضل اللحظات التي شاهدتها هذا الموسم؟",
        "هل يغيّر هذا الإنجاز طريقة حديثنا عن هذا الفريق/اللاعب؟"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}. لحظة تُكتب في كتب التاريخ. 🏆 #{teamATag} #{teamBTag} #إنجاز"
      ]
    },
    close: {
      hook: [
        "مباراة {teamA} ضد {teamB} حُسمت حتى اللحظة الأخيرة.",
        "لم يستطع أحد الفصل بين {teamA} و{teamB} حتى النهاية."
      ],
      video: [
        "ملخص شد وجذب: كل تحول رئيسي في مباراة {teamA} ضد {teamB}، مع التركيز على {keyMoment}.",
        "\"ما مدى تقارب هذه المباراة؟\" — تحليل {keyMoment} وما تعنيه."
      ],
      question: [
        "هل فاز الفريق المستحق، أم كان يجب أن تسير الأمور بشكل معاكس؟",
        "ما كان الفارق الحقيقي — {keyMoment}، أم شيء آخر؟"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}. كلاسيكية فورية. #{teamATag} #{teamBTag} #مباراة_متقاربة"
      ]
    },
    other: {
      hook: [
        "قدمت مباراة {teamA} ضد {teamB} الكثير للحديث عنه.",
        "هذا أبرز ما ميّز مباراة {teamA} ضد {teamB}."
      ],
      video: [
        "ملخص سريع يركز على {keyMoment}.",
        "فيديو تحليلي: لماذا كانت {keyMoment} مهمة."
      ],
      question: [
        "ما رأيك في {keyMoment}؟",
        "ما مدى أهمية {keyMoment} في الصورة الأكبر؟"
      ],
      caption: [
        "{teamA} {scoreA} - {scoreB} {teamB}. #{teamATag} #{teamBTag} #أبرز_اللحظات"
      ]
    }
  }
};

function tag(name) {
  return name.replace(/[^a-zA-Z0-9]/g, "");
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fill(str, data) {
  return str.replace(/\{(\w+)\}/g, (_, key) => data[key] ?? "");
}

function generate(data) {
  const langSet = TEMPLATES[currentLang] || TEMPLATES.en;
  const set = langSet[data.momentType] || langSet.other;
  return {
    hook: fill(pick(set.hook), data),
    video: fill(pick(set.video), data),
    question: fill(pick(set.question), data),
    caption: fill(pick(set.caption), data)
  };
}

const GOAL_CTA = {
  en: {
    media: "Follow for more breakdowns like this.",
    coach: "Save this if you coach — bring it to practice.",
    frontoffice: "Follow for more film breakdowns like this.",
    brand: "Follow along as I build this out.",
    analytics: "Follow for more data-backed takes.",
    explore: "Follow for more breakdowns like this."
  },
  es: {
    media: "Sígueme para más análisis como este.",
    coach: "Guarda esto si entrenas — llévalo a la práctica.",
    frontoffice: "Sígueme para más análisis de video.",
    brand: "Sígueme mientras construyo esto.",
    analytics: "Sígueme para más análisis basados en datos.",
    explore: "Sígueme para más análisis como este."
  },
  zh: {
    media: "关注我获取更多类似解析。",
    coach: "如果你是教练，收藏这条带到训练中用。",
    frontoffice: "关注我获取更多录像分析。",
    brand: "关注我，一起见证成长过程。",
    analytics: "关注我获取更多数据驱动的观点。",
    explore: "关注我获取更多类似解析。"
  },
  ar: {
    media: "تابعني للمزيد من التحليلات مثل هذه.",
    coach: "احفظ هذا إذا كنت مدربًا — واستخدمه في التدريب.",
    frontoffice: "تابعني للمزيد من تحليلات الفيديو.",
    brand: "تابعني بينما أبني هذا المشروع.",
    analytics: "تابعني للمزيد من الآراء المبنية على البيانات.",
    explore: "تابعني للمزيد من التحليلات مثل هذه."
  }
};

function generateScript(data, out) {
  const passport = loadPassport();
  const ctaMap = GOAL_CTA[currentLang] || GOAL_CTA.en;
  const ctaLine = ctaMap[passport && passport.goal] || ctaMap.explore;

  return [
    { time: "0:00–0:03", label: t("beatHook"), text: out.hook },
    {
      time: "0:03–0:08",
      label: t("beatSetup"),
      text: fill(t("setupLine"), data)
    },
    { time: "0:08–0:20", label: t("beatMoment"), text: data.keyMoment + "." },
    {
      time: "0:20–0:28",
      label: t("beatYourTake"),
      text: data.observation || t("defaultTakeLine")
    },
    {
      time: "0:28–0:35",
      label: t("beatCTA"),
      text: out.question + " " + ctaLine
    }
  ];
}

const form = document.getElementById("gameForm");
const results = document.getElementById("results");
const regenBtn = document.getElementById("regenBtn");
const scriptList = document.getElementById("outScript");
const playBtn = document.getElementById("playBtn");
const stopBtn = document.getElementById("stopBtn");
const copyScriptBtn = document.getElementById("copyScriptBtn");
const ttsWarning = document.getElementById("ttsWarning");

const speechSupported = "speechSynthesis" in window;
if (!speechSupported) {
  playBtn.hidden = true;
  ttsWarning.hidden = false;
}

let lastData = null;
let lastScript = null;

function renderScript(beats) {
  scriptList.innerHTML = "";
  beats.forEach((beat) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="beat-label">${beat.label} <span class="beat-time">${beat.time}</span></span>${beat.text}`;
    scriptList.appendChild(li);
  });
}

function scriptToText(beats) {
  return beats.map((b) => b.text).join(" ");
}

// Every caption carries the LJSOCCER credit; it's kept apart from the variant so it always reads the same.
let lastCaption = "";
const copyCaptionBtn = document.getElementById("copyCaptionBtn");

function captionWithCredit() {
  return lastCaption + "\n\n" + t("creditText");
}

function renderCaption() {
  document.getElementById("outCaption").textContent = lastCaption;
  document.getElementById("outCredit").textContent = t("creditText");
}

copyCaptionBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(captionWithCredit());
    copyCaptionBtn.textContent = t("copiedLabel");
    setTimeout(() => (copyCaptionBtn.textContent = t("copyCaption")), 1500);
  } catch {
    // clipboard access denied; the caption and credit are still on screen to copy by hand
  }
});

function render() {
  const out = generate(lastData);
  document.getElementById("outHook").textContent = out.hook;
  document.getElementById("outVideo").textContent = out.video;
  document.getElementById("outQuestion").textContent = out.question;
  lastCaption = out.caption;
  renderCaption();

  lastScript = generateScript(lastData, out);
  renderScript(lastScript);

  results.hidden = false;
  regenBtn.hidden = false;
}

if (speechSupported) {
  playBtn.addEventListener("click", () => {
    if (!lastScript) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(scriptToText(lastScript));
    utterance.lang = currentLang === "es" ? "es-ES" : currentLang === "zh" ? "zh-CN" : currentLang === "ar" ? "ar-SA" : "en-US";
    utterance.rate = 1;
    utterance.onend = () => {
      playBtn.hidden = false;
      stopBtn.hidden = true;
    };
    window.speechSynthesis.speak(utterance);
    playBtn.hidden = true;
    stopBtn.hidden = false;
  });

  stopBtn.addEventListener("click", () => {
    window.speechSynthesis.cancel();
    playBtn.hidden = false;
    stopBtn.hidden = true;
  });
}

copyScriptBtn.addEventListener("click", async () => {
  if (!lastScript) return;
  const text = lastScript.map((b) => `[${b.time}] ${b.label}: ${b.text}`).join("\n");
  try {
    await navigator.clipboard.writeText(text);
    copyScriptBtn.textContent = t("copiedLabel");
    setTimeout(() => (copyScriptBtn.textContent = t("copyScript")), 1500);
  } catch {
    // clipboard access denied; nothing to fall back to in this MVP
  }
});

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const teamA = document.getElementById("teamA").value.trim();
  const teamB = document.getElementById("teamB").value.trim();
  const scoreA = document.getElementById("scoreA").value;
  const scoreB = document.getElementById("scoreB").value;
  const sportTerm = document.getElementById("sport").value;
  const momentType = document.getElementById("momentType").value;
  const keyMoment = document.getElementById("keyMoment").value.trim();
  const observation = document.getElementById("observation").value.trim();

  lastData = {
    teamA, teamB, scoreA, scoreB, sportTerm, momentType, keyMoment, observation,
    teamATag: tag(teamA),
    teamBTag: tag(teamB)
  };

  render();
  results.scrollIntoView({ behavior: "smooth" });
});

document.getElementById("studioExampleBtn").addEventListener("click", () => {
  document.getElementById("teamA").value = "Arsenal";
  document.getElementById("teamB").value = "Chelsea";
  document.getElementById("scoreA").value = "2";
  document.getElementById("scoreB").value = "1";
  document.getElementById("sport").selectedIndex = 0;
  document.getElementById("momentType").value = "comeback";
  document.getElementById("keyMoment").value = t("exampleMoment");
  document.getElementById("observation").value = t("exampleTake");
  form.requestSubmit();
});

regenBtn.addEventListener("click", () => {
  if (lastData) render();
});

// ---- Tab switching ----

function activateTab(name) {
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === name + "Panel"));
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => activateTab(tab.dataset.tab));
});

// ---- Sports Passport ----

const CAREER_PATHS = {
  en: [
    {
      name: "Sports Content Creator",
      blurb: "Building an audience by turning games, players, and takes into short-form content.",
      nextStep: "Post one piece of content a week using the Creator Studio tab.",
      tags: ["video editing", "social media", "writing", "photography / design", "content creation", "personal brand building"]
    },
    {
      name: "Team Video / Media Analyst",
      blurb: "Breaking down film for a team or program to support coaching and player development.",
      nextStep: "Offer to cut film for a local club or college team to build a reel.",
      tags: ["video editing", "data & analytics", "coaching", "coaching & player development"]
    },
    {
      name: "Sports Journalist / Broadcaster",
      blurb: "Covering games and stories through writing or on-camera work.",
      nextStep: "Start a match-report or postgame recap series in your own voice.",
      tags: ["writing", "broadcasting / on-camera", "content creation", "journalism & broadcasting"]
    },
    {
      name: "Youth or Club Coach",
      blurb: "Developing players directly, using your own playing background.",
      nextStep: "Volunteer as an assistant coach with a local youth or club team.",
      tags: ["coaching", "playing experience", "event management", "coaching & player development"]
    },
    {
      name: "Scouting / Analytics",
      blurb: "Evaluating talent and performance using data and game knowledge.",
      nextStep: "Start logging your own scouting notes or stats on games you watch.",
      tags: ["data & analytics", "playing experience", "scouting & analytics"]
    },
    {
      name: "Marketing & Sponsorship",
      blurb: "Connecting brands, sponsors, and audiences within sports.",
      nextStep: "Study how a team or athlete you follow runs their sponsor content.",
      tags: ["marketing & sales", "social media", "content creation", "marketing & sponsorship"]
    },
    {
      name: "Event Operations",
      blurb: "Running the logistics behind games, tournaments, and sports events.",
      nextStep: "Volunteer to help run a local tournament or club event.",
      tags: ["event management", "event operations"]
    },
    {
      name: "Front Office / Team Operations",
      blurb: "Working behind the scenes for a team or organization.",
      nextStep: "Look for internship or part-time roles with local clubs or franchises.",
      tags: ["data & analytics", "marketing & sales", "event management", "playing experience", "front office / team ops"]
    }
  ],
  es: [
    {
      name: "Creador de Contenido Deportivo",
      blurb: "Construir una audiencia convirtiendo partidos, jugadores y opiniones en contenido de formato corto.",
      nextStep: "Publica una pieza de contenido a la semana usando la pestaña Estudio Creativo.",
      tags: ["video editing", "social media", "writing", "photography / design", "content creation", "personal brand building"]
    },
    {
      name: "Analista de Video / Medios de un Equipo",
      blurb: "Analizar video para un equipo o programa, apoyando el entrenamiento y el desarrollo de jugadores.",
      nextStep: "Ofrécete a editar video para un club local o un equipo universitario para armar tu portafolio.",
      tags: ["video editing", "data & analytics", "coaching", "coaching & player development"]
    },
    {
      name: "Periodista / Locutor Deportivo",
      blurb: "Cubrir partidos e historias a través de la escritura o el trabajo frente a cámara.",
      nextStep: "Comienza tu propia serie de crónicas o resúmenes post-partido con tu propio estilo.",
      tags: ["writing", "broadcasting / on-camera", "content creation", "journalism & broadcasting"]
    },
    {
      name: "Entrenador Juvenil o de Club",
      blurb: "Formar jugadores directamente, usando tu propia experiencia como jugador.",
      nextStep: "Ofrécete como entrenador asistente en un equipo juvenil o de club local.",
      tags: ["coaching", "playing experience", "event management", "coaching & player development"]
    },
    {
      name: "Scouting / Análisis",
      blurb: "Evaluar talento y rendimiento usando datos y conocimiento del juego.",
      nextStep: "Empieza a registrar tus propias notas de scouting o estadísticas de los partidos que ves.",
      tags: ["data & analytics", "playing experience", "scouting & analytics"]
    },
    {
      name: "Marketing y Patrocinios",
      blurb: "Conectar marcas, patrocinadores y audiencias dentro del deporte.",
      nextStep: "Estudia cómo un equipo o atleta que sigues maneja su contenido de patrocinio.",
      tags: ["marketing & sales", "social media", "content creation", "marketing & sponsorship"]
    },
    {
      name: "Operaciones de Eventos",
      blurb: "Gestionar la logística detrás de partidos, torneos y eventos deportivos.",
      nextStep: "Ofrécete como voluntario para ayudar a organizar un torneo o evento local.",
      tags: ["event management", "event operations"]
    },
    {
      name: "Front Office / Operaciones de Equipo",
      blurb: "Trabajar detrás de escena para un equipo u organización.",
      nextStep: "Busca prácticas profesionales o roles de medio tiempo en clubes o franquicias locales.",
      tags: ["data & analytics", "marketing & sales", "event management", "playing experience", "front office / team ops"]
    }
  ],
  zh: [
    {
      name: "体育内容创作者",
      blurb: "把比赛、球员和观点转化为短视频内容，从而积累观众。",
      nextStep: "每周使用创作工作室标签发布一条内容。",
      tags: ["video editing", "social media", "writing", "photography / design", "content creation", "personal brand building"]
    },
    {
      name: "球队视频/媒体分析师",
      blurb: "为球队或项目剪辑分析比赛录像，支持教练工作和球员发展。",
      nextStep: "主动为当地俱乐部或大学球队剪辑录像，积累作品集。",
      tags: ["video editing", "data & analytics", "coaching", "coaching & player development"]
    },
    {
      name: "体育记者/解说员",
      blurb: "通过写作或镜头前的工作报道比赛和故事。",
      nextStep: "用自己的风格开始做赛后战报或复盘系列内容。",
      tags: ["writing", "broadcasting / on-camera", "content creation", "journalism & broadcasting"]
    },
    {
      name: "青少年或俱乐部教练",
      blurb: "利用自己的球员经历，直接培养球员。",
      nextStep: "在当地青少年或俱乐部球队担任助理教练志愿者。",
      tags: ["coaching", "playing experience", "event management", "coaching & player development"]
    },
    {
      name: "球探/数据分析",
      blurb: "利用数据和比赛知识评估球员天赋和表现。",
      nextStep: "开始记录你观看比赛时的球探笔记或数据。",
      tags: ["data & analytics", "playing experience", "scouting & analytics"]
    },
    {
      name: "市场营销与赞助",
      blurb: "在体育领域连接品牌、赞助商和观众。",
      nextStep: "研究你关注的球队或运动员是如何做赞助内容的。",
      tags: ["marketing & sales", "social media", "content creation", "marketing & sponsorship"]
    },
    {
      name: "赛事运营",
      blurb: "负责比赛、锦标赛和体育赛事背后的后勤工作。",
      nextStep: "自愿协助组织当地的锦标赛或活动。",
      tags: ["event management", "event operations"]
    },
    {
      name: "球队管理层/运营",
      blurb: "在球队或机构幕后工作。",
      nextStep: "寻找当地俱乐部或球队的实习或兼职机会。",
      tags: ["data & analytics", "marketing & sales", "event management", "playing experience", "front office / team ops"]
    }
  ],
  ar: [
    {
      name: "صانع محتوى رياضي",
      blurb: "بناء جمهور من خلال تحويل المباريات واللاعبين والآراء إلى محتوى قصير.",
      nextStep: "انشر قطعة محتوى واحدة أسبوعيًا باستخدام تبويب استوديو الإبداع.",
      tags: ["video editing", "social media", "writing", "photography / design", "content creation", "personal brand building"]
    },
    {
      name: "محلل فيديو / إعلام لفريق",
      blurb: "تحليل الفيديو لفريق أو برنامج لدعم التدريب وتطوير اللاعبين.",
      nextStep: "اعرض تحرير الفيديو لنادٍ محلي أو فريق جامعي لبناء ملفك الخاص.",
      tags: ["video editing", "data & analytics", "coaching", "coaching & player development"]
    },
    {
      name: "صحفي / معلّق رياضي",
      blurb: "تغطية المباريات والقصص من خلال الكتابة أو الظهور أمام الكاميرا.",
      nextStep: "ابدأ سلسلة تقارير مباريات أو ملخصات بأسلوبك الخاص.",
      tags: ["writing", "broadcasting / on-camera", "content creation", "journalism & broadcasting"]
    },
    {
      name: "مدرب ناشئين أو نادٍ",
      blurb: "تطوير اللاعبين مباشرة، بالاستفادة من خبرتك كلاعب.",
      nextStep: "تطوّع كمدرب مساعد في فريق ناشئين أو نادٍ محلي.",
      tags: ["coaching", "playing experience", "event management", "coaching & player development"]
    },
    {
      name: "الكشف عن المواهب / التحليل",
      blurb: "تقييم المواهب والأداء باستخدام البيانات ومعرفة اللعبة.",
      nextStep: "ابدأ بتسجيل ملاحظات الكشف عن المواهب أو الإحصاءات الخاصة بك للمباريات التي تشاهدها.",
      tags: ["data & analytics", "playing experience", "scouting & analytics"]
    },
    {
      name: "التسويق والرعاية",
      blurb: "ربط العلامات التجارية والرعاة والجمهور داخل عالم الرياضة.",
      nextStep: "ادرس كيف يدير فريق أو رياضي تتابعه محتوى الرعاية الخاص به.",
      tags: ["marketing & sales", "social media", "content creation", "marketing & sponsorship"]
    },
    {
      name: "تنظيم الفعاليات",
      blurb: "إدارة الجوانب اللوجستية وراء المباريات والبطولات والفعاليات الرياضية.",
      nextStep: "تطوّع للمساعدة في تنظيم بطولة أو فعالية محلية.",
      tags: ["event management", "event operations"]
    },
    {
      name: "الإدارة التنفيذية / عمليات الفريق",
      blurb: "العمل خلف الكواليس لفريق أو منظمة.",
      nextStep: "ابحث عن فرص تدريب أو عمل بدوام جزئي مع أندية أو فرق محلية.",
      tags: ["data & analytics", "marketing & sales", "event management", "playing experience", "front office / team ops"]
    }
  ]
};

const GOAL_TAGS = {
  media: ["content creation", "journalism & broadcasting"],
  coach: ["coaching & player development"],
  frontoffice: ["front office / team ops"],
  brand: ["personal brand building", "content creation"],
  analytics: ["scouting & analytics"],
  explore: []
};

const GOAL_LABELS = {
  en: {
    media: "breaking into sports media / content",
    coach: "becoming a coach",
    frontoffice: "working in a team front office",
    brand: "building a personal brand",
    analytics: "becoming a scout / analyst",
    explore: "still exploring options"
  },
  es: {
    media: "entrar en medios deportivos / contenido",
    coach: "convertirse en entrenador/a",
    frontoffice: "trabajar en la oficina de un equipo",
    brand: "construir una marca personal",
    analytics: "convertirse en scout / analista",
    explore: "seguir explorando opciones"
  },
  zh: {
    media: "进入体育媒体/内容行业",
    coach: "成为教练",
    frontoffice: "在球队管理层工作",
    brand: "打造个人品牌",
    analytics: "成为球探/分析师",
    explore: "继续探索方向"
  },
  ar: {
    media: "الدخول إلى الإعلام الرياضي / المحتوى",
    coach: "أن أصبح مدربًا",
    frontoffice: "العمل في الإدارة التنفيذية لفريق",
    brand: "بناء علامة شخصية",
    analytics: "أن أصبح كشّاف مواهب / محلل",
    explore: "الاستمرار في الاستكشاف"
  }
};

const ROLE_LABELS = {
  en: { player: "player", formerplayer: "former player", coach: "coach", student: "student", contentcreator: "content creator", fan: "fan", other: "other" },
  es: { player: "jugador/a", formerplayer: "ex-jugador/a", coach: "entrenador/a", student: "estudiante", contentcreator: "creador/a de contenido", fan: "aficionado/a", other: "otro/a" },
  zh: { player: "球员", formerplayer: "退役球员", coach: "教练", student: "学生", contentcreator: "内容创作者", fan: "球迷", other: "其他" },
  ar: { player: "لاعب", formerplayer: "لاعب سابق", coach: "مدرب", student: "طالب", contentcreator: "صانع محتوى", fan: "مشجع", other: "آخر" }
};

const TAG_LABELS = {
  "video editing": { en: "Video Editing", es: "Edición de Video", zh: "视频剪辑", ar: "مونتاج الفيديو" },
  "writing": { en: "Writing", es: "Escritura", zh: "写作", ar: "الكتابة" },
  "coaching": { en: "Coaching", es: "Entrenamiento", zh: "教练指导", ar: "التدريب" },
  "data & analytics": { en: "Data & Analytics", es: "Datos y Análisis", zh: "数据与分析", ar: "البيانات والتحليل" },
  "social media": { en: "Social Media", es: "Redes Sociales", zh: "社交媒体", ar: "وسائل التواصل الاجتماعي" },
  "playing experience": { en: "Playing Experience", es: "Experiencia como Jugador", zh: "球员经验", ar: "خبرة اللعب" },
  "event management": { en: "Event Management", es: "Gestión de Eventos", zh: "赛事管理", ar: "إدارة الفعاليات" },
  "marketing & sales": { en: "Marketing & Sales", es: "Marketing y Ventas", zh: "市场与销售", ar: "التسويق والمبيعات" },
  "photography / design": { en: "Photography / Design", es: "Fotografía / Diseño", zh: "摄影/设计", ar: "التصوير / التصميم" },
  "broadcasting / on-camera": { en: "Broadcasting / On-Camera", es: "Locución / Frente a Cámara", zh: "解说/镜头表现", ar: "الإذاعة / الظهور أمام الكاميرا" },
  "content creation": { en: "Content Creation", es: "Creación de Contenido", zh: "内容创作", ar: "صناعة المحتوى" },
  "coaching & player development": { en: "Coaching & Player Development", es: "Entrenamiento y Desarrollo de Jugadores", zh: "教练与球员发展", ar: "التدريب وتطوير اللاعبين" },
  "scouting & analytics": { en: "Scouting & Analytics", es: "Scouting y Análisis", zh: "球探与数据分析", ar: "الكشف عن المواهب والتحليل" },
  "journalism & broadcasting": { en: "Journalism & Broadcasting", es: "Periodismo y Locución", zh: "新闻与解说", ar: "الصحافة والإذاعة" },
  "marketing & sponsorship": { en: "Marketing & Sponsorship", es: "Marketing y Patrocinios", zh: "市场与赞助", ar: "التسويق والرعاية" },
  "event operations": { en: "Event Operations", es: "Operaciones de Eventos", zh: "赛事运营", ar: "تنظيم الفعاليات" },
  "front office / team ops": { en: "Front Office / Team Ops", es: "Front Office / Operaciones de Equipo", zh: "球队管理层/运营", ar: "الإدارة التنفيذية / عمليات الفريق" },
  "personal brand building": { en: "Personal Brand Building", es: "Construcción de Marca Personal", zh: "打造个人品牌", ar: "بناء العلامة الشخصية" }
};

function tagLabel(value) {
  return (TAG_LABELS[value] && TAG_LABELS[value][currentLang]) || value;
}

const PASSPORT_KEY = "ljsportmind_passport";

function getCheckedValues(containerId) {
  return Array.from(document.querySelectorAll(`#${containerId} input:checked`)).map((el) => el.value);
}

const JOB_QUERIES = [
  "sports content creator",
  "sports video analyst",
  "sports journalist",
  "youth sports coach",
  "sports scout analyst",
  "sports marketing sponsorship",
  "sports event coordinator",
  "sports operations coordinator"
];

const SPORTS_JOB_BOARDS = [
  ["TeamWork Online", "https://www.teamworkonline.com/"],
  ["WorkInSports", "https://www.workinsports.com/"]
];

function jobSearchLinks(query, location) {
  const q = encodeURIComponent(query);
  const l = encodeURIComponent(location || "");
  return [
    ["Indeed", `https://www.indeed.com/jobs?q=${q}${l ? `&l=${l}` : ""}`],
    ["LinkedIn", `https://www.linkedin.com/jobs/search/?keywords=${q}${l ? `&location=${l}` : ""}`],
    ["Glassdoor", `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${q}`]
  ];
}

function linksToHTML(pairs) {
  return pairs
    .map(([name, url]) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${name}</a>`)
    .join(" · ");
}

function matchCareerPaths(userTags) {
  const paths = CAREER_PATHS[currentLang] || CAREER_PATHS.en;
  return paths.map((path, idx) => {
    const matched = path.tags.filter((t) => userTags.includes(t));
    return { ...path, idx, score: matched.length, matched, fit: Math.round((100 * matched.length) / path.tags.length) };
  })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

const openingsCache = new Map();

function safeUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : "";
  } catch {
    return "";
  }
}

function renderOpenings(box, result) {
  box.innerHTML = "";
  const note = (key) => {
    const p = document.createElement("p");
    p.className = "warning";
    p.textContent = t(key);
    box.appendChild(p);
  };
  if (result.status === "not_configured") return note("openingsNotConfigured");
  if (result.status === "error") return note("openingsError");

  let shown = 0;
  result.jobs.forEach((j) => {
    const href = safeUrl(j.url);
    if (!href || !j.title) return;
    const row = document.createElement("div");
    row.className = "opening";
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = j.title;
    const meta = document.createElement("span");
    meta.className = "opening-meta";
    meta.textContent = [j.employer, j.location, j.publisher, j.salary].filter(Boolean).join(" · ");
    row.append(a, meta);
    box.appendChild(row);
    shown++;
  });
  if (!shown) note("openingsNone");
}

async function loadOpenings(idx, location, box, btn) {
  const key = `${idx}|${location || ""}`;
  if (openingsCache.has(key)) {
    renderOpenings(box, openingsCache.get(key));
    btn.hidden = true;
    return;
  }
  btn.disabled = true;
  box.textContent = t("loadingOpenings");
  let result;
  try {
    const res = await fetch(`/api/jobs?role=${idx}&location=${encodeURIComponent(location || "")}`);
    if (res.status === 503) {
      result = { status: "not_configured", jobs: [] };
    } else if (!res.ok) {
      result = { status: "error", jobs: [] };
    } else {
      const data = await res.json();
      result = { status: "ok", jobs: Array.isArray(data.jobs) ? data.jobs : [] };
      openingsCache.set(key, result);
    }
  } catch {
    result = { status: "error", jobs: [] };
  }
  btn.disabled = false;
  renderOpenings(box, result);
  if (result.status === "ok") btn.hidden = true;
}

function renderMatches(matches, location, data, eff) {
  const list = document.getElementById("matchList");
  list.innerHTML = "";
  if (matches.length === 0) {
    list.innerHTML = `<div class="match-card"><p>${t("selectMoreSkills")}</p></div>`;
    return;
  }
  matches.forEach((m) => {
    const div = document.createElement("div");
    div.className = "match-card";
    div.innerHTML = `
      <h4>${m.name}<span class="fit-badge">${tf("fitLabel", { n: m.fit })}</span></h4>
      <p>${m.blurb}</p>
      <p><strong>${t("nextStepLabel")}</strong> ${m.nextStep}</p>
      ${explainMatchHTML(m, data, eff)}
      <p class="job-links">${t("jobSearchLabel")} ${linksToHTML(jobSearchLinks(JOB_QUERIES[m.idx], location))}</p>
    `;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "secondary openings-btn";
    btn.textContent = t("showOpenings");
    const box = document.createElement("div");
    box.className = "openings-box";
    btn.addEventListener("click", () => loadOpenings(m.idx, location, box, btn));
    div.append(btn, box);
    if (openingsCache.has(`${m.idx}|${location || ""}`)) loadOpenings(m.idx, location, box, btn);

    list.appendChild(div);
  });

  const boards = document.createElement("div");
  boards.className = "match-card";
  boards.innerHTML = `
    <p><strong>${t("jobBoardsLabel")}</strong></p>
    <p class="job-links">${linksToHTML(SPORTS_JOB_BOARDS)}</p>
  `;
  list.appendChild(boards);
}

const EDU_KEYS = { highschool: "eduHighSchool", college: "eduCollege", bachelors: "eduBachelors", graduate: "eduGraduate" };

function collectProfile() {
  return {
    name: document.getElementById("pName").value.trim(),
    location: document.getElementById("pLocation").value.trim(),
    role: document.getElementById("pRole").value,
    goal: document.getElementById("pGoal").value,
    skills: getCheckedValues("pSkills"),
    interests: getCheckedValues("pInterests"),
    education: document.getElementById("pEducation").value,
    achievements: document.getElementById("pAchievements").value.trim()
  };
}

function effectiveProfile(data) {
  const skills = [...(data.skills || [])];
  const interests = [...(data.interests || [])];
  const fromAch = new Set();
  if (data.achievements) {
    findKeywordMatches(data.achievements, SKILL_KEYWORDS).forEach(({ value }) => {
      if (!skills.includes(value)) { skills.push(value); fromAch.add(value); }
    });
    findKeywordMatches(data.achievements, INTEREST_KEYWORDS).forEach(({ value }) => {
      if (!interests.includes(value)) { interests.push(value); fromAch.add(value); }
    });
  }
  return { skills, interests, fromAch };
}

function achievementCount(data) {
  return (data.achievements || "").split("\n").filter((l) => l.trim()).length;
}

function explainMatchHTML(m, data, eff) {
  const goalLabels = GOAL_LABELS[currentLang] || GOAL_LABELS.en;
  const label = (v) => tagLabel(v) + (eff.fromAch.has(v) ? " " + t("fromAch") : "");

  const why = [tf("whyBase", { have: m.matched.map(tagLabel).join(", ") })];
  if ((GOAL_TAGS[data.goal] || []).some((g) => m.tags.includes(g))) {
    why.push(tf("whyGoal", { goal: goalLabels[data.goal] }));
  }
  const ach = m.matched.filter((v) => eff.fromAch.has(v));
  if (ach.length) why.push(tf("whyAch", { ach: ach.map(tagLabel).join(", ") }));

  const have = [m.matched.map(label).join(", ")];
  if (EDU_KEYS[data.education]) have.push(tf("haveEdu", { edu: t(EDU_KEYS[data.education]) }));

  const gaps = m.tags.filter((v) => SKILL_KEYWORDS[v] && !eff.skills.includes(v));
  const gapHTML = gaps.length
    ? `${gaps.map(tagLabel).join(", ")}. ${tf("gapAdvice", { skills: gaps.slice(0, 2).map(tagLabel).join(" / ") })}`
    : t("noGaps");

  return `<div class="explain">
      <p><strong>${t("whyLabel")}</strong> ${why.join(" ")}</p>
      <p class="have"><strong>${t("haveLabel")}</strong> ${have.join(" · ")}</p>
      <p class="gap"><strong>${t("gapsLabel")}</strong> ${gapHTML}</p>
    </div>`;
}

function computeStrength(data) {
  const checks = [
    [10, !!data.name, "pNameLabel"],
    [10, !!data.location, "pLocationLabel"],
    [15, data.skills.length >= 1, "skillsLabel"],
    [10, data.skills.length >= 3, "skillsLabel"],
    [15, data.interests.length >= 1, "interestsLabel"],
    [10, data.goal !== "explore", "pGoalLabel"],
    [10, !!data.education, "pEduLabel"],
    [10, achievementCount(data) >= 1, "pAchLabel"],
    [10, achievementCount(data) >= 3, "pAchLabel"]
  ];
  const pct = checks.reduce((sum, [pts, ok]) => sum + (ok ? pts : 0), 0);
  const missing = checks.filter(([, ok]) => !ok).map(([, , key]) => key);
  return { pct, next: missing[0] };
}

function renderStrength() {
  const { pct, next } = computeStrength(collectProfile());
  document.getElementById("strengthFill").style.width = pct + "%";
  const saved = loadPassport();
  const parts = [`${t("strengthLabel")}: ${pct}%`];
  if (saved && saved.updatedAt) {
    parts.push(`${t("updatedLabel")}: ${new Date(saved.updatedAt).toLocaleDateString(currentLang)}`);
  }
  parts.push(next ? `${t("strengthNext")} ${t(next).replace(/\s*\(.*\)\s*$/, "")}` : t("strengthFull"));
  document.getElementById("strengthText").textContent = parts.join(" · ");
}

const CONTENT_ANGLE_SKILLS = ["playing experience", "broadcasting / on-camera", "video editing", "writing", "photography / design", "social media", "data & analytics", "coaching"];

function renderCreatorNote() {
  const note = document.getElementById("creatorProfileNote");
  const saved = loadPassport();
  if (!saved) { note.hidden = true; return; }
  const goalLabels = GOAL_LABELS[currentLang] || GOAL_LABELS.en;
  let text = tf("creatorNote", { name: saved.name || t("youFallback"), goal: goalLabels[saved.goal] || goalLabels.explore });
  const skill = CONTENT_ANGLE_SKILLS.find((sk) => effectiveProfile(saved).skills.includes(sk));
  if (skill) text += " " + tf("creatorAngle", { skill: tagLabel(skill) });
  note.textContent = text;
  note.hidden = false;
}

function checkOpportunity() {
  const box = document.getElementById("oppResult");
  const text = document.getElementById("oppText").value.replace(/\s+/g, " ").trim();
  box.hidden = false;
  if (!text) { box.innerHTML = `<p class="section-blurb">${t("oppEmpty")}</p>`; return; }

  const data = collectProfile();
  const eff = effectiveProfile(data);
  const asks = findKeywordMatches(text, SKILL_KEYWORDS).map((x) => x.value);
  if (!asks.length) { box.innerHTML = `<p class="section-blurb">${t("oppNoSignals")}</p>`; return; }

  const have = asks.filter((v) => eff.skills.includes(v));
  const gaps = asks.filter((v) => !eff.skills.includes(v));
  const pct = Math.round((100 * have.length) / asks.length);
  const verdict = pct >= 70 ? t("oppStrong") : pct >= 40 ? t("oppMedium") : t("oppLow");
  const label = (v) => tagLabel(v) + (eff.fromAch.has(v) ? " " + t("fromAch") : "");

  const degreeAsked = /bachelor|master'?s|\bdegree\b/i.test(text);
  const hasDegree = data.education === "bachelors" || data.education === "graduate";
  const degreeLine = degreeAsked
    ? `<p class="${hasDegree ? "have" : "gap"}">${hasDegree ? t("oppDegreeOk") : t("oppDegreeGap")}</p>`
    : "";

  box.innerHTML = `
    <div class="match-card">
      <h4>${tf("oppFit", { n: pct })}</h4>
      <p>${verdict} ${tf("oppWhy", { n: have.length, total: asks.length })}</p>
      <div class="explain">
        <p><strong>${t("oppAsks")}</strong> ${asks.map(tagLabel).join(", ")}</p>
        <p class="have"><strong>${t("haveLabel")}</strong> ${have.length ? have.map(label).join(", ") : "-"}</p>
        <p class="gap"><strong>${t("gapsLabel")}</strong> ${gaps.length ? `${gaps.map(tagLabel).join(", ")}. ${tf("gapAdvice", { skills: gaps.slice(0, 2).map(tagLabel).join(" / ") })}` : t("noGaps")}</p>
        ${degreeLine}
      </div>
    </div>`;
}

function savePassport(data) {
  try {
    localStorage.setItem(PASSPORT_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable; nothing to persist
  }
}

function loadPassport() {
  try {
    const raw = localStorage.getItem(PASSPORT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function applyPassportToForm(data) {
  document.getElementById("pName").value = data.name || "";
  document.getElementById("pLocation").value = data.location || "";
  document.getElementById("pRole").value = data.role || "player";
  document.getElementById("pGoal").value = data.goal || "explore";
  document.getElementById("pEducation").value = data.education || "";
  document.getElementById("pAchievements").value = data.achievements || "";
  document.querySelectorAll("#pSkills input").forEach((el) => {
    el.checked = (data.skills || []).includes(el.value);
  });
  document.querySelectorAll("#pInterests input").forEach((el) => {
    el.checked = (data.interests || []).includes(el.value);
  });
}

function buildSummary(name, location, roleLabel, goalLabel) {
  if (currentLang === "es") {
    const loc = location ? ` de ${location}` : "";
    return `${name}${loc} es ${roleLabel}, con el objetivo de ${goalLabel}.`;
  }
  if (currentLang === "zh") {
    const loc = location ? `（来自${location}）` : "";
    return `${name}${loc}目前是${roleLabel}，目标是${goalLabel}。`;
  }
  if (currentLang === "ar") {
    const loc = location ? ` من ${location}` : "";
    return `${name}${loc}، ${roleLabel}، ويعمل على ${goalLabel}.`;
  }
  const loc = location ? ` from ${location}` : "";
  return `${name}${loc} is a ${roleLabel}, working toward ${goalLabel}.`;
}

function renderPassportSummaryAndMatches(data) {
  const roleLabels = ROLE_LABELS[currentLang] || ROLE_LABELS.en;
  const goalLabels = GOAL_LABELS[currentLang] || GOAL_LABELS.en;
  const namePart = data.name || t("youFallback");

  document.getElementById("passportSummary").textContent = buildSummary(
    namePart,
    data.location,
    roleLabels[data.role] || data.role,
    goalLabels[data.goal] || data.goal
  );

  const eff = effectiveProfile(data);
  const userTags = [...eff.skills, ...eff.interests, ...(GOAL_TAGS[data.goal] || [])];
  renderMatches(matchCareerPaths(userTags), data.location, data, eff);
  renderPassportIdentity(data);
}

// ---- Passport identity: fingerprint, readiness, memory ----
// Fingerprint = a symbol only this profile produces. Readiness = "ready for what?":
// goal -> what it needs -> what you have -> gaps -> progress. Memory = your first save
// is your baseline, and later saves are compared with you, not with a general standard.

const ALL_TAGS = [
  "video editing", "writing", "coaching", "data & analytics", "social media", "playing experience",
  "event management", "marketing & sales", "photography / design", "broadcasting / on-camera",
  "content creation", "coaching & player development", "scouting & analytics", "journalism & broadcasting",
  "marketing & sponsorship", "event operations", "front office / team ops", "personal brand building"
];
const HISTORY_MAX = 30;

function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function seededRandom(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// Minted once at the first save and kept for life, so the ID and ring layout never change;
// only which rings are gold changes as the profile grows.
function mintFingerprint(data) {
  return "LJ-" + hashString(`${data.name}|${data.updatedAt}|${Math.random()}`).toString(16).toUpperCase().padStart(8, "0").slice(0, 6);
}

function fingerprintId(data) {
  return data.fingerprint || mintFingerprint(data);
}

function fingerprintSeed(data) {
  return hashString(fingerprintId(data));
}

// One ring per skill or interest; rings the user owns are drawn in gold.
function fingerprintSvg(data) {
  const eff = effectiveProfile(data);
  const owned = new Set([...eff.skills, ...eff.interests]);
  const rand = seededRandom(fingerprintSeed(data));
  const point = (r, a) => `${(60 + r * Math.cos(a)).toFixed(2)} ${(60 + r * Math.sin(a)).toFixed(2)}`;
  let paths = "";
  ALL_TAGS.forEach((tag, i) => {
    const r = 6 + i * 2.9;
    const has = owned.has(tag);
    const arcs = 1 + Math.floor(rand() * 3);
    let start = rand() * Math.PI * 2;
    for (let k = 0; k < arcs; k++) {
      const span = (Math.PI * 2 / arcs) * (0.45 + rand() * 0.4);
      const end = start + span;
      paths += `<path d="M${point(r, start)} A${r} ${r} 0 ${span > Math.PI ? 1 : 0} 1 ${point(r, end)}" class="${has ? "fp-on" : "fp-off"}"/>`;
      start = end + (Math.PI * 2 / arcs) * 0.2;
    }
  });
  return `<svg viewBox="0 0 120 120" width="120" height="120">${paths}<circle cx="60" cy="60" r="2.5" class="fp-dot"/></svg>`;
}

// The career path that best serves the user's goal ("ready for what?").
function readinessOf(data) {
  const eff = effectiveProfile(data);
  const have = new Set([...eff.skills, ...eff.interests]);
  const paths = CAREER_PATHS[currentLang] || CAREER_PATHS.en;
  const goalTags = GOAL_TAGS[data.goal] || [];
  const scored = paths.map((p) => ({ path: p, owned: p.tags.filter((tg) => have.has(tg)) }));
  const forGoal = scored.filter((s) => s.path.tags.some((tg) => goalTags.includes(tg)));
  const pool = forGoal.length ? forGoal : scored;
  const best = pool.reduce((a, b) => (b.owned.length / b.path.tags.length > a.owned.length / a.path.tags.length ? b : a));
  return {
    path: best.path,
    needs: best.path.tags,
    have: best.owned,
    gaps: best.path.tags.filter((tg) => !have.has(tg)),
    pct: Math.round((100 * best.owned.length) / best.path.tags.length)
  };
}

function snapshotOf(data) {
  const eff = effectiveProfile(data);
  return {
    at: data.updatedAt,
    tags: [...eff.skills, ...eff.interests].sort(),
    ach: achievementCount(data),
    strength: computeStrength(data).pct,
    ready: readinessOf(data).pct,
    goal: data.goal
  };
}

// Adds a snapshot only when something changed. The first one is the baseline and is always kept.
function nextHistory(prev, data) {
  const history = (prev && Array.isArray(prev.history) ? prev.history : []).slice();
  const snap = snapshotOf(data);
  const last = history[history.length - 1];
  const same = last && last.ach === snap.ach && last.strength === snap.strength && last.ready === snap.ready &&
    last.goal === snap.goal && last.tags.join(",") === snap.tags.join(",");
  if (!same) history.push(snap);
  return history.length > HISTORY_MAX ? [history[0], ...history.slice(-(HISTORY_MAX - 1))] : history;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderPassportIdentity(data) {
  if (!data.fingerprint) {
    // Profiles saved before fingerprints existed get theirs now, once.
    data.fingerprint = mintFingerprint(data);
    const saved = loadPassport();
    if (saved && !saved.fingerprint) savePassport({ ...saved, fingerprint: data.fingerprint });
  }
  document.getElementById("fpSvg").innerHTML = fingerprintSvg(data);
  document.getElementById("fpId").textContent = tf("fpId", { id: fingerprintId(data) });

  const ready = readinessOf(data);
  const goalLabels = GOAL_LABELS[currentLang] || GOAL_LABELS.en;
  const readyBody = document.getElementById("readyBody");
  readyBody.innerHTML = "";
  readyBody.append(
    el("p", "ready-goal", tf("readyGoal", { goal: goalLabels[data.goal] || goalLabels.explore, path: ready.path.name })),
    el("div", "ready-bar", ""),
    el("p", "ready-level", tf("readyLevel", { n: ready.pct })),
    el("p", "have", `${t("readyHave")} ${ready.have.map(tagLabel).join(", ") || "—"}`),
    el("p", "gap", `${t("readyGaps")} ${ready.gaps.map(tagLabel).join(", ") || "—"}`),
    el("p", "ready-stage", t(ready.pct >= 80 ? "readyStageReady" : ready.pct >= 40 ? "readyStageClose" : "readyStageBuilding"))
  );
  const fill = el("div", "ready-fill", "");
  fill.style.width = ready.pct + "%";
  readyBody.querySelector(".ready-bar").appendChild(fill);

  const memBody = document.getElementById("memBody");
  memBody.innerHTML = "";
  const history = Array.isArray(data.history) && data.history.length ? data.history : [snapshotOf(data)];
  const base = history[0];
  const now = history[history.length - 1];
  const day = (iso) => (iso ? new Date(iso).toLocaleDateString(currentLang) : "");
  if (history.length < 2) {
    memBody.append(el("p", "", tf("memBaseline", { date: day(base.at) })));
    return;
  }
  const gained = now.tags.filter((tg) => !base.tags.includes(tg));
  const lines = [];
  if (gained.length) lines.push(tf("memNewTags", { n: gained.length, list: gained.map(tagLabel).join(", ") }));
  if (now.ach !== base.ach) lines.push(tf("memAch", { n: (now.ach > base.ach ? "+" : "") + (now.ach - base.ach) }));
  if (now.strength !== base.strength) lines.push(tf("memStrength", { a: base.strength, b: now.strength }));
  if (now.ready !== base.ready) lines.push(tf("memReady", { a: base.ready, b: now.ready }));
  memBody.append(el("p", "", tf("memSince", { date: day(base.at) })));
  if (!lines.length) {
    memBody.append(el("p", "", t("memNoChange")));
  } else {
    const ul = el("ul", "mem-list");
    lines.forEach((line) => ul.append(el("li", "", line)));
    memBody.append(ul);
  }
  memBody.append(el("p", "mem-count", tf("memSaves", { n: history.length })));
}

const passportForm = document.getElementById("passportForm");
const passportResults = document.getElementById("passportResults");
const passportBanner = document.getElementById("passportBanner");

function renderPassportBanner(data) {
  if (!data || !data.name) {
    passportBanner.hidden = true;
    return;
  }
  const goalLabels = GOAL_LABELS[currentLang] || GOAL_LABELS.en;
  const goalLabel = goalLabels[data.goal] || goalLabels.explore;
  passportBanner.textContent = t("tailoredFor").replace("{name}", data.name).replace("{goal}", goalLabel);
  passportBanner.hidden = false;
}

const savedPassport = loadPassport();
if (savedPassport) {
  applyPassportToForm(savedPassport);
  renderPassportBanner(savedPassport);
}

passportForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const data = { ...collectProfile(), updatedAt: new Date().toISOString() };
  const previous = loadPassport();
  data.fingerprint = (previous && previous.fingerprint) || mintFingerprint(data);
  // Movement checks and their goal live with the profile but aren't part of the form.
  if (previous && previous.movement) data.movement = previous.movement;
  if (previous && previous.movementGoal) data.movementGoal = previous.movementGoal;
  data.history = nextHistory(previous, data);

  savePassport(data);
  syncState = "";
  uploadProfile(data);
  renderSync();
  renderPassportBanner(data);
  renderStrength();
  renderCreatorNote();
  renderAiNote();
  renderPassportSummaryAndMatches(data);

  passportResults.hidden = false;
  passportResults.scrollIntoView({ behavior: "smooth" });
});

passportForm.addEventListener("input", renderStrength);
passportForm.addEventListener("change", renderStrength);
document.getElementById("oppCheckBtn").addEventListener("click", checkOpportunity);

// ---- Resume import ----

const SKILL_KEYWORDS = {
  "video editing": ["video edit", "editing video", "premiere", "final cut", "davinci", "capcut", "after effects", "filmora", "videograph", "video production", "motion graphics"],
  "writing": ["writing", "copywrit", "content writ", "blog", "newsletter", "storytelling", "articles", "reporting"],
  "coaching": ["coach", "mentor", "instructor", "trainer"],
  "data & analytics": ["analytics", "data analysis", "excel", "sql", "tableau", "power bi", "statistic", "python", "sabermetric", "data-driven"],
  "social media": ["social media", "instagram", "tiktok", "twitter", "facebook", "youtube", "hootsuite", "community management", "content calendar"],
  "playing experience": ["varsity", "captain", "ncaa", "division i", "all-conference", "collegiate athlete", "student-athlete", "student athlete", "semi-pro", "professional player", "club team", "travel team", "academy"],
  "event management": ["event management", "event planning", "event coordinat", "tournament", "logistics", "game day", "gameday", "volunteer coordinat"],
  "marketing & sales": ["marketing", "sales", "business development", "seo", "advertising", "brand partnership", "crm", "salesforce", "fundraising"],
  "photography / design": ["photograph", "photoshop", "lightroom", "canva", "graphic design", "illustrator", "figma", "indesign"],
  "broadcasting / on-camera": ["broadcast", "announcer", "commentat", "play-by-play", "on-camera", "on camera", "podcast", "radio", "sideline report", "voiceover", "voice-over", "color analyst"]
};

const INTEREST_KEYWORDS = {
  "content creation": ["content creat", "youtuber", "youtube channel", "influencer", "vlog", "short-form", "reels", "tiktok"],
  "coaching & player development": ["player development", "athlete development", "youth development", "talent development"],
  "scouting & analytics": ["scout", "recruiting", "recruit", "talent evaluation", "performance analysis", "sabermetric"],
  "journalism & broadcasting": ["journalis", "reporter", "sports writer", "broadcast", "media relations"],
  "marketing & sponsorship": ["sponsorship", "brand partnership", "sports marketing", "partnerships"],
  "event operations": ["event operations", "game day", "gameday", "tournament", "facilities", "venue"],
  "front office / team ops": ["front office", "team operations", "operations coordinator", "athletic department", "athletics administration", "athletic administration", "sports management", "sport management", "general manager"],
  "personal brand building": ["personal brand", "own brand", "influencer", "followers"]
};

function findKeywordMatches(text, table) {
  const found = [];
  for (const [value, words] of Object.entries(table)) {
    const hits = words.filter((w) =>
      new RegExp("\\b" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(text)
    );
    if (hits.length) found.push({ value, hits: hits.slice(0, 3) });
  }
  return found;
}

function checkPassportBoxes(containerId, values) {
  document.querySelectorAll(`#${containerId} input`).forEach((el) => {
    if (values.includes(el.value)) el.checked = true;
  });
}

const resumeText = document.getElementById("resumeText");
const resumeFile = document.getElementById("resumeFile");
const resumeResults = document.getElementById("resumeResults");
let resumeState = { type: "none" };

function renderResume() {
  resumeResults.innerHTML = "";
  if (resumeState.type === "none") {
    resumeResults.hidden = true;
    return;
  }
  resumeResults.hidden = false;

  const note = (key) => {
    const p = document.createElement("p");
    p.className = "warning";
    p.textContent = t(key);
    resumeResults.appendChild(p);
  };

  if (resumeState.type === "empty") return note("resumeEmpty");
  if (resumeState.type === "unsupported") return note("resumeUnsupportedFile");
  if (resumeState.type === "reading") return note("resumeReading");
  if (resumeState.type === "pdfError") return note("resumePdfError");

  const { skills, interests } = resumeState;
  if (!skills.length && !interests.length) return note("resumeNothingFound");

  const card = document.createElement("div");
  card.className = "card";
  const addGroup = (titleKey, items) => {
    if (!items.length) return;
    const h = document.createElement("h3");
    h.textContent = t(titleKey);
    card.appendChild(h);
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "detect-row";
      const chip = document.createElement("span");
      chip.className = "detect-chip";
      chip.textContent = tagLabel(item.value);
      const evidence = document.createElement("span");
      evidence.className = "detect-evidence";
      evidence.textContent = `${t("resumeFound")} ${item.hits.join(", ")}`;
      row.append(chip, evidence);
      card.appendChild(row);
    });
  };
  addGroup("resumeDetectedSkills", skills);
  addGroup("resumeDetectedInterests", interests);

  const applied = document.createElement("p");
  applied.className = "warning";
  applied.textContent = t("resumeApplied");
  card.appendChild(applied);

  const go = document.createElement("button");
  go.type = "button";
  go.textContent = t("resumeGoToPassport");
  go.addEventListener("click", () => {
    document.getElementById("passportForm").scrollIntoView({ behavior: "smooth" });
  });
  const actions = document.createElement("div");
  actions.className = "actions";
  actions.appendChild(go);
  card.appendChild(actions);

  resumeResults.appendChild(card);
}

function analyzeResume(text) {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    resumeState = { type: "empty" };
    renderResume();
    return false;
  }
  const skills = findKeywordMatches(trimmed, SKILL_KEYWORDS);
  const interests = findKeywordMatches(trimmed, INTEREST_KEYWORDS);
  checkPassportBoxes("pSkills", skills.map((s) => s.value));
  checkPassportBoxes("pInterests", interests.map((i) => i.value));
  renderStrength();
  resumeState = { type: "results", skills, interests };
  renderResume();
  return true;
}

const resumeInputs = document.getElementById("resumeInputs");
const resumeLoaded = document.getElementById("resumeLoaded");

function showResumeLoaded(name) {
  document.getElementById("resumeFileName").textContent = name;
  resumeInputs.hidden = true;
  resumeLoaded.hidden = false;
}

document.getElementById("resumeRemoveBtn").addEventListener("click", () => {
  resumeText.value = "";
  resumeState = { type: "none" };
  renderResume();
  resumeInputs.hidden = false;
  resumeLoaded.hidden = true;
});

document.getElementById("resumeAnalyzeBtn").addEventListener("click", () => analyzeResume(resumeText.value));

const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_INTEGRITY = "sha384-/1qUCSGwTur9vjf/z9lmu/eCUYbpOTgSjmpbMQZ1/CtX2v/WcAIKqRv+U1DUCG6e";
const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
let pdfJsPromise = null;

function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (!pdfJsPromise) {
    pdfJsPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = PDFJS_URL;
      s.integrity = PDFJS_INTEGRITY;
      s.crossOrigin = "anonymous";
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        resolve(window.pdfjsLib);
      };
      s.onerror = () => {
        pdfJsPromise = null;
        reject(new Error("Could not load the PDF reader"));
      };
      document.head.appendChild(s);
    });
  }
  return pdfJsPromise;
}

async function extractPdfText(file) {
  const pdfjsLib = await loadPdfJs();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  let text = "";
  for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(" ") + "\n";
  }
  return text;
}

resumeFile.addEventListener("change", async () => {
  const file = resumeFile.files[0];
  if (!file) return;
  const isPdf = /\.pdf$/i.test(file.name) || file.type === "application/pdf";
  const isText = /\.(txt|md)$/i.test(file.name) || file.type.startsWith("text/");
  resumeFile.value = "";

  if (isPdf) {
    resumeState = { type: "reading" };
    renderResume();
    try {
      const text = await extractPdfText(file);
      if (!text.trim()) throw new Error("No text in PDF");
      if (analyzeResume(text)) showResumeLoaded(file.name);
    } catch {
      resumeState = { type: "pdfError" };
      renderResume();
    }
    return;
  }

  if (!isText) {
    resumeState = { type: "unsupported" };
    renderResume();
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    if (analyzeResume(String(reader.result))) showResumeLoaded(file.name);
  };
  reader.readAsText(file);
});

// ---- AI Coach ----

const aiLog = document.getElementById("aiLog");
const aiForm = document.getElementById("aiForm");
const aiQuestion = document.getElementById("aiQuestion");
const aiAskBtn = document.getElementById("aiAskBtn");
const aiClearBtn = document.getElementById("aiClearBtn");
const aiWriteBtn = document.getElementById("aiWriteBtn");
const aiDraft = document.getElementById("aiDraft");
const aiDraftText = document.getElementById("aiDraftText");
let aiHistory = [];
let aiPending = false;

// Only the fields the AI needs; the name stays in the browser.
function aiContext() {
  const data = loadPassport();
  if (!data) return { profile: null, matches: [] };
  const roleLabels = ROLE_LABELS[currentLang] || ROLE_LABELS.en;
  const goalLabels = GOAL_LABELS[currentLang] || GOAL_LABELS.en;
  const eff = effectiveProfile(data);
  const userTags = [...eff.skills, ...eff.interests, ...(GOAL_TAGS[data.goal] || [])];
  const matches = matchCareerPaths(userTags).map((m) => ({
    name: m.name,
    fit: m.fit,
    have: m.matched,
    gaps: m.tags.filter((tg) => !m.matched.includes(tg))
  }));
  return {
    profile: {
      role: roleLabels[data.role] || data.role,
      goal: goalLabels[data.goal] || data.goal,
      location: data.location,
      education: data.education ? t(EDU_KEYS[data.education]) : "",
      skills: eff.skills,
      interests: eff.interests,
      achievements: data.achievements,
      readiness: aiReadinessText(data),
      sinceBaseline: aiBaselineText(data),
      movement: typeof moveSummaryText === "function" ? moveSummaryText(data.movement) : "",
      games: typeof playSummaryText === "function" ? playSummaryText() : ""
    },
    matches
  };
}

// Plain-English summaries for the AI, independent of the interface language.
function aiReadinessText(data) {
  const r = readinessOf(data);
  return `${r.pct}% ready for ${r.path.name}. Has: ${r.have.join(", ") || "none"}. Gaps: ${r.gaps.join(", ") || "none"}.`;
}

function aiBaselineText(data) {
  const h = Array.isArray(data.history) ? data.history : [];
  if (h.length < 2) return "Only a baseline so far.";
  const base = h[0], now = h[h.length - 1];
  const gained = now.tags.filter((tg) => !base.tags.includes(tg));
  return `Baseline ${String(base.at).slice(0, 10)}: readiness ${base.ready}% -> ${now.ready}%, profile strength ${base.strength}% -> ${now.strength}%, achievements ${base.ach} -> ${now.ach}, new skills/interests: ${gained.join(", ") || "none"}.`;
}

function renderAiNote() {
  const note = document.getElementById("aiProfileNote");
  const data = loadPassport();
  if (!data) {
    note.textContent = t("aiNoProfile");
    return;
  }
  const roleLabels = ROLE_LABELS[currentLang] || ROLE_LABELS.en;
  const goalLabels = GOAL_LABELS[currentLang] || GOAL_LABELS.en;
  note.textContent = tf("aiUsingProfile", {
    role: roleLabels[data.role] || data.role,
    goal: goalLabels[data.goal] || data.goal
  });
}

function renderAiLog() {
  aiLog.innerHTML = "";
  const entries = aiPending ? [...aiHistory, { role: "assistant", content: t("aiThinking") }] : aiHistory;
  entries.forEach((m) => {
    const box = document.createElement("div");
    box.className = "ai-msg " + (m.role === "user" ? "user" : "coach");
    const who = document.createElement("p");
    who.className = "ai-who";
    who.textContent = m.role === "user" ? t("aiYou") : t("aiCoach");
    const text = document.createElement("p");
    text.className = "ai-text";
    text.dir = "auto";
    text.textContent = m.content;
    box.append(who, text);
    aiLog.appendChild(box);
  });
  aiClearBtn.hidden = !aiHistory.length;
}

function aiErrorText(code) {
  if (code === "not_configured") return t("aiErrNotEnabled");
  if (code === "rate_limited") return t("aiErrBusy");
  if (code === "refused") return t("aiErrRefused");
  if (code === "sign_in_required") return t("aiErrSignIn");
  if (code === "pro_required") return t("aiErrPro");
  return t("aiErrGeneric");
}

// The signed-in user's token, so the server can check who is asking (and whether they're Pro).
async function authHeaders() {
  const headers = {};
  const pass = getProPass();
  if (pass) headers["x-pro-pass"] = pass;
  if (sb && sbUser) {
    const { data } = await sb.auth.getSession();
    if (data.session) headers.Authorization = "Bearer " + data.session.access_token;
  }
  return headers;
}

async function callAssistant(payload) {
  try {
    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ ...payload, ...aiContext(), lang: currentLang })
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.text) return { error: aiErrorText(body.error) };
    return { text: body.text };
  } catch {
    return { error: t("aiErrGeneric") };
  }
}

async function askAssistant(question) {
  question = question.trim();
  if (aiPending) return;
  if (!question) {
    aiQuestion.placeholder = t("aiEmpty");
    aiQuestion.focus();
    return;
  }
  const history = aiHistory.slice();
  aiHistory.push({ role: "user", content: question });
  aiQuestion.value = "";
  aiPending = true;
  aiAskBtn.disabled = true;
  renderAiLog();

  const reply = await callAssistant({ mode: "ask", question, history });
  aiPending = false;
  aiAskBtn.disabled = false;
  if (reply.text) {
    aiHistory.push({ role: "assistant", content: reply.text });
  } else {
    // Drop the unanswered question so the next request keeps turns alternating.
    aiHistory.pop();
    aiQuestion.value = question;
    aiHistory.push({ role: "error", content: reply.error });
  }
  renderAiLog();
  aiHistory = aiHistory.filter((m) => m.role !== "error");
}

// The AI Coach lives inside the Passport now; this opens it and brings it into view.
function openCoach() {
  activateTab("passport");
  const coach = document.getElementById("coachTool");
  coach.open = true;
  coach.scrollIntoView({ behavior: "smooth", block: "start" });
}

aiForm.addEventListener("submit", (e) => {
  e.preventDefault();
  askAssistant(aiQuestion.value);
});

document.querySelectorAll(".ai-suggest").forEach((btn) => {
  btn.addEventListener("click", () => askAssistant(btn.textContent));
});

aiClearBtn.addEventListener("click", () => {
  aiHistory = [];
  renderAiLog();
});

aiWriteBtn.addEventListener("click", async () => {
  const val = (id) => document.getElementById(id).value.trim();
  const selected = (id) => {
    const el = document.getElementById(id);
    return el.options[el.selectedIndex].textContent;
  };
  aiDraft.hidden = false;
  if (!val("teamA") || !val("teamB") || val("scoreA") === "" || val("scoreB") === "" || !val("keyMoment")) {
    aiDraftText.textContent = t("aiWriteNeedsGame");
    return;
  }
  aiWriteBtn.disabled = true;
  aiDraftText.textContent = t("aiThinking");
  const reply = await callAssistant({
    mode: "content",
    credit: t("creditText"),
    game: {
      teamA: val("teamA"),
      teamB: val("teamB"),
      scoreA: val("scoreA"),
      scoreB: val("scoreB"),
      sport: selected("sport"),
      momentType: selected("momentType"),
      keyMoment: val("keyMoment"),
      observation: val("observation")
    }
  });
  aiWriteBtn.disabled = false;
  aiDraftText.textContent = reply.text || reply.error;
});

// ---- Accounts and cloud profile ----
// Sign-in by emailed link (Supabase). The browser copy in localStorage stays the
// working copy; the account row is the durable one. Off until /api/config is set up.

const SUPABASE_JS_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js";
const SUPABASE_JS_INTEGRITY = "sha384-Rj26LVGvoeRVR6+mwQmFfcR3QOBEwT+ZmuCWpuiqeTzJpCs0ER4ITAWGb4Hiy3Ok";

const accountBar = document.getElementById("accountBar");
const accForm = document.getElementById("accForm");
const accEmail = document.getElementById("accEmail");
const accMsg = document.getElementById("accMsg");
const accDeleteBtn = document.getElementById("accDeleteBtn");
let sb = null;
let sbUser = null;
let checkoutEnabled = false;
let proRequiredForAi = false;
let accountsMode = false;
let userIsPro = false;

// Stripe-only Pro: the signed pass this browser received after paying.
const PRO_PASS_KEY = "ljsportmind_pro_pass";
function getProPass() {
  try {
    return localStorage.getItem(PRO_PASS_KEY) || "";
  } catch {
    return "";
  }
}
function setProPass(pass) {
  try {
    if (pass) localStorage.setItem(PRO_PASS_KEY, pass);
    else localStorage.removeItem(PRO_PASS_KEY);
  } catch {
    // storage unavailable; Pro won't persist on this device
  }
}
let syncState = "";
let accMsgKey = "";

function loadScript(src, integrity) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.integrity = integrity;
    s.crossOrigin = "anonymous";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Could not load " + src));
    document.head.appendChild(s);
  });
}

function clearPassport() {
  try {
    localStorage.removeItem(PASSPORT_KEY);
  } catch {
    // localStorage unavailable; nothing stored to clear
  }
}

function refreshProfileViews() {
  const data = loadPassport();
  if (data) {
    applyPassportToForm(data);
    if (!passportResults.hidden) renderPassportSummaryAndMatches(data);
  } else {
    passportForm.reset();
    passportResults.hidden = true;
  }
  renderPassportBanner(data);
  renderStrength();
  renderCreatorNote();
  renderAiNote();
  renderSync();
}

function showAccMsg(key) {
  accMsgKey = key;
  accMsg.textContent = key ? t(key) : "";
  accMsg.hidden = !key;
}

function renderAccount() {
  if (!sb) return;
  accountBar.hidden = false;
  document.getElementById("accSignedOut").hidden = !!sbUser;
  document.getElementById("accSignedIn").hidden = !sbUser;
  document.getElementById("accWho").textContent = sbUser ? tf("accSignedInAs", { email: sbUser.email || "" }) : "";
  accDeleteBtn.hidden = !sbUser;
  showAccMsg(accMsgKey);
}

function renderSync() {
  const el = document.getElementById("syncStatus");
  let key = syncState;
  if (!key && sb && loadPassport()) key = sbUser ? "syncSaved" : "syncLocal";
  el.textContent = key ? t(key) : "";
  el.hidden = !key;
}

async function uploadProfile(data) {
  if (!sb || !sbUser || !data) return;
  syncState = "syncSaving";
  renderSync();
  const { error } = await sb.from("profiles").upsert({
    user_id: sbUser.id,
    data,
    updated_at: data.updatedAt || new Date().toISOString()
  });
  syncState = error ? "syncFailed" : "syncSaved";
  renderSync();
}

// On sign-in, the newer of the account copy and this device's copy wins.
async function syncOnSignIn() {
  const { data: row, error } = await sb.from("profiles").select("data, updated_at").eq("user_id", sbUser.id).maybeSingle();
  if (error) {
    syncState = "syncFailed";
    renderSync();
    return;
  }
  const local = loadPassport();
  const localTime = Date.parse((local && local.updatedAt) || "") || 0;
  const remoteTime = row ? Date.parse(row.updated_at) || 0 : -1;
  if (row && remoteTime >= localTime) {
    savePassport(row.data);
    syncState = "syncLoaded";
    refreshProfileViews();
  } else if (local) {
    await uploadProfile(local);
  } else {
    syncState = "";
    renderSync();
  }
}

async function initAccounts() {
  let cfg;
  try {
    const res = await fetch("/api/config");
    if (!res.ok) return;
    cfg = await res.json();
  } catch {
    return; // Server settings unavailable: the app keeps working with a browser-only profile.
  }
  checkoutEnabled = !!cfg.checkoutEnabled;
  proRequiredForAi = !!cfg.proRequiredForAi;
  accountsMode = !!cfg.accountsEnabled;
  if (!accountsMode) {
    // No accounts: profiles stay on the device and Pro runs on a Stripe pass.
    renderPro();
    await loadProStatus();
    return;
  }
  try {
    await loadScript(SUPABASE_JS_URL, SUPABASE_JS_INTEGRITY);
  } catch {
    accountsMode = false;
    renderPro();
    await loadProStatus();
    return;
  }
  sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  sb.auth.onAuthStateChange((event, session) => {
    const user = session ? session.user : null;
    const newUser = !!user && (!sbUser || sbUser.id !== user.id);
    sbUser = user;
    if (user) showAccMsg("");
    renderAccount();
    renderSync();
    // Supabase advises against awaiting its own calls inside this callback.
    if (newUser) setTimeout(async () => { await syncOnSignIn(); await loadProStatus(); }, 0);
  });
  renderAccount();
  renderSync();
  renderPro();
}

document.getElementById("accOpenBtn").addEventListener("click", () => {
  accForm.hidden = !accForm.hidden;
  if (!accForm.hidden) accEmail.focus();
});

accForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = accEmail.value.trim();
  if (!accEmail.checkValidity() || !email) return showAccMsg("accEmailInvalid");
  const btn = document.getElementById("accSendBtn");
  btn.disabled = true;
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.origin + location.pathname }
  });
  btn.disabled = false;
  if (error) return showAccMsg("accError");
  accForm.hidden = true;
  showAccMsg("accLinkSent");
});

document.getElementById("accSignOutBtn").addEventListener("click", async () => {
  await sb.auth.signOut();
  // A shared device shouldn't keep the previous user's profile.
  clearPassport();
  sbUser = null;
  syncState = "";
  accMsgKey = "";
  userIsPro = false;
  renderPro();
  renderAccount();
  refreshProfileViews();
});

accDeleteBtn.addEventListener("click", async () => {
  if (!sbUser || !window.confirm(t("accDeleteConfirm"))) return;
  const { error } = await sb.from("profiles").delete().eq("user_id", sbUser.id);
  if (error) return showAccMsg("accError");
  clearPassport();
  syncState = "";
  refreshProfileViews();
  showAccMsg("accDeleted");
});

initAccounts();

// ---- Pro plan and waitlist ----
// No payments yet: the waitlist measures demand before Stripe is added.

const proForm = document.getElementById("proForm");
const proEmail = document.getElementById("proEmail");
const proMsg = document.getElementById("proMsg");
let proMsgKey = "";

function showProMsg(key) {
  proMsgKey = key;
  proMsg.textContent = key ? t(key) : "";
  proMsg.hidden = !key;
}

function openPro() {
  activateTab("pro");
  if (sbUser && !proEmail.value) proEmail.value = sbUser.email || "";
  document.getElementById("proPanel").scrollIntoView({ behavior: "smooth" });
}

document.getElementById("proOpenBtn").addEventListener("click", openPro);
document.querySelectorAll(".pro-link").forEach((btn) => btn.addEventListener("click", openPro));

proForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = proEmail.value.trim().toLowerCase();
  if (!proEmail.checkValidity() || !email) return showProMsg("accEmailInvalid");
  if (!sb) return showProMsg("proNoWaitlist");
  const btn = document.getElementById("proJoinBtn");
  btn.disabled = true;
  const { error } = await sb.from("pro_waitlist").insert({ email, lang: currentLang });
  btn.disabled = false;
  if (error && error.code === "23505") return showProMsg("proAlready");
  if (error) return showProMsg("accError");
  showProMsg("proJoined");
});

// ---- Pro checkout (Stripe) ----
// Payment happens on Stripe's page; the webhook records the subscription and the app reads it back.

const proBuyBtn = document.getElementById("proBuyBtn");
const proManageBtn = document.getElementById("proManageBtn");
const proBuyMsg = document.getElementById("proBuyMsg");
let proBuyMsgKey = "";

function showProBuyMsg(key) {
  proBuyMsgKey = key;
  proBuyMsg.textContent = key ? t(key) : "";
  proBuyMsg.hidden = !key;
}

function renderPro() {
  document.getElementById("proIntroText").textContent = t(checkoutEnabled ? "proIntroLive" : "proIntro");
  document.getElementById("aiAccessNote").textContent = t(proRequiredForAi ? "aiProOnly" : "aiEarlyAccess");
  document.getElementById("proOpenBtn").textContent = t(userIsPro ? "proBadge" : "proOpen");
  document.getElementById("proBuy").hidden = !checkoutEnabled;
  proForm.hidden = checkoutEnabled;
  if (!checkoutEnabled) return;

  document.getElementById("proBuyTitle").textContent = t(userIsPro ? "proIsProTitle" : "proBuyTitle");
  const needsSignIn = accountsMode && !sbUser;
  document.getElementById("proBuyText").textContent = t(userIsPro ? "proIsPro" : needsSignIn ? "proSignInFirst" : "proBuyBody");
  proBuyBtn.hidden = userIsPro;
  proBuyBtn.textContent = t(needsSignIn ? "proSignInBtn" : "proBuyBtn");
  proManageBtn.hidden = !userIsPro;
  showProBuyMsg(proBuyMsgKey);
}

async function loadProStatus() {
  const pass = getProPass();
  if (pass) {
    try {
      const res = await fetch("/api/pro", { method: "POST", headers: { "Content-Type": "application/json", "x-pro-pass": pass }, body: "{}" });
      const body = await res.json();
      if (res.ok) {
        userIsPro = !!body.pro;
        if (!body.pro) setProPass(""); // cancelled or unpaid: back to Free
      }
    } catch {
      // offline: keep the last known status
    }
  } else if (!sb || !sbUser) {
    userIsPro = false;
  } else {
    const { data } = await sb.from("subscriptions").select("status").eq("user_id", sbUser.id).maybeSingle();
    userIsPro = !!data && ["active", "trialing"].includes(data.status);
  }
  renderPro();
  return userIsPro;
}

async function goToStripe(endpoint, errorKey) {
  showProBuyMsg("proRedirecting");
  try {
    const res = await fetch(endpoint, { method: "POST", headers: await authHeaders() });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.url) {
      location.href = body.url;
      return;
    }
    if (body.error === "already_pro") {
      await loadProStatus();
      return showProBuyMsg("");
    }
    showProBuyMsg(errorKey);
  } catch {
    showProBuyMsg(errorKey);
  }
}

proBuyBtn.addEventListener("click", () => {
  if (accountsMode && !sbUser) {
    // Pro belongs to an account, so sign-in comes first.
    accForm.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
    accEmail.focus();
    return;
  }
  proBuyBtn.disabled = true;
  goToStripe("/api/checkout", "accError").finally(() => (proBuyBtn.disabled = false));
});

proManageBtn.addEventListener("click", () => goToStripe("/api/portal", "accError"));

// Back from Stripe: ?pro=success | cancel | manage. The webhook can land a moment
// after the redirect, so a successful payment is re-checked for a short while.
async function handleProReturn() {
  const params = new URLSearchParams(location.search);
  const result = params.get("pro");
  const sessionId = params.get("session_id");
  if (!result) return;
  params.delete("pro");
  params.delete("session_id");
  history.replaceState(null, "", location.pathname + (params.toString() ? "?" + params : "") + location.hash);
  openPro();
  if (result === "cancel") return showProBuyMsg("proCanceled");
  if (result !== "success") return;
  showProBuyMsg("proActivating");
  // Stripe-only: trade the finished checkout for a Pro pass.
  if (sessionId) {
    for (let i = 0; i < 5; i++) {
      try {
        const res = await fetch("/api/pro", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) });
        const body = await res.json();
        if (body.pass) {
          setProPass(body.pass);
          userIsPro = true;
          renderPro();
          return showProBuyMsg("proWelcome");
        }
      } catch {
        // try again
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  for (let i = 0; i < 10; i++) {
    if (sbUser && (await loadProStatus())) return showProBuyMsg("proWelcome");
    await new Promise((r) => setTimeout(r, 2000));
  }
  showProBuyMsg("");
}

handleProReturn();

// ---- Language switching ----

const langSelect = document.getElementById("langSelect");
langSelect.value = currentLang;

function applyLanguage(lang) {
  currentLang = lang;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // localStorage unavailable; language choice won't persist
  }
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  langSelect.value = lang;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });

  const passport = loadPassport();
  renderPassportBanner(passport);
  if (passport && !passportResults.hidden) renderPassportSummaryAndMatches(passport);
  if (lastData && !results.hidden) render();
  renderResume();
  renderStrength();
  renderCreatorNote();
  renderAiNote();
  renderAiLog();
  renderAccount();
  renderSync();
  showProMsg(proMsgKey);
  renderPro();
  if (lastCaption) renderCaption();
  if (!document.getElementById("oppResult").hidden) checkOpportunity();
}

langSelect.addEventListener("change", () => applyLanguage(langSelect.value));

applyLanguage(currentLang);
