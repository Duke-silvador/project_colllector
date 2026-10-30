"use strict";
/* Plantillas de partida: cuestionarios de TFG y TFM, líneas de trabajo y sectores.
   Cada convocatoria guarda su propia copia; editarla no cambia estas plantillas. */
const SECTORS_DEF = [{"k":"banca","re":"banc|financ|fintech|inversi|bolsa|crédit|credit","label":"banca"},{"k":"seguros","re":"segur|asegurad","label":"seguros"},{"k":"retail","re":"retail|comerci|tienda|supermerc|distribuc|gran consumo|consumo","label":"retail"},{"k":"ecommerce","re":"e-?commerce|comercio electr|online|marketplace","label":"comercio electrónico"},{"k":"moda","re":"moda|textil|lujo|fashion","label":"moda"},{"k":"salud","re":"salud|sanit|hospital|farma|clínic|clinic","label":"salud"},{"k":"deporte","re":"deport|fútbol|futbol|gimnas|fitness|club","label":"deporte"},{"k":"energia","re":"energ|eléctric|electric|utilit|renovab","label":"energía"},{"k":"turismo","re":"turism|hotel|viaj|hostel|restaura|ocio","label":"turismo y hostelería"},{"k":"telecom","re":"telec|telefon|operador","label":"telecomunicaciones"},{"k":"tecnologia","re":"tecnolog|software|startup|digital|saas","label":"tecnología"},{"k":"marketing","re":"marketing|publicid|marca|redes sociales","label":"marketing"},{"k":"rrhh","re":"recursos humanos|rrhh|talento|empleo","label":"recursos humanos"},{"k":"consultoria","re":"consultor|auditor","label":"consultoría"},{"k":"musica","re":"música|musica|streaming|cine|entretenim|videojuego","label":"entretenimiento"},{"k":"logistica","re":"logíst|logist|transporte|movilidad","label":"logística"},{"k":"pyme","re":"pyme|pequeña empresa|negocio familiar|autónom","label":"pymes"},{"k":"educacion","re":"educa|universidad|formaci","label":"educación"}];
const DEFAULT_LINES = [
 {
  "id": "ia",
  "name": "IA generativa y productividad empresarial",
  "short": "IA generativa",
  "entregable": "Experimento con y sin IA, rúbrica de calidad y análisis de resultados",
  "need": {
   "code": 1.5,
   "stats": 2.3,
   "ml": 1.3,
   "biz": 2.8
  },
  "w": {
   "code": 0.5,
   "stats": 1,
   "ml": 0.6,
   "biz": 1
  },
  "fav": {
   "Definir el problema de negocio": 1,
   "Diseñar recomendaciones empresariales": 0.9,
   "Visualizar y comunicar resultados": 0.5
  },
  "pref": {
   "Investigación y análisis empresarial": 1,
   "Mixto: análisis y pequeño prototipo": 0.8,
   "Aplicado con datos y código": 0.45
  },
  "sectors": [
   "tecnologia",
   "consultoria",
   "educacion",
   "rrhh",
   "marketing"
  ],
  "titulo": "Impacto de la IA generativa en la productividad y la calidad del trabajo en {sector}: diseño experimental y evaluación",
  "sector_def": "una empresa de servicios",
  "en": "Impact of Generative AI on Business Productivity and Work Quality: An Experimental Evaluation",
  "problema": [
   "La IA generativa se está incorporando a tareas habituales de las empresas (redacción, análisis, atención al cliente), pero todavía hay poca evidencia cuantitativa sobre cuánto mejora realmente el tiempo y la calidad del trabajo, y en qué condiciones puede empeorarlos. En {sector}, la decisión afecta a la inversión en licencias, a la formación y al rediseño de procesos.",
   "Este TFG diseñará un experimento que compare una tarea de negocio realizada con y sin apoyo de IA generativa, medirá tiempo y calidad con una rúbrica y traducirá el resultado en una recomendación de adopción."
  ],
  "general": "Medir el efecto de la IA generativa sobre la productividad y la calidad en una tarea de negocio concreta y formular una recomendación de adopción basada en evidencia.",
  "especificos": [
   "Revisar la literatura sobre IA generativa y productividad en la empresa.",
   "Diseñar el experimento: tarea, grupos, rúbrica de calidad y métricas.",
   "Recoger y analizar los resultados con contrastes estadísticos adecuados.",
   "Estimar el impacto económico y las condiciones de uso recomendadas."
  ],
  "fases": [
   "Delimitación de la tarea y de la pregunta de investigación.",
   "Estado del arte y diseño experimental.",
   "Preparación de materiales, rúbrica y prueba piloto.",
   "Ejecución del experimento y recogida de datos.",
   "Análisis estadístico e interpretación de negocio.",
   "Redacción de la memoria y preparación de la defensa."
  ]
 },
 {
  "id": "churn",
  "name": "Predicción de ventas o abandono de clientes",
  "short": "Ventas / abandono",
  "entregable": "Modelo base + modelo mejorado, métricas y valor económico de la retención",
  "need": {
   "code": 3,
   "stats": 3,
   "ml": 3,
   "biz": 2.3
  },
  "w": {
   "code": 1,
   "stats": 1,
   "ml": 1,
   "biz": 0.6
  },
  "fav": {
   "Programar y modelizar": 1,
   "Recopilar y limpiar datos": 0.6,
   "Diseñar recomendaciones empresariales": 0.5
  },
  "pref": {
   "Aplicado con datos y código": 1,
   "Mixto: análisis y pequeño prototipo": 0.75,
   "Investigación y análisis empresarial": 0.25
  },
  "sectors": [
   "telecom",
   "banca",
   "seguros",
   "retail",
   "energia",
   "deporte",
   "ecommerce",
   "musica"
  ],
  "titulo": "Predicción del abandono de clientes en {sector} y valoración económica de una estrategia de retención",
  "sector_def": "una empresa de suscripción",
  "en": "Customer Churn Prediction and Economic Evaluation of a Retention Strategy",
  "problema": [
   "Captar un cliente nuevo cuesta varias veces más que retener uno existente, y en {sector} la pérdida de clientes tiene un impacto directo en ingresos y márgenes. Sin embargo, muchas campañas de retención se dirigen a todos los clientes por igual, sin saber quién tiene más riesgo ni cuánto vale retenerlo.",
   "Este TFG construirá un modelo que estime la probabilidad de abandono de cada cliente y la combinará con su valor para decidir a quién dirigir la retención y con qué retorno esperado."
  ],
  "general": "Predecir el abandono de clientes y diseñar una estrategia de retención priorizada por valor económico.",
  "especificos": [
   "Analizar y preparar los datos de clientes, uso y facturación.",
   "Entrenar un modelo base interpretable y un modelo mejorado, y compararlos con métricas adecuadas.",
   "Identificar los factores asociados al abandono.",
   "Estimar el retorno económico de distintas políticas de retención."
  ],
  "fases": [
   "Definición del problema, del KPI y de los datos disponibles.",
   "Revisión de la literatura sobre churn y valor del cliente.",
   "Limpieza, exploración y ingeniería de variables.",
   "Modelado: modelo base, modelo mejorado y validación.",
   "Simulación económica de la estrategia de retención.",
   "Redacción de la memoria y preparación de la defensa."
  ]
 },
 {
  "id": "sent",
  "name": "Sentimiento y reputación digital",
  "short": "Sentimiento",
  "entregable": "Clasificación de sentimiento, temas principales e insights para negocio",
  "need": {
   "code": 2.3,
   "stats": 2.3,
   "ml": 2,
   "biz": 2.5
  },
  "w": {
   "code": 0.8,
   "stats": 0.7,
   "ml": 0.7,
   "biz": 0.8
  },
  "fav": {
   "Visualizar y comunicar resultados": 1,
   "Recopilar y limpiar datos": 0.7,
   "Definir el problema de negocio": 0.5
  },
  "pref": {
   "Mixto: análisis y pequeño prototipo": 1,
   "Aplicado con datos y código": 0.8,
   "Investigación y análisis empresarial": 0.6
  },
  "sectors": [
   "turismo",
   "moda",
   "retail",
   "marketing",
   "ecommerce",
   "musica",
   "deporte",
   "salud"
  ],
  "titulo": "Análisis de sentimiento de reseñas y reputación digital en {sector}: de la opinión del cliente a la decisión comercial",
  "sector_def": "una marca de consumo",
  "en": "Sentiment Analysis of Customer Reviews and Digital Reputation: From Customer Opinion to Business Decisions",
  "problema": [
   "Las reseñas y comentarios en línea influyen en la decisión de compra y en la reputación de las marcas, pero su volumen hace imposible analizarlas a mano. En {sector}, entender qué valoran y qué critican los clientes permite priorizar mejoras con impacto en ventas y fidelidad.",
   "Este TFG aplicará técnicas de procesamiento de lenguaje natural para clasificar el sentimiento y extraer los temas principales de las opiniones de clientes, y los relacionará con indicadores de negocio."
  ],
  "general": "Convertir las opiniones de los clientes en indicadores y recomendaciones de negocio mediante análisis de sentimiento y de temas.",
  "especificos": [
   "Recopilar y depurar un corpus de reseñas u opiniones.",
   "Clasificar el sentimiento y comparar al menos dos enfoques.",
   "Identificar los temas que más pesan en las valoraciones positivas y negativas.",
   "Relacionar sentimiento y temas con indicadores de negocio y proponer acciones."
  ],
  "fases": [
   "Delimitación de la marca, el producto o el sector y de las fuentes.",
   "Estado del arte en análisis de sentimiento.",
   "Recogida y preparación del texto.",
   "Modelado de sentimiento y de temas, y validación.",
   "Interpretación de negocio y recomendaciones.",
   "Redacción de la memoria y preparación de la defensa."
  ]
 },
 {
  "id": "bi",
  "name": "Business Intelligence para pymes",
  "short": "BI para pymes",
  "entregable": "Modelo de datos, dashboard con KPI y recomendaciones para la gerencia",
  "need": {
   "code": 1,
   "stats": 1.8,
   "ml": 0.5,
   "biz": 3
  },
  "w": {
   "code": 0.5,
   "stats": 0.6,
   "ml": 0.2,
   "biz": 1
  },
  "fav": {
   "Visualizar y comunicar resultados": 1,
   "Diseñar recomendaciones empresariales": 0.9,
   "Definir el problema de negocio": 0.8,
   "Recopilar y limpiar datos": 0.6
  },
  "pref": {
   "Mixto: análisis y pequeño prototipo": 1,
   "Investigación y análisis empresarial": 0.75,
   "Aplicado con datos y código": 0.6
  },
  "sectors": [
   "pyme",
   "retail",
   "turismo",
   "logistica",
   "moda",
   "salud",
   "deporte"
  ],
  "titulo": "Diseño de un cuadro de mando para la toma de decisiones en {sector}: KPI, visualización y recomendaciones",
  "sector_def": "una pyme",
  "en": "Business Intelligence Dashboard for Decision-Making in SMEs: KPIs, Visualisation and Recommendations",
  "problema": [
   "Muchas pequeñas y medianas empresas toman decisiones con información dispersa en hojas de cálculo y sin indicadores comunes. En {sector}, disponer de un cuadro de mando bien diseñado permite detectar a tiempo problemas de ventas, márgenes o stock.",
   "Este TFG diseñará el modelo de datos y un dashboard con los indicadores clave para la gerencia, y lo usará para extraer conclusiones y recomendaciones concretas."
  ],
  "general": "Diseñar e implantar un cuadro de mando que apoye la toma de decisiones de la dirección con indicadores fiables y accionables.",
  "especificos": [
   "Identificar las decisiones clave y los KPI que las apoyan.",
   "Diseñar el modelo de datos e integrar las fuentes disponibles.",
   "Construir el dashboard siguiendo buenas prácticas de visualización.",
   "Analizar los resultados y formular recomendaciones de negocio."
  ],
  "fases": [
   "Entrevistas o análisis del negocio y definición de KPI.",
   "Revisión de buenas prácticas de BI y visualización.",
   "Preparación de datos y modelo dimensional.",
   "Construcción y validación del dashboard.",
   "Análisis de resultados y recomendaciones.",
   "Redacción de la memoria y preparación de la defensa."
  ]
 },
 {
  "id": "fraud",
  "name": "Detección de fraude o anomalías",
  "short": "Fraude / anomalías",
  "entregable": "Detector de anomalías, umbral óptimo y análisis coste-beneficio",
  "need": {
   "code": 3.3,
   "stats": 3,
   "ml": 3.3,
   "biz": 2
  },
  "w": {
   "code": 1,
   "stats": 1,
   "ml": 1,
   "biz": 0.5
  },
  "fav": {
   "Programar y modelizar": 1,
   "Recopilar y limpiar datos": 0.7
  },
  "pref": {
   "Aplicado con datos y código": 1,
   "Mixto: análisis y pequeño prototipo": 0.6,
   "Investigación y análisis empresarial": 0.2
  },
  "sectors": [
   "banca",
   "seguros",
   "ecommerce",
   "consultoria",
   "telecom",
   "energia"
  ],
  "titulo": "Detección de anomalías y fraude en {sector}: modelo de alertas y análisis coste-beneficio de las falsas alarmas",
  "sector_def": "el sector financiero",
  "en": "Anomaly and Fraud Detection: Alert Modelling and Cost-Benefit Analysis of False Alarms",
  "problema": [
   "El fraude y las operaciones anómalas generan pérdidas económicas y de confianza, pero un sistema que alerta demasiado satura a los equipos de revisión. En {sector}, el reto es detectar los casos relevantes sin disparar los costes de las falsas alarmas.",
   "Este TFG desarrollará un modelo de detección de anomalías y elegirá el umbral de alerta a partir de un análisis coste-beneficio, no solo de métricas estadísticas."
  ],
  "general": "Detectar operaciones anómalas o fraudulentas y fijar una política de alertas que minimice el coste total para la empresa.",
  "especificos": [
   "Preparar un conjunto de datos de operaciones con el desequilibrio de clases característico.",
   "Comparar técnicas supervisadas y no supervisadas de detección.",
   "Definir la matriz de costes y elegir el umbral óptimo.",
   "Evaluar el impacto económico frente a la situación actual."
  ],
  "fases": [
   "Definición del problema y de los costes de error.",
   "Estado del arte en detección de fraude y anomalías.",
   "Preparación de datos y tratamiento del desequilibrio.",
   "Modelado, validación y elección de umbral.",
   "Análisis coste-beneficio y recomendaciones.",
   "Redacción de la memoria y preparación de la defensa."
  ]
 },
 {
  "id": "reco",
  "name": "Sistemas de recomendación",
  "short": "Recomendadores",
  "entregable": "Recomendador, evaluación offline y estimación de impacto comercial",
  "need": {
   "code": 3.3,
   "stats": 2.5,
   "ml": 3,
   "biz": 2.3
  },
  "w": {
   "code": 1,
   "stats": 0.8,
   "ml": 1,
   "biz": 0.6
  },
  "fav": {
   "Programar y modelizar": 1,
   "Diseñar recomendaciones empresariales": 0.6,
   "Recopilar y limpiar datos": 0.5
  },
  "pref": {
   "Aplicado con datos y código": 1,
   "Mixto: análisis y pequeño prototipo": 0.65,
   "Investigación y análisis empresarial": 0.2
  },
  "sectors": [
   "retail",
   "ecommerce",
   "moda",
   "musica",
   "turismo",
   "deporte"
  ],
  "titulo": "Sistema de recomendación para {sector}: personalización y efecto esperado sobre las ventas",
  "sector_def": "el comercio electrónico",
  "en": "Recommender System for Personalised Offers and Its Expected Effect on Sales",
  "problema": [
   "Ofrecer a cada cliente el producto adecuado aumenta la conversión y el valor del cliente, pero muchas empresas siguen usando reglas generales iguales para todos. En {sector}, la personalización es una palanca directa de ventas y fidelidad.",
   "Este TFG construirá y evaluará un sistema de recomendación a partir del historial de compras o interacciones y estimará su efecto esperado sobre las ventas."
  ],
  "general": "Diseñar y evaluar un sistema de recomendación que mejore la relevancia de las ofertas y estimar su impacto comercial.",
  "especificos": [
   "Preparar los datos de interacciones entre clientes y productos.",
   "Implementar un recomendador base y al menos un enfoque más avanzado.",
   "Evaluar los modelos con métricas de ranking y de negocio.",
   "Estimar el impacto comercial y proponer un plan de puesta en marcha."
  ],
  "fases": [
   "Definición del caso de uso y de los datos.",
   "Estado del arte en sistemas de recomendación.",
   "Preparación de datos y análisis exploratorio.",
   "Modelado y evaluación offline.",
   "Estimación de impacto y recomendaciones.",
   "Redacción de la memoria y preparación de la defensa."
  ]
 }
];
const TEMPLATE_TFG = {"version":2,"intro":{"title":"Cuestionario inicial del TFG","text":"Unos 15 minutos. No es un examen: sirve para proponerte un TFG que te interese y que puedas sacar adelante. Si no has cursado una asignatura, márcalo; también es información útil.","privacy":"Solo tu tutor verá tus respuestas. Se guarda un borrador en este navegador mientras escribes. Cuando pulses «Enviar respuestas» se las mandas a tu tutor; podrás cambiarlas después."},"sections":[{"t":"Perfil y situación académica","q":[{"id":"q1","t":"Nombre y apellidos","type":"text"},{"id":"q2","t":"Correo universitario","type":"email"},{"id":"q3","t":"¿En qué curso estás y qué asignaturas tienes pendientes?","type":"text"},{"id":"q4","t":"¿Qué modalidad de TFG estás realizando y qué fechas de entrega conoces?","type":"text"},{"id":"q5","t":"¿Cuál es tu nota media aproximada? (Si no la conoces, indícalo)","type":"text"}]},{"t":"Asignaturas cursadas y calificaciones","q":[{"id":"q6","t":"Programación I / introducción a la programación: nota y lenguaje utilizado (o no cursada)","type":"grade","dim":"code"},{"id":"q7","t":"Programación II / programación avanzada: nota, contenidos y si la has cursado","type":"grade","dim":"code"},{"id":"q8","t":"Estadística y probabilidad: nota y temas que mejor dominas","type":"grade","dim":"stats"},{"id":"q9","t":"Bases de datos y SQL: nota y experiencia con consultas","type":"grade","dim":"code"},{"id":"q10","t":"Minería de datos / aprendizaje automático: nota, herramientas y proyectos","type":"grade","dim":"ml"},{"id":"q11","t":"Inteligencia Artificial: nota, contenidos y aplicación realizada","type":"grade","dim":"ml"},{"id":"q12","t":"Econometría / modelos cuantitativos: nota y capacidad para interpretar resultados","type":"grade","dim":"stats"},{"id":"q13","t":"Dirección estratégica / marketing / finanzas: ¿en cuáles destacas y con qué notas?","type":"grade","dim":"biz"},{"id":"q14","t":"¿Qué otras asignaturas del grado has cursado que sean relevantes para tu TFG? Indica sus notas.","type":"area"},{"id":"q15","t":"¿Qué dos asignaturas te han gustado más y cuáles dos te han resultado más difíciles? ¿Por qué?","type":"area"}]},{"t":"Competencias prácticas","q":[{"id":"q16","t":"¿Cómo describirías tu nivel de Python?","type":"choice","o":["No lo he utilizado","Básico: variables, condicionales, bucles","Intermedio: funciones, pandas y gráficos","Avanzado: proyectos autónomos, paquetes y modelos"]},{"id":"q17","t":"¿Qué puedes hacer con SQL sin ayuda?","type":"choice","o":["Nada todavía","SELECT y filtros","JOIN, GROUP BY y subconsultas","Consultas complejas y diseño de datos"]},{"id":"q18","t":"¿Qué nivel de Excel y Power BI tienes? Explica por separado ejemplos reales.","type":"area"},{"id":"q19","t":"¿Has entrenado modelos predictivos o estadísticos con datos reales? Describe uno y cómo lo evaluaste.","type":"area"},{"id":"q20","t":"¿Podrías explicar con tus palabras la diferencia entre correlación y causalidad? Da un ejemplo empresarial.","type":"area"},{"id":"q21","t":"¿Qué herramientas de IA generativa utilizas y para qué tareas académicas o técnicas?","type":"area"},{"id":"q22","t":"En un proyecto de datos, ¿qué parte te gusta más?","type":"choice","o":["Definir el problema de negocio","Recopilar y limpiar datos","Programar y modelizar","Visualizar y comunicar resultados","Diseñar recomendaciones empresariales"]}]},{"t":"GitHub y gestión de proyectos","q":[{"id":"q23","t":"¿Has utilizado Git y GitHub anteriormente?","type":"choice","o":["Nunca","Solo he descargado repositorios","He hecho commits y push","He trabajado con ramas y pull requests"]},{"id":"q24","t":"¿Dispones de cuenta de GitHub? Si quieres, indica tu usuario.","type":"text"},{"id":"q25","t":"¿Has utilizado alguna herramienta de organización de proyectos?","type":"choice","o":["Ninguna","Trello / Notion","Planner / Teams","Jira / GitHub Projects","Otra"]},{"id":"q26","t":"¿Has trabajado con tableros Kanban, tareas y entregas cortas? Describe tu experiencia.","type":"area"},{"id":"q27","t":"¿Podrías dedicar 3-5 horas a la semana al TFG de forma sostenida?","type":"choice","o":["Sí","Depende de la semana","No, necesito acordar otra dedicación"]},{"id":"q28","t":"Para las tutorías, ¿prefieres revisión semanal o quincenal?","type":"choice","o":["Semanal","Quincenal","Indiferente"]}]},{"t":"Intereses y elección del TFG","q":[{"id":"q29","t":"¿Qué línea de TFG te interesa más?","type":"choice","o":["IA generativa y productividad empresarial","Predicción de ventas o abandono de clientes","Sentimiento y reputación digital","Business Intelligence para pymes","Detección de fraude o anomalías","Sistemas de recomendación"]},{"id":"q30","t":"¿Cuál sería tu segunda opción?","type":"choice","o":["IA generativa y productividad empresarial","Predicción de ventas o abandono de clientes","Sentimiento y reputación digital","Business Intelligence para pymes","Detección de fraude o anomalías","Sistemas de recomendación"]},{"id":"q31","t":"¿Qué sector empresarial te motiva más (banca, retail, salud, deporte, energía, etc.) y por qué?","type":"area"},{"id":"q32","t":"¿Prefieres un TFG aplicado con datos y prototipo o uno más orientado a análisis de negocio e investigación?","type":"choice","o":["Aplicado con datos y código","Mixto: análisis y pequeño prototipo","Investigación y análisis empresarial"]},{"id":"q33","t":"¿Tienes acceso a una empresa, un caso real o datos que puedan utilizarse legalmente y de forma autorizada?","type":"area"},{"id":"q34","t":"Propón una pregunta de negocio que te gustaría responder con datos.","type":"area"}]},{"t":"Organización y expectativas","q":[{"id":"q35","t":"¿Qué esperas aprender al finalizar el TFG?","type":"area"},{"id":"q36","t":"¿Qué dificultades anticipas (programación, estadística, tiempo, escritura académica, datos, otras)?","type":"area"},{"id":"q37","t":"¿Cuántas horas reales por semana prevés dedicar al TFG?","type":"choice","o":["Menos de 3","Entre 3 y 5","Entre 6 y 8","Más de 8"]},{"id":"q38","t":"¿Tienes alguna restricción de disponibilidad para tutorías?","type":"area"},{"id":"q39","t":"¿Qué te gustaría contarme antes de nuestra primera reunión?","type":"area"}]}]};
const TEMPLATE_TFM = {"version":2,"intro":{"title":"Cuestionario inicial del TFM","text":"Unos 15 minutos. No es un examen: sirve para proponerte un TFM que encaje con tu formación, tu experiencia y tus intereses.","privacy":"Solo tu tutor verá tus respuestas. Se guarda un borrador en este navegador mientras escribes. Cuando pulses «Enviar respuestas» se las mandas a tu tutor; podrás cambiarlas después."},"sections":[{"t":"Perfil y situación académica","q":[{"id":"q1","t":"Nombre y apellidos","type":"text"},{"id":"q2","t":"Correo universitario","type":"email"},{"id":"m1","t":"¿Qué máster cursas y en qué modalidad (presencial, online, executive)?","type":"text"},{"id":"q4","t":"¿Qué fechas de entrega del TFM conoces?","type":"text"},{"id":"m2","t":"¿Qué grado estudiaste y en qué universidad?","type":"text"},{"id":"q5","t":"¿Cuál fue tu nota media del grado aproximada?","type":"text"}]},{"t":"Experiencia profesional","q":[{"id":"m3","t":"¿Trabajas actualmente?","type":"choice","o":["Sí, a tiempo completo","Sí, a tiempo parcial","No"]},{"id":"m4","t":"¿En qué empresa y en qué puesto?","type":"text","cond":{"q":"m3","op":"neq","v":"No"}},{"id":"m5","t":"¿Cuánta experiencia tienes trabajando con datos o analítica?","type":"choice","o":["Ninguna","Menos de 1 año","Entre 1 y 3 años","Más de 3 años"],"dim":"code"},{"id":"m6","t":"¿Podrías hacer el TFM con datos o un caso de tu empresa, con autorización?","type":"choice","o":["Sí","Tendría que preguntarlo","No"],"cond":{"q":"m3","op":"neq","v":"No"}},{"id":"m7","t":"¿Qué tipo de datos y quién tendría que autorizarlos?","type":"area","cond":{"q":"m6","op":"neq","v":"No"}}]},{"t":"Asignaturas del máster","q":[{"id":"q8","t":"Estadística / fundamentos cuantitativos del máster: nota y temas que mejor dominas","type":"grade","dim":"stats"},{"id":"q9","t":"Bases de datos y SQL: nota y experiencia con consultas","type":"grade","dim":"code"},{"id":"q10","t":"Machine learning / minería de datos: nota, herramientas y proyectos","type":"grade","dim":"ml"},{"id":"q11","t":"Inteligencia artificial / deep learning: nota y aplicación realizada","type":"grade","dim":"ml"},{"id":"q13","t":"Asignaturas de negocio o estrategia del máster: ¿en cuáles destacas?","type":"grade","dim":"biz"}]},{"t":"Competencias prácticas","q":[{"id":"q16","t":"¿Cómo describirías tu nivel de Python?","type":"choice","o":["No lo he utilizado","Básico: variables, condicionales, bucles","Intermedio: funciones, pandas y gráficos","Avanzado: proyectos autónomos, paquetes y modelos"]},{"id":"q17","t":"¿Qué puedes hacer con SQL sin ayuda?","type":"choice","o":["Nada todavía","SELECT y filtros","JOIN, GROUP BY y subconsultas","Consultas complejas y diseño de datos"]},{"id":"q18","t":"¿Qué nivel de Excel y Power BI tienes? Explica por separado ejemplos reales.","type":"area"},{"id":"q19","t":"¿Has entrenado modelos predictivos o estadísticos con datos reales? Describe uno y cómo lo evaluaste.","type":"area"},{"id":"q20","t":"¿Podrías explicar con tus palabras la diferencia entre correlación y causalidad? Da un ejemplo empresarial.","type":"area"},{"id":"q21","t":"¿Qué herramientas de IA generativa utilizas y para qué tareas académicas o técnicas?","type":"area"},{"id":"q22","t":"En un proyecto de datos, ¿qué parte te gusta más?","type":"choice","o":["Definir el problema de negocio","Recopilar y limpiar datos","Programar y modelizar","Visualizar y comunicar resultados","Diseñar recomendaciones empresariales"]}]},{"t":"Herramientas y organización","q":[{"id":"q23","t":"¿Has utilizado Git y GitHub anteriormente?","type":"choice","o":["Nunca","Solo he descargado repositorios","He hecho commits y push","He trabajado con ramas y pull requests"]},{"id":"q24","t":"¿Dispones de cuenta de GitHub? Si quieres, indica tu usuario.","type":"text"},{"id":"q25","t":"¿Has utilizado alguna herramienta de organización de proyectos?","type":"choice","o":["Ninguna","Trello / Notion","Planner / Teams","Jira / GitHub Projects","Otra"]},{"id":"q27","t":"¿Podrías dedicar 3-5 horas a la semana al TFM de forma sostenida?","type":"choice","o":["Sí","Depende de la semana","No, necesito acordar otra dedicación"]},{"id":"q28","t":"Para las tutorías, ¿prefieres revisión semanal o quincenal?","type":"choice","o":["Semanal","Quincenal","Indiferente"]}]},{"t":"Intereses y elección del TFM","q":[{"id":"q29","t":"¿Qué línea de TFM te interesa más?","type":"choice","o":["IA generativa y productividad empresarial","Predicción de ventas o abandono de clientes","Sentimiento y reputación digital","Business Intelligence para pymes","Detección de fraude o anomalías","Sistemas de recomendación"]},{"id":"q30","t":"¿Cuál sería tu segunda opción?","type":"choice","o":["IA generativa y productividad empresarial","Predicción de ventas o abandono de clientes","Sentimiento y reputación digital","Business Intelligence para pymes","Detección de fraude o anomalías","Sistemas de recomendación"]},{"id":"q31","t":"¿Qué sector empresarial te motiva más (banca, retail, salud, deporte, energía, etc.) y por qué?","type":"area"},{"id":"q32","t":"¿Prefieres un TFM aplicado con datos y prototipo o uno más orientado a análisis de negocio e investigación?","type":"choice","o":["Aplicado con datos y código","Mixto: análisis y pequeño prototipo","Investigación y análisis empresarial"]},{"id":"q33","t":"¿Tienes acceso a una empresa, un caso real o datos que puedan utilizarse legalmente y de forma autorizada?","type":"area"},{"id":"q34","t":"Propón una pregunta de negocio que te gustaría responder con datos.","type":"area"}]},{"t":"Organización y expectativas","q":[{"id":"q35","t":"¿Qué esperas aprender al finalizar el TFM?","type":"area"},{"id":"q36","t":"¿Qué dificultades anticipas (programación, estadística, tiempo, escritura académica, datos, otras)?","type":"area"},{"id":"q37","t":"¿Cuántas horas reales por semana prevés dedicar al TFM?","type":"choice","o":["Menos de 3","Entre 3 y 5","Entre 6 y 8","Más de 8"]},{"id":"q38","t":"¿Tienes alguna restricción de disponibilidad para tutorías?","type":"area"},{"id":"q39","t":"¿Qué te gustaría contarme antes de nuestra primera reunión?","type":"area"}]}]};
const TEMPLATE_VACIA = {"version":2,"intro":{"title":"Cuestionario inicial","text":"Responde con sinceridad: sirve para orientar tu trabajo.","privacy":"Solo tu tutor verá tus respuestas. Se guarda un borrador en este navegador mientras escribes. Cuando pulses «Enviar respuestas» se las mandas a tu tutor; podrás cambiarlas después."},"sections":[{"t":"Datos personales","q":[{"id":"q1","t":"Nombre y apellidos","type":"text"},{"id":"q2","t":"Correo universitario","type":"email"}]}]};
const PLANTILLAS = [
  { id: "tfg-ba", nombre: "TFG · Análisis de Negocios / Business Analytics", tipo: "TFG", def: TEMPLATE_TFG, lineas: DEFAULT_LINES },
  { id: "tfm-ba", nombre: "TFM · Business Analytics / Ciencia de Datos", tipo: "TFM", def: TEMPLATE_TFM, lineas: DEFAULT_LINES },
  { id: "vacia", nombre: "En blanco (solo nombre y correo)", tipo: "TFG", def: TEMPLATE_VACIA, lineas: [] },
];
