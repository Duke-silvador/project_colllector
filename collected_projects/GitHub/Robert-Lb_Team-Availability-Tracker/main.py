from flask import Flask, render_template, redirect, request, jsonify, flash
from flask_mysqldb import MySQL

app = Flask(__name__)

# MySQL Configurations (Adjust these to match your local setup)
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = ''
app.config['MYSQL_DB'] = 'db_task5'
app.config['MYSQL_CURSORCLASS'] = 'DictCursor'

mysql = MySQL(app)
app.secret_key = 'user availability'

@app.route('/')
def index():
    # Fetch all users to display on the dashboard
    cur = mysql.connection.cursor()
    cur.execute("SELECT id, name, email, status FROM tbl_users")
    users = cur.fetchall()
    cur.close()
    return render_template('index.html', users=users)

@app.route('/create', methods = ['GET', 'POST'])
def create():
    if request.method == 'POST':        
        name = request.form['name']
        email = request.form['email']             
        sql_query="INSERT INTO tbl_users (name, email) VALUES (%s, %s)"
        cur = mysql.connection.cursor()
        cur.execute(sql_query,(name,email,))
        flash("New User created Successfully")
        mysql.connection.commit()
        return redirect("/")        
    return render_template("create.html")

@app.route('/update_status', methods=['POST'])
def update_status():
    data = request.get_json()
    user_id = data.get('id')
    # Convert Python boolean to MySQL equivalent integer (1 or 0)
    status = 1 if data.get('status') else 0

    try:
        cur = mysql.connection.cursor()
        cur.execute(
            "UPDATE tbl_users SET status = %s WHERE id = %s",
            (status, user_id)
        )
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True, "message": "Status updated successfully"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)