"""Student model for the Student Information System."""

from datetime import datetime, timezone
import uuid


class Student:
    """Represents one student record."""

    def __init__(
        self,
        student_id=None,
        name="",
        email="",
        course="",
        year_level="",
        gpa=0.0,
        created_at=None,
        updated_at=None,
    ):
        now = datetime.now(timezone.utc).isoformat()
        self.student_id = student_id or str(uuid.uuid4())[:8]
        self.name = name.strip()
        self.email = email.strip()
        self.course = course.strip()
        self.year_level = str(year_level).strip()
        self.gpa = float(gpa) if gpa not in ("", None) else 0.0
        self.created_at = created_at or now
        self.updated_at = updated_at or now

    def to_dict(self):
        """Convert the model to a JSON-serializable dictionary."""
        return {
            "student_id": self.student_id,
            "name": self.name,
            "email": self.email,
            "course": self.course,
            "year_level": self.year_level,
            "gpa": self.gpa,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data):
        """Create a Student object from a dictionary."""
        return cls(**data)

    def update(self, data):
        """Update allowed fields while preserving the student ID."""
        for field in ("name", "email", "course", "year_level", "gpa"):
            if field in data and data[field] is not None:
                value = data[field]
                if field == "gpa":
                    value = float(value)
                elif isinstance(value, str):
                    value = value.strip()
                setattr(self, field, value)

        self.updated_at = datetime.now(timezone.utc).isoformat()
