from flask import Flask, request, jsonify, send_from_directory, session, redirect
import sqlite3
import os
import secrets
from pathlib import Path

# Project folders
BASE_DIR = Path(__file__).resolve().parent
DATABASE = BASE_DIR / "the_builders.db"

# Existing frontend paths
PUBLIC_DIR = BASE_DIR / "public"

app = Flask(__name__)
app.secret_key = os.environ.get("THE_BUILDERS_SECRET_KEY") or secrets.token_hex(32)
ADMIN_PASSWORD = os.environ.get("THE_BUILDERS_ADMIN_PASSWORD")
print("ADMIN PASSWORD LOADED:", bool(ADMIN_PASSWORD))

# Create database and enquiries table
def init_db():
    with sqlite3.connect(DATABASE) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS enquiries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()


# Serve existing website homepage
@app.route("/")
def home():
    return send_from_directory(BASE_DIR, "index.html")


# Serve existing CSS, images and other public files
@app.route("/public/<path:filename>")
def public_files(filename):
    return send_from_directory(PUBLIC_DIR, filename)

# Admin login page
@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    if request.method == "POST":
        password = request.form.get("password", "")

        if not ADMIN_PASSWORD:
            app.logger.warning("ADMIN_PASSWORD is missing in this server process")
            return "Admin password is not configured. Set it in PowerShell first.", 500

        import hmac
        if hmac.compare_digest(password, ADMIN_PASSWORD):
            session["admin_logged_in"] = True
            return redirect("/admin")

        return "Incorrect password. Please go back and try again.", 401

    return  """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#080c0a">
  <title>Admin Login | THE BUILDERS</title>

  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      font-family: Arial, Helvetica, sans-serif;
      color: #f4fff7;
      background:
        radial-gradient(ellipse at top, #173523 0%, transparent 48%),
        linear-gradient(135deg, #080c0a, #101812 55%, #080c0a);
    }

    .login-card {
      width: 100%;
      max-width: 420px;
      padding: 38px 32px;
      border: 1px solid rgba(83, 255, 139, 0.22);
      border-radius: 24px;
      background: rgba(17, 25, 20, 0.94);
      box-shadow: 0 25px 80px rgba(0, 0, 0, 0.45),
                  0 0 35px rgba(47, 255, 119, 0.06);
      animation: appear 0.55s ease both;
    }

    .brand {
      margin-bottom: 32px;
      text-align: center;
    }

    .brand-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      margin-bottom: 18px;
      border: 1px solid rgba(83, 255, 139, 0.35);
      border-radius: 20px;
      color: #65ff96;
      background: rgba(70, 255, 130, 0.08);
      font-size: 30px;
      box-shadow: 0 0 28px rgba(65, 255, 125, 0.09);
    }

    .brand h1 {
      font-size: 25px;
      letter-spacing: 1.5px;
    }

    .brand h1 span {
      color: #65ff96;
    }

    .brand p {
      margin-top: 10px;
      color: #9aaca0;
      font-size: 13px;
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    .divider {
      height: 1px;
      margin-bottom: 28px;
      background: linear-gradient(
        90deg, transparent, rgba(101, 255, 150, 0.35), transparent
      );
    }

    .welcome {
      margin-bottom: 8px;
      font-size: 21px;
    }

    .description {
      margin-bottom: 26px;
      color: #a3b2a8;
      font-size: 14px;
      line-height: 1.6;
    }

    label {
      display: block;
      margin-bottom: 10px;
      color: #d9e8dd;
      font-size: 13px;
      font-weight: 600;
    }

    input {
      display: block;
      width: 100%;
      padding: 15px 16px;
      border: 1px solid #35473a;
      border-radius: 12px;
      outline: none;
      background: #0b110d;
      color: #ffffff;
      font-size: 15px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    input:focus {
      border-color: #65ff96;
      box-shadow: 0 0 0 3px rgba(101, 255, 150, 0.1);
    }

    .login-button {
      width: 100%;
      margin-top: 22px;
      padding: 15px;
      border: none;
      border-radius: 12px;
      background: #65ff96;
      color: #07130b;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      transition: transform 0.2s, background 0.2s, box-shadow 0.2s;
    }

    .login-button:hover {
      transform: translateY(-2px);
      background: #83ffaa;
      box-shadow: 0 8px 25px rgba(101, 255, 150, 0.2);
    }

    .login-button:focus-visible {
      outline: 2px solid #ffffff;
      outline-offset: 4px;
    }

    .footer {
      margin-top: 28px;
      color: #74847a;
      font-size: 12px;
      line-height: 1.6;
      text-align: center;
    }

    .footer span {
      color: #65ff96;
    }

    @keyframes appear {
      from {
        opacity: 0;
        transform: translateY(14px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 480px) {
      .login-card {
        padding: 30px 22px;
        border-radius: 20px;
      }

      .brand h1 {
        font-size: 22px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
      }
    }
  </style>
</head>

<body>
  <main class="login-card">
    <header class="brand">
      <div class="brand-icon" aria-hidden="true">✦</div>
      <h1>THE<span>BUILDERS</span></h1>
      <p>Administration Portal</p>
    </header>

    <div class="divider"></div>

    <h2 class="welcome">Welcome back</h2>
    <p class="description">
      Sign in to access your construction project enquiries and dashboard.
    </p>

    <form method="POST" action="/admin/login">
      <label for="password">Admin Password</label>
      <input
        id="password"
        type="password"
        name="password"
        placeholder="Enter your admin password"
        required
        autocomplete="current-password"
      >
      <button class="login-button" type="submit">Secure Login &rarr;</button>
    </form>

    <footer class="footer">
      Protected administration area<br>
      &copy; <span>THE BUILDERS</span> · Educational Project
    </footer>
  </main>
</body>
</html>
"""

