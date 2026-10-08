"""Business and persistence logic for student records."""

import json
import os
import re
from datetime import datetime, timezone

from src.models.student import Student


class StudentService:
    """CRUD, search, validation, persistence, and export operations."""

    def __init__(self, data_file="data/students.json", export_directory="exports"):
        self.data_file = data_file
        self.export_directory = export_directory
        self._ensure_data_file()

    def _ensure_data_file(self):
        directory = os.path.dirname(self.data_file)
        if directory:
            os.makedirs(directory, exist_ok=True)
        if not os.path.exists(self.data_file):
            with open(self.data_file, "w", encoding="utf-8") as file:
                json.dump([], file, indent=4)

    def _load_students(self):
        try:
            with open(self.data_file, "r", encoding="utf-8") as file:
                data = json.load(file)
            if not isinstance(data, list):
                raise ValueError("Student data must be a JSON list.")
            return [Student.from_dict(item) for item in data]
        except (FileNotFoundError, json.JSONDecodeError, ValueError):
            return []

    def _save_students(self, students):
        temp_file = self.data_file + ".tmp"
        with open(temp_file, "w", encoding="utf-8") as file:
            json.dump([student.to_dict() for student in students], file, indent=4)
        os.replace(temp_file, self.data_file)

    @staticmethod
    def validate_student_data(data):
        required = ("name", "email", "course", "year_level")
        missing = [field for field in required if not str(data.get(field, "")).strip()]
        if missing:
            raise ValueError("Missing required fields: " + ", ".join(missing))

        email = str(data["email"]).strip()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
            raise ValueError("Invalid email address.")

        try:
            gpa = float(data.get("gpa", 0))
        except (TypeError, ValueError):
            raise ValueError("GPA must be a number.")

        if not 0 <= gpa <= 4:
            raise ValueError("GPA must be between 0.00 and 4.00.")

    def add_student(self, student_data):
        self.validate_student_data(student_data)
        students = self._load_students()

        email = str(student_data["email"]).strip().lower()
        if any(s.email.lower() == email for s in students):
            raise ValueError("A student with that email already exists.")

        student = Student(
            name=student_data["name"],
            email=email,
            course=student_data["course"],
            year_level=student_data["year_level"],
            gpa=student_data.get("gpa", 0),
        )
        students.append(student)
        self._save_students(students)
        return student

    def get_all_students(self):
        return sorted(self._load_students(), key=lambda s: s.name.lower())

    def get_student(self, student_id):
        return next((s for s in self._load_students() if s.student_id == student_id), None)

    def update_student(self, student_id, update_data):
        students = self._load_students()
        student = next((s for s in students if s.student_id == student_id), None)
        if student is None:
            return None

        merged = student.to_dict()
        merged.update(update_data)
        self.validate_student_data(merged)

        new_email = str(merged["email"]).strip().lower()
        if any(s.student_id != student_id and s.email.lower() == new_email for s in students):
            raise ValueError("Another student already uses that email.")

        student.update(update_data)
        self._save_students(students)
        return student

    def delete_student(self, student_id):
        students = self._load_students()
        remaining = [s for s in students if s.student_id != student_id]
        if len(remaining) == len(students):
            return False
        self._save_students(remaining)
        return True

    def search_students(self, keyword):
        keyword = keyword.strip().lower()
        return [
            s for s in self.get_all_students()
            if keyword in s.student_id.lower()
            or keyword in s.name.lower()
            or keyword in s.email.lower()
            or keyword in s.course.lower()
        ]

    def export_students(self):
        os.makedirs(self.export_directory, exist_ok=True)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        path = os.path.join(self.export_directory, f"students_{timestamp}.json")
        with open(path, "w", encoding="utf-8") as file:
            json.dump([s.to_dict() for s in self.get_all_students()], file, indent=4)
        return path
