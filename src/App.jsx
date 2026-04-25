import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startupError, setStartupError] = useState("");

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (!isMounted) return;
        if (error) {
          setStartupError(error.message);
        } else {
          setSession(session);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setStartupError(err?.message || "Nu am putut initializa conexiunea.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setSession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-dot" />
      </div>
    );
  }

  if (startupError) {
    return (
      <div className="app-loading">
        <p>Database startup error: {startupError}</p>
      </div>
    );
  }

  return session ? (
    <Dashboard session={session} />
  ) : (
    <AuthPage />
  );
}
