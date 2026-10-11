
const API_URL = "http://127.0.0.1:8000";

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const themeButton = document.getElementById("themeButton");
const resultsContainer = document.getElementById("results");
const assistantForm = document.getElementById("assistantForm");
const assistantInput = document.getElementById("assistantInput");
let activeQuery = "";

// --------------------------------------------------
// RESULTS AREA
// --------------------------------------------------

function showResults() {
    if (resultsContainer) {
        resultsContainer.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}

function setResultsMessage(message) {
    if (!resultsContainer) return;

    resultsContainer.replaceChildren();

    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    resultsContainer.appendChild(paragraph);

    showResults();
}

function addHeading(text) {
    const heading = document.createElement("h2");
    heading.textContent = text;
    resultsContainer.appendChild(heading);
}

function renderAiList(title, items, emptyMessage) {
    if (!resultsContainer) return;

    resultsContainer.replaceChildren();
    addHeading(title);

    if (!items || items.length === 0) {
        setResultsMessage(emptyMessage);
        return;
    }

    const list = document.createElement("ul");
    items.forEach(item => {
        const listItem = document.createElement("li");
        listItem.textContent = item;
        list.appendChild(listItem);
    });

    resultsContainer.appendChild(list);
    showResults();
}

// --------------------------------------------------
// NORMALIZE BOOK CONTENT
// --------------------------------------------------

function getTopics(content) {
    if (content == null) return [];

    if (typeof content === "string") {
        try {
            const parsed = JSON.parse(content);

            if (parsed !== content) {
                return getTopics(parsed);
            }
        } catch {
            // The content is ordinary text.
        }

        return content
            .split(/\r?\n/)
            .map(item => item.trim())
            .filter(Boolean);
    }

    if (Array.isArray(content)) {
        return content.flatMap(item => getTopics(item));
    }

    if (typeof content === "object") {
        return Object.entries(content).map(([key, value]) => {
            const textValue = typeof value === "string"
                ? value
                : JSON.stringify(value);

            return `${key}: ${textValue}`;
        });
    }

    return [String(content)];
}

// --------------------------------------------------
// DISPLAY BOOKS
// --------------------------------------------------

function displayBooks(books, query) {
    if (!resultsContainer) return;

    resultsContainer.replaceChildren();
    addHeading(`Books found: ${books.length}`);

    if (books.length === 0) {
        setResultsMessage(
            `No books found for "${query}". Try DBMS, OS, or another subject.`
        );
        return;
    }

    books.forEach(book => {
        const card = document.createElement("article");
        card.className = "book-card";

        const title = document.createElement("h2");
        title.textContent = `📚 ${book.book_name || "Untitled book"}`;
        card.appendChild(title);

        const details = [
            ["Subject", book.subject],
            ["Author", book.author],
            ["Edition", book.edition],
            ["Publication Year", book.publication_year]
        ];

        details.forEach(([label, value]) => {
            const paragraph = document.createElement("p");
            const strong = document.createElement("strong");

            strong.textContent = `${label}: `;
            paragraph.append(
                strong,
                document.createTextNode(
                    value == null || value === "" ? "N/A" : String(value)
                )
            );

            card.appendChild(paragraph);
        });

        const topicHeading = document.createElement("h3");
        topicHeading.textContent = "Topics / Book Content";
        card.appendChild(topicHeading);

        const list = document.createElement("ul");
        const topics = getTopics(book.content);

        if (topics.length === 0) {
            const item = document.createElement("li");
            item.textContent = "No topic details are available.";
            list.appendChild(item);
        } else {
            topics.forEach(topic => {
                const item = document.createElement("li");
                item.textContent = topic;
                list.appendChild(item);
            });
        }

        card.appendChild(list);
        resultsContainer.appendChild(card);
    });

    showResults();
}

// --------------------------------------------------
// FETCH ASSISTANT DATA
// --------------------------------------------------

async function fetchAssistantData(endpoint, query) {
    const response = await fetch(
        `${API_URL}${endpoint}?q=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
        throw new Error(`API returned ${response.status} for ${endpoint}`);
    }

    return response.json();
}

// --------------------------------------------------
// SEARCH BOOKS
// --------------------------------------------------

async function searchLibrary(queryOverride = "") {
    const query = (
        queryOverride ||
        (searchInput ? searchInput.value : "")
    ).trim();

    if (!query) {
        setResultsMessage("Please enter a subject, book name, or topic.");

        if (searchInput) searchInput.focus();
        return [];
    }

    if (searchInput) searchInput.value = query;
    activeQuery = query;

    setResultsMessage(`Searching the library for "${query}"...`);

    try {
        const response = await fetch(
            `${API_URL}/search?q=${encodeURIComponent(query)}`
        );

        if (!response.ok) {
            throw new Error(`Search API returned ${response.status}`);
        }

        const data = await response.json();
        const books = Array.isArray(data)
            ? data
            : Array.isArray(data.books)
                ? data.books
                : [];

        displayBooks(books, query);
        return books;

    } catch (error) {
        console.error("Search failed:", error);
        setResultsMessage(
            "Unable to connect to the library server. " +
            "Start FastAPI and check the /search endpoint."
        );
        return [];
    }
}

// --------------------------------------------------
// IMPORTANT TOPICS
// --------------------------------------------------

async function showImportantTopics(subject = getCurrentSubject()) {
    if (!subject) return requestSubject();
    try {
        const data = await fetchAssistantData(
            "/important-topics",
            subject
        );

        const topics = Array.isArray(data.topics) ? data.topics : [];

        if (!topics.length) {
            setResultsMessage(
                `No important topics were found for "${subject}". Try a subject or topic in the library.`
            );
            return;
        }

        resultsContainer.replaceChildren();
        addHeading(`🎯 Important Topics: ${subject}`);

        const summary = document.createElement("p");
        summary.textContent = data.ai_summary || "Study these topics in order.";
        resultsContainer.appendChild(summary);

        appendList(topics, "ol");
        appendStudyPlan(data.study_plan);
        showResults();

    } catch (error) {
        console.error("Important topics failed:", error);
        showFeatureError(error, "important topics");
    }
}

// --------------------------------------------------
// PRACTICE QUESTIONS
// --------------------------------------------------

async function showPracticeQuestions(subject = getCurrentSubject()) {
    if (!subject) return requestSubject();
    try {
        const data = await fetchAssistantData(
            "/practice-questions",
            subject
        );

        const questions = Array.isArray(data.questions) ? data.questions : [];

        if (!questions.length) {
            setResultsMessage(
                `No practice questions were found for "${subject}". Try a subject or topic in the library.`
            );
            return;
        }

        resultsContainer.replaceChildren();
        addHeading(`❓ Practice Questions: ${subject}`);

        const note = document.createElement("p");
        note.textContent =
            "These are quick revision prompts based on the library content " +
            "and subject themes.";
        resultsContainer.appendChild(note);

        appendList(questions, "ol");
        showResults();

    } catch (error) {
        console.error("Practice questions failed:", error);
        showFeatureError(error, "practice questions");
    }
}

// --------------------------------------------------
// QUICK REVISION
// --------------------------------------------------

async function showQuickRevision(subject = getCurrentSubject()) {
    if (!subject) return requestSubject();
    try {
        const data = await fetchAssistantData(
            "/quick-revision",
            subject
        );

        const notes = Array.isArray(data.notes) ? data.notes : [];

        if (!notes.length) {
            setResultsMessage(
                `No revision notes were found for "${subject}". Try a subject or topic in the library.`
            );
            return;
        }

        resultsContainer.replaceChildren();
        addHeading(`⚡ Quick Revision: ${subject}`);

        appendList(notes);
        showResults();

    } catch (error) {
        console.error("Quick revision failed:", error);
        showFeatureError(error, "revision notes");
    }
}

// --------------------------------------------------
// STUDY ACTIONS
// --------------------------------------------------

function getCurrentSubject() {
    const typedQuery = searchInput ? searchInput.value.trim() : "";
    return typedQuery || activeQuery;
}

function requestSubject() {
    setResultsMessage(
        "First enter a subject or topic in the search box above, then choose a study action."
    );
    if (searchInput) {
        searchInput.focus();
        searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

function appendList(items, tagName = "ul") {
    const list = document.createElement(tagName);
    items.forEach(text => {
        const item = document.createElement("li");
        item.textContent = text;
        list.appendChild(item);
    });
    resultsContainer.appendChild(list);
}

function appendStudyPlan(plan) {
    if (!Array.isArray(plan) || plan.length === 0) return;
    const heading = document.createElement("h3");
    heading.textContent = "Suggested study plan";
    resultsContainer.appendChild(heading);
    appendList(plan);
}

function showFeatureError(error, feature) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`${feature} request failed:`, detail);
    setResultsMessage(
        `Could not load ${feature}. Check that the library API is running at ${API_URL} and try again.`
    );
}

async function showStudyGuide(subject = getCurrentSubject()) {
    if (!subject) return requestSubject();
    try {
        const data = await fetchAssistantData("/study-guide", subject);
        if (!data.matched_books) {
            setResultsMessage(
                `I couldn't find library books for "${subject}". Try DBMS, Operating Systems, Data Structures, Computer Networks, or a topic.`
            );
            return;
        }

        resultsContainer.replaceChildren();
        addHeading(`🎓 Study Guide: ${subject}`);
        const summary = document.createElement("p");
        summary.textContent = data.ai_summary;
        resultsContainer.appendChild(summary);
        if (Array.isArray(data.subjects) && data.subjects.length) {
            const subjects = document.createElement("p");
            subjects.textContent = `Library subject: ${data.subjects.join(", ")}`;
            resultsContainer.appendChild(subjects);
        }
        const topicsHeading = document.createElement("h3");
        topicsHeading.textContent = "Start with these topics";
        resultsContainer.appendChild(topicsHeading);
        appendList(data.important_topics || []);
        appendStudyPlan(data.study_plan);
        showResults();
    } catch (error) {
        showFeatureError(error, "study guide");
    }
}

