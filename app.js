/* FocusFlow: a browser-only daily planner. */

const STORAGE_KEY = "focusflow-day-planner-v1";

const initialState = {
  settings: {
    start: "08:30",
    end: "17:00",
    breakMinutes: 10,
  },
  tasks: [
    {
      id: "task-1",
      title: "Review project brief and define next steps",
      priority: "high",
      duration: 45,
      due: "10:30",
      notes: "Capture open questions for the team.",
      completed: false,
      scheduled: true,
    },
    {
      id: "task-2",
      title: "Prepare slides for the client check-in",
      priority: "high",
      duration: 60,
      due: "13:00",
      notes: "Keep the update concise and include risks.",
      completed: false,
      scheduled: true,
    },
    {
      id: "task-3",
      title: "Reply to messages and clear inbox",
      priority: "medium",
      duration: 30,
      due: "",
      notes: "",
      completed: false,
      scheduled: true,
    },
    {
      id: "task-4",
      title: "Take a proper lunch break",
      priority: "low",
      duration: 45,
      due: "",
      notes: "Step away from the desk.",
      completed: false,
      scheduled: true,
    },
    {
      id: "task-5",
      title: "Update portfolio project README",
      priority: "medium",
      duration: 45,
      due: "",
      notes: "",
      completed: false,
      scheduled: false,
    },
    {
      id: "task-6",
      title: "Book dentist appointment",
      priority: "low",
      duration: 15,
      due: "",
      notes: "",
      completed: false,
      scheduled: false,
    },
  ],
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

let state = readState();
let dateOffset = 0;
let toastTimer;

function readState() {
  for (const storageName of ["localStorage", "sessionStorage"]) {
    try {
      const storage = window[storageName];
      const saved = JSON.parse(storage.getItem(STORAGE_KEY));
      if (saved?.tasks && saved?.settings) return saved;
    } catch {
      // A browser may block storage for pages opened directly from a file.
    }
  }

  return structuredClone(initialState);
}

function persist() {
  const serialized = JSON.stringify(state);
  const setStatus = (message, warning = false) => {
    const status = $("#saveStatus");
    if (!status) return;
    status.innerHTML = `<i></i> ${message}`;
    status.classList.toggle("save-warning", warning);
  };

  try {
    localStorage.setItem(STORAGE_KEY, serialized);
    setStatus("Saved on this device.");
    return "device";
  } catch {
    // Session storage is a useful fallback for restricted file:// pages.
  }

  try {
    sessionStorage.setItem(STORAGE_KEY, serialized);
    setStatus("Saved for this session.", true);
    return "session";
  } catch {
    // Keep the app usable even when both browser storage APIs are unavailable.
    setStatus("Saved until this page closes.", true);
    return "memory";
  }
}

function safe(value = "") {
  const entities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return String(value).replace(/[&<>"']/g, (character) => entities[character]);
}

function minutesFromTime(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(value) {
  const [hours, minutes] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function timeFromMinutes(value) {
  const minutes = Math.max(0, Math.min(value, 1439));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function dateString(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date;
}

function prettyDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2300);
}

function priorityOrder(task) {
  return { high: 0, medium: 1, low: 2 }[task.priority] ?? 3;
}

function plannedBlocks() {
  return state.tasks
    .filter((task) => task.scheduled)
    .sort((first, second) => {
      const priorityDifference = priorityOrder(first) - priorityOrder(second);
      if (priorityDifference) return priorityDifference;
      if (first.due && second.due) return first.due.localeCompare(second.due);
      if (first.due) return -1;
      if (second.due) return 1;
      return 0;
    });
}

function renderSchedule() {
  const tasks = plannedBlocks();
  const list = $("#scheduleList");

  $("#planCount").textContent = `${tasks.length} ${tasks.length === 1 ? "block" : "blocks"}`;

  if (!tasks.length) {
    list.innerHTML = `
      <div class="empty-plan">
        ✳
        <strong>Your plan has room to grow</strong>
        Add a task or move one in from Loose tasks.
      </div>`;
    $("#timeBlocked").textContent = "0h 00m";
    return;
  }

  let cursor = minutesFromTime(state.settings.start);
  const dayEnd = minutesFromTime(state.settings.end);
  let totalMinutes = 0;

  const blocks = tasks.map((task) => {
    let start = cursor;

    if (task.due) {
      const due = minutesFromTime(task.due);
      if (due >= cursor && due <= dayEnd) {
        start = Math.max(cursor, due - Number(task.duration));
      }
    }

    const finish = Math.min(dayEnd, start + Number(task.duration));
    const duration = Math.max(0, finish - start);
    totalMinutes += duration;

    const completionText = task.completed
      ? '<span class="completed-word">Done</span>'
      : `${duration} min`;
    const statusClass = task.completed ? "completed" : "";
    const dueText = task.due ? `<span>· Due ${formatTime(task.due)}</span>` : "";

    const html = `
      <article class="schedule-block ${statusClass}" data-id="${safe(task.id)}">
        <div class="block-time">${formatTime(timeFromMinutes(start))}</div>
        <div class="block-marker"><i></i></div>
        <div class="block-content">
          <div class="block-copy">
            <span class="block-title" title="${safe(task.title)}">${safe(task.title)}</span>
            <div class="block-meta">
              <span class="priority-label ${safe(task.priority)}">${safe(task.priority.toUpperCase())} PRIORITY</span>
              ${dueText}
            </div>
          </div>
          <div class="block-actions">
            <span class="duration-pill">${completionText}</span>
            <button class="complete-button" data-complete="${safe(task.id)}"
              aria-label="${task.completed ? "Mark incomplete" : "Mark complete"}: ${safe(task.title)}">
              ${task.completed ? "✓" : ""}
            </button>
            <button class="task-menu" data-taskmenu="${safe(task.id)}"
              aria-label="Task options">···</button>
          </div>
        </div>
        <div></div>
      </article>`;

    cursor = finish + Number(state.settings.breakMinutes);
    return html;
  });

  list.innerHTML = blocks.join("");
  $("#timeBlocked").textContent = `${Math.floor(totalMinutes / 60)}h ${String(totalMinutes % 60).padStart(2, "0")}m`;
}

function renderLooseTasks() {
  const looseTasks = state.tasks.filter((task) => !task.scheduled && !task.completed);
  $("#looseCount").textContent = looseTasks.length;
  $("#navTaskCount").textContent = state.tasks.filter((task) => !task.completed).length;
  $("#looseEmpty").hidden = looseTasks.length !== 0;

  $("#looseList").innerHTML = looseTasks
    .map((task) => `
      <div class="loose-task">
        <input type="checkbox" class="loose-check" data-loose-done="${safe(task.id)}"
          aria-label="Complete ${safe(task.title)}">
        <span class="loose-title" title="${safe(task.title)}">${safe(task.title)}</span>
        <span class="loose-duration">${Number(task.duration)}m</span>
        <button class="loose-schedule" data-schedule="${safe(task.id)}"
          title="Add to plan" aria-label="Add ${safe(task.title)} to plan">↗</button>
      </div>`)
    .join("");
}

function renderProgress() {
  const completed = state.tasks.filter((task) => task.completed).length;
  const total = state.tasks.length;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  $("#doneCount").textContent = completed;
  $("#totalCount").textContent = total;
  $("#progressPercent").textContent = `${percent}%`;
  $("#progressBar").style.width = `${percent}%`;

  if (percent === 100 && total) {
    $("#progressMessage").textContent = "Beautifully done. Make space to recharge.";
  } else if (percent >= 50) {
    $("#progressMessage").textContent = "You’re building good momentum.";
  } else if (completed) {
    $("#progressMessage").textContent = "Nice start. Keep your pace steady.";
  } else {
    $("#progressMessage").textContent = "Every step forward counts.";
  }
}

function renderDates() {
  const date = dateString(dateOffset);
  const scheduleDate = $("#scheduleDate");

  if (dateOffset === 0) scheduleDate.textContent = "Today";
  else if (dateOffset === 1) scheduleDate.textContent = "Tomorrow";
  else if (dateOffset === -1) scheduleDate.textContent = "Yesterday";
  else scheduleDate.textContent = prettyDate(date);

  $("#dateLabel").textContent = dateOffset === 0
    ? "TODAY"
    : date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).toUpperCase();
}

function render() {
  renderDates();
  renderSchedule();
  renderLooseTasks();
  renderProgress();
}

function addTask(formData, scheduled = true) {
  const task = {
    id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: formData.title.trim(),
    priority: formData.priority,
    duration: Number(formData.duration),
    due: formData.due || "",
    notes: (formData.notes || "").trim(),
    completed: false,
    scheduled,
  };

  state.tasks.push(task);
  const savedTo = persist();
  render();
  return savedTo;
}

function showSavedMessage(message, storageType) {
  if (storageType === "memory") {
    showToast(`${message} It will stay until this page is closed.`);
  } else if (storageType === "session") {
    showToast(`${message} Saved for this browser session.`);
  } else {
    showToast(`${message} Saved on this device.`);
  }
}

function replan() {
  const tasks = plannedBlocks();
  const start = minutesFromTime(state.settings.start);
  const end = minutesFromTime(state.settings.end);
  const availableMinutes = end - start;
  const neededMinutes = tasks
    .filter((task) => !task.completed)
    .reduce((sum, task) => sum + Number(task.duration), 0);

  if (!tasks.length) {
    showToast("Add a task to your plan first.");
    return;
  }

  if (neededMinutes > availableMinutes) {
    showToast("Your tasks exceed your available time. Move one to Loose tasks.");
    return;
  }

  tasks.forEach((task) => {
    if (!task.completed) task.due = "";
  });

  persist();
  render();
  showToast("Plan refreshed by priority. Check the timing and adjust as needed.");
}

function assistantReply(mode, question = "") {
  const unfinished = state.tasks.filter((task) => !task.completed);
  const scheduled = unfinished.filter((task) => task.scheduled);

  if (mode === "prioritize") {
    if (!unfinished.length) {
      return "You have no unfinished tasks. Enjoy the breathing room, or add something you’d like to work on.";
    }

    const next = [...unfinished].sort((first, second) => {
      const priorityDifference = priorityOrder(first) - priorityOrder(second);
      if (priorityDifference) return priorityDifference;
      return (first.due || "99:99").localeCompare(second.due || "99:99");
    })[0];
    const dueMessage = next.due ? ` and has a ${formatTime(next.due)} due time` : "";

    return `A good place to start is “${next.title}.” It’s marked ${next.priority} priority${dueMessage}. Try one focused ${next.duration}-minute block, then reassess. This suggestion is based on your task labels.`;
  }

  if (mode === "balance") {
    if (!scheduled.length) {
      return "Your schedule is open. Add a couple of important tasks and a break, then re-plan to see how they fit.";
    }

    const total = scheduled.reduce((sum, task) => sum + Number(task.duration), 0);
    const highPriority = scheduled.filter((task) => task.priority === "high").length;
    const longTasks = scheduled.filter((task) => task.duration >= 90).length;
    let reply = `You have ${scheduled.length} planned tasks totaling about ${Math.floor(total / 60)}h ${total % 60}m.`;

    if (highPriority >= 3) {
      reply += " There are several high-priority items; consider moving one if the day feels crowded.";
    } else if (highPriority === 0) {
      reply += " Nothing is marked high priority yet. Check that your top commitment is easy to spot.";
    } else {
      reply += " Your priority mix looks manageable.";
    }

    reply += longTasks
      ? ` ${longTasks} task${longTasks > 1 ? "s are" : " is"} at least 90 minutes; consider adding a break.`
      : " Remember to leave room for breaks and unexpected work.";
    return reply;
  }

  if (mode === "breakdown") {
    const query = question.toLowerCase();
    const task = unfinished.find((item) => query && item.title.toLowerCase().includes(query)) || unfinished[0];

    if (!task) return "Add a task first and I can help turn it into smaller steps.";

    return `For “${task.title}”, try this sequence:
1. Define what “done” looks like (5 min).
2. Gather the materials or information you need (${Math.max(5, Math.round(task.duration * 0.15))} min).
3. Work on the main piece in one focused block (${Math.max(10, Math.round(task.duration * 0.55))} min).
4. Review, tidy up, and choose the next action (${Math.max(5, Math.round(task.duration * 0.2))} min).

Adjust these steps to fit the actual task.`;
  }

  if (/overwhelm|too much|busy|replan|re-plan/i.test(question)) {
    return "Let’s make it smaller: pick one high-priority task, move anything optional into Loose tasks, and keep a break after your next focus block. Use Re-plan day to refresh the schedule, then check the suggested timing.";
  }

  return "I can help prioritize tasks, break something into steps, or check how balanced your day looks. Try one of the prompts above. My suggestions use your task priorities and estimates, so please review them before changing your plan.";
}

function showAssistant(mode, question = "") {
  const response = $("#assistantResponse");
  response.textContent = assistantReply(mode, question);
  response.hidden = false;
  response.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function openTaskDialog(scheduled) {
  const form = $("#taskForm");
  form.dataset.scheduled = String(scheduled);
  $("#taskDialog").hidden = false;
  setTimeout(() => form.elements.title.focus(), 20);
}

function closeDialog(overlay) {
  overlay.hidden = true;
}

$("#addTaskTop").addEventListener("click", () => openTaskDialog(true));
$("#addLooseTask").addEventListener("click", () => openTaskDialog(false));
$("#addLooseFooter").addEventListener("click", () => openTaskDialog(false));

$("#taskForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = Object.fromEntries(new FormData(form));
  const scheduled = form.dataset.scheduled === "true";
  const storageType = addTask(formData, scheduled);

  form.reset();
  closeDialog($("#taskDialog"));
  showSavedMessage(scheduled ? "Task added to your day." : "Task saved to Loose tasks.", storageType);
});

$("#scheduleList").addEventListener("click", (event) => {
  const completeButton = event.target.closest("[data-complete]");

  if (completeButton) {
    const task = state.tasks.find((item) => item.id === completeButton.dataset.complete);
    if (!task) return;

    task.completed = !task.completed;
    persist();
    render();
    showToast(task.completed ? "Nice work — task completed." : "Task moved back to your plan.");
    return;
  }

  const menuButton = event.target.closest("[data-taskmenu]");
  if (!menuButton) return;

  const task = state.tasks.find((item) => item.id === menuButton.dataset.taskmenu);
  if (!task || !confirm(`Move “${task.title}” to Loose tasks?`)) return;

  task.scheduled = false;
  persist();
  render();
  showToast("Task moved to Loose tasks.");
});

$("#looseList").addEventListener("click", (event) => {
  const scheduleButton = event.target.closest("[data-schedule]");

  if (scheduleButton) {
    const task = state.tasks.find((item) => item.id === scheduleButton.dataset.schedule);
    if (!task) return;

    task.scheduled = true;
    persist();
    render();
    showToast("Task added to your plan.");
    return;
  }

  const doneCheckbox = event.target.closest("[data-loose-done]");
  if (!doneCheckbox) return;

  const task = state.tasks.find((item) => item.id === doneCheckbox.dataset.looseDone);
  if (!task) return;

  task.completed = true;
  persist();
  render();
  showToast("Task completed.");
});

$("#replanButton").addEventListener("click", replan);
$("#prevDay").addEventListener("click", () => {
  dateOffset -= 1;
  renderDates();
});
$("#nextDay").addEventListener("click", () => {
  dateOffset += 1;
  renderDates();
});
$("#todayButton").addEventListener("click", () => {
  dateOffset = 0;
  renderDates();
});

$("#settingsButton").addEventListener("click", () => {
  const form = $("#settingsForm");
  form.elements.start.value = state.settings.start;
  form.elements.end.value = state.settings.end;
  form.elements.break.value = state.settings.breakMinutes;
  $("#settingsDialog").hidden = false;
});

$("#settingsForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const start = formData.get("start");
  const end = formData.get("end");

  if (minutesFromTime(end) <= minutesFromTime(start)) {
    showToast("Wrap-up time needs to be later than start time.");
    return;
  }

  state.settings = {
    start,
    end,
    breakMinutes: Number(formData.get("break")),
  };

  persist();
  render();
  closeDialog($("#settingsDialog"));
  showToast("Day settings saved.");
});

$$('[data-dismiss]').forEach((button) => {
  button.addEventListener("click", () => closeDialog(button.closest(".overlay")));
});

$$(".overlay").forEach((overlay) => {
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeDialog(overlay);
  });
});

$$('[data-prompt]').forEach((button) => {
  button.addEventListener("click", () => {
    showAssistant(button.dataset.prompt, $("#assistantQuestion").value);
  });
});

$("#assistantForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const question = $("#assistantQuestion").value.trim();
  showAssistant(question ? "custom" : "prioritize", question);
});

$("#menuButton").addEventListener("click", () => {
  $("#sidebar").classList.toggle("open");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    $$(".overlay").forEach(closeDialog);
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    $("#assistantQuestion").focus();
  }
});

render();
