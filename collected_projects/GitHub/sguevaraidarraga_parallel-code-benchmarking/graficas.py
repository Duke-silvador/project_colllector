import os
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
from matplotlib.lines import Line2D
from matplotlib.ticker import LogLocator, NullFormatter, ScalarFormatter

# ---------- Configuracion ----------
RUTA_METRICAS = sys.argv[1] if len(sys.argv) > 1 else "metricas.csv"
CARPETA_SALIDA = sys.argv[2] if len(sys.argv) > 2 else "graficas"
KERNEL_RESUMEN = 7          # kernel usado en las figuras resumen
NUCLEOS_FISICOS = 8         # linea vertical de referencia (AMD Ryzen 7 5700X)
DPI = 200

IMAGENES = [512, 1024, 2048, 4096]
KERNELS = [3, 5, 7, 11]
HILOS = [1, 2, 4, 8, 16]

# Colores de la paleta Okabe-Ito (distinguibles con daltonismo) + marcador y
# estilo de linea distintos, para que se lean tambien en blanco y negro.
ESTILOS = {
    "secuencial":      dict(label="C++ Secuencial",       color="#000000", marker="x", ls=(0, (4, 2))),
    "paralelo_ia":     dict(label="C++ Paralelo IA",      color="#0072B2", marker="o", ls="-"),
    "paralelo_ia_opt": dict(label="C++ Paralelo IA + Opt.", color="#D55E00", marker="s", ls="--"),
    "paralelo_manual": dict(label="C++ Paralelo Manual",  color="#009E73", marker="^", ls="-."),
}
PARALELAS = ["paralelo_ia", "paralelo_ia_opt", "paralelo_manual"]

METRICAS = {
    "tiempo": dict(ylabel="Tiempo de ejecución (ms)", log=True),
    "speedup": dict(ylabel=r"Speedup  $S_p = T_1 / T_p$", log=True),
    "eficiencia": dict(ylabel=r"Eficiencia  $E_p = S_p / p$", log=False),
    "speedup_propio": dict(ylabel=r"Speedup propio  $T_1^{\,versión} / T_p$", log=True),
}

# ---------- Datos ----------
def cargar(ruta):
    df = pd.read_csv(ruta)
    # Speedup propio: T1 de la misma version (1 hilo) / Tp
    t1 = df[df["hilos"] == 1].set_index(["version", "imagen", "kernel"])["tiempo_promedio_ms"]
    df["speedup_propio"] = [
        t1[(v, i, k)] / t for v, i, k, t in zip(df["version"], df["imagen"], df["kernel"], df["tiempo_promedio_ms"])
    ]
    return df

def serie(df, version, imagen, kernel):
    s = df[(df["version"] == version) & (df["imagen"] == imagen) & (df["kernel"] == kernel)]
    return s.sort_values("hilos")

# ---------- Dibujo de un panel ----------
def dibujar_panel(ax, df, imagen, kernel, metrica):
    cfg = METRICAS[metrica]
    secuencial = serie(df, "secuencial", imagen, kernel)

    if metrica == "tiempo":
        # El secuencial (1 hilo) se dibuja como linea horizontal de referencia.
        t_sec = secuencial["tiempo_promedio_ms"].iloc[0]
        e = ESTILOS["secuencial"]
        ax.axhline(t_sec, color=e["color"], ls=e["ls"], lw=1.2)
    elif metrica in ("speedup", "speedup_propio"):
        ax.plot(HILOS, HILOS, color="#999999", ls="-", lw=1.0)  # ideal
    elif metrica == "eficiencia":
        ax.axhline(1.0, color="#999999", ls="-", lw=1.0)        # ideal

    for v in PARALELAS:
        s = serie(df, v, imagen, kernel)
        e = ESTILOS[v]
        if metrica == "tiempo":
            ax.errorbar(s["hilos"], s["tiempo_promedio_ms"], yerr=s["desviacion_ms"], color=e["color"],
                        marker=e["marker"], ls=e["ls"], lw=1.4, ms=5, capsize=2.5, elinewidth=0.9)
        else:
            ax.plot(s["hilos"], s[metrica], color=e["color"], marker=e["marker"], ls=e["ls"], lw=1.4, ms=5)

    ax.axvline(NUCLEOS_FISICOS, color="gray", ls=(0, (1, 3)), lw=0.9, alpha=0.8)

    ax.set_xscale("log", base=2)
    ax.set_xticks(HILOS)
    ax.set_xticklabels([str(h) for h in HILOS])
    ax.minorticks_off()
    if cfg["log"]:
        ax.set_yscale("log", base=2 if metrica != "tiempo" else 10)
        if metrica == "tiempo":
            # Marcas 1-2-5 con numeros planos, para que se lea mejor en un rango corto
            ax.yaxis.set_major_locator(LogLocator(base=10, subs=(1, 2, 5)))
            ax.yaxis.set_major_formatter(ScalarFormatter())
            ax.yaxis.set_minor_formatter(NullFormatter())
        else:
            ticks = [0.125, 0.25, 0.5, 1, 2, 4, 8, 16]
            ax.set_yticks(ticks)
            ax.set_yticklabels([("%g" % t) for t in ticks])
            ax.set_ylim(0.1, 20)
            ax.minorticks_off()
    else:
        ax.set_ylim(0, 2.3)
    ax.grid(True, which="major", alpha=0.3, lw=0.6)
    ax.set_title(f"Imagen {imagen}×{imagen}, kernel {kernel}×{kernel}", fontsize=9)

