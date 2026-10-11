import json
import os
import re
import sqlite3
from collections import Counter


# =========================================================
# FILE PATHS
# =========================================================

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DATABASE_NAME = os.path.join(
    BASE_DIR,
    "backend",
    "library.db"
)

JSON_FILE = os.path.join(
    BASE_DIR,
    "data",
    "library_books.json"
)

SEARCH_ALIASES = {
    "dbms": "database management systems",
    "database management systems": "database management systems",
    "os": "operating systems",
    "operating systems": "operating systems",
    "dsa": "data structures and algorithms",
    "data structures": "data structures and algorithms",
    "ada": "analysis and design of algorithms",
    "algorithms": "analysis and design of algorithms",
    "cn": "computer networks",
    "computer networks": "computer networks",
    "ai": "artificial intelligence",
    "ml": "machine learning",
    "oops": "object oriented programming",
    "java": "java programming",
    "java programming": "java programming",
}


# =========================================================
# DATABASE CONNECTION
# =========================================================

def get_connection():
    return sqlite3.connect(DATABASE_NAME)


# =========================================================
# CREATE DATABASE
# =========================================================

def create_database():

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject TEXT NOT NULL,
            book_name TEXT NOT NULL,
            author TEXT NOT NULL,
            edition TEXT NOT NULL,
            publication_year INTEGER,
            content TEXT NOT NULL
        )
    """)

    connection.commit()

    cursor.execute("SELECT COUNT(*) FROM books")
    count = cursor.fetchone()[0]

    print("Books currently in database:", count)

    if count == 0:
        if os.path.exists(JSON_FILE):
            print("Loading library books from:", JSON_FILE)

            try:
                with open(JSON_FILE, "r", encoding="utf-8") as file:
                    books = json.load(file)

                for book in books:
                    cursor.execute(
                        """
                        INSERT INTO books
                        (
                            subject,
                            book_name,
                            author,
                            edition,
                            publication_year,
                            content
                        )
                        VALUES (?, ?, ?, ?, ?, ?)
                        """,
                        (
                            book["subject"],
                            book["book_name"],
                            book["author"],
                            book["edition"],
                            book.get("publication_year"),
                            json.dumps(book["content"])
                        )
                    )

                connection.commit()
                print("Books inserted:", len(books))

            except Exception as error:
                print("ERROR while loading books:", error)

        else:
            print("ERROR: library_books.json not found!")
            print("Expected location:", JSON_FILE)

    connection.close()


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def normalize_query(query):
    cleaned = re.sub(r"[^a-z0-9\s]", " ", str(query).lower())
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def flatten_topics(content):
    if content is None:
        return []

    if isinstance(content, str):
        parts = []
        for line in content.splitlines():
            parts.extend(part for part in re.split(r"[;\n]", line) if part.strip())
        return [part.strip() for part in parts if part.strip()]

    if isinstance(content, list):
        topics = []
        for item in content:
            topics.extend(flatten_topics(item))
        return topics

    if isinstance(content, dict):
        topics = []
        for value in content.values():
            topics.extend(flatten_topics(value))
        return topics

    return [str(content).strip()]


def get_search_terms(query):
    normalized = normalize_query(query)
    if not normalized:
        return []

    alias = SEARCH_ALIASES.get(normalized)
    if alias and len(normalized) <= 3:
        return [alias]

    terms = [normalized]
    if alias and alias != normalized:
        terms.append(alias)
    return terms


def build_topic_counter(books):
    counts = Counter()

    for book in books:
        for topic in flatten_topics(book.get("content", [])):
            cleaned = re.sub(r"^\s*[-*\d\.]+\s*", "", topic).strip()
            if len(cleaned) > 2:
                counts[cleaned] += 1

    return counts


def build_ai_summary(query, books):
    if not books:
        return (
            f"I could not find a strong match for '{query}'. "
            "Try a subject like DBMS, Operating Systems, or a specific topic."
        )

    subjects = sorted({book["subject"] for book in books})
    topics = build_topic_counter(books)
    leading_topics = [topic for topic, _ in topics.most_common(4)]

    return (
        f"I found {len(books)} relevant book(s) across {len(subjects)} subject area(s) "
        f"for '{query}'. The strongest matching themes are {', '.join(leading_topics)}. "
        "Use these topics to plan revision, practice questions, and chapter-wise revision."
    )


# =========================================================
# GET ALL BOOKS
# =========================================================

def get_all_books():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            id,
            subject,
            book_name,
            author,
            edition,
            publication_year,
            content
        FROM books
        ORDER BY subject, book_name
    """)

    rows = cursor.fetchall()
    connection.close()

    books = []
    for row in rows:
        books.append({
            "id": row[0],
            "subject": row[1],
            "book_name": row[2],
            "author": row[3],
            "edition": row[4],
            "publication_year": row[5],
            "content": json.loads(row[6])
        })

    return books


