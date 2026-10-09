import os
from dotenv import load_dotenv
from flask import Flask, render_template, request, redirect, session
from db import Base, engine, SessionLocal
import models
import PyPDF2
import docx
import json
from ai import analyze_resume

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY")

# Create database tables
Base.metadata.create_all(bind=engine)

# HOME
@app.route('/')
def home():
    if 'user_id' in session:
        return redirect('/dashboard')

    return redirect('/login')

# SIGN UP
@app.route('/signup', methods=['GET', 'POST'])
def signup():
    db = SessionLocal()

    try:
        if request.method == 'POST':
            email = request.form.get('email')
            password = request.form.get('password')

            # Check if user already exists
            existing_user = (
                db.query(models.User)
                .filter_by(email=email)
                .first()
            )

            if existing_user:
                return "User already exists. Please log in."

            # Create new user
            new_user = models.User(
                email=email,
                password=password
            )

            db.add(new_user)
            db.commit()

            return redirect('/login')

        return render_template('signup.html')

    finally:
        db.close()

# LOGIN
@app.route('/login', methods=['GET', 'POST'])
def login():
    db = SessionLocal()

    try:
        if request.method == 'POST':
            email = request.form.get('email')
            password = request.form.get('password')

            # Find user
            user = (
                db.query(models.User)
                .filter_by(
                    email=email,
                    password=password
                )
                .first()
            )

            if user:
                session['user_id'] = user.id
                session['user'] = user.email

                return redirect('/dashboard')

            return "Invalid email or password."

        return render_template('login.html')

    finally:
        db.close()

# DASHBOARD
@app.route('/dashboard', methods=['GET', 'POST'])
def dashboard():

    # Check login
    if 'user_id' not in session:
        return redirect('/login')

    result = None

    if request.method == 'POST':

        user_goal = request.form.get('goal')
        resume_text = request.form.get('resume')

        file = request.files.get('file')

        
        # FILE HANDLING
        if file and file.filename != '':

            # PDF
            if file.filename.lower().endswith('.pdf'):

                try:
                    pdf_reader = PyPDF2.PdfReader(file)

                    text = ""

                    for page in pdf_reader.pages:
                        extracted_text = page.extract_text()

                        if extracted_text:
                            text += extracted_text

                    resume_text = text

                except Exception as e:
                    result = {
                        "error": f"PDF error: {str(e)}"
                    }

            # DOCX
            elif file.filename.lower().endswith('.docx'):

                try:
                    doc = docx.Document(file)

                    text = ""

                    for paragraph in doc.paragraphs:
                        text += paragraph.text + "\n"

                    resume_text = text

                except Exception as e:
                    result = {
                        "error": f"DOCX error: {str(e)}"
                    }

        # AI ANALYSIS
        if resume_text and user_goal:

            try:
                result = analyze_resume(
                    resume_text,
                    user_goal
                )

                # SAVE REPORT TO DATABASE  
                db = SessionLocal()

                try:
                    user = (
                        db.query(models.User)
                        .filter_by(
                            email=session['user']
                        )
                        .first()
                    )

                    if user:

                        report = models.Reports(
                            user_id=user.id,
                            resume_text=resume_text,
                            result=json.dumps(result)
                        )

                        db.add(report)
                        db.commit()

                finally:
                    db.close()

            except Exception as e:
                result = {
                    "error": f"AI error: {str(e)}"
                }

        elif request.method == 'POST':

            result = {
                "error": "Please provide both resume and career goal."
            }

    # IMPORTANT:
    # This return MUST be outside the POST block.
    return render_template(
        "dashboard.html",
        user=session.get('user'),
        result=result
    )

# HISTORY
@app.route('/history')
def history():

    if 'user_id' not in session:
        return redirect('/login')

    db = SessionLocal()

    try:
        user = (
            db.query(models.User)
            .filter_by(email=session['user'])
            .first()
        )

        if not user:
            return redirect('/login')

        reports = (
            db.query(models.Reports)
            .filter_by(user_id=user.id)
            .all()
        )

        parsed_reports = []

        for report in reports:

            try:
                result_data = json.loads(report.result)

            except Exception:
                result_data = {}

            parsed_reports.append({
                "resume": report.resume_text,
                "result": result_data
            })

        return render_template(
            "history.html",
            reports=parsed_reports
        )

    finally:
        db.close()

# LOGOUT
@app.route('/logout')
def logout():

    # Remove both session values
    session.pop('user', None)
    session.pop('user_id', None)

    return redirect('/login')

# RUN APPLICATION
if __name__ == '__main__':
    app.run(debug=True)