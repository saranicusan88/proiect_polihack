import { useState } from "react";
import { supabase } from "../supabaseClient";
import "../styles/AuthPage.css";

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
    setSuccess("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (error) setError(error.message);
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.name },
      },
    });

    if (error) {
      setError(error.message);
    } else {
      if (data?.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: form.name,
          email: form.email,
        });
      }
      setSuccess("Cont creat! Verifica emailul pentru confirmare.");
    }

    setLoading(false);
  };

  return (
    <div className="auth-root">
      <div className="auth-left">
        <div className="auth-brand">
          <span className="auth-brand-icon">◎</span>
          <span className="auth-brand-name">LearnLoop</span>
        </div>
        <div className="auth-left-content">
          <h1 className="auth-headline">
            Invata mai
            <br />
            <em>inteligent</em>,
            <br />
            nu mai mult.
          </h1>
          <p className="auth-sub">
            Sesiuni personalizate, quiz-uri adaptive si streak-uri care te motiveaza sa revii in fiecare zi.
          </p>
          <div className="auth-features">
            <div className="auth-feature-item"><span className="feat-dot" />Continut adaptat pe facultate, an si semestru</div>
            <div className="auth-feature-item"><span className="feat-dot" />Quiz-uri cu feedback instant</div>
            <div className="auth-feature-item"><span className="feat-dot" />Urmaresti progresul zilnic cu streak-uri</div>
          </div>
        </div>
        <div className="auth-left-decoration" />
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === "login" ? "active" : ""}`}
              onClick={() => {
                setMode("login");
                setError("");
                setSuccess("");
              }}
            >
              Intra in cont
            </button>
            <button
              className={`auth-tab ${mode === "register" ? "active" : ""}`}
              onClick={() => {
                setMode("register");
                setError("");
                setSuccess("");
              }}
            >
              Creare cont
            </button>
          </div>

          <form className="auth-form" onSubmit={mode === "login" ? handleLogin : handleRegister}>
            {mode === "register" && (
              <div className="auth-field">
                <label htmlFor="name">Nume complet</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Ion Popescu"
                  value={form.name}
                  onChange={handleChange}
                  required
                  autoComplete="name"
                />
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="ion@student.upt.ro"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Parola</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder={mode === "register" ? "Minim 6 caractere" : "Parola ta"}
                value={form.password}
                onChange={handleChange}
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>

            {error && <div className="auth-error">{error}</div>}
            {success && <div className="auth-success">{success}</div>}

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? <span className="btn-spinner" /> : mode === "login" ? "Intra in cont ->" : "Creeaza cont ->"}
            </button>
          </form>

          {mode === "login" && (
            <p className="auth-switch">
              Nu ai cont? <button onClick={() => setMode("register")}>Inregistreaza-te</button>
            </p>
          )}
          {mode === "register" && (
            <p className="auth-switch">
              Ai deja cont? <button onClick={() => setMode("login")}>Intra in cont</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
