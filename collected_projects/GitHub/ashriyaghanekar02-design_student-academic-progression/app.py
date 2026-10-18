import os, json
from datetime import date
import pandas as pd
import streamlit as st
import plotly.express as px
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()
st.set_page_config(page_title="Student Academic Progression", page_icon="🎓", layout="wide")
st.title("🎓 Student Academic Progression & Portfolio System")
st.caption("TE Electrical and Computer Engineering | DBMS Mini-Project")

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

def db():
    if not DATABASE_URL:
        st.error("DATABASE_URL is missing. Copy .env.example to .env and add your PostgreSQL connection string.")
        st.stop()
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def query(sql, params=(), fetch=True):
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            if fetch:
                return cur.fetchall()
            return None

def sync_sheets():
    """One-way full-table export to Google Sheets, when credentials are configured."""
    path = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
    sheet_id = os.getenv("GOOGLE_SHEET_ID", "").strip()
    if not path or not sheet_id or not os.path.exists(path) or "PASTE_" in sheet_id:
        st.session_state["sync_status"] = "Google Sheets not configured; database update saved only."
        return
    try:
        import gspread
        from google.oauth2.service_account import Credentials
        scopes = ["https://www.googleapis.com/auth/spreadsheets"]
        creds = Credentials.from_service_account_file(path, scopes=scopes)
        client = gspread.authorize(creds)
        book = client.open_by_key(sheet_id)
        exports = {
            "Students": "SELECT * FROM students ORDER BY student_id",
            "Semesters": """SELECT s.roll_no, s.full_name, m.semester_no, m.academic_year,
                             m.sgpa, m.cgpa, m.gap_year_before, m.notes
                             FROM semesters m JOIN students s USING(student_id)
                             ORDER BY s.roll_no, m.semester_no""",
            "Subject_Marks": """SELECT s.roll_no, s.full_name, m.semester_no, sub.subject_code,
                             sub.subject_name, sub.subject_type, sub.marks_obtained, sub.max_marks
                             FROM subjects sub JOIN semesters m USING(semester_id)
                             JOIN students s USING(student_id)
                             ORDER BY s.roll_no, m.semester_no, sub.subject_type, sub.subject_name""",
            "Portfolio": """SELECT s.roll_no, s.full_name, p.item_type, p.category, p.title,
                             p.participation_level, p.event_date, p.description
                             FROM portfolio_items p JOIN students s USING(student_id)
                             ORDER BY s.roll_no, p.event_date"""
        }
        for tab, sql in exports.items():
            rows = query(sql)
            df = pd.DataFrame(rows)
            ws = book.worksheet(tab) if tab in [w.title for w in book.worksheets()] else book.add_worksheet(title=tab, rows=1000, cols=20)
            ws.clear()
            if not df.empty:
                ws.update([df.columns.tolist()] + df.astype(str).replace("None", "").values.tolist())
            else:
                ws.update([["No records yet"]])
        st.session_state["sync_status"] = "Google Sheets sync successful."
    except Exception as e:
        st.session_state["sync_status"] = f"Sync error: {e}"

def changed():
    sync_sheets()

tabs = st.tabs(["Dashboard", "Students", "Semester & Marks", "Portfolio", "Google Sheets Sync", "Schema & Help"])