def leyenda(fig, metrica):
    handles = []
    orden = ["secuencial"] + PARALELAS if metrica == "tiempo" else PARALELAS
    for v in orden:
        e = ESTILOS[v]
        handles.append(Line2D([0], [0], color=e["color"], marker=e["marker"] if v != "secuencial" else None,
                              ls=e["ls"], lw=1.4, ms=5, label=e["label"]))
    if metrica in ("speedup", "speedup_propio"):
        handles.append(Line2D([0], [0], color="#999999", ls="-", lw=1.0, label="Ideal (Sp = p)"))
    if metrica == "eficiencia":
        handles.append(Line2D([0], [0], color="#999999", ls="-", lw=1.0, label="Ideal (Ep = 1)"))
    handles.append(Line2D([0], [0], color="gray", ls=(0, (1, 3)), lw=0.9, label=f"{NUCLEOS_FISICOS} núcleos físicos"))
    fig.legend(handles=handles, loc="lower center", ncol=len(handles), fontsize=8, frameon=False,
               bbox_to_anchor=(0.5, 0.0))

def figura_resumen(df, metrica, carpeta):
    fig, axes = plt.subplots(2, 2, figsize=(9, 7.2), sharex=True)
    for ax, imagen in zip(axes.flat, IMAGENES):
        dibujar_panel(ax, df, imagen, KERNEL_RESUMEN, metrica)
    for ax in axes[1]:
        ax.set_xlabel("Número de hilos")
    for ax in axes[:, 0]:
        ax.set_ylabel(METRICAS[metrica]["ylabel"])
    leyenda(fig, metrica)
    fig.tight_layout(rect=(0, 0.06, 1, 1))
    guardar(fig, carpeta, f"resumen_{metrica}_k{KERNEL_RESUMEN}")

def figura_anexo(df, metrica, carpeta):
    fig, axes = plt.subplots(4, 4, figsize=(16, 13), sharex=True)
    for i, imagen in enumerate(IMAGENES):
        for j, kernel in enumerate(KERNELS):
            dibujar_panel(axes[i][j], df, imagen, kernel, metrica)
    for ax in axes[3]:
        ax.set_xlabel("Número de hilos")
    for ax in axes[:, 0]:
        ax.set_ylabel(METRICAS[metrica]["ylabel"], fontsize=9)
    leyenda(fig, metrica)
    fig.tight_layout(rect=(0, 0.04, 1, 1))
    guardar(fig, carpeta, f"anexo_{metrica}")

def guardar(fig, carpeta, nombre):
    fig.savefig(os.path.join(carpeta, nombre + ".png"), dpi=DPI)
    fig.savefig(os.path.join(carpeta, nombre + ".pdf"))
    plt.close(fig)
    print("Guardada:", nombre)

def main():
    os.makedirs(CARPETA_SALIDA, exist_ok=True)
    df = cargar(RUTA_METRICAS)
    for metrica in METRICAS:
        figura_resumen(df, metrica, CARPETA_SALIDA)
        figura_anexo(df, metrica, CARPETA_SALIDA)
    print(f"Listo. Figuras en la carpeta '{CARPETA_SALIDA}'.")

main()