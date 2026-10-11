# 📚 College Library Preparation

An AI-powered college library assistant designed for engineering students.

The system helps students search library books, explore subjects, understand chapters, find important topics, and prepare for examinations. The assistant uses the library catalogue to build subject-aware study guides, practice prompts, and revision checklists. These tools are grounded in the topics stored in the library; they do not call an external language model or claim to rank topics by verified exam importance.

---

## 🎯 Project Objective

The main objective of this project is to convert the college library book collection into an interactive digital learning assistant.

Students can:

- 🔍 Search for books by subject, author, title, or topic
- 📚 Search books subject-wise with subject aliases such as DBMS and OS
- 👨‍🏫 Explore book content and chapter topics
- 🎯 Find important topics from matching library resources
- 📝 Generate practice questions from book themes
- 🎓 Prepare for examinations with a study summary and roadmap
- ⚡ Get quick revision notes for faster review
- 🧠 Use a subject-aware assistant flow instead of raw keyword-only lookup

---

## 🚀 Run the project

1. Activate the environment.
2. Start the backend:
   ```bash
   .venv\Scripts\python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
   ```
3. Open the frontend in a browser and use the library assistant UI.

The API exposes these useful endpoints:

- `GET /search?q=DBMS`
- `GET /study-guide?q=Operating Systems`
- `GET /important-topics?q=DBMS`
- `GET /practice-questions?q=DBMS`
- `GET /quick-revision?q=DBMS`

In the web interface, enter a subject or topic in the main search box before using the study-action cards. The assistant input also understands requests such as `practice questions for DBMS`, `important topics in OS`, and `revision notes for normalization`.

---

# 🏗️ Project Architecture

```text
college-library-preparation/
│
├── .venv/
│
├── backend/
│   ├── main.py
│   ├── database.py
│   └── models.py
│
├── data/
│   └── library_books.json
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
└── README.md