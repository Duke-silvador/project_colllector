* { box-sizing: border-box; }
:root {
  --bg: #0f172a;
  --bg-soft: #111827;
  --panel: #1f2937;
  --panel-alt: #111827;
  --ink: #e5e7eb;
  --muted: #94a3b8;
  --accent: #38bdf8;
  --accent-2: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
  --pending: #334155;
  --done: #166534;
  --skipped: #4b5563;
  --border: rgba(148, 163, 184, 0.22);
}

body {
  margin: 0;
  font-family: Arial, Helvetica, sans-serif;
  background: linear-gradient(180deg, var(--bg), var(--bg-soft));
  color: var(--ink);
}

.header {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.eyebrow {
  margin: 0 0 0.3rem;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.75rem;
}

h1, h2, h3, p { margin-top: 0; }

h1 { margin-bottom: 0; }

.status-badge {
  background: rgba(56, 189, 248, 0.14);
  border: 1px solid rgba(56, 189, 248, 0.45);
  color: var(--accent);
  border-radius: 999px;
  padding: 0.6rem 1rem;
  font-weight: 700;
}

.layout {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem 2rem;
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 1rem;
}

.panel {
  background: rgba(17, 24, 39, 0.9);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1rem;
  box-shadow: 0 8px 20px rgba(0,0,0,0.18);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.btn {
  appearance: none;
  border: 1px solid var(--border);
  background: #0b1220;
  color: var(--ink);
  border-radius: 10px;
  padding: 0.7rem 1rem;
  font-weight: 600;
  cursor: pointer;
}

.btn.primary { background: var(--accent); color: #031827; border-color: transparent; }
.btn.warning { background: var(--warning); color: #1f2937; border-color: transparent; }
.btn.danger { background: var(--danger); color: white; border-color: transparent; }
.fileBtn { display: inline-flex; align-items: center; }

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  color: var(--muted);
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 0.4rem;
}
.dot.pending { background: var(--pending); }
.dot.done { background: var(--done); }
.dot.skipped { background: var(--skipped); }

.grid-wrap {
  overflow-x: auto;
}

.grid {
  width: 100%;
  border-collapse: collapse;
}

.grid th, .grid td {
  border: 1px solid var(--border);
  padding: 0.6rem;
  text-align: center;
}

.cell {
  background: var(--pending);
  color: var(--ink);
  border: 1px solid var(--border);
  border-radius: 10px;
  width: 100%;
  min-height: 72px;
  padding: 0.5rem;
  cursor: pointer;
  transition: transform 0.12s ease;
}

.cell:hover { transform: translateY(-1px); }
.cell.done { background: var(--done); }
.cell.skipped { background: var(--skipped); }
.cell.today { outline: 2px solid var(--accent); }
.cell.selected { outline: 2px solid white; }

.cell strong { display: block; font-size: 1.05rem; }
.cell small { display: block; color: rgba(255,255,255,0.8); }

.session-info {
  min-height: 80px;
  display: flex;
  align-items: center;
  color: var(--muted);
}

.session-form {
  display: block;
}

.hidden { display: none !important; }

.row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.status-row { margin-top: 1rem; }

.exercise {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem;
  background: rgba(255,255,255,0.02);
}

.field {
  margin-top: 1rem;
}

.field label {
  display: block;
  color: var(--muted);
  font-size: 0.82rem;
  margin-bottom: 0.35rem;
}

input, textarea {
  width: 100%;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: rgba(15, 23, 42, 0.8);
  color: var(--ink);
  padding: 0.7rem 0.8rem;
  font: inherit;
}

.sets {
  display: flex;
  gap: 0.5rem;
}
.sets input { width: 30%; min-width: 0; }

.note-field textarea { resize: vertical; }

@media (max-width: 860px) {
  .layout { grid-template-columns: 1fr; }
  .header { flex-direction: column; align-items: flex-start; }
}
