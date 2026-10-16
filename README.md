# QuickLearn — University Study & Quiz Platform

> **PoliHack Hackathon Project**  
> A simple study app for university students to review course materials, take practice quizzes, and get clear, instant explanations.

---

## About the Project

Studying for college exams can get messy when notes and slides are all over the place. Many people turn to AI tools, but they often give incorrect or misleading answers on exact technical subjects.

We built **QuickLearn** during the **PoliHack** hackathon to solve this. Instead of relying on AI, the app pulls all subjects, questions, and explanations straight from a Supabase (PostgreSQL) database. Every answer and explanation is verified and loads instantly.

---

## Key Features

- **User Accounts:** Sign up and log in securely with Supabase Auth.
- **Subject Quizzes:** Practice tests divided by courses and chapters to test what you know.
- **Course Concepts:** Short, clear summary sheets for key topics before taking a test.
- **Instant Explanations:** See why an answer is right or wrong immediately after submitting it.
- **Student Dashboard:** A clean space to pick your subjects and track your study sessions.

---

## Interface

| Authentication Page | Main Dashboard / Quizzes |
| :---: | :---: |
| <img src="https://github.com/user-attachments/assets/5705d642-adb0-4173-a632-980d41b8b984" alt="Authentication Page" /> | <img src="https://github.com/user-attachments/assets/a55e450a-c771-4623-876c-a0d21f8d0456" alt="Main Dashboard" /> |

---

## Tech Stack

- **Frontend:** React, Vite
- **Language:** JavaScript
- **Backend & Database:** Supabase (PostgreSQL)
- **Styling:** CSS3

---

## Getting Started

Follow these steps to run the project locally on your machine.

> **Important Note on Course Data:**  
> The question bank and lecture concept tables have not been made public yet. Running the application locally will let you test the authentication flow and navigate the user interface, but the quiz questions and study modules will not populate without access to the private database tables.

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or newer)
- `npm` (comes with Node.js)
- A free [Supabase](https://supabase.com/) account

### 1. Clone the repository

```bash
git clone https://github.com/saranicusan88/QuickLearn.git
cd QuickLearn
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard) and create a new project.
2. Under **Authentication**, enable the **Email / Password** provider.
3. Open **Project Settings** > **API** to copy your **Project URL** and **anon public key**.

### 4. Configure environment variables

Create a file named `.env.local` in the root folder of the project:

```bash
touch .env.local
```

Paste your Supabase credentials into `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

### 5. Run the application

Start the Vite development server:

```bash
npm run dev
```

Open your browser and navigate to the local link shown in the terminal (usually `http://localhost:5173`).

---

## Project Structure

```text
QuickLearn/
├── public/              # Static files
├── src/
│   ├── pages/
│   │   ├── AuthPage.jsx     # Login and register screens
│   │   └── Dashboard.jsx    # Main area with courses and quizzes
│   ├── App.css              # App layout styles
│   ├── App.jsx              # Auth state check and page routing
│   ├── index.css            # Base styles and resets
│   ├── main.jsx             # React entry file
│   └── supabaseClient.js    # Supabase connection setup
├── .env.local               # Private API keys (do not commit to git)
├── package.json
└── README.md
```

---

## Limitations

- The question set and course materials currently require manual database entries or custom migration scripts.
- Only a core selection of introductory computer science subjects is mapped out at this stage.
- The question bank remains private, meaning local clones cannot load full quiz sets out of the box.

---

## Future Roadmap

- [ ] Add support for higher-year university subjects and electives.
- [ ] Build student progress tracking, including score histories and mistake breakdowns by chapter.
- [ ] Create an instructor admin panel to easily add, edit, and review quiz questions.
- [ ] Add an option to export summary sheets as downloadable PDF study guides.
