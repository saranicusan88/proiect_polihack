import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import "../styles/Dashboard.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const FACULTIES = ["Automatică și Calculatoare", "Electronică", "Electrotehnică", "Mecanică","Matematică și Informatică","Fizică", "Chimie", "Biologie","Economie", "Drept", "Medicină","Psihologie", "Sociologie", "Litere", "Istorie", "Filosofie","Arte"];
const YEARS = [1, 2, 3, 4];
const SEMESTERS = [1, 2];
const LEARN_MODES = [
  { value: "current", label: "Semestrul curent" },
  { value: "past", label: "Din trecut" },
  { value: "all", label: "Toate" },
];

// Chat flow stages
const STAGE = {
  GREETING: "greeting",
  ASK_TIME: "ask_time",
  ASK_SUBJECT: "ask_subject",
  READY: "ready",
};

function parseMinutes(text) {
  const t = text.toLowerCase().trim();
  if (t.includes("jumătate de oră") || t.includes("30")) return 30;
  const match = t.match(/(\d+)/);
  if (match) return parseInt(match[1]);
  if (t.includes("oră") || t.includes("ora")) return 60;
  return null;
}

function normalizeText(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Dashboard({ session }) {
  const user = session.user;

  // Academic selectors
  const [faculty, setFaculty] = useState("Automatică și Calculatoare");
  const [year, setYear] = useState(1);
  const [semester, setSemester] = useState(1);
  const [learnMode, setLearnMode] = useState("current");

  // Chat state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [stage, setStage] = useState(STAGE.GREETING);
  const [sessionMinutes, setSessionMinutes] = useState(null);
  const [chosenSubject, setChosenSubject] = useState(null);
  const chatEndRef = useRef(null);
  const initializedRef = useRef(false);

  // Session / quiz state
  const [sessionId, setSessionId] = useState(null);
  const [currentItem, setCurrentItem] = useState(null); // { type: "quiz"|"content", data: {...} }
  const [itemStartTime, setItemStartTime] = useState(null);
  const [minutesLeft, setMinutesLeft] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [stats, setStats] = useState({ items: 0, correct: 0 });

  // Streak
  const [streak, setStreak] = useState(0);

  // Active panel: null | "quiz" | "concepts"
  const [activePanel, setActivePanel] = useState(null);

  // ── On mount: greet + load streak ─────────────────────────────────────────
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      addBot("Bună! 👋 Sunt aici să te ajut să înveți. Cât timp ai la dispoziție să exersezi cu mine?");
      setStage(STAGE.ASK_TIME);
    }
    loadStreak();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Streak ─────────────────────────────────────────────────────────────────
  async function loadStreak() {
    const { data } = await supabase
      .from("user_streaks")
      .select("current_streak")
      .eq("user_id", user.id)
      .single();
    if (data) setStreak(data.current_streak);
  }

  async function updateStreak() {
    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      await supabase.from("user_streaks").insert({
        user_id: user.id,
        current_streak: 1,
        longest_streak: 1,
        last_completed_date: today,
      });
      setStreak(1);
      return;
    }

    if (existing.last_completed_date === today) return; // already done today

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split("T")[0];

    const newStreak = existing.last_completed_date === yStr ? existing.current_streak + 1 : 1;
    const longestStreak = Math.max(newStreak, existing.longest_streak || 0);

    await supabase.from("user_streaks").update({
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_completed_date: today,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    setStreak(newStreak);
  }

  // ── Chat helpers ───────────────────────────────────────────────────────────
  function addBot(text) {
    setMessages((prev) => [...prev, { role: "bot", text }]);
  }
  function addUser(text) {
    setMessages((prev) => [...prev, { role: "user", text }]);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    addUser(text);

    if (stage === STAGE.ASK_TIME) {
      const mins = parseMinutes(text);
      if (!mins) {
        addBot("Nu am înțeles cât timp ai. Încearcă: \"10 minute\", \"20 minute\" sau \"o oră\".");
        return;
      }
      setSessionMinutes(mins);
      setMinutesLeft(mins);

      // Create learning session
      const { data: sess } = await supabase
        .from("learning_sessions")
        .insert({ user_id: user.id, requested_minutes: mins, started_at: new Date().toISOString() })
        .select()
        .single();
      if (sess) setSessionId(sess.id);

      addBot(`Super! ${mins} minute rezervate. 🎯\n\nVrei să alegi o materie anume sau să îți aleg eu una potrivită?`);
      setStage(STAGE.ASK_SUBJECT);
      return;
    }

    if (stage === STAGE.ASK_SUBJECT) {
      const lower = text.toLowerCase();
      if (lower.includes("alege tu") || lower.includes("nu știu") || lower.includes("tu")) {
        setChosenSubject(null);
        addBot("Perfect! Aleg eu. Apasă **Quiz-uri** sau **Concepte** ca să pornim sesiunea. 🚀");
      } else {
        setChosenSubject(text);
        addBot(`Am notat: **${text}**. Apasă **Quiz-uri** sau **Concepte** ca să pornim. 🚀`);
      }
      setStage(STAGE.READY);
      return;
    }

    addBot("Sesiunea e deja pornită. Folosește butoanele de mai jos sau apasă Next pentru a continua.");
  }

  // ── Fetch next item ────────────────────────────────────────────────────────
  async function getSelectedFacultyIds() {
    const { data, error } = await supabase
      .from("faculties")
      .select("id, name");

    if (error || !data?.length) return [];

    const selected = normalizeText(faculty);
    return data
      .filter((f) => {
        const dbName = normalizeText(f.name);
        return dbName === selected || dbName.includes(selected) || selected.includes(dbName);
      })
      .map((f) => f.id);
  }

  async function getFilteredTopics() {
    const facultyIds = await getSelectedFacultyIds();

    let subjectQuery = supabase
      .from("subjects")
      .select("id, name, year, semester, faculty_id");

    if (facultyIds.length) {
      subjectQuery = subjectQuery.in("faculty_id", facultyIds);
    }

    if (learnMode === "current") {
      subjectQuery = subjectQuery.eq("year", year).eq("semester", semester);
    } else if (learnMode === "past") {
      subjectQuery = subjectQuery.or(`year.lt.${year},and(year.eq.${year},semester.lt.${semester})`);
    }

    const { data: subjects, error: subjectsError } = await subjectQuery;
    if (subjectsError || !subjects?.length) return [];

    const subjectIds = subjects.map((s) => s.id);
    const subjectNameById = Object.fromEntries(subjects.map((s) => [s.id, s.name]));

    const { data: topics, error: topicsError } = await supabase
      .from("topics")
      .select("id, name, subject_id")
      .in("subject_id", subjectIds)
      .limit(500);

    if (topicsError || !topics?.length) return [];

    const selectedText = normalizeText(chosenSubject);
    if (!selectedText) return topics;

    return topics.filter((t) => {
      const topicName = normalizeText(t.name);
      const subjectName = normalizeText(subjectNameById[t.subject_id]);
      return topicName.includes(selectedText) || subjectName.includes(selectedText);
    });
  }

  async function fetchQuiz() {
    const topics = await getFilteredTopics();
    if (!topics.length) return null;

    const topicIds = topics.map((t) => t.id);
    const topicNameById = Object.fromEntries(topics.map((t) => [t.id, t.name]));

    const { data, error } = await supabase
      .from("quiz_questions")
      .select("id, question, option_a, option_b, option_c, correct_option, explanation, estimated_minutes, topic_id")
      .in("topic_id", topicIds)
      .limit(200);

    if (error || !data?.length) return null;

    const enriched = data.map((q) => ({
      ...q,
      topics: { name: topicNameById[q.topic_id] || "" },
    }));

    return enriched.sort(() => Math.random() - 0.5)[0];
  }

  async function fetchContent() {
    const topics = await getFilteredTopics();
    if (!topics.length) return null;

    const topicIds = topics.map((t) => t.id);
    const topicNameById = Object.fromEntries(topics.map((t) => [t.id, t.name]));

    const { data, error } = await supabase
      .from("content_items")
      .select("*")
      .in("topic_id", topicIds)
      .limit(200);

    if (error || !data?.length) return null;

    const allowedTypes = new Set([
      "explanation",
      "example",
      "explicatie",
      "exemplu",
      "concept",
    ]);

    const filteredByType = data.filter((item) => {
      if (!item.type) return true;
      return allowedTypes.has(normalizeText(item.type));
    });

    const source = filteredByType.length ? filteredByType : data;

    const enriched = source.map((item) => ({
      ...item,
      body: item.body || item.content || item.text || item.description || "",
      topics: { name: topicNameById[item.topic_id] || "" },
    }));

    return enriched[Math.floor(Math.random() * enriched.length)];
  }

  // ── Handle button clicks ───────────────────────────────────────────────────
  async function handleQuizButton() {
    if (stage !== STAGE.READY) {
      addBot("Mai întâi spune-mi cât timp ai și ce materie vrei.");
      return;
    }
    if (sessionDone) return;

    const item = await fetchQuiz();
    if (!item) {
    addBot(`Nu am găsit întrebări pentru "${chosenSubject || "filtrele selectate"}". Verifică numele materiei sau schimbă filtrul de an/semestru.`);
    return;
}

    setCurrentItem({ type: "quiz", data: item });
    setItemStartTime(Date.now());
    setSelectedOption(null);
    setAnswered(false);
    setActivePanel("quiz");
  }

  async function handleConceptsButton() {
    if (stage !== STAGE.READY) {
      addBot("Mai întâi spune-mi cât timp ai și ce materie vrei.");
      return;
    }
    if (sessionDone) return;

    const item = await fetchContent();
    if (!item) {
      addBot("Nu am găsit conținut pentru filtrele selectate.");
      return;
    }

    // Save progress
    if (sessionId) {
      await supabase.from("user_content_progress").insert({
        user_id: user.id,
        session_id: sessionId,
        content_item_id: item.id,
        viewed_at: new Date().toISOString(),
      });
    }

    setCurrentItem({ type: "content", data: item });
    setItemStartTime(Date.now());
    setActivePanel("concepts");
    setStats((s) => ({ ...s, items: s.items + 1 }));
  }

  async function handleAnswer(option) {
    if (answered) return;
    setSelectedOption(option);
    setAnswered(true);

    const item = currentItem.data;
    const isCorrect = option.toLowerCase().trim() === item.correct_option?.toLowerCase().trim();


    // Save answer
    if (sessionId) {
      await supabase.from("user_answers").insert({
        user_id: user.id,
        session_id: sessionId,
        question_id: item.id,
        selected_option: option,
        is_correct: isCorrect,
        answered_at: new Date().toISOString(),
      });
    }

    setStats((s) => ({
      items: s.items + 1,
      correct: isCorrect ? s.correct + 1 : s.correct,
    }));

    // Update streak on first answer of the day
    await updateStreak();
  }

  async function handleNext() {
    if (!itemStartTime) return;

    const elapsed = (Date.now() - itemStartTime) / 1000 / 60; // minutes
    const newLeft = Math.max(0, minutesLeft - elapsed);
    setMinutesLeft(newLeft);

    if (newLeft <= 0.5) {
      // Session done
      setSessionDone(true);
      setCurrentItem(null);
      setActivePanel(null);

      if (sessionId) {
        await supabase.from("learning_sessions")
          .update({ ended_at: new Date().toISOString() })
          .eq("id", sessionId);
      }

      addBot(
        `Sesiunea s-a terminat! 🎉\n\nAi parcurs **${stats.items + 1}** itemuri și ai răspuns corect la **${stats.correct}** întrebări. Revin mâine! 🔥`
      );
      return;
    }

    // Pick next item based on active panel
    if (activePanel === "quiz") {
      await handleQuizButton();
    } else {
      await handleConceptsButton();
    }
  }

  async function handleStopSession() {
    if (!sessionId && minutesLeft === null) return;

    if (sessionId) {
      await supabase
        .from("learning_sessions")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", sessionId);
    }

    setSessionDone(false);
    setCurrentItem(null);
    setActivePanel(null);
    setSelectedOption(null);
    setAnswered(false);
    setItemStartTime(null);
    setSessionId(null);
    setSessionMinutes(null);
    setMinutesLeft(null);
    setChosenSubject(null);
    setStats({ items: 0, correct: 0 });
    setStage(STAGE.ASK_TIME);

    addBot("Am oprit sesiunea curentă. Spune-mi cât timp ai la dispoziție pentru o sesiune nouă.");
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const userName = user?.user_metadata?.full_name?.split(" ")[0] || "Student";
  const minutesDisplay = minutesLeft !== null ? Math.max(0, Math.round(minutesLeft)) : null;

  return (
    <div className="dash-root">
      {/* ── TOP BAR ── */}
      <header className="dash-header">
        <div className="dash-brand">
          <span className="dash-brand-icon">◎</span>
          <span className="dash-brand-name">QuickLearn</span>
        </div>

        <div className="dash-header-center">
          {/* Academic selectors */}
          <select value={faculty} onChange={(e) => setFaculty(e.target.value)} className="dash-select">
            {FACULTIES.map((f) => <option key={f}>{f}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="dash-select">
            {YEARS.map((y) => <option key={y} value={y}>Anul {y}</option>)}
          </select>
          <select value={semester} onChange={(e) => setSemester(Number(e.target.value))} className="dash-select">
            {SEMESTERS.map((s) => <option key={s} value={s}>Sem. {s}</option>)}
          </select>
          <select value={learnMode} onChange={(e) => setLearnMode(e.target.value)} className="dash-select">
            {LEARN_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        <div className="dash-header-right">
          {minutesDisplay !== null && (
            <div className={`dash-timer ${minutesDisplay <= 3 ? "timer-low" : ""}`}>
              ⏱ {minutesDisplay} min
            </div>
          )}
          <div className="dash-streak">🔥 {streak}</div>
          <div className="dash-user">{userName}</div>
          <button className="dash-logout" onClick={handleLogout}>Ieși</button>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="dash-main">
        {/* ── LEFT: Chat ── */}
        <section className="dash-chat-panel">
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.role}`}>
                {msg.role === "bot" && <span className="chat-avatar">◎</span>}
                <div
                  className="chat-text"
                  dangerouslySetInnerHTML={{
                    __html: msg.text
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\n/g, "<br/>"),
                  }}
                />
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {!sessionDone && (
            <div className="chat-input-row">
              <input
                className="chat-input"
                placeholder="Scrie aici..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <button className="chat-send" onClick={handleSend}>→</button>
            </div>
          )}
        </section>

        {/* ── RIGHT: Content panel ── */}
        <section className="dash-content-panel">
          {/* Buttons */}
          {!sessionDone && (
            <div className="dash-action-buttons">
              <button
                className={`action-btn concepts-btn ${activePanel === "concepts" ? "active" : ""}`}
                onClick={handleConceptsButton}
              >
                <span className="btn-icon">📖</span>
                Concepte + Explicații
              </button>
              <button
                className={`action-btn quiz-btn ${activePanel === "quiz" ? "active" : ""}`}
                onClick={handleQuizButton}
              >
                <span className="btn-icon">🧠</span>
                Quiz-uri
              </button>
              {minutesLeft !== null && (
                <button className="action-btn stop-btn" onClick={handleStopSession}>
                  Oprește sesiunea
                </button>
              )}
              {currentItem && (
                <button className="action-btn next-btn" onClick={handleNext}>
                  Next →
                </button>
              )}
            </div>
          )}

          {/* Content display */}
          <div className="dash-item-display">
            {!currentItem && !sessionDone && (
              <div className="dash-empty-state">
                <div className="empty-icon">◎</div>
                <p>Alege un mod de învățare și apasă un buton pentru a începe.</p>
              </div>
            )}

            {sessionDone && (
              <div className="session-done-card">
                <div className="done-icon">🎉</div>
                <h2>Sesiune completă!</h2>
                <div className="done-stats">
                  <div className="stat-pill">
                    <span>{stats.items}</span> itemuri parcurse
                  </div>
                  <div className="stat-pill correct">
                    <span>{stats.correct}</span> răspunsuri corecte
                  </div>
                  {stats.items > 0 && (
                    <div className="stat-pill rate">
                      <span>{Math.round((stats.correct / stats.items) * 100)}%</span> rată succes
                    </div>
                  )}
                </div>
                <button
                  className="action-btn quiz-btn"
                  onClick={() => {
                    setSessionDone(false);
                    setStats({ items: 0, correct: 0 });
                    setCurrentItem(null);
                    setActivePanel(null);
                    setStage(STAGE.ASK_TIME);
                    setMessages([]);
                    setMinutesLeft(null);
                    setSessionMinutes(null);
                    addBot("Bun venit înapoi! 💪 Cât timp ai la dispoziție acum?");
                  }}
                >
                  Sesiune nouă
                </button>
              </div>
            )}

            {/* Quiz card */}
            {currentItem?.type === "quiz" && !sessionDone && (
              <QuizCard
                data={currentItem.data}
                selectedOption={selectedOption}
                answered={answered}
                onAnswer={handleAnswer}
              />
            )}

            {/* Content card */}
            {currentItem?.type === "content" && !sessionDone && (
              <ContentCard data={currentItem.data} />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

// ─── QuizCard ──────────────────────────────────────────────────────────────────
function QuizCard({ data, selectedOption, answered, onAnswer }) {
  // ✅ Normalizează correct_option o singură dată
  const correctOpt = data.correct_option?.toLowerCase().trim();
  const explanationText = (data.explanation || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const explanationHasCorrectAnswerText =
    explanationText.includes("raspunsul corect era") ||
    explanationText.includes("varianta corecta") ||
    explanationText.includes("correct answer");
  const cleanedExplanation = (data.explanation || "")
    .split("\n")
    .filter((line) => {
      const normalized = line
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

      if (!normalized) return false;

      return !(
        normalized.includes("raspuns corect") ||
        normalized.includes("raspunsul corect") ||
        normalized.includes("varianta corecta") ||
        normalized.includes("correct answer")
      );
    })
    .join("\n");

  const options = [
    { key: "a", label: data.option_a },
    { key: "b", label: data.option_b },
    { key: "c", label: data.option_c },
  ];

  function getOptionClass(key) {
    if (!answered) return selectedOption === key ? "option selected" : "option";
    if (key === correctOpt) return "option correct";                              // ✅
    if (key === selectedOption && key !== correctOpt) return "option wrong";      // ✅
    return "option";
  }

  return (
    <div className="item-card quiz-card">
      <div className="item-meta">
        <span className="meta-badge quiz-badge">Quiz</span>
        {data.estimated_minutes && (
          <span className="meta-time">⏱ max {data.estimated_minutes} min</span>
        )}
        {data.topics?.name && <span className="meta-topic">{data.topics.name}</span>}
      </div>

      <h2 className="quiz-question">{data.question}</h2>

      <div className="quiz-options">
        {options.map((opt) => (
          <button
            key={opt.key}
            className={getOptionClass(opt.key)}
            onClick={() => onAnswer(opt.key)}
            disabled={answered}
          >
            <span className="option-letter">{opt.key.toUpperCase()}</span>
            <span className="option-text">{opt.label}</span>
            {answered && opt.key === correctOpt && (               // ✅
              <span className="option-check">✓</span>
            )}
            {answered && opt.key === selectedOption && opt.key !== correctOpt && (  // ✅
              <span className="option-cross">✗</span>
            )}
          </button>
        ))}
      </div>

      {answered && (
        <div className={`quiz-feedback ${selectedOption === correctOpt ? "fb-correct" : "fb-wrong"}`}>  {/* ✅ */}
          {selectedOption === correctOpt ? (        // ✅
            <>
              <strong>Corect! ✓</strong>
              {cleanedExplanation && <p>{cleanedExplanation}</p>}
            </>
          ) : (
            <>
              <strong>Greșit.</strong>{" "}
              {!explanationHasCorrectAnswerText && (
                <>
                  Răspunsul corect era <strong>{correctOpt?.toUpperCase()}</strong>.{" "}
                </>
              )}
              {cleanedExplanation && <p>{cleanedExplanation}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ContentCard ───────────────────────────────────────────────────────────────
function ContentCard({ data }) {
  return (
    <div className="item-card content-card">
      <div className="item-meta">
        <span className={`meta-badge ${data.type === "example" ? "example-badge" : "explain-badge"}`}>
          {data.type === "example" ? "Exemplu" : "Explicație"}
        </span>
        {data.estimated_minutes && (
          <span className="meta-time">⏱ max {data.estimated_minutes} min</span>
        )}
        {data.topics?.name && <span className="meta-topic">{data.topics.name}</span>}
      </div>

      <h2 className="content-title">{data.title}</h2>
      <div className="content-body">{data.body}</div>
    </div>
  );
}