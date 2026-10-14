// Sammelordner – Kartenzustand (Condition)
// Ein Zustand gehört zu einem abgehakten Exemplar: Karte (inkl. Variante) + Sprache.
// Gespeichert in st.cond unter "<kartenschlüssel>|<de|en>", z. B. "base-4|de" oder "neo1-9:1e|en".
//
// Datenform (bewusst offen für weitere Grading-Firmen):
//   { kind: "raw",    grade: "NM" }                    – nicht gegradet
//   { kind: "graded", company: "PSA", grade: "10" }    – gegradet
//
// Neue Grading-Firma (z. B. BGS, CGC, TAG): nur einen Eintrag in GRADERS ergänzen.
// Die Auswahl in der Detailansicht und alle Anzeigen ergeben sich daraus automatisch.

const Condition = (() => {
  // Raw-Zustände, vom besten zum schlechtesten
  const RAW = [
    { id: "Mint",      label: "Mint",      de: "Neuwertig, ohne jede Spur" },
    { id: "NM",        label: "NM",        de: "Near Mint – fast neuwertig" },
    { id: "Excellent", label: "Excellent", de: "Sehr gut, minimale Spuren" },
    { id: "LP",        label: "LP",        de: "Light Played – leichte Spuren" },
    { id: "Good",      label: "Good",      de: "Gut, deutliche Spuren" },
    { id: "Played",    label: "Played",    de: "Bespielt, starke Spuren" },
    { id: "Poor",      label: "Poor",      de: "Stark beschädigt" },
  ];

  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => String(b - i));   // 10 … 1
  const GRADERS = {
    PSA: { label: "PSA", grades: range(1, 10) },
    // BGS: { label: "BGS", grades: ["10", "9.5", "9", "8.5", …] },
    // CGC: { label: "CGC", grades: […] },
    // TAG: { label: "TAG", grades: […] },
  };

  const LANGS = { 1: "de", 2: "en" };
  const key = (cardKey, bit) => cardKey + "|" + LANGS[bit];

  function valid(c) {
    if (!c || typeof c !== "object") return false;
    if (c.kind === "raw") return RAW.some(r => r.id === c.grade);
    if (c.kind === "graded") return !!GRADERS[c.company] && GRADERS[c.company].grades.includes(String(c.grade));
    return false;
  }
  // Kurzform für Listen: "NM", "PSA 10"
  const short = c => !valid(c) ? "" : c.kind === "raw" ? c.grade : `${GRADERS[c.company].label} ${c.grade}`;
  // Langform für die Detailansicht
  const long = c => !valid(c) ? "Kein Zustand" : c.kind === "raw"
    ? `Raw · ${RAW.find(r => r.id === c.grade).de}` : `${GRADERS[c.company].label} ${c.grade} · gegradet`;

  // Unbekannte oder kaputte Einträge (z. B. aus einem alten Sicherungscode) still entfernen
  function clean(map) {
    const out = {};
    if (map && typeof map === "object") for (const [k, v] of Object.entries(map)) if (valid(v)) out[k] = v;
    return out;
  }

  return { RAW, GRADERS, key, valid, short, long, clean };
})();
