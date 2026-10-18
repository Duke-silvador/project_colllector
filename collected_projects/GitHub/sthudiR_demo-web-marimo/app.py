import marimo

__generated_with = "0.25.1"
app = marimo.App(width="medium", app_title="Lemonade Lab")


@app.cell
def _():
    import marimo as mo

    return (mo,)


@app.cell
def _(mo):
    mo.md(
        r"""
        # Lemonade Lab

        Mix a pitcher and see how the taste shifts. Move a slider and every
        number below updates on its own: that is what *reactive* means.

        > **Try this:** set lemons to 9 and sugar to 0. How tart can you make it?
        > The first visit starts Python inside your browser, which takes about 5 seconds.
        """
    )
    return


@app.cell
def _(mo):
    lemons = mo.ui.slider(1, 10, value=4, label="Lemons")
    sugar = mo.ui.slider(0, 200, step=10, value=80, label="Sugar (g)")
    water = mo.ui.slider(500, 2000, step=100, value=1000, label="Water (ml)")
    mo.vstack([lemons, sugar, water])
    return lemons, sugar, water


@app.cell
def _(lemons, sugar, water):
    juice_ml = lemons.value * 45
    total_ml = water.value + juice_ml
    sweet = sugar.value / total_ml * 100  # grams per 100 ml
    sour = juice_ml / total_ml * 100  # percent juice
    ratio = sweet / sour if sour else 0.0

    if ratio < 0.8:
        verdict = "Pucker up: very tart."
    elif ratio < 1.2:
        verdict = "Balanced and bright. Nicely done."
    elif ratio < 1.8:
        verdict = "Sweet and mellow."
    else:
        verdict = "Basically syrup."
    return juice_ml, ratio, sour, sweet, total_ml, verdict


@app.cell
def _(juice_ml, mo, ratio, sour, sweet, total_ml, verdict):
    def bar(label, value, top, color):
        pct = max(0, min(100, value / top * 100))
        return (
            f'<div style="margin:8px 0"><div style="font-size:.85rem">{label}: <b>{value:.1f}</b></div>'
            f'<div style="background:#8883;border-radius:8px;height:14px">'
            f'<div style="width:{pct:.0f}%;background:{color};height:14px;border-radius:8px"></div></div></div>'
        )

    fill = max(15, min(100, total_ml / 2500 * 100))
    glass = (
        f'<svg viewBox="0 0 120 150" width="120" height="150" role="img" aria-label="Pitcher">'
        f'<rect x="20" y="10" width="80" height="130" rx="10" fill="none" stroke="currentColor" stroke-width="3"/>'
        f'<rect x="23" y="{140 - 127 * fill / 100:.0f}" width="74" height="{127 * fill / 100:.0f}" rx="8" fill="#f5d547" opacity=".85"/>'
        f"</svg>"
    )
    mo.Html(
        '<div style="display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap">'
        + glass
        + '<div style="flex:1;min-width:260px;max-width:460px">'
        + bar("Sweetness (g sugar per 100 ml)", sweet, 15, "#e56fa8")
        + bar("Sourness (% lemon juice)", sour, 15, "#f5d547")
        + f"<p><b>Sweet-to-sour ratio {ratio:.2f}</b>. {verdict}</p>"
        + f'<p style="font-size:.85rem;opacity:.7">{total_ml:.0f} ml total, {juice_ml} ml of it lemon juice (about 45 ml per lemon).</p>'
        + "</div></div>"
    )
    return


@app.cell
def _(mo):
    mo.vstack(
        [
            mo.md("## Watch the video"),
            mo.Html(
                '<div style="position:relative;aspect-ratio:16/9;max-width:720px"><iframe '
                'src="https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ" title="Lemonade explainer video" '
                'loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:10px" '
                'allow="encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" '
                "allowfullscreen></iframe></div>"
            ),
            mo.md(
                "---\n[&larr; Back to Hub](https://sthudir.github.io/demo-web-hub/) &nbsp;·&nbsp; "
                "[Source on GitHub](https://github.com/sthudiR/demo-web-marimo)"
            ),
        ]
    )
    return


@app.cell
def _(mo):
    mo.accordion(
        {
            "Behind this page": mo.md(
                """
                | | |
                |---|---|
                | **Built with** | marimo 0.25 exported to WebAssembly, so Python runs in your browser |
                | **The numbers** | 27 MB · ready in about 6 s · builds in 23 s · 107 lines of source · you write Python |
                | **Good for** | Python simulations with sliders, no server needed |
                | **Not for** | Fast first loads (it starts Python in your browser) or multi-page sites |
                | **More** | [Source on GitHub](https://github.com/sthudiR/demo-web-marimo) · [What can I use for…?](https://sthudir.github.io/demo-web-hub/which/) · [Back to hub](https://sthudir.github.io/demo-web-hub/) |

                <small>Ready time: median of 3 cold loads, 17 Oct 2026, one home connection.</small>
                """
            )
        }
    )
    return


if __name__ == "__main__":
    app.run()