# Protected admin dashboard
@app.route("/admin")
def admin_dashboard():
    if not session.get("admin_logged_in"):
        return redirect("/admin/login")

    return send_from_directory(BASE_DIR, "admin.html")


# Return customer enquiries to logged-in admin only
@app.route("/api/admin/enquiries", methods=["GET"])
def admin_enquiries():
    if not session.get("admin_logged_in"):
        return jsonify({"success": False, "message": "Login required"}), 401

    try:
        with sqlite3.connect(DATABASE) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute("""
                SELECT id, name, phone, email, message, created_at
                FROM enquiries
                ORDER BY id DESC
            """).fetchall()

        return jsonify({
            "success": True,
            "enquiries": [dict(row) for row in rows]
        })
    except sqlite3.Error:
        app.logger.exception("Could not load enquiries")
        return jsonify({
            "success": False,
            "message": "Unable to load enquiries."
        }), 500
    
# Save contact form enquiry
@app.route("/api/enquiries", methods=["POST"])
def create_enquiry():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "success": False,
            "message": "Please send valid JSON data."
        }), 400

    name = str(data.get("name", "")).strip()
    phone = str(data.get("phone", "")).strip()
    email = str(data.get("email", "")).strip()
    message = str(data.get("message", "")).strip()

    if not name or not message:
        return jsonify({
            "success": False,
            "message": "Name, phone and message are required."
        }), 400

    if len(name) > 100 or len(phone) > 30:
        return jsonify({
            "success": False,
            "message": "Name or phone number is too long."
        }), 400

    if len(email) > 254 or len(message) > 5000:
        return jsonify({
            "success": False,
            "message": "Email or message is too long."
        }), 400

    try:
        with sqlite3.connect(DATABASE) as conn:
            conn.execute("""
                INSERT INTO enquiries (name, phone, email, message)
                VALUES (?, ?, ?, ?)
            """, (name, phone, email, message))

        return jsonify({
            "success": True,
            "message": "Your enquiry has been saved successfully."
        }), 201

    except sqlite3.Error:
        app.logger.exception("Could not save enquiry")
        return jsonify({
            "success": False,
            "message": "Unable to save enquiry. Please try again."
        }), 500


# Initialise database when starting the application
init_db()


if __name__ == "__main__":
    app.run(debug=True)