function showMessage(action) {
    const normalized = String(action).trim().toLowerCase();

    const actions = {
        "search books": () => {
            if (searchInput) {
                searchInput.focus();
                searchInput.scrollIntoView({ behavior: "smooth" });
            }
        },
        "prepare": showStudyGuide,
        "prepare by subject": showStudyGuide,
        "chapters": () => searchLibrary(getCurrentSubject()),
        "explore chapters": () => searchLibrary(getCurrentSubject()),
        "important": showImportantTopics,
        "important topics": showImportantTopics,
        "questions": showPracticeQuestions,
        "practice questions": showPracticeQuestions,
        "revision": showQuickRevision,
        "quick revision": showQuickRevision
    };

    if (actions[normalized]) {
        actions[normalized]();
    } else if (typeof action === "string" && action.trim()) {
        searchLibrary(action);
    }
}

function askAssistant(message) {
    const text = String(message || "").trim();
    if (!text) {
        if (assistantInput) assistantInput.focus();
        return;
    }

    const normalized = text.toLowerCase();
    const subject = text
        .replace(/^(?:(?:can|could) you\s+)?(?:please\s+)?(?:show|find|give(?: me)?|generate|make|create|list|explain|help me with)\s+/i, "")
        .replace(/\b(important topics?|practice questions?|questions?|quiz|quick revision(?: notes?)?|revision notes?|revision|study guide|study plan|books?)\b/gi, "")
        .trim()
        .replace(/^(for|about|on|in|of)\s+/i, "")
        .replace(/[?.!,]+$/g, "")
        .trim();
    const query = subject || getCurrentSubject();

    if (/important topics?/.test(normalized)) {
        showImportantTopics(query);
    } else if (/practice questions?|questions?|quiz/.test(normalized)) {
        showPracticeQuestions(query);
    } else if (/quick revision|revision notes?|revision/.test(normalized)) {
        showQuickRevision(query);
    } else if (/study guide|prepare|study plan/.test(normalized)) {
        showStudyGuide(query);
    } else {
        searchLibrary(text);
    }
}

