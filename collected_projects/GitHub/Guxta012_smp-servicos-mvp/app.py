import os
from datetime import date
from decimal import Decimal, InvalidOperation
from flask import Flask, render_template, request, redirect, url_for, flash
import mysql.connector
from mysql.connector import Error

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "chave-local-apenas-para-desenvolvimento")

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "smp_user"),
    "password": os.getenv("DB_PASSWORD", "smp_dev_password"),
    "database": os.getenv("DB_NAME", "smp_servicos"),
}

def connect_db():
    return mysql.connector.connect(**DB_CONFIG)

def fetch_all(sql, params=()):
    conn = connect_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(sql, params)
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()

def fetch_one(sql, params=()):
    rows = fetch_all(sql, params)
    return rows[0] if rows else None

def execute(sql, params=()):
    conn = connect_db()
    cur = conn.cursor()
    try:
        cur.execute(sql, params)
        conn.commit()
        return cur.lastrowid
    finally:
        cur.close()
        conn.close()

@app.route("/")
def index():
    total = fetch_one("SELECT COUNT(*) total FROM empresas")["total"]
    mes = date.today().strftime("%Y-%m")
    faturamento = fetch_one(
        "SELECT COALESCE(SUM(valor),0) total FROM faturamentos WHERE mes_referencia=%s", (mes,)
    )["total"]
    pendentes = fetch_one(
        "SELECT COUNT(*) total FROM impostos WHERE situacao IN ('Pendente','Atrasado')"
    )["total"]
    recentes = fetch_all("""
        SELECT e.id,e.nome,e.cnpj,f.valor,f.mes_referencia
        FROM empresas e LEFT JOIN faturamentos f ON f.empresa_id=e.id
        AND f.mes_referencia=(SELECT MAX(f2.mes_referencia) FROM faturamentos f2 WHERE f2.empresa_id=e.id)
        ORDER BY e.nome LIMIT 5
    """)
    return render_template("index.html", total=total, faturamento=faturamento,
                           pendentes=pendentes, recentes=recentes)

@app.route("/empresas", methods=["GET", "POST"])
def empresas():
    if request.method == "POST":
        nome = request.form.get("nome", "").strip()
        cnpj = request.form.get("cnpj", "").strip()
        valor_texto = request.form.get("faturamento", "").strip().replace(".", "").replace(",", ".")
        mes = request.form.get("mes_referencia", "").strip()
        if not all([nome, cnpj, valor_texto, mes]):
            flash("Preencha todos os campos obrigatórios.", "error")
            return redirect(url_for("empresas"))
        try:
            valor = Decimal(valor_texto)
            if valor < 0:
                raise InvalidOperation
        except InvalidOperation:
            flash("Informe um faturamento válido.", "error")
            return redirect(url_for("empresas"))
        try:
            empresa_id = execute("INSERT INTO empresas (nome, cnpj) VALUES (%s,%s)", (nome, cnpj))
            execute("INSERT INTO faturamentos (empresa_id, valor, mes_referencia) VALUES (%s,%s,%s)",
                    (empresa_id, valor, mes))
            flash("Empresa cadastrada com sucesso.", "success")
        except Error as exc:
            if getattr(exc, "errno", None) == 1062:
                flash("Esse CNPJ já está cadastrado.", "error")
            else:
                app.logger.exception("Erro ao cadastrar empresa")
                flash("Não foi possível salvar. Confira a conexão com o banco.", "error")
        return redirect(url_for("empresas"))

    lista = fetch_all("""
        SELECT e.id,e.nome,e.cnpj,
          COALESCE(f.valor,0) faturamento,f.mes_referencia
        FROM empresas e LEFT JOIN faturamentos f ON f.empresa_id=e.id
        AND f.mes_referencia=(SELECT MAX(f2.mes_referencia) FROM faturamentos f2 WHERE f2.empresa_id=e.id)
        ORDER BY e.nome
    """)
    return render_template("empresas.html", empresas=lista)

@app.route("/impostos", methods=["GET", "POST"])
def impostos():
    empresas = fetch_all("SELECT id,nome FROM empresas ORDER BY nome")
    filtro = request.args.get("empresa_id", type=int)
    if request.method == "POST":
        empresa_id = request.form.get("empresa_id", type=int)
        nome = request.form.get("nome", "").strip()
        vencimento = request.form.get("vencimento", "").strip()
        valor_texto = request.form.get("valor", "").strip().replace(".", "").replace(",", ".")
        situacao = request.form.get("situacao", "")
        observacao = request.form.get("observacao", "").strip()
        if not all([empresa_id, nome, vencimento, valor_texto]) or situacao not in ("Pago", "Pendente", "Atrasado"):
            flash("Preencha os campos obrigatórios.", "error")
            return redirect(url_for("impostos"))
        try:
            valor = Decimal(valor_texto)
            if valor < 0:
                raise InvalidOperation
        except InvalidOperation:
            flash("Informe um valor válido.", "error")
            return redirect(url_for("impostos", empresa_id=empresa_id))
        execute("""INSERT INTO impostos (empresa_id,nome,vencimento,valor,situacao,observacao)
                    VALUES (%s,%s,%s,%s,%s,%s)""",
                (empresa_id, nome, vencimento, valor, situacao, observacao))
        flash("Imposto registrado com sucesso.", "success")
        return redirect(url_for("impostos", empresa_id=empresa_id))
    sql = """SELECT i.*,e.nome empresa_nome FROM impostos i
             JOIN empresas e ON e.id=i.empresa_id"""
    params = ()
    if filtro:
        sql += " WHERE i.empresa_id=%s"
        params = (filtro,)
    sql += " ORDER BY i.vencimento,e.nome"
    lista = fetch_all(sql, params)
    return render_template("impostos.html", empresas=empresas, impostos=lista, filtro=filtro)

@app.route("/empresa/<int:empresa_id>")
def detalhe_empresa(empresa_id):
    empresa = fetch_one("SELECT * FROM empresas WHERE id=%s", (empresa_id,))
    if not empresa:
        flash("Empresa não encontrada.", "error")
        return redirect(url_for("empresas"))
    faturamentos = fetch_all(
        "SELECT * FROM faturamentos WHERE empresa_id=%s ORDER BY mes_referencia DESC", (empresa_id,)
    )
    impostos = fetch_all(
        "SELECT * FROM impostos WHERE empresa_id=%s ORDER BY vencimento", (empresa_id,)
    )
    return render_template("detalhe_empresa.html", empresa=empresa,
                           faturamentos=faturamentos, impostos=impostos)

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=int(os.getenv("PORT", "5000")))
