#!/usr/bin/env python3
"""Gera gráficos Tamanho vs Tempo a partir dos CSVs do benchmark.

Lê resultadosDijkstra_grafos.csv e resultadosBellmanFord_grafos.csv
(formato LCS: "Tamanho;Tempo_..._Segundos;" + linhas "n;tempo"),
e salva variantes em images/:
  - grafico_Dijkstra_vs_BellmanFord_linear.png : linhas, escala decimal
  - grafico_Dijkstra_vs_BellmanFord_log.png    : linhas, escala log (eixo y)
  - grafico_barras_Dijkstra_vs_BellmanFord_linear.png : barras, decimal
  - grafico_barras_Dijkstra_vs_BellmanFord_log.png    : barras, log (eixo y)
"""

import csv
import pathlib

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

BASE = pathlib.Path(".")
OUT = BASE / "images"
OUT.mkdir(exist_ok=True)


def read_csv(path):
    xs, ys = [], []
    with open(path, newline="") as f:
        reader = csv.reader(f, delimiter=";")
        header = next(reader)
        print(f"CSV {path}: {header}")
        for row in reader:
            if not row or not row[0].strip():
                continue
            xs.append(int(row[0]))
            ys.append(float(row[1]))
    return xs, ys


def common_ax(ax, title, ylabel):
    ax.set_title(title)
    ax.set_xlabel("Tamanho da entrada (n)")
    ax.set_ylabel(ylabel)
    ax.grid(True, which="both", alpha=0.3)
    ax.legend()


n_d, t_d = read_csv(BASE / "resultadosDijkstra_grafos.csv")
n_b, t_b = read_csv(BASE / "resultadosBellmanFord_grafos.csv")
assert n_d == n_b, f"tamanhos divergem: {n_d} vs {n_b}"
n = n_d
print(f"pontos: {len(n)} | n={n}")

COLOR_D = "#1f77b4"  # azul (como na referência PD)
COLOR_B = "#d62728"  # vermelho (como na referência Rec)

# --- 1. linhas, escala decimal ---
fig, ax = plt.subplots(figsize=(9, 6))
ax.plot(n, t_d, marker="o", color=COLOR_D, label="Dijkstra (min-heap)")
ax.plot(n, t_b, marker="o", color=COLOR_B, label="Bellman-Ford")
common_ax(ax, "Dijkstra vs Bellman-Ford (escala decimal)", "Tempo (s)")
fig.tight_layout()
fig.savefig(OUT / "grafico_Dijkstra_vs_BellmanFord_linear.png", dpi=150)
plt.close(fig)

# --- 2. linhas, escala log (eixo y) — estilo da figura LCS ---
fig, ax = plt.subplots(figsize=(9, 6))
ax.plot(n, t_d, marker="o", color=COLOR_D, label="Dijkstra (min-heap)")
ax.plot(n, t_b, marker="o", color=COLOR_B, label="Bellman-Ford")
ax.set_yscale("log")
common_ax(ax, "Dijkstra vs Bellman-Ford (escala log)", "Tempo (s) - escala log")
fig.tight_layout()
fig.savefig(OUT / "grafico_Dijkstra_vs_BellmanFord_log.png", dpi=150)
plt.close(fig)

# --- 3. barras agrupadas, escala decimal ---
import numpy as np
w = 0.35
xs = np.arange(len(n))
fig, ax = plt.subplots(figsize=(10, 6))
ax.bar(xs - w / 2, t_d, w, color=COLOR_D, label="Dijkstra (min-heap)")
ax.bar(xs + w / 2, t_b, w, color=COLOR_B, label="Bellman-Ford")
ax.set_xticks(xs)
ax.set_xticklabels(n, rotation=45, ha="right")
common_ax(ax, "Dijkstra vs Bellman-Ford — barras (escala decimal)", "Tempo (s)")
fig.tight_layout()
fig.savefig(OUT / "grafico_barras_Dijkstra_vs_BellmanFord_linear.png", dpi=150)
plt.close(fig)

# --- 4. barras agrupadas, escala log (eixo y) ---
fig, ax = plt.subplots(figsize=(10, 6))
ax.bar(xs - w / 2, t_d, w, color=COLOR_D, label="Dijkstra (min-heap)")
ax.bar(xs + w / 2, t_b, w, color=COLOR_B, label="Bellman-Ford")
ax.set_xticks(xs)
ax.set_xticklabels(n, rotation=45, ha="right")
ax.set_yscale("log")
common_ax(ax, "Dijkstra vs Bellman-Ford — barras (escala log)", "Tempo (s) - escala log")
fig.tight_layout()
fig.savefig(OUT / "grafico_barras_Dijkstra_vs_BellmanFord_log.png", dpi=150)
plt.close(fig)

print("imagens salvas em images/:")
for p in sorted(OUT.glob("*.png")):
    print(f"  {p} ({p.stat().st_size} bytes)")
