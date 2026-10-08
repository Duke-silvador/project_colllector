import json
from pathlib import Path

from src.services.student_service import StudentService


def make_service(tmp_path):
    data_file = tmp_path / "students.json"
    export_dir = tmp_path / "exports"
    return StudentService(str(data_file), str(export_dir))


def test_add_and_get_student(tmp_path):
    service = make_service(tmp_path)
    student = service.add_student({
        "name": "Juan Dela Cruz",
        "email": "juan@example.com",
        "course": "BSIT",
        "year_level": "2",
        "gpa": 3.25,
    })

    found = service.get_student(student.student_id)
    assert found is not None
    assert found.name == "Juan Dela Cruz"


def test_update_student(tmp_path):
    service = make_service(tmp_path)
    student = service.add_student({
        "name": "Maria Santos",
        "email": "maria@example.com",
        "course": "BSCS",
        "year_level": "1",
        "gpa": 3.0,
    })

    updated = service.update_student(
        student.student_id,
        {"name": "Maria A. Santos", "gpa": 3.75},
    )
    assert updated.name == "Maria A. Santos"
    assert updated.gpa == 3.75


def test_delete_student(tmp_path):
    service = make_service(tmp_path)
    student = service.add_student({
        "name": "Pedro Reyes",
        "email": "pedro@example.com",
        "course": "BSA",
        "year_level": "3",
        "gpa": 2.5,
    })

    assert service.delete_student(student.student_id) is True
    assert service.get_student(student.student_id) is None


def test_json_persistence(tmp_path):
    service = make_service(tmp_path)
    service.add_student({
        "name": "Ana Cruz",
        "email": "ana@example.com",
        "course": "BSBA",
        "year_level": "4",
        "gpa": 3.5,
    })

    with open(service.data_file, encoding="utf-8") as file:
        data = json.load(file)

    assert len(data) == 1
    assert data[0]["name"] == "Ana Cruz"