# =========================================================
# SEARCH BOOKS
# =========================================================

def search_books(query):
    connection = get_connection()
    cursor = connection.cursor()

    query = normalize_query(query)
    if not query:
        return []

    search_terms = get_search_terms(query)
    results = []

    for term in search_terms:
        search_value = f"%{term}%"

        cursor.execute("""
            SELECT
                id,
                subject,
                book_name,
                author,
                edition,
                publication_year,
                content
            FROM books
            WHERE
                LOWER(subject) LIKE ?
                OR LOWER(book_name) LIKE ?
                OR LOWER(author) LIKE ?
                OR LOWER(content) LIKE ?
            ORDER BY subject, book_name
        """, (
            search_value,
            search_value,
            search_value,
            search_value
        ))

        rows = cursor.fetchall()
        for row in rows:
            book = {
                "id": row[0],
                "subject": row[1],
                "book_name": row[2],
                "author": row[3],
                "edition": row[4],
                "publication_year": row[5],
                "content": json.loads(row[6])
            }

            if book not in results:
                results.append(book)

    connection.close()

    print(f'Search: "{query}" -> {len(results)} books found')
    return results


# =========================================================
# AI STUDY HELPERS
# =========================================================

def get_subject_insights(query):
    books = search_books(query)
    normalized_query = normalize_query(query)
    topics = build_topic_counter(books)
    top_topics = [topic for topic, _ in topics.most_common(8)]
    subjects = sorted({book["subject"] for book in books})

    study_plan = []
    if top_topics:
        study_plan = [
            f"Start with the fundamentals of {top_topics[0]} before moving into related concepts.",
            f"Review {', '.join(top_topics[:3])} in a chapter-wise sequence for better retention.",
            "Practice short answer explanations and examples to strengthen exam confidence."
        ]

    return {
        "query": normalized_query,
        "matched_books": len(books),
        "subjects": subjects,
        "important_topics": top_topics,
        "study_plan": study_plan,
        "ai_summary": build_ai_summary(normalized_query, books),
    }


def generate_practice_questions(query):
    books = search_books(query)
    topics = build_topic_counter(books)
    top_topics = [topic for topic, _ in topics.most_common(6)]

    if not top_topics:
        return {
            "query": normalize_query(query),
            "matched_books": len(books),
            "subjects": sorted({book["subject"] for book in books}),
            "questions": []
        }

    questions = [
        question
        for topic in top_topics[:5]
        for question in (
            f"Explain {topic} in your own words and provide one practical example.",
            f"Compare {topic} with a related concept from the same subject and describe key differences.",
            f"Why is {topic} important for exams and real-world applications? Write a short answer."
        )
    ]

    return {
        "query": normalize_query(query),
        "matched_books": len(books),
        "subjects": sorted({book["subject"] for book in books}),
        "questions": questions
    }


def generate_revision_notes(query):
    books = search_books(query)
    topics = build_topic_counter(books)
    top_topics = [topic for topic, _ in topics.most_common(8)]

    if not top_topics:
        return {
            "query": normalize_query(query),
            "matched_books": len(books),
            "subjects": sorted({book["subject"] for book in books}),
            "notes": []
        }

    notes = [
        f"{topic}: revise definitions, key steps, and one example for quick memory recall."
        for topic in top_topics
    ]

    return {
        "query": normalize_query(query),
        "matched_books": len(books),
        "subjects": sorted({book["subject"] for book in books}),
        "notes": notes
    }