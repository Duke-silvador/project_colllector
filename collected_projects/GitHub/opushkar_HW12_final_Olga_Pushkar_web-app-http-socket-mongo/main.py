import mimetypes
import socket
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, unquote_plus
from multiprocessing import Process
from datetime import datetime
from pymongo import MongoClient

# Константи конфігурації
HTTP_PORT = 3000
SOCKET_PORT = 5000
SOCKET_HOST = '127.0.0.1'
# У Docker-compose мережі хостом для бази буде назва сервісу 'mongodb'
MONGO_URI = 'mongodb://mongodb:27017/'

BASE_DIR = Path(__file__).resolve().parent / 'front-init'

class HTTPHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        pr_url = unquote_plus(self.path)
        
        # Видаляємо зайві косі риски та параметри, якщо вони є
        clean_path = pr_url.strip('/')
        
        # Точний роутинг для головних сторінок
        if clean_path == "" or clean_path == "index.html":
            self.send_html_file('index.html')
        elif clean_path == "message.html" or clean_path == "message":
            self.send_html_file('message.html')
        elif clean_path == "error.html":
            self.send_html_file('error.html', 404)
        else:
            # Обробка абсолютно всіх інших статичних ресурсів (style.css, logo.png тощо)
            file_path = BASE_DIR / clean_path
            if file_path.exists() and file_path.is_file():
                self.send_static(file_path)
            else:
                # Якщо файл взагалі не знайдено на диску — віддаємо error.html із кодом 404
                self.send_html_file('error.html', 404)


    def do_POST(self):
        if self.path == '/message':
            # Зчитуємо дані з форми
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length).decode('utf-8')
            
            # Парсимо x-www-form-urlencoded дані
            parsed_data = parse_qs(post_data)
            data_dict = {key: value[0] for key, value in parsed_data.items()}
            
            # Відправляємо через UDP сокет на Socket-сервер
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
                    message = json.dumps(data_dict).encode('utf-8')
                    sock.sendto(message, (SOCKET_HOST, SOCKET_PORT))
            except Exception as e:
                print(f"Помилка відправки сокету: {e}")

            # Після успішного відправлення перенаправляємо користувача назад на сторінку форми або головну
            self.send_response(302)
            self.send_header('Location', '/message.html')
            self.end_headers()
        else:
            self.send_html_file('error.html', 404)

    def send_html_file(self, filename, status=200):
        self.send_response(status)
        self.send_header('Content-type', 'text/html; charset=utf-8')
        self.end_headers()
        file_path = BASE_DIR / filename
        if file_path.exists():
            with open(file_path, 'rb') as f:
                self.wfile.write(f.read())
        else:
            self.wfile.write(b"<h1>404 Not Found</h1>")

    def send_static(self, file_path):
        self.send_response(200)
        mt = mimetypes.guess_type(file_path)
        if mt[0]:
            self.send_header("Content-Type", mt[0])
        else:
            self.send_header("Content-Type", "text/plain")
        self.end_headers()
        with open(file_path, 'rb') as f:
            self.wfile.write(f.read())

def run_http_server():
    server_address = ('', HTTP_PORT)
    http = HTTPServer(server_address, HTTPHandler)
    print(f"HTTP Server запущенно на порту {HTTP_PORT}...")
    try:
        http.serve_forever()
    except KeyboardInterrupt:
        http.server_close()

def run_socket_server():
    # Ініціалізація підключення до MongoDB всередині процесу сокету
    client = MongoClient(MONGO_URI)
    db = client['messages_db']
    collection = db['messages']

    server_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    server_socket.bind((SOCKET_HOST, SOCKET_PORT))
    print(f"Socket Server (UDP) запущенно на порту {SOCKET_PORT}...")

    try:
        while True:
            data, address = server_socket.recvfrom(4096)
            try:
                # Перетворюємо байт-рядок у словник
                data_dict = json.loads(data.decode('utf-8'))
                
                # Додаємо поточну дату та час
                data_dict['date'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')
                
                # Зберігаємо документ у MongoDB
                collection.insert_one(data_dict)
                print(f"Документ збережено в MongoDB: {data_dict}")
            except Exception as e:
                print(f"Помилка обробки сокет-повідомлення: {e}")
    except KeyboardInterrupt:
        print("Socket-сервер зупинено.")
    finally:
        server_socket.close()

if __name__ == '__main__':
    # Запуск двох серверів у різних процесах згідно з ТЗ
    http_process = Process(target=run_http_server)
    socket_process = Process(target=run_socket_server)

    http_process.start()
    socket_process.start()

    http_process.join()
    socket_process.join()
