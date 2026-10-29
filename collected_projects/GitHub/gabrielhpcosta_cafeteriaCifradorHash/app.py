from flask import Flask, render_template, request

from cifras import processar

app = Flask(__name__, static_folder="static", static_url_path="")

METODOS = {
    "cesar": "Cifra de César",
    "substituicao": "Substituição",
    "transposicao": "Transposição",
}


@app.route("/")
def login():
    return app.send_static_file("index.html")


@app.route("/cifrador", methods=["GET", "POST"])
def cifrador():
    dados = {
        "mensagem": request.args.get("mensagem", ""),
        "metodo": request.args.get("metodo", "cesar"),
        "chave": request.args.get("chave", "3"),
    }
    resultado = None
    erro = None
    acao = None

    if request.method == "POST":
        dados["mensagem"] = request.form.get("mensagem", "")
        dados["metodo"] = request.form.get("metodo", "cesar")
        dados["chave"] = request.form.get("chave", "")
        acao = request.form.get("acao", "cifrar")
        resultado, erro = processar(dados["mensagem"], dados["metodo"], dados["chave"], acao)

    return render_template(
        "cifrador.html",
        dados=dados,
        metodos=METODOS,
        resultado=resultado,
        erro=erro,
        acao=acao,
    )


@app.route("/aprenda")
def aprenda():
    return render_template("aprenda.html")


if __name__ == "__main__":
    app.run(debug=True)
