from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.database import (
    create_database,
    generate_practice_questions,
    generate_revision_notes,
    get_all_books,
    get_subject_insights,
    search_books,
)


app = FastAPI(
    title="College Library Preparation API",
    description="AI-powered engineering college library assistant",
    version="1.1"
)


# --------------------------------------------------
# CORS
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# CREATE DATABASE
# --------------------------------------------------

create_database()


# --------------------------------------------------
# HOME
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "📚 College Library Preparation API is running!",
        "status": "success",
        "features": [
            "Book search",
            "Subject overview",
            "Important topics",
            "Practice questions",
            "Revision notes"
        ]
    }


# --------------------------------------------------
# GET ALL BOOKS
# --------------------------------------------------

@app.get("/books")
def books():
    all_books = get_all_books()
    return {
        "count": len(all_books),
        "books": all_books
    }


# --------------------------------------------------
# SEARCH BOOKS
# --------------------------------------------------

@app.get("/search")
def search(
    q: str = Query(..., min_length=1)
):
    results = search_books(q)
    return {
        "query": q,
        "count": len(results),
        "books": results
    }


# --------------------------------------------------
# AI SUBJECT GUIDE
# --------------------------------------------------

@app.get("/study-guide")
def study_guide(
    q: str = Query(..., min_length=1)
):
    return get_subject_insights(q)


# --------------------------------------------------
# IMPORTANT TOPICS
# --------------------------------------------------

@app.get("/important-topics")
def important_topics(
    q: str = Query(..., min_length=1)
):
    data = get_subject_insights(q)
    return {
        "query": q,
        "count": len(data["important_topics"]),
        "subjects": data["subjects"],
        "topics": data["important_topics"],
        "ai_summary": data["ai_summary"],
        "study_plan": data["study_plan"]
    }


# --------------------------------------------------
# PRACTICE QUESTIONS
# --------------------------------------------------

@app.get("/practice-questions")
def practice_questions(
    q: str = Query(..., min_length=1)
):
    return generate_practice_questions(q)


# --------------------------------------------------
# QUICK REVISION
# --------------------------------------------------

@app.get("/quick-revision")
def quick_revision(
    q: str = Query(..., min_length=1)
):
    return generate_revision_notes(q)