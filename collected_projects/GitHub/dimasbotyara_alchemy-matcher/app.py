"""Alchemy Matcher — минимальный Flask-сервер.

Вся игровая логика и сохранение прогресса находятся на стороне клиента
(localStorage + cookies), поэтому серверу остаётся только отдавать страницы.
"""
from flask import Flask, jsonify, render_template

app = Flask(__name__)


@app.route('/')
def game():
    return render_template('game.html')


@app.route('/healthz')
def health():
    """Точка проверки живости для мониторинга и CI."""
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
