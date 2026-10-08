"""Command-line interface for the Student Information System."""

from src.services.student_service import StudentService
from src.utils.config import load_config
from src.utils.logger import setup_logger


def display_menu():
    print("\n" + "=" * 55)
    print("        STUDENT INFORMATION SYSTEM")
    print("=" * 55)
    print("1. Add Student")
    print("2. View All Students")
    print("3. View Student by ID")
    print("4. Update Student")
    print("5. Delete Student")
    print("6. Search Student")
    print("7. Export Students")
    print("8. Exit")
    print("=" * 55)


def input_student_data(existing=None):
    existing = existing or {}
    return {
        "name": input(f"Name [{existing.get('name', '')}]: ").strip()
        or existing.get("name", ""),
        "email": input(f"Email [{existing.get('email', '')}]: ").strip()
        or existing.get("email", ""),
        "course": input(f"Course [{existing.get('course', '')}]: ").strip()
        or existing.get("course", ""),
        "year_level": input(
            f"Year Level [{existing.get('year_level', '')}]: "
        ).strip() or existing.get("year_level", ""),
        "gpa": input(f"GPA [{existing.get('gpa', 0)}]: ").strip()
        or existing.get("gpa", 0),
    }


def print_student(student):
    print(
        f"ID: {student.student_id} | Name: {student.name} | "
        f"Email: {student.email} | Course: {student.course} | "
        f"Year: {student.year_level} | GPA: {student.gpa:.2f}"
    )


class StudentInformationSystem:
    def __init__(self):
        config = load_config()
        self.service = StudentService(
            config["data_file"], config["export_directory"]
        )
        self.logger = setup_logger(config["log_file"])

    def add_student(self):
        try:
            student = self.service.add_student(input_student_data())
            self.logger.info("Added student %s", student.student_id)
            print(f"\nStudent added successfully! ID: {student.student_id}")
        except (ValueError, OSError) as error:
            self.logger.error("Add student failed: %s", error)
            print(f"Error: {error}")

    def view_all_students(self):
        students = self.service.get_all_students()
        print("\n--- All Students ---")
        if not students:
            print("No students found.")
            return
        for student in students:
            print_student(student)

    def view_student(self):
        student_id = input("Enter Student ID: ").strip()
        student = self.service.get_student(student_id)
        if student:
            print_student(student)
        else:
            print("Student not found.")

    def update_student(self):
        student_id = input("Enter Student ID to update: ").strip()
        student = self.service.get_student(student_id)
        if not student:
            print("Student not found.")
            return

        try:
            updated = self.service.update_student(
                student_id, input_student_data(student.to_dict())
            )
            self.logger.info("Updated student %s", student_id)
            print(f"Student {updated.student_id} updated successfully.")
        except (ValueError, OSError) as error:
            self.logger.error("Update failed for %s: %s", student_id, error)
            print(f"Error: {error}")

    def delete_student(self):
        student_id = input("Enter Student ID to delete: ").strip()
        student = self.service.get_student(student_id)
        if not student:
            print("Student not found.")
            return

        confirm = input(f"Delete {student.name}? (y/n): ").strip().lower()
        if confirm == "y":
            if self.service.delete_student(student_id):
                self.logger.info("Deleted student %s", student_id)
                print("Student deleted successfully.")
        else:
            print("Deletion cancelled.")

    def search_student(self):
        keyword = input("Enter name, email, course, or ID: ")
        results = self.service.search_students(keyword)
        if not results:
            print("No matching students found.")
            return
        for student in results:
            print_student(student)

    def export_students(self):
        try:
            path = self.service.export_students()
            self.logger.info("Exported students to %s", path)
            print(f"Students exported successfully to: {path}")
        except OSError as error:
            self.logger.error("Export failed: %s", error)
            print(f"Export error: {error}")

    def run(self):
        self.logger.info("Application started")
        while True:
            display_menu()
            choice = input("Enter your choice (1-8): ").strip()

            if choice == "1":
                self.add_student()
            elif choice == "2":
                self.view_all_students()
            elif choice == "3":
                self.view_student()
            elif choice == "4":
                self.update_student()
            elif choice == "5":
                self.delete_student()
            elif choice == "6":
                self.search_student()
            elif choice == "7":
                self.export_students()
            elif choice == "8":
                self.logger.info("Application closed")
                print("Goodbye!")
                break
            else:
                print("Invalid choice. Please try again.")


if __name__ == "__main__":
    StudentInformationSystem().run()
