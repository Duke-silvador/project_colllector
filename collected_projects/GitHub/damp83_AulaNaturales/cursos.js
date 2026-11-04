/* =====================================================================
   CURSOS DE LA PLATAFORMA · Exploradores de la Naturaleza
   © 2026 Diego Alberto Moya Puerta, Maestro de Educación Primaria, Comunidad Autónoma de la Región de Murcia · Licencia CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es)
   ---------------------------------------------------------------------
   Cada curso tiene su carpeta en cursos/<id>/ con:
     contenidos.js      temas, misiones, retos, esquemas y currículo (obligatorio)
     contenidos-en.js   los mismos contenidos en inglés (opcional; si no existe, el curso va solo en castellano)
   Cada curso tiene su propio enlace:  https://damp83.github.io/AulaNaturales/?curso=<id>
   y guarda el progreso por separado.
   Para crear un curso nuevo:  python3 tools/nuevo_curso.py <id> "<nombre>"
   ===================================================================== */
const CURSOS = [
  {
    id: '2-primaria',
    nombre: '2.º de Primaria',           // como aparece en el selector de curso
    nombre_en: 'Primary 2',
    ingles: true,                         // tiene contenidos-en.js
    clave: 'exploradores-cuerpo-v1'       // dónde se guarda el progreso (no cambiar en cursos ya en uso)
  },
  {
    id: '3-primaria',
    nombre: '3.º de Primaria',
    nombre_en: 'Primary 3',
    ingles: false
  }
];