with tabs[0]:
    try:
        students = query("SELECT * FROM students ORDER BY full_name")
        sems = query("""SELECT s.full_name, s.roll_no, m.semester_no, m.sgpa, m.cgpa,
                        m.gap_year_before, m.academic_year
                        FROM semesters m JOIN students s USING(student_id)
                        ORDER BY s.full_name, m.semester_no""")
        portfolios = query("SELECT * FROM portfolio_items")
        a,b,c,d = st.columns(4)
        a.metric("Students", len(students))
        b.metric("Semester records", len(sems))
        c.metric("Portfolio items", len(portfolios))
        d.metric("Gap years flagged", sum(1 for x in sems if x["gap_year_before"]))
        name = st.text_input("🔎 Search student by name", key="dash_search")
        filtered = [x for x in students if name.lower() in x["full_name"].lower()] if name else students
        st.subheader("Student directory")
        st.dataframe(pd.DataFrame(filtered), use_container_width=True, hide_index=True)
        if sems:
            names = sorted(set(x["full_name"] for x in sems))
            selected = st.selectbox("Select student for progression curve", names)
            points = [x for x in sems if x["full_name"] == selected]
            chart_df = pd.DataFrame([{"Semester": f"Sem {x['semester_no']}", "Semester No": x["semester_no"], "SGPA": float(x["sgpa"]) if x["sgpa"] is not None else None, "CGPA": float(x["cgpa"]) if x["cgpa"] is not None else None, "Gap year before": bool(x["gap_year_before"])} for x in points])
            fig = px.line(chart_df, x="Semester No", y=["SGPA","CGPA"], markers=True, title=f"Semester progression — {selected}")
            for x in points:
                if x["gap_year_before"]:
                    fig.add_vline(x=x["semester_no"], line_dash="dash", annotation_text="Gap year", line_color="red")
            fig.update_xaxes(dtick=1, tickprefix="Sem ")
            fig.update_yaxes(range=[0,10], title="Grade point")
            st.plotly_chart(fig, use_container_width=True)
            st.caption("Red dashed vertical lines mark a gap year recorded before that semester.")
    except Exception as e:
        st.warning(f"Database is not ready yet: {e}. Set DATABASE_URL and run schema.sql first.")