// --------------------------------------------------
// CHAT SUGGESTIONS
// --------------------------------------------------

function askQuestion(question) {
    const value = String(question).trim();

    if (/show me\s+.*\s+books/i.test(value)) {
        const subject = value
            .replace(/^show me\s+/i, "")
            .replace(/\s+books$/i, "");

        searchLibrary(subject);
        return;
    }

    if (/questions/i.test(value)) {
        showPracticeQuestions(getCurrentSubject());
        return;
    }

    if (/revision/i.test(value)) {
        showQuickRevision(getCurrentSubject());
        return;
    }

    askAssistant(value);
}

// --------------------------------------------------
// DARK MODE
// --------------------------------------------------

function syncThemeButton() {
    if (!themeButton) return;
    const darkModeOn = document.body.classList.contains("dark");
    themeButton.textContent = darkModeOn ? "☀️" : "🌙";
}

function toggleTheme() {
    document.body.classList.toggle("dark");
    syncThemeButton();
}

// --------------------------------------------------
// EVENT LISTENERS
// --------------------------------------------------

if (searchForm) {
    searchForm.addEventListener("submit", event => {
        event.preventDefault();
        searchLibrary();
    });
}

if (assistantForm && assistantInput) {
    assistantForm.addEventListener("submit", event => {
        event.preventDefault();
        askAssistant(assistantInput.value);
        assistantInput.value = "";
    });
}

if (searchButton) {
    searchButton.addEventListener("click", event => {
        event.preventDefault();
        searchLibrary();
    });
}

if (searchInput) {
    searchInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            searchLibrary();
        }
    });
}

if (themeButton) {
    syncThemeButton();
}
