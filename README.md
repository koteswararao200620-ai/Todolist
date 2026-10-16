# Dayflow — Daily Task & Habit Tracker

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5 / CSS3](https://img.shields.io/badge/Built%20with-HTML5%20%26%20CSS3-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/)

Dayflow is a modern, distraction-free daily task and habit tracker built with zero external runtime dependencies. It combines everyday recurring habits, live completion percentages, native desktop notifications, and a Pomodoro focus timer into a single responsive dashboard.

Repository: **[koteswararao200620-ai/Todolist](https://github.com/koteswararao200620-ai/Todolist)**

---

## 💡 Why Dayflow?

Most task managers either feel bloated with unnecessary enterprise project-management features, or too basic to help you maintain consistent daily focus. Dayflow is tailored specifically for **everyday execution**:

- **Everyday Habits**: Mark tasks as recurring habits—they automatically reset each morning so you start fresh without manually recreating your routine.
- **Visual Progress Velocity**: Real-time radial completion ring and linear progress bar showing exactly where you stand throughout your day.
- **Desktop & Audio Alerts**: Timely browser desktop notifications and gentle acoustic chime reminders for scheduled tasks and focus sprints.
- **Deep Work Integration**: Integrated 25-minute Pomodoro focus timer directly linked to your chosen task.
- **Priority Views**: Toggle seamlessly between standard checklist deck and an **Eisenhower 4-Quadrant Priority Matrix**.

---

## ⌨️ Keyboard Shortcuts

Dayflow is designed with accessibility and fast keyboard navigation:

| Key | Action |
| :---: | :--- |
| `N` | Open **New Task** modal |
| `/` | Focus **Quick Add** input bar |
| `F` | Start / Pause **Pomodoro Focus Timer** |
| `T` | Toggle **Light / Dark** theme |
| `?` | Open **Keyboard Shortcuts** modal |
| `Esc` | Close any open dialog or modal |

---

## ✨ Features

- **Natural Language Quick Entry**: Type naturally like `Workout at 7am everyday (high)` or `Read chapter 3 at 8:30pm`—Dayflow automatically extracts the title, category, priority, time, and recurring status.
- **Subtask Checklists**: Decompose complex tasks into subtasks with individual progress bars.
- **Daily Rollover Engine**: At midnight, everyday recurring habits roll over for the new day while archiving yesterday's completion record.
- **7-Day Consistency Chart**: Visual bar chart tracking daily completion consistency and productivity streaks.
- **Native Notifications & Web Audio**: Uses the HTML5 `Notification` API and synthesizes gentle alert chimes using the `Web Audio API` (works 100% offline).
- **Data Portability**: One-click JSON backup and CSV daily report export.
- **Theme Support**: Seamless Dark and Light modes persisted in `localStorage`.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: Semantic HTML5, modern CSS3 (Custom Properties, Grid & Flexbox), Vanilla JavaScript (ES6+).
- **APIs**:
  - `Notification API` for desktop reminders.
  - `Web Audio API` (`AudioContext`, `OscillatorNode`, `GainNode`) for offline audio synthesis.
  - `localStorage` for client-side persistence.
- **Local Server**: Lightweight Python development server (`server.py`) for serving over `http://localhost`.

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/koteswararao200620-ai/Todolist.git
cd Todolist
```

### 2. Run the development server
```bash
python server.py
```
Your browser will open automatically at `http://localhost:8000`.

> **Note:** Desktop notifications require a secure context or `http://localhost`. Running via `server.py` ensures the browser allows notification permissions.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