with tabs[1]:
    st.subheader("Add student")
    with st.form("add_student"):
        c1,c2 = st.columns(2)
        roll = c1.text_input("Roll number *")
        full = c2.text_input("Full name *")
        email = c1.text_input("Email")
        admission = c2.number_input("Admission year", min_value=2000, max_value=2100, value=2024)
        sec_school = c1.text_input("Secondary school")
        sec_pct = c2.number_input("Secondary percentage", min_value=0.0, max_value=100.0, value=0.0)
        hs_school = c1.text_input("Higher secondary school")
        hs_pct = c2.number_input("Higher secondary percentage", min_value=0.0, max_value=100.0, value=0.0)
        status = st.selectbox("Current status", ["Studying","Graduated","Dropped","On Leave"])
        submitted = st.form_submit_button("Save student")
        if submitted:
            if not roll.strip() or not full.strip():
                st.error("Roll number and full name are required.")
            else:
                try:
                    query("""INSERT INTO students(roll_no,full_name,email,admission_year,secondary_school,
                              secondary_percentage,higher_secondary_school,higher_secondary_percentage,current_status)
                              VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                          (roll.strip(),full.strip(),email.strip() or None,admission,sec_school or None,
                           sec_pct,hs_school or None,hs_pct,status), fetch=False)
                    st.success("Student saved.")
                    changed()
                    st.rerun()
                except Exception as e: st.error(f"Could not save student: {e}")
    st.divider()
    st.subheader("Update or delete student")
    try:
        ss = query("SELECT student_id, roll_no, full_name, current_status FROM students ORDER BY full_name")
        if ss:
            opts = {f"{x['roll_no']} — {x['full_name']}": x for x in ss}
            choice = st.selectbox("Choose student", list(opts), key="student_edit")
            x = opts[choice]
            new_status = st.selectbox("Update status", ["Studying","Graduated","Dropped","On Leave"], index=["Studying","Graduated","Dropped","On Leave"].index(x["current_status"]))
            col1,col2 = st.columns(2)
            if col1.button("Update status"):
                query("UPDATE students SET current_status=%s WHERE student_id=%s", (new_status,x["student_id"]), fetch=False)
                changed(); st.success("Status updated."); st.rerun()
            confirm = col2.checkbox("Confirm deletion", key="confirm_student_delete")
            if col2.button("Delete selected student", disabled=not confirm):
                query("DELETE FROM students WHERE student_id=%s", (x["student_id"],), fetch=False)
                changed(); st.success("Student and related records deleted by ON DELETE CASCADE."); st.rerun()
        else: st.info("Add a student first.")
    except Exception as e: st.info(f"Student editor will appear after database setup. {e}")

with tabs[2]:
    st.subheader("Add semester record")
    try:
        ss = query("SELECT student_id, roll_no, full_name FROM students ORDER BY full_name")
        if ss:
            smap = {f"{x['roll_no']} — {x['full_name']}": x["student_id"] for x in ss}
            with st.form("add_semester"):
                who = st.selectbox("Student", list(smap))
                semno = st.selectbox("Semester number", list(range(1,9)))
                ay = st.text_input("Academic year (e.g. 2025-26)")
                sgpa = st.number_input("SGPA", min_value=0.0, max_value=10.0, step=0.01)
                cgpa = st.number_input("CGPA", min_value=0.0, max_value=10.0, step=0.01)
                gap = st.checkbox("Gap/drop year occurred before this semester")
                notes = st.text_input("Notes")
                if st.form_submit_button("Save semester"):
                    query("""INSERT INTO semesters(student_id,semester_no,academic_year,sgpa,cgpa,gap_year_before,notes)
                              VALUES(%s,%s,%s,%s,%s,%s,%s)""",
                          (smap[who],semno,ay or None,sgpa,cgpa,gap,notes or None),fetch=False)
                    changed(); st.success("Semester saved."); st.rerun()
            st.divider()
            st.subheader("Add theory or lab marks")
            sems = query("""SELECT m.semester_id,s.roll_no,s.full_name,m.semester_no FROM semesters m
                            JOIN students s USING(student_id) ORDER BY s.full_name,m.semester_no""")
            if sems:
                semmap = {f"{x['roll_no']} — {x['full_name']} — Sem {x['semester_no']}":x["semester_id"] for x in sems}
                with st.form("add_subject"):
                    semchoice = st.selectbox("Semester record", list(semmap))
                    code = st.text_input("Subject code *")
                    subject = st.text_input("Subject name *")
                    typ = st.selectbox("Subject type", ["Theory","Lab"])
                    maxm = st.number_input("Maximum marks", min_value=1.0, max_value=100.0, value=100.0)
                    marks = st.number_input("Marks obtained", min_value=0.0, max_value=100.0, value=0.0)
                    if st.form_submit_button("Save subject marks"):
                        if not code.strip() or not subject.strip(): st.error("Subject code and name are required.")
                        elif marks > maxm: st.error("Marks obtained cannot exceed maximum marks.")
                        else:
                            query("""INSERT INTO subjects(semester_id,subject_code,subject_name,subject_type,marks_obtained,max_marks)
                                      VALUES(%s,%s,%s,%s,%s,%s)""",
                                  (semmap[semchoice],code.strip(),subject.strip(),typ,marks,maxm),fetch=False)
                            changed(); st.success("Marks saved."); st.rerun()
            allmarks = query("""SELECT s.roll_no,s.full_name,m.semester_no,sub.subject_code,sub.subject_name,
                                sub.subject_type,sub.marks_obtained,sub.max_marks
                                FROM subjects sub JOIN semesters m USING(semester_id)
                                JOIN students s USING(student_id)
                                ORDER BY s.full_name,m.semester_no,sub.subject_type,sub.subject_name""")
            st.subheader("All subject and lab marks")
            st.dataframe(pd.DataFrame(allmarks), use_container_width=True, hide_index=True)
        else: st.info("Add a student first.")
    except Exception as e: st.warning(f"Set up the database first. {e}")

with tabs[3]:
    st.subheader("Add seminar or activity")
    try:
        ss = query("SELECT student_id,roll_no,full_name FROM students ORDER BY full_name")
        if ss:
            smap = {f"{x['roll_no']} — {x['full_name']}":x["student_id"] for x in ss}
            with st.form("portfolio"):
                who = st.selectbox("Student",list(smap))
                item_type = st.selectbox("Portfolio type",["Seminar","Activity"])
                if item_type == "Seminar":
                    category = "Seminar"
                    level = st.selectbox("Seminar type",["Internal","External"])
                else:
                    category = st.selectbox("Activity category",["Technical","Co-curricular","Extra-curricular"])
                    level = None
                title = st.text_input("Title *")
                when = st.date_input("Event date", value=date.today())
                desc = st.text_area("Description")
                if st.form_submit_button("Save portfolio item"):
                    if not title.strip(): st.error("Title is required.")
                    else:
                        query("""INSERT INTO portfolio_items(student_id,item_type,category,title,participation_level,event_date,description)
                                  VALUES(%s,%s,%s,%s,%s,%s,%s)""",
                              (smap[who],item_type,category,title.strip(),level,when,desc or None),fetch=False)
                        changed(); st.success("Portfolio item saved."); st.rerun()
            allp = query("""SELECT s.roll_no,s.full_name,p.item_type,p.category,p.title,p.participation_level,
                             p.event_date,p.description FROM portfolio_items p JOIN students s USING(student_id)
                             ORDER BY p.event_date DESC""")
            df = pd.DataFrame(allp)
            if not df.empty:
                f1,f2 = st.columns(2)
                typ_filter = f1.selectbox("Filter portfolio",["All","Seminar","Activity"])
                if typ_filter != "All": df = df[df["item_type"] == typ_filter]
                if typ_filter == "Seminar" or (typ_filter == "All" and "Seminar" in allp and False):
                    pass
                seminar_filter = f2.selectbox("Seminar level",["All","Internal","External"])
                if seminar_filter != "All": df = df[(df["item_type"] != "Seminar") | (df["participation_level"] == seminar_filter)]
                st.dataframe(df, use_container_width=True, hide_index=True)
            else: st.info("No portfolio records yet.")
        else: st.info("Add a student first.")
    except Exception as e: st.warning(f"Set up the database first. {e}")

with tabs[4]:
    st.subheader("Google Sheets one-way synchronization")
    st.write("The app exports Students, Semesters, Subject_Marks, and Portfolio tabs to the linked spreadsheet after a successful create/update/delete action.")
    st.write("Configure `GOOGLE_SERVICE_ACCOUNT_JSON` and `GOOGLE_SHEET_ID` in `.env`, then share the spreadsheet with the service-account email as Editor.")
    if st.button("Sync database to Google Sheets now"):
        sync_sheets()
    st.info(st.session_state.get("sync_status","Not synced yet. Configure credentials and use the sync button."))
    st.caption("This starter uses one-way database-to-sheet sync. Spreadsheet edits are not imported into the database.")

with tabs[5]:
    st.subheader("Technical design")
    st.markdown("""
**Entities and relationships**
- `students` — one row per student.
- `semesters` — multiple semester records per student (1-to-many).
- `subjects` — theory/lab marks belonging to a semester (1-to-many).
- `portfolio_items` — seminars and activities belonging to a student (1-to-many).

**Constraints**
- Primary keys on every table; foreign keys connect child records.
- `ON DELETE CASCADE` removes a student's related semesters, marks, and portfolio items when that student is deleted.
- `CHECK` constraints validate percentages (0–100), marks (0–maximum), SGPA/CGPA (0–10), semester number (1–8), status, subject type, and portfolio categories.
- `UNIQUE` constraints prevent duplicate roll numbers, duplicate student email addresses, duplicate semester numbers for one student, and duplicate subject codes within one semester.
- The GUI catches database errors and displays a message; the database remains the final authority for validation.

**How to use**
1. Add a student in Students.
2. Add semester SGPA/CGPA and mark any gap year in Semester & Marks.
3. Add every theory subject and lab subject with marks.
4. Add seminars and activities in Portfolio.
5. Search by name on Dashboard; select a student to view SGPA/CGPA progression.
6. Configure Sheets credentials and sync.

**Limitations to disclose honestly**
- Two-way spreadsheet edits are not implemented in this version.
- This is a compact demonstration app; use sample/student data with permission and avoid publishing real personal information.
""")
