/**
 * Dayflow — Daily Task & Habit Tracker
 * 
 * An everyday productivity planner featuring:
 * - Recurring daily task engine with midnight rollover
 * - Subtasks checklist with completion percentage
 * - Native HTML5 Desktop Web Notifications & audio alerts
 * - Integrated Pomodoro focus timer
 * - Eisenhower 4-quadrant priority matrix
 * - Natural language task parser
 * - Keyboard shortcuts (N, /, F, T, Esc)
 * - Offline persistence with JSON/CSV export
 */

(function () {
  'use strict';

  // --- Constants & LocalStorage Keys ---
  const STORAGE_KEYS = {
    TASKS: 'dayflow_tasks',
    HISTORY: 'dayflow_history',
    STREAK: 'dayflow_streak',
    LAST_ACTIVE_DATE: 'dayflow_last_date',
    SETTINGS: 'dayflow_settings',
    THEME: 'dayflow_theme'
  };

  // --- Application State ---
  const state = {
    tasks: [],
    history: {},
    streak: 1,
    lastActiveDate: '',
    settings: {
      dueReminders: true,
      hourlyNudge: true,
      sound: true
    },
    activeView: 'list', // 'list' | 'matrix'
    filter: 'all',
    categoryFilter: 'all',
    priorityFilter: 'all',
    searchQuery: '',
    editingTaskId: null,
    notifiedTaskIds: new Set(),
    lastHourlyNudgeHour: -1,

    pomodoro: {
      mode: 'focus', // 'focus' (25m) | 'break' (5m)
      remaining: 25 * 60,
      isRunning: false,
      intervalId: null,
      activeTaskId: null
    }
  };

  // Starter tasks for first-time launch
  const STARTER_TASKS = [
    {
      id: 'task-1',
      title: 'Morning workout & mobility stretch',
      desc: '20-min cardio and core mobility exercises',
      category: 'Health',
      priority: 'high',
      time: '07:30',
      isRecurring: true,
      completed: true,
      createdAt: new Date().toISOString(),
      subtasks: [
        { id: 'sub-1', title: '5-min dynamic warm-up', completed: true },
        { id: 'sub-2', title: '15-min core & stretching', completed: true }
      ]
    },
    {
      id: 'task-2',
      title: 'Review emails & organize daily priority list',
      desc: 'Clear inbox and align top 3 deliverables for the day',
      category: 'Work',
      priority: 'high',
      time: '09:00',
      isRecurring: true,
      completed: true,
      createdAt: new Date().toISOString(),
      subtasks: [
        { id: 'sub-3', title: 'Triage pending messages', completed: true },
        { id: 'sub-4', title: 'Define top 3 goals', completed: true }
      ]
    },
    {
      id: 'task-3',
      title: 'Deep Work: Core project development',
      desc: 'Uninterrupted 90-minute coding and implementation block',
      category: 'Work',
      priority: 'high',
      time: '11:00',
      isRecurring: false,
      completed: false,
      createdAt: new Date().toISOString(),
      subtasks: [
        { id: 'sub-5', title: 'Implement feature requirements', completed: false },
        { id: 'sub-6', title: 'Write tests and clean up code', completed: false }
      ]
    },
    {
      id: 'task-4',
      title: 'Read 20 pages of technical book',
      desc: 'Focus on distributed systems and architectural patterns',
      category: 'Study',
      priority: 'medium',
      time: '18:30',
      isRecurring: true,
      completed: false,
      createdAt: new Date().toISOString(),
      subtasks: []
    },
    {
      id: 'task-5',
      title: 'Hydration goal: Drink 2.5L water',
      desc: 'Keep track of hydration through the day',
      category: 'Routine',
      priority: 'low',
      time: '19:00',
      isRecurring: true,
      completed: false,
      createdAt: new Date().toISOString(),
      subtasks: []
    }
  ];

  // --- DOM Elements Cache ---
  const ui = {
    liveClock: document.getElementById('liveClock'),
    liveDate: document.getElementById('liveDate'),
    notifyPermissionBtn: document.getElementById('notifyPermissionBtn'),
    notifyBtnText: document.getElementById('notifyBtnText'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeIcon: document.getElementById('themeIcon'),
    notificationBanner: document.getElementById('notificationBanner'),
    enableNotificationBannerBtn: document.getElementById('enableNotificationBannerBtn'),
    dismissBannerBtn: document.getElementById('dismissBannerBtn'),

    // View Navigation
    viewListBtn: document.getElementById('viewListBtn'),
    viewMatrixBtn: document.getElementById('viewMatrixBtn'),
    listViewContainer: document.getElementById('listViewContainer'),
    matrixViewContainer: document.getElementById('matrixViewContainer'),

    // Quick Add Bar
    quickTaskInput: document.getElementById('quickTaskInput'),
    quickTaskSubmitBtn: document.getElementById('quickTaskSubmitBtn'),
    templateChips: document.querySelectorAll('.template-chip'),

    // Progress Elements
    radialCircle: document.getElementById('radialProgressCircle'),
    progressPercentage: document.getElementById('progressPercentage'),
    statCompletedCount: document.getElementById('statCompletedCount'),
    statTotalCount: document.getElementById('statTotalCount'),
    streakCount: document.getElementById('streakCount'),
    progressMessage: document.getElementById('progressMessage'),
    linearProgressBar: document.getElementById('linearProgressBar'),
    linearPercentText: document.getElementById('linearPercentText'),

    // Pomodoro Timer
    pomodoroTimer: document.getElementById('pomodoroTimer'),
    pomodoroTaskLabel: document.getElementById('pomodoroTaskLabel'),
    pomodoroModeBadge: document.getElementById('pomodoroModeBadge'),
    pomodoroStartBtn: document.getElementById('pomodoroStartBtn'),
    pomodoroPauseBtn: document.getElementById('pomodoroPauseBtn'),
    pomodoroResetBtn: document.getElementById('pomodoroResetBtn'),
    pomodoroModeToggleBtn: document.getElementById('pomodoroModeToggleBtn'),

    // Stats Grid
    countHighPriority: document.getElementById('countHighPriority'),
    countMedPriority: document.getElementById('countMedPriority'),
    countLowPriority: document.getElementById('countLowPriority'),
    countRecurring: document.getElementById('countRecurring'),

    // Settings
    toggleDueReminders: document.getElementById('toggleDueReminders'),
    toggleHourlyNudge: document.getElementById('toggleHourlyNudge'),
    toggleSound: document.getElementById('toggleSound'),
    sendTestNotificationBtn: document.getElementById('sendTestNotificationBtn'),
    sendProgressAlertBtn: document.getElementById('sendProgressAlertBtn'),

    // Filters & Task List
    taskSearchInput: document.getElementById('taskSearchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    openAddTaskModalBtn: document.getElementById('openAddTaskModalBtn'),
    filterPills: document.querySelectorAll('.filter-pill'),
    categoryFilter: document.getElementById('categoryFilter'),
    priorityFilter: document.getElementById('priorityFilter'),
    filterAllCount: document.getElementById('filterAllCount'),
    filterActiveCount: document.getElementById('filterActiveCount'),
    filterCompletedCount: document.getElementById('filterCompletedCount'),
    filterRecurringCount: document.getElementById('filterRecurringCount'),
    taskList: document.getElementById('taskList'),
    emptyState: document.getElementById('emptyState'),
    emptyStateAddBtn: document.getElementById('emptyStateAddBtn'),
    markAllCompleteBtn: document.getElementById('markAllCompleteBtn'),
    clearCompletedBtn: document.getElementById('clearCompletedBtn'),

    // Matrix Quadrants
    matrixListQ1: document.getElementById('matrixListQ1'),
    matrixListQ2: document.getElementById('matrixListQ2'),
    matrixListQ3: document.getElementById('matrixListQ3'),
    matrixListQ4: document.getElementById('matrixListQ4'),
    countQ1: document.getElementById('countQ1'),
    countQ2: document.getElementById('countQ2'),
    countQ3: document.getElementById('countQ3'),
    countQ4: document.getElementById('countQ4'),

    // Weekly Chart
    weeklyChart: document.getElementById('weeklyChart'),

    // Modals
    taskModal: document.getElementById('taskModal'),
    modalTitle: document.getElementById('modalTitle'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelModalBtn: document.getElementById('cancelModalBtn'),
    taskForm: document.getElementById('taskForm'),
    editTaskId: document.getElementById('editTaskId'),
    taskTitleInput: document.getElementById('taskTitleInput'),
    taskDescInput: document.getElementById('taskDescInput'),
    taskCategorySelect: document.getElementById('taskCategorySelect'),
    taskPrioritySelect: document.getElementById('taskPrioritySelect'),
    taskTimeInput: document.getElementById('taskTimeInput'),
    taskRecurringInput: document.getElementById('taskRecurringInput'),
    subtaskInputsContainer: document.getElementById('subtaskInputsContainer'),
    btnAddSubtaskField: document.getElementById('btnAddSubtaskField'),

    // Insights Modal
    insightsModalBtn: document.getElementById('insightsModalBtn'),
    aiCoachModal: document.getElementById('aiCoachModal'),
    closeAiCoachBtn: document.getElementById('closeAiCoachBtn'),
    dismissAiCoachBtn: document.getElementById('dismissAiCoachBtn'),
    refreshAiBriefingBtn: document.getElementById('refreshAiBriefingBtn'),
    aiBriefingContent: document.getElementById('aiBriefingContent'),
    aiBriefingTimestamp: document.getElementById('aiBriefingTimestamp'),
    templateCards: document.querySelectorAll('.template-card'),

    // Shortcuts Modal
    shortcutsBtn: document.getElementById('shortcutsBtn'),
    shortcutsModal: document.getElementById('shortcutsModal'),
    closeShortcutsBtn: document.getElementById('closeShortcutsBtn'),

    // Export Modal
    exportDataBtn: document.getElementById('exportDataBtn'),
    exportModal: document.getElementById('exportModal'),
    closeExportBtn: document.getElementById('closeExportBtn'),
    downloadJsonBtn: document.getElementById('downloadJsonBtn'),
    downloadCsvBtn: document.getElementById('downloadCsvBtn'),

    toastContainer: document.getElementById('toastContainer')
  };

  // --- Audio Synthesis via Web Audio API ---
  let audioContext = null;

  function initAudioContext() {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audioContext = new AudioCtx();
    }
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
    return audioContext;
  }

  function playSound(type = 'default') {
    if (!state.settings.sound) return;
    try {
      const ctx = initAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'complete') {
        // High pleasant bell
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, t); // D5
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.12); // A5
        gain.gain.setValueAtTime(0.16, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.start(t);
        osc.stop(t + 0.4);
      } else if (type === 'celebrate') {
        // Arpeggiated chord
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'triangle';
          o.frequency.value = freq;
          o.connect(g);
          g.connect(ctx.destination);
          const start = t + i * 0.08;
          g.gain.setValueAtTime(0.12, start);
          g.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
          o.start(start);
          o.stop(start + 0.35);
        });
      } else if (type === 'alert') {
        // Timer alarm tone
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.exponentialRampToValueAtTime(1174.66, t + 0.2);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
        osc.start(t);
        osc.stop(t + 0.55);
      } else {
        // Subtle click/chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(659.25, t + 0.1);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.start(t);
        osc.stop(t + 0.35);
      }
    } catch (err) {
      console.warn('Audio tone could not be played:', err);
    }
  }

  // --- Notification Engine ---
  function getNotificationPermission() {
    return 'Notification' in window ? Notification.permission : 'unsupported';
  }

  function updateNotificationStatus() {
    const perm = getNotificationPermission();
    if (perm === 'granted') {
      ui.notifyBtnText.textContent = 'Active';
      ui.notifyPermissionBtn.classList.remove('btn-subtle');
      ui.notifyPermissionBtn.classList.add('btn-outline');
      ui.notifyPermissionBtn.style.color = 'var(--success)';
      ui.notifyPermissionBtn.style.borderColor = 'var(--success)';
      ui.notificationBanner.classList.add('hidden');
    } else if (perm === 'denied') {
      ui.notifyBtnText.textContent = 'Blocked';
      ui.notificationBanner.classList.remove('hidden');
      document.getElementById('bannerTitle').textContent = 'Notifications blocked';
      document.getElementById('bannerDesc').textContent = 'Enable notifications in your browser settings to receive scheduled reminders.';
      ui.enableNotificationBannerBtn.classList.add('hidden');
    } else {
      ui.notifyBtnText.textContent = 'Notifications';
      ui.notificationBanner.classList.remove('hidden');
      ui.enableNotificationBannerBtn.classList.remove('hidden');
    }
  }

  async function requestNotifications() {
    if (!('Notification' in window)) {
      notifyToast('Notice', 'Desktop notifications are not supported in this browser.', 'ℹ️');
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      updateNotificationStatus();
      if (permission === 'granted') {
        playSound('celebrate');
        notifyToast('Notifications Enabled', 'You will receive reminders for scheduled tasks and daily progress.', '🔔');
        sendDesktopAlert('Dayflow Reminders Active', {
          body: 'Scheduled task alerts and daily progress updates are now configured.'
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  function sendDesktopAlert(title, options = {}) {
    if (getNotificationPermission() === 'granted') {
      try {
        const n = new Notification(title, {
          icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="%234f46e5"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>',
          tag: options.tag || 'dayflow-' + Date.now(),
          ...options
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      } catch (err) {
        console.warn('Native notification failed:', err);
      }
    }
  }

  function notifyToast(title, message, icon = '🔔', timeoutMs = 4000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <div class="toast-body">
        <div class="toast-title">${escapeHTML(title)}</div>
        <div class="toast-msg">${escapeHTML(message)}</div>
      </div>
      <button class="toast-close" aria-label="Dismiss">✕</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      dismissToast(toast);
    });

    ui.toastContainer.appendChild(toast);
    setTimeout(() => dismissToast(toast), timeoutMs);
  }

  function dismissToast(el) {
    if (el.classList.contains('toast-leave')) return;
    el.classList.add('toast-leave');
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 220);
  }

  // --- Natural Language Task Parser ---
  function parseQuickTask(input) {
    let text = input.trim();
    let category = 'Work';
    let priority = 'medium';
    let time = '';
    let isRecurring = false;

    // Detect everyday recurring
    if (/\b(everyday|daily|every day|each day)\b/i.test(text)) {
      isRecurring = true;
      text = text.replace(/\b(everyday|daily|every day|each day)\b/gi, '').trim();
    }

    // Detect Priority
    if (/\b(urgent|critical|high priority|high|p1)\b/i.test(text)) {
      priority = 'high';
      text = text.replace(/\b(urgent|critical|high priority|high|p1)\b/gi, '').trim();
    } else if (/\b(low priority|low|p3)\b/i.test(text)) {
      priority = 'low';
      text = text.replace(/\b(low priority|low|p3)\b/gi, '').trim();
    }

    // Detect Time (e.g. at 7am, 07:30 PM, 15:00)
    const timeRegex = /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;
    const match = text.match(timeRegex);
    if (match) {
      let h = parseInt(match[1], 10);
      let m = match[2] ? parseInt(match[2], 10) : 0;
      const ampm = match[3] ? match[3].toLowerCase() : null;

      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;

      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        text = text.replace(match[0], '').trim();
      }
    }

    // Detect Category
    if (/\b(workout|gym|run|walk|exercise|water|diet|cardio|health)\b/i.test(text)) {
      category = 'Health';
    } else if (/\b(study|read|book|course|learn|algorithm|notes)\b/i.test(text)) {
      category = 'Study';
    } else if (/\b(grocery|groceries|home|clean|chores|call|personal)\b/i.test(text)) {
      category = 'Personal';
    } else if (/\b(routine|wake up|sleep|hydrate|stretch|journal)\b/i.test(text)) {
      category = 'Routine';
    }

    text = text.replace(/^(to\s+|for\s+)/i, '').trim();

    return {
      title: text || 'New Task',
      category,
      priority,
      time,
      isRecurring
    };
  }

  // --- Smart Subtask Decomposition ---
  function decomposeTask(title) {
    const q = title.toLowerCase();

    if (q.includes('workout') || q.includes('cardio') || q.includes('gym')) {
      return [
        { id: 'sub-' + Date.now() + '-1', title: '5-minute dynamic warm-up', completed: false },
        { id: 'sub-' + Date.now() + '-2', title: 'Main training session (20 mins)', completed: false },
        { id: 'sub-' + Date.now() + '-3', title: 'Cool-down stretch & hydrate', completed: false }
      ];
    }

    if (q.includes('read') || q.includes('book') || q.includes('study')) {
      return [
        { id: 'sub-' + Date.now() + '-1', title: 'Review key takeaways from yesterday', completed: false },
        { id: 'sub-' + Date.now() + '-2', title: 'Focused reading block', completed: false },
        { id: 'sub-' + Date.now() + '-3', title: 'Jot down 2-3 action notes', completed: false }
      ];
    }

    if (q.includes('code') || q.includes('feature') || q.includes('pr') || q.includes('develop')) {
      return [
        { id: 'sub-' + Date.now() + '-1', title: 'Inspect requirements & edge cases', completed: false },
        { id: 'sub-' + Date.now() + '-2', title: 'Implement feature changes', completed: false },
        { id: 'sub-' + Date.now() + '-3', title: 'Run test suite and verify build', completed: false }
      ];
    }

    if (q.includes('email') || q.includes('inbox')) {
      return [
        { id: 'sub-' + Date.now() + '-1', title: 'Archive newsletters and notifications', completed: false },
        { id: 'sub-' + Date.now() + '-2', title: 'Reply to urgent inquiries', completed: false },
        { id: 'sub-' + Date.now() + '-3', title: 'Schedule follow-up items', completed: false }
      ];
    }

    return [
      { id: 'sub-' + Date.now() + '-1', title: `Prepare goals for "${title}"`, completed: false },
      { id: 'sub-' + Date.now() + '-2', title: 'Execute primary milestone', completed: false },
      { id: 'sub-' + Date.now() + '-3', title: 'Review and confirm completion', completed: false }
    ];
  }

  // --- Daily Rollover & History Engine ---
  function getTodayKey() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function handleDailyRollover() {
    const today = getTodayKey();
    if (!state.lastActiveDate) {
      state.lastActiveDate = today;
      persistState();
      return;
    }

    if (state.lastActiveDate !== today) {
      const total = state.tasks.length;
      const completed = state.tasks.filter(t => t.completed).length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Save yesterday in history
      state.history[state.lastActiveDate] = { total, completed, pct };

      // Update streak
      if (pct >= 50) {
        state.streak = (state.streak || 0) + 1;
      } else {
        state.streak = 1;
      }

      // Reset everyday recurring tasks and uncheck subtasks
      state.tasks = state.tasks
        .filter(t => t.isRecurring || !t.completed)
        .map(t => {
          if (t.isRecurring) {
            const resetSubs = (t.subtasks || []).map(s => ({ ...s, completed: false }));
            return { ...t, completed: false, subtasks: resetSubs };
          }
          return t;
        });

      state.lastActiveDate = today;
      state.notifiedTaskIds.clear();
      persistState();

      notifyToast('Good Morning! ☀️', 'Everyday tasks have rolled over for today.', '🌅');
      sendDesktopAlert('Dayflow: Everyday Tasks Ready', {
        body: `You have ${state.tasks.length} tasks ready for today. Current streak: ${state.streak} days.`
      });
    }
  }

  // --- Persistence ---
  function loadPersistedState() {
    try {
      const storedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
      const storedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
      const storedStreak = localStorage.getItem(STORAGE_KEYS.STREAK);
      const storedDate = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE_DATE);
      const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME);

      if (storedTasks) state.tasks = JSON.parse(storedTasks);
      else state.tasks = [...STARTER_TASKS];

      if (storedHistory) state.history = JSON.parse(storedHistory);
      if (storedStreak) state.streak = parseInt(storedStreak, 10) || 1;
      if (storedDate) state.lastActiveDate = storedDate;
      if (storedSettings) state.settings = { ...state.settings, ...JSON.parse(storedSettings) };

      if (storedTheme) {
        applyTheme(storedTheme);
      } else {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'dark' : 'light');
      }

      handleDailyRollover();
    } catch (err) {
      console.error('Error loading state:', err);
      state.tasks = [...STARTER_TASKS];
    }
  }

  function persistState() {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(state.tasks));
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(state.history));
      localStorage.setItem(STORAGE_KEYS.STREAK, state.streak.toString());
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_DATE, state.lastActiveDate || getTodayKey());
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
    } catch (err) {
      console.error('Error saving state:', err);
    }
  }

  // --- Calculations & UI Updates ---
  function computeProgress() {
    const total = state.tasks.length;
    const completed = state.tasks.filter(t => t.completed).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, remaining: total - completed, percentage };
  }

  function refreshProgress() {
    const { total, completed, remaining, percentage } = computeProgress();

    // Radial Progress (r=58, circumference=364.42)
    const circumference = 2 * Math.PI * 58;
    const offset = circumference - (percentage / 100) * circumference;
    ui.radialCircle.style.strokeDashoffset = offset;

    if (percentage === 100 && total > 0) {
      ui.radialCircle.style.stroke = 'var(--success)';
    } else if (percentage >= 50) {
      ui.radialCircle.style.stroke = 'var(--brand)';
    } else if (percentage > 0) {
      ui.radialCircle.style.stroke = 'var(--warning)';
    } else {
      ui.radialCircle.style.stroke = 'var(--border-light)';
    }

    ui.progressPercentage.textContent = `${percentage}%`;
    ui.statCompletedCount.textContent = completed;
    ui.statTotalCount.textContent = total;
    ui.streakCount.textContent = state.streak;

    // Linear bar
    ui.linearProgressBar.style.width = `${percentage}%`;
    ui.linearPercentText.textContent = `${percentage}% (${completed}/${total})`;

    // Status Banner Cue
    const banner = ui.progressMessage;
    banner.className = 'status-banner';
    if (total === 0) {
      banner.classList.add('info');
      banner.textContent = 'All clear. Add everyday tasks or pick a habit template!';
    } else if (percentage === 0) {
      banner.classList.add('info');
      banner.textContent = `0 of ${total} tasks completed. Pick your first goal to get started! 🚀`;
    } else if (percentage < 50) {
      banner.classList.add('warn');
      banner.textContent = `Steady progress! ${completed} finished, ${remaining} remaining.`;
    } else if (percentage < 100) {
      banner.classList.add('info');
      banner.textContent = `Over halfway there! ${percentage}% completed. Keep going!`;
    } else {
      banner.classList.add('success');
      banner.textContent = `🎉 All ${total} tasks finished today! Great job!`;
    }

    // Counts by priority & recurring
    let high = 0, med = 0, low = 0, recurring = 0;
    state.tasks.forEach(t => {
      if (t.priority === 'high') high++;
      else if (t.priority === 'medium') med++;
      else if (t.priority === 'low') low++;
      if (t.isRecurring) recurring++;
    });

    ui.countHighPriority.textContent = high;
    ui.countMedPriority.textContent = med;
    ui.countLowPriority.textContent = low;
    ui.countRecurring.textContent = recurring;

    // Filter pill numbers
    ui.filterAllCount.textContent = total;
    ui.filterActiveCount.textContent = remaining;
    ui.filterCompletedCount.textContent = completed;
    ui.filterRecurringCount.textContent = recurring;

    // Cache today in history
    state.history[getTodayKey()] = { total, completed, pct: percentage };

    renderWeeklyHistory();
    renderEisenhowerMatrix();
  }

  function renderWeeklyHistory() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    ui.weeklyChart.innerHTML = '';

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${dayNum}`;

      const dayName = days[d.getDay()];
      const isToday = i === 0;

      const record = state.history[key];
      const pct = record ? record.pct : (isToday ? computeProgress().percentage : 0);

      let color = 'low';
      if (pct >= 80) color = 'high';
      else if (pct >= 50) color = 'medium';

      const col = document.createElement('div');
      col.className = 'chart-col';
      col.innerHTML = `
        <span class="chart-pct">${pct}%</span>
        <div class="chart-slot" title="${key}: ${pct}% completed">
          <div class="chart-bar ${color} ${isToday ? 'is-today' : ''}" style="height: ${Math.max(pct, 5)}%"></div>
        </div>
        <span class="chart-col-label ${isToday ? 'is-today' : ''}">${dayName}</span>
      `;
      ui.weeklyChart.appendChild(col);
    }
  }

  // --- Task Deck & Rendering ---
  function getFilteredTaskList() {
    return state.tasks.filter(t => {
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchNotes = t.desc && t.desc.toLowerCase().includes(q);
        const matchCat = t.category.toLowerCase().includes(q);
        if (!matchTitle && !matchNotes && !matchCat) return false;
      }
      if (state.filter === 'active' && t.completed) return false;
      if (state.filter === 'completed' && !t.completed) return false;
      if (state.filter === 'recurring' && !t.isRecurring) return false;
      if (state.categoryFilter !== 'all' && t.category !== state.categoryFilter) return false;
      if (state.priorityFilter !== 'all' && t.priority !== state.priorityFilter) return false;
      return true;
    });
  }

  function renderTasks() {
    const list = getFilteredTaskList();
    ui.taskList.innerHTML = '';

    if (list.length === 0) {
      ui.emptyState.classList.remove('hidden');
    } else {
      ui.emptyState.classList.add('hidden');

      list.forEach(task => {
        const item = document.createElement('div');
        item.className = `task-item priority-${task.priority} ${task.completed ? 'is-done' : ''}`;
        item.setAttribute('data-id', task.id);

        const subtasks = task.subtasks || [];
        const completedSubs = subtasks.filter(s => s.completed).length;
        const subPct = subtasks.length > 0 ? Math.round((completedSubs / subtasks.length) * 100) : 0;

        item.innerHTML = `
          <div class="task-main-row">
            <div class="task-identity">
              <label class="task-checkbox-wrap" title="${task.completed ? 'Mark incomplete' : 'Mark complete'}">
                <input type="checkbox" class="task-check-input" ${task.completed ? 'checked' : ''}>
                <span class="checkbox-custom">✓</span>
              </label>

              <div class="task-body">
                <div class="task-title">${escapeHTML(task.title)}</div>
                ${task.desc ? `<div class="task-notes">${escapeHTML(task.desc)}</div>` : ''}

                <div class="task-tags">
                  <span class="tag-badge">${escapeHTML(task.category)}</span>
                  <span class="tag-badge priority-${task.priority}">${task.priority.toUpperCase()}</span>
                  ${task.isRecurring ? '<span class="tag-badge routine" title="Everyday Habit">🔄 Everyday</span>' : ''}
                  ${task.time ? `<span class="tag-badge time">⏰ ${formatDisplayTime(task.time)}</span>` : ''}
                </div>
              </div>
            </div>

            <div class="task-actions-wrap">
              <button class="btn-task-tool btn-focus-link" title="Focus session on this task">🎯</button>
              <button class="btn-task-tool btn-edit-task" title="Edit task">✏️</button>
              <button class="btn-task-tool danger btn-delete-task" title="Delete task">🗑️</button>
            </div>
          </div>

          <!-- Subtasks Checklist -->
          <div class="task-checklist-block">
            <div class="checklist-header">
              <span>Checklist (${completedSubs}/${subtasks.length})</span>
              ${subtasks.length > 0 ? `
                <div class="checklist-meter-track">
                  <div class="checklist-meter-fill" style="width: ${subPct}%"></div>
                </div>
              ` : ''}
            </div>

            <div class="checklist-items">
              ${subtasks.map(s => `
                <label class="checklist-item ${s.completed ? 'done' : ''}">
                  <input type="checkbox" class="checklist-check" data-sub-id="${s.id}" ${s.completed ? 'checked' : ''}>
                  <span>${escapeHTML(s.title)}</span>
                </label>
              `).join('')}
            </div>

            ${subtasks.length === 0 ? `
              <button class="btn-ai-decompose" data-task-id="${task.id}">
                ⚡ Generate subtasks
              </button>
            ` : ''}
          </div>
        `;

        // Checkbox events
        item.querySelector('.task-check-input').addEventListener('change', (e) => {
          toggleTask(task.id, e.target.checked);
        });

        // Subtask checks
        item.querySelectorAll('.checklist-check').forEach(chk => {
          chk.addEventListener('change', (e) => {
            const subId = e.target.getAttribute('data-sub-id');
            toggleSubtask(task.id, subId, e.target.checked);
          });
        });

        // Decompose button
        const decomposeBtn = item.querySelector('.btn-ai-decompose');
        if (decomposeBtn) {
          decomposeBtn.addEventListener('click', () => {
            const subs = decomposeTask(task.title);
            task.subtasks = subs;
            persistState();
            renderTasks();
            playSound('complete');
            notifyToast('Subtasks Created', `Added ${subs.length} steps to "${task.title}".`, '⚡');
          });
        }

        // Pomodoro focus link
        item.querySelector('.btn-focus-link').addEventListener('click', () => {
          state.pomodoro.activeTaskId = task.id;
          ui.pomodoroTaskLabel.textContent = `Task: ${task.title}`;
          notifyToast('Focus Linked', `Session focused on: "${task.title}".`, '🎯');
        });

        item.querySelector('.btn-edit-task').addEventListener('click', () => openEditDialog(task.id));
        item.querySelector('.btn-delete-task').addEventListener('click', () => removeTask(task.id));

        ui.taskList.appendChild(item);
      });
    }

    refreshProgress();
  }

  // --- Eisenhower Matrix View ---
  function renderEisenhowerMatrix() {
    ui.matrixListQ1.innerHTML = '';
    ui.matrixListQ2.innerHTML = '';
    ui.matrixListQ3.innerHTML = '';
    ui.matrixListQ4.innerHTML = '';

    let q1 = 0, q2 = 0, q3 = 0, q4 = 0;

    state.tasks.forEach(t => {
      const entry = document.createElement('div');
      entry.className = `matrix-entry ${t.completed ? 'done' : ''}`;
      entry.innerHTML = `
        <span>${escapeHTML(t.title)}</span>
        <span class="tag-badge">${t.isRecurring ? '🔄' : ''} ${t.time ? formatDisplayTime(t.time) : ''}</span>
      `;

      if (t.priority === 'high') {
        q1++;
        ui.matrixListQ1.appendChild(entry);
      } else if (t.isRecurring || t.priority === 'medium') {
        q2++;
        ui.matrixListQ2.appendChild(entry);
      } else if (t.time) {
        q3++;
        ui.matrixListQ3.appendChild(entry);
      } else {
        q4++;
        ui.matrixListQ4.appendChild(entry);
      }
    });

    ui.countQ1.textContent = q1;
    ui.countQ2.textContent = q2;
    ui.countQ3.textContent = q3;
    ui.countQ4.textContent = q4;
  }

  // --- Task CRUD Operations ---
  function toggleTask(id, done) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = done;
    if (task.subtasks) {
      task.subtasks.forEach(s => s.completed = done);
    }
    persistState();

    if (done) {
      playSound('complete');
      const { total, percentage } = computeProgress();
      if (percentage === 100) {
        playSound('celebrate');
        notifyToast('All Goals Completed! 🏆', `You completed all ${total} tasks for today!`, '🎉');
        sendDesktopAlert('100% Everyday Tasks Completed! 🏆', {
          body: `All ${total} tasks are complete. Fantastic work today!`
        });
      } else {
        notifyToast('Task Done', `"${task.title}" is complete.`, '✓');
      }
    }

    renderTasks();
  }

  function toggleSubtask(taskId, subId, done) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks) return;

    const sub = task.subtasks.find(s => s.id === subId);
    if (sub) sub.completed = done;

    const allFinished = task.subtasks.length > 0 && task.subtasks.every(s => s.completed);
    if (allFinished && !task.completed) {
      task.completed = true;
      playSound('complete');
    } else if (!allFinished && task.completed) {
      task.completed = false;
    }

    persistState();
    renderTasks();
  }

  function removeTask(id) {
    const task = state.tasks.find(t => t.id === id);
    const title = task ? task.title : 'Task';
    state.tasks = state.tasks.filter(t => t.id !== id);
    persistState();
    renderTasks();
    notifyToast('Deleted', `"${title}" removed.`, '🗑️');
  }

  function markAllDone() {
    if (state.tasks.length === 0) return;
    state.tasks.forEach(t => {
      t.completed = true;
      if (t.subtasks) t.subtasks.forEach(s => s.completed = true);
    });
    persistState();
    renderTasks();
    playSound('celebrate');
    notifyToast('Complete', 'All tasks marked done.', '🏆');
  }

  function clearDone() {
    const doneCount = state.tasks.filter(t => t.completed).length;
    if (doneCount === 0) return;

    state.tasks = state.tasks.filter(t => !t.completed || t.isRecurring);
    state.tasks.forEach(t => {
      if (t.isRecurring && t.completed) {
        t.completed = false;
        if (t.subtasks) t.subtasks.forEach(s => s.completed = false);
      }
    });

    persistState();
    renderTasks();
    notifyToast('Cleared', `Reset or removed ${doneCount} completed tasks.`, '🧹');
  }

  // --- Add/Edit Dialog ---
  function openAddDialog() {
    state.editingTaskId = null;
    ui.modalTitle.textContent = 'New Task';
    ui.taskForm.reset();
    ui.editTaskId.value = '';
    ui.taskPrioritySelect.value = 'medium';
    ui.taskCategorySelect.value = 'Work';
    ui.taskRecurringInput.checked = true;
    ui.subtaskInputsContainer.innerHTML = '';
    ui.taskModal.classList.remove('hidden');
    setTimeout(() => ui.taskTitleInput.focus(), 60);
  }

  function openEditDialog(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;

    state.editingTaskId = id;
    ui.modalTitle.textContent = 'Edit Task';
    ui.editTaskId.value = task.id;
    ui.taskTitleInput.value = task.title;
    ui.taskDescInput.value = task.desc || '';
    ui.taskCategorySelect.value = task.category;
    ui.taskPrioritySelect.value = task.priority;
    ui.taskTimeInput.value = task.time || '';
    ui.taskRecurringInput.checked = !!task.isRecurring;

    ui.subtaskInputsContainer.innerHTML = '';
    (task.subtasks || []).forEach(s => addSubtaskField(s.title));

    ui.taskModal.classList.remove('hidden');
    setTimeout(() => ui.taskTitleInput.focus(), 60);
  }

  function closeDialogs() {
    ui.taskModal.classList.add('hidden');
    ui.aiCoachModal.classList.add('hidden');
    ui.shortcutsModal.classList.add('hidden');
    ui.exportModal.classList.add('hidden');
    state.editingTaskId = null;
    ui.taskForm.reset();
  }

  function addSubtaskField(val = '') {
    const row = document.createElement('div');
    row.className = 'subtask-row';
    row.innerHTML = `
      <input type="text" class="field-input subtask-field" placeholder="Step milestone..." value="${escapeHTML(val)}">
      <button type="button" class="btn-del-sub" aria-label="Remove step">✕</button>
    `;
    row.querySelector('.btn-del-sub').addEventListener('click', () => row.remove());
    ui.subtaskInputsContainer.appendChild(row);
  }

  function handleTaskForm(e) {
    e.preventDefault();
    const title = ui.taskTitleInput.value.trim();
    if (!title) return;

    const desc = ui.taskDescInput.value.trim();
    const category = ui.taskCategorySelect.value;
    const priority = ui.taskPrioritySelect.value;
    const time = ui.taskTimeInput.value;
    const isRecurring = ui.taskRecurringInput.checked;

    const subInputs = ui.subtaskInputsContainer.querySelectorAll('.subtask-field');
    const subtasks = [];
    subInputs.forEach((inp, idx) => {
      const v = inp.value.trim();
      if (v) {
        subtasks.push({
          id: 'sub-' + Date.now() + '-' + idx,
          title: v,
          completed: false
        });
      }
    });

    if (state.editingTaskId) {
      const idx = state.tasks.findIndex(t => t.id === state.editingTaskId);
      if (idx !== -1) {
        state.tasks[idx] = {
          ...state.tasks[idx],
          title,
          desc,
          category,
          priority,
          time,
          isRecurring,
          subtasks: subtasks.length > 0 ? subtasks : (state.tasks[idx].subtasks || [])
        };
        notifyToast('Updated', `"${title}" has been saved.`, '✏️');
      }
    } else {
      const newTask = {
        id: 'task-' + Date.now(),
        title,
        desc,
        category,
        priority,
        time,
        isRecurring,
        completed: false,
        subtasks,
        createdAt: new Date().toISOString()
      };
      state.tasks.unshift(newTask);
      notifyToast('Added', `"${title}" added to today's goals.`, '✨');
    }

    persistState();
    closeDialogs();
    renderTasks();
  }

  // --- Pomodoro Focus Timer ---
  function updateTimerDisplay() {
    const mins = Math.floor(state.pomodoro.remaining / 60);
    const secs = state.pomodoro.remaining % 60;
    ui.pomodoroTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function startTimer() {
    if (state.pomodoro.isRunning) return;
    state.pomodoro.isRunning = true;
    ui.pomodoroStartBtn.classList.add('hidden');
    ui.pomodoroPauseBtn.classList.remove('hidden');

    state.pomodoro.intervalId = setInterval(() => {
      if (state.pomodoro.remaining > 0) {
        state.pomodoro.remaining--;
        updateTimerDisplay();
      } else {
        clearInterval(state.pomodoro.intervalId);
        state.pomodoro.isRunning = false;
        ui.pomodoroStartBtn.classList.remove('hidden');
        ui.pomodoroPauseBtn.classList.add('hidden');

        playSound('alert');
        const isFocus = state.pomodoro.mode === 'focus';
        const msg = isFocus
          ? 'Pomodoro focus sprint finished! Time for a 5-minute break.'
          : 'Break finished! Ready to begin your next focus block.';

        notifyToast(isFocus ? 'Focus Block Done' : 'Break Done', msg, '⏱️', 6000);
        sendDesktopAlert(isFocus ? '🎯 Focus Session Finished' : '☕ Break Finished', { body: msg });

        toggleTimerMode();
      }
    }, 1000);
  }

  function pauseTimer() {
    if (!state.pomodoro.isRunning) return;
    clearInterval(state.pomodoro.intervalId);
    state.pomodoro.isRunning = false;
    ui.pomodoroStartBtn.classList.remove('hidden');
    ui.pomodoroPauseBtn.classList.add('hidden');
  }

  function resetTimer() {
    pauseTimer();
    state.pomodoro.remaining = state.pomodoro.mode === 'focus' ? 25 * 60 : 5 * 60;
    updateTimerDisplay();
  }

  function toggleTimerMode() {
    pauseTimer();
    if (state.pomodoro.mode === 'focus') {
      state.pomodoro.mode = 'break';
      state.pomodoro.remaining = 5 * 60;
      ui.pomodoroModeBadge.textContent = 'BREAK';
      ui.pomodoroModeBadge.className = 'pill pill-break';
      ui.pomodoroModeToggleBtn.textContent = 'Focus';
    } else {
      state.pomodoro.mode = 'focus';
      state.pomodoro.remaining = 25 * 60;
      ui.pomodoroModeBadge.textContent = 'FOCUS';
      ui.pomodoroModeBadge.className = 'pill pill-focus';
      ui.pomodoroModeToggleBtn.textContent = 'Break';
    }
    updateTimerDisplay();
  }

  // --- Scheduled Reminder Checks ---
  function checkReminders() {
    const now = new Date();
    const curH = String(now.getHours()).padStart(2, '0');
    const curM = String(now.getMinutes()).padStart(2, '0');
    const curTime = `${curH}:${curM}`;
    const today = getTodayKey();

    if (state.settings.dueReminders) {
      state.tasks.forEach(t => {
        if (!t.completed && t.time === curTime) {
          const key = `${today}-${t.id}-${t.time}`;
          if (!state.notifiedTaskIds.has(key)) {
            state.notifiedTaskIds.add(key);
            playSound('default');
            notifyToast('Task Reminder ⏰', `Time for: "${t.title}"`, '🔔', 7000);
            sendDesktopAlert(`Task Reminder: ${t.title}`, {
              body: t.desc ? `${t.desc} (${t.category})` : `Priority: ${t.priority.toUpperCase()} • ${t.category}`,
              tag: key
            });
          }
        }
      });
    }

    if (state.settings.hourlyNudge) {
      const h = now.getHours();
      if (now.getMinutes() === 0 && h >= 9 && h <= 21 && state.lastHourlyNudgeHour !== h) {
        state.lastHourlyNudgeHour = h;
        sendProgressSummaryAlert();
      }
    }
  }

  function sendProgressSummaryAlert() {
    const { total, completed, remaining, percentage } = computeProgress();
    playSound('default');
    const msg = percentage === 100
      ? `🎉 All ${total} everyday tasks completed!`
      : `You've completed ${percentage}% (${completed}/${total} tasks). ${remaining} remaining today.`;

    notifyToast(`Progress Update: ${percentage}%`, msg, '📊');
    sendDesktopAlert(`Dayflow: ${percentage}% Completed`, {
      body: msg,
      tag: 'dayflow-progress-nudge'
    });
  }

  // --- Assessment & Habit Templates ---
  function updateAssessment() {
    const { total, completed, remaining, percentage } = computeProgress();
    const highPending = state.tasks.filter(t => !t.completed && t.priority === 'high');

    let text = '';
    if (total === 0) {
      text = 'Your schedule is currently clear. Add tasks above or choose one of the proven everyday habit routines below to jumpstart your day.';
    } else if (percentage === 100) {
      text = `Outstanding execution! You've accomplished 100% of your goals for today (${completed} tasks). Your streak is at 🔥 ${state.streak} days.`;
    } else if (highPending.length > 0) {
      text = `You have completed ${percentage}% of today's workload (${completed}/${total}). Your primary high-priority goal is <strong>"${escapeHTML(highPending[0].title)}"</strong>. Start a 25-minute focus session to knock it out.`;
    } else if (percentage >= 50) {
      text = `Solid momentum! Over halfway through (${percentage}% completed). With ${remaining} tasks left, finish off your everyday habits to maintain your streak.`;
    } else {
      text = `You are at ${percentage}% completion. Pick the single quickest task first to build momentum and get into flow.`;
    }

    ui.aiBriefingContent.innerHTML = text;
    ui.aiBriefingTimestamp.textContent = `Evaluated at ${new Date().toLocaleTimeString()} based on ${total} goals`;
  }

  function applyHabitPreset(preset) {
    const sets = {
      developer: [
        { title: 'Morning Code & PR Review', category: 'Work', priority: 'high', time: '09:30', isRecurring: true },
        { title: 'Deep Work: Core implementation block', category: 'Work', priority: 'high', time: '11:00', isRecurring: true },
        { title: 'Read 20 pages: System Architecture', category: 'Study', priority: 'medium', time: '18:00', isRecurring: true },
        { title: 'Hydration & Posture Break', category: 'Health', priority: 'low', time: '15:00', isRecurring: true }
      ],
      student: [
        { title: 'Spaced Repetition & Flashcards', category: 'Study', priority: 'high', time: '08:30', isRecurring: true },
        { title: 'Problem sets & lecture assignments', category: 'Study', priority: 'high', time: '14:00', isRecurring: true },
        { title: '30-minute cardio / brisk walk', category: 'Health', priority: 'medium', time: '17:30', isRecurring: true },
        { title: 'Plan tomorrow\'s study schedule', category: 'Routine', priority: 'low', time: '21:00', isRecurring: true }
      ],
      fitness: [
        { title: 'Morning 30-min Cardio & Stretch', category: 'Health', priority: 'high', time: '07:00', isRecurring: true },
        { title: 'Prep balanced high-protein lunch', category: 'Health', priority: 'medium', time: '12:30', isRecurring: true },
        { title: 'Drink 2.5L Water throughout day', category: 'Routine', priority: 'high', time: '16:00', isRecurring: true },
        { title: 'Evening mobility & wind-down', category: 'Health', priority: 'low', time: '21:30', isRecurring: true }
      ],
      productivity: [
        { title: 'Select Top 3 Must-Win Goals', category: 'Work', priority: 'high', time: '09:00', isRecurring: true },
        { title: 'Uninterrupted 90-min Deep Work sprint', category: 'Work', priority: 'high', time: '10:00', isRecurring: true },
        { title: 'Inbox zero and correspondence batch', category: 'Work', priority: 'medium', time: '16:30', isRecurring: true },
        { title: 'Daily wins journal & reflection', category: 'Routine', priority: 'low', time: '20:30', isRecurring: true }
      ]
    };

    const chosen = sets[preset] || [];
    chosen.forEach(item => {
      state.tasks.unshift({
        id: 'task-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        title: item.title,
        desc: 'Everyday routine template',
        category: item.category,
        priority: item.priority,
        time: item.time,
        isRecurring: item.isRecurring,
        completed: false,
        subtasks: decomposeTask(item.title),
        createdAt: new Date().toISOString()
      });
    });

    persistState();
    renderTasks();
    ui.aiCoachModal.classList.add('hidden');
    playSound('celebrate');
    notifyToast('Habits Added', `Added ${chosen.length} everyday goals to your schedule.`, '🚀');
  }

  // --- Export Data ---
  function exportJson() {
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const a = document.createElement('a');
    a.href = jsonStr;
    a.download = `dayflow_backup_${getTodayKey()}.json`;
    a.click();
    notifyToast('Exported', 'JSON backup file downloaded.', '📥');
  }

  function exportCsv() {
    let csv = "ID,Title,Category,Priority,ScheduledTime,EverydayRecurring,Completed,SubtasksCount\n";
    state.tasks.forEach(t => {
      const escTitle = `"${(t.title || '').replace(/"/g, '""')}"`;
      csv += `${t.id},${escTitle},${t.category},${t.priority},${t.time || ''},${t.isRecurring ? 'Yes' : 'No'},${t.completed ? 'Yes' : 'No'},${(t.subtasks || []).length}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dayflow_tasks_${getTodayKey()}.csv`;
    a.click();
    notifyToast('Exported', 'CSV report file downloaded.', '📊');
  }

  // --- Theme & Helpers ---
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.remove('theme-light');
      document.body.classList.add('theme-dark');
      ui.themeIcon.textContent = '☀️';
      localStorage.setItem(STORAGE_KEYS.THEME, 'dark');
    } else {
      document.body.classList.remove('theme-dark');
      document.body.classList.add('theme-light');
      ui.themeIcon.textContent = '🌙';
      localStorage.setItem(STORAGE_KEYS.THEME, 'light');
    }
  }

  function toggleTheme() {
    const isDark = document.body.classList.contains('theme-dark');
    applyTheme(isDark ? 'light' : 'dark');
  }

  function updateClock() {
    const now = new Date();
    ui.liveClock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    ui.liveDate.textContent = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatDisplayTime(str) {
    if (!str) return '';
    const [h, m] = str.split(':');
    let hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${m} ${ampm}`;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Keyboard Shortcuts & Event Listeners ---
  function bindEvents() {
    // Navigation Views
    ui.viewListBtn.addEventListener('click', () => {
      ui.viewListBtn.classList.add('active');
      ui.viewMatrixBtn.classList.remove('active');
      ui.listViewContainer.classList.remove('hidden');
      ui.matrixViewContainer.classList.add('hidden');
      state.activeView = 'list';
    });

    ui.viewMatrixBtn.addEventListener('click', () => {
      ui.viewMatrixBtn.classList.add('active');
      ui.viewListBtn.classList.remove('active');
      ui.listViewContainer.classList.add('hidden');
      ui.matrixViewContainer.classList.remove('hidden');
      state.activeView = 'matrix';
      renderEisenhowerMatrix();
    });

    // Quick Add
    function handleQuickSubmit() {
      const v = ui.quickTaskInput.value.trim();
      if (!v) return;
      const parsed = parseQuickTask(v);
      const newTask = {
        id: 'task-' + Date.now(),
        title: parsed.title,
        desc: 'Added via quick entry',
        category: parsed.category,
        priority: parsed.priority,
        time: parsed.time,
        isRecurring: parsed.isRecurring,
        completed: false,
        subtasks: decomposeTask(parsed.title),
        createdAt: new Date().toISOString()
      };
      state.tasks.unshift(newTask);
      persistState();
      renderTasks();
      ui.quickTaskInput.value = '';
      playSound('complete');
      notifyToast('Task Added', `"${parsed.title}" added to today's list.`, '⚡');
    }

    ui.quickTaskSubmitBtn.addEventListener('click', handleQuickSubmit);
    ui.quickTaskInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleQuickSubmit();
    });

    ui.templateChips.forEach(chip => {
      chip.addEventListener('click', () => {
        ui.quickTaskInput.value = chip.getAttribute('data-text');
        handleQuickSubmit();
      });
    });

    // Pomodoro Controls
    ui.pomodoroStartBtn.addEventListener('click', startTimer);
    ui.pomodoroPauseBtn.addEventListener('click', pauseTimer);
    ui.pomodoroResetBtn.addEventListener('click', resetTimer);
    ui.pomodoroModeToggleBtn.addEventListener('click', toggleTimerMode);

    // Insights Modal
    ui.insightsModalBtn.addEventListener('click', () => {
      updateAssessment();
      ui.aiCoachModal.classList.remove('hidden');
    });
    ui.closeAiCoachBtn.addEventListener('click', closeDialogs);
    ui.dismissAiCoachBtn.addEventListener('click', closeDialogs);
    ui.refreshAiBriefingBtn.addEventListener('click', updateAssessment);

    ui.templateCards.forEach(card => {
      card.addEventListener('click', () => {
        applyHabitPreset(card.getAttribute('data-preset'));
      });
    });

    // Shortcuts Modal
    ui.shortcutsBtn.addEventListener('click', () => ui.shortcutsModal.classList.remove('hidden'));
    ui.closeShortcutsBtn.addEventListener('click', closeDialogs);

    // Export Modal
    ui.exportDataBtn.addEventListener('click', () => ui.exportModal.classList.remove('hidden'));
    ui.closeExportBtn.addEventListener('click', closeDialogs);
    ui.downloadJsonBtn.addEventListener('click', exportJson);
    ui.downloadCsvBtn.addEventListener('click', exportCsv);

    // Subtask adder in dialog
    ui.btnAddSubtaskField.addEventListener('click', () => addSubtaskField());

    // Notifications
    ui.notifyPermissionBtn.addEventListener('click', requestNotifications);
    ui.enableNotificationBannerBtn.addEventListener('click', requestNotifications);
    ui.dismissBannerBtn.addEventListener('click', () => ui.notificationBanner.classList.add('hidden'));
    ui.sendTestNotificationBtn.addEventListener('click', () => {
      playSound('default');
      notifyToast('Notification Test', 'Notifications and sound chime operating normally.', '🚀');
      sendDesktopAlert('Dayflow Test Alert', { body: 'Desktop notifications are working as expected.' });
    });
    ui.sendProgressAlertBtn.addEventListener('click', sendProgressSummaryAlert);

    // Settings
    ui.toggleDueReminders.addEventListener('change', (e) => {
      state.settings.dueReminders = e.target.checked;
      persistState();
    });
    ui.toggleHourlyNudge.addEventListener('change', (e) => {
      state.settings.hourlyNudge = e.target.checked;
      persistState();
    });
    ui.toggleSound.addEventListener('change', (e) => {
      state.settings.sound = e.target.checked;
      persistState();
    });

    // Theme
    ui.themeToggleBtn.addEventListener('click', toggleTheme);

    // Add Task Modal
    ui.openAddTaskModalBtn.addEventListener('click', openAddDialog);
    ui.emptyStateAddBtn.addEventListener('click', openAddDialog);
    ui.closeModalBtn.addEventListener('click', closeDialogs);
    ui.cancelModalBtn.addEventListener('click', closeDialogs);
    ui.taskForm.addEventListener('submit', handleTaskForm);

    // Search & Filters
    ui.taskSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim();
      ui.clearSearchBtn.classList.toggle('hidden', state.searchQuery === '');
      renderTasks();
    });
    ui.clearSearchBtn.addEventListener('click', () => {
      ui.taskSearchInput.value = '';
      state.searchQuery = '';
      ui.clearSearchBtn.classList.add('hidden');
      renderTasks();
    });

    ui.filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        ui.filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.filter = pill.getAttribute('data-filter');
        renderTasks();
      });
    });

    ui.categoryFilter.addEventListener('change', (e) => {
      state.categoryFilter = e.target.value;
      renderTasks();
    });

    ui.priorityFilter.addEventListener('change', (e) => {
      state.priorityFilter = e.target.value;
      renderTasks();
    });

    ui.markAllCompleteBtn.addEventListener('click', markAllDone);
    ui.clearCompletedBtn.addEventListener('click', clearDone);

    // Backdrop click closes modals
    [ui.taskModal, ui.aiCoachModal, ui.shortcutsModal, ui.exportModal].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeDialogs();
      });
    });

    // Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      const isInputActive = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

      if (e.key === 'Escape') {
        closeDialogs();
        return;
      }

      if (!isInputActive) {
        if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          openAddDialog();
        } else if (e.key === '/') {
          e.preventDefault();
          ui.quickTaskInput.focus();
        } else if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          if (state.pomodoro.isRunning) pauseTimer();
          else startTimer();
        } else if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          toggleTheme();
        } else if (e.key === '?') {
          e.preventDefault();
          ui.shortcutsModal.classList.remove('hidden');
        }
      }
    });
  }

  // --- Bootstrap ---
  function init() {
    loadPersistedState();
    bindEvents();
    updateClock();
    updateNotificationStatus();
    renderTasks();
    updateTimerDisplay();

    ui.toggleDueReminders.checked = state.settings.dueReminders;
    ui.toggleHourlyNudge.checked = state.settings.hourlyNudge;
    ui.toggleSound.checked = state.settings.sound;

    setInterval(updateClock, 1000);
    setInterval(checkReminders, 20000);
    setInterval(handleDailyRollover, 60000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
