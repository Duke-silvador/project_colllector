import sqlite3
import os

# Database file path
DB_PATH = "resource_compass.db"


def get_connection():
    """Create and return a database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # This allows accessing columns by name
    return conn


def init_db():
    """Initialize the database and create the resources table if it doesn't exist."""
    conn = get_connection()
    cursor = conn.cursor()

    # Create resources table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS resources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            topic TEXT NOT NULL,
            level TEXT NOT NULL,
            goal TEXT NOT NULL,
            description TEXT NOT NULL,
            resource_type TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()
    print("Database initialized successfully.")


def seed_resources():
    """Populate the database with test book resources."""
    conn = get_connection()
    cursor = conn.cursor()

    # Check if resources already exist
    cursor.execute("SELECT COUNT(*) FROM resources")
    count = cursor.fetchone()[0]

    if count > 0:
        print(f"Database already contains {count} resources. Skipping seed.")
        conn.close()
        return

    # Test book data - diverse topics, levels, and goals
    books = [
        # Python books
        ("Python Crash Course", "Eric Matthes", "Python", "Beginner", "Understand Concepts",
         "A beginner-friendly book for learning Python programming from scratch.", "Book"),

        ("Automate the Boring Stuff with Python", "Al Sweigart", "Python", "Beginner", "Practice",
         "Practical Python learning through automation projects and real-world examples.", "Book"),

        ("Fluent Python", "Luciano Ramalho", "Python", "Advanced", "Understand Concepts",
         "Deep dive into Python's advanced features and idiomatic patterns.", "Book"),

        ("Head First Python", "Paul Barry", "Python", "Beginner", "Understand Concepts",
         "Visual and engaging introduction to Python programming.", "Book"),

        ("Think Python", "Allen B. Downey", "Python", "Intermediate", "Revision",
         "Introduction to Python with focus on problem-solving and computational thinking.", "Book"),

        # Data Structures and Algorithms books
        ("Grokking Algorithms", "Aditya Bhargava", "Data Structures", "Beginner", "Understand Concepts",
         "Visual guide to algorithms and data structures for beginners.", "Book"),

        ("Introduction to Algorithms", "Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein",
         "Data Structures", "Advanced", "Understand Concepts",
         "Comprehensive coverage of algorithms and data structures.", "Book"),

        ("Data Structures and Algorithms Made Easy", "Narasimha Karumanchi", "Data Structures", "Intermediate", "Practice",
         "Problem-solving approach to DSA with coding examples.", "Book"),

        # Software Engineering books
        ("Clean Code", "Robert C. Martin", "Software Engineering", "Intermediate", "Understand Concepts",
         "Best practices for writing clean, maintainable code.", "Book"),

        ("The Pragmatic Programmer", "Andrew Hunt and David Thomas", "Software Engineering", "Intermediate", "Revision",
         "Timeless lessons for software craftsmanship and professional development.", "Book"),

        # Database books
        ("Database System Concepts", "Abraham Silberschatz, Henry F. Korth, S. Sudarshan", "DBMS", "Beginner", "Understand Concepts",
         "Foundational textbook covering database management systems.", "Book"),

        ("Learning SQL", "Alan Beaulieu", "DBMS", "Beginner", "Practice",
         "Hands-on guide to learning SQL with practical examples.", "Book"),

        # Networking books
        ("Computer Networking: A Top-Down Approach", "James Kurose and Keith Ross", "Computer Networks", "Intermediate", "Understand Concepts",
         "Top-down approach to understanding computer networking.", "Book"),

        # Operating Systems books
        ("Operating System Concepts", "Abraham Silberschatz, Peter B. Galvin, Greg Gagne", "Operating Systems", "Advanced", "Understand Concepts",
         "Comprehensive guide to operating system principles and design.", "Book"),

        # AI books
        ("Artificial Intelligence: A Modern Approach", "Stuart Russell and Peter Norvig", "Artificial Intelligence", "Advanced", "Revision",
         "The leading textbook in artificial intelligence covering theory and practice.", "Book"),
    ]

    # Insert all books
    cursor.executemany("""
        INSERT INTO resources (title, author, topic, level, goal, description, resource_type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, books)

    conn.commit()
    conn.close()
    print(f"Successfully seeded {len(books)} resources into the database.")


def get_all_resources():
    """Retrieve all resources from the database."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM resources")
    resources = cursor.fetchall()

    conn.close()

    # Convert Row objects to dictionaries
    return [dict(resource) for resource in resources]


# Initialize database when this module is imported
if __name__ == "__main__":
    init_db()
    seed_resources()
