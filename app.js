"use strict";

const STORAGE_KEY = "daymark.tasks.v1";

const form = document.querySelector("#task-form");
const input = document.querySelector("#task-input");
const taskList = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");
const totalCount = document.querySelector("#total-count");
const remainingCount = document.querySelector("#remaining-count");
const clearCompletedButton = document.querySelector("#clear-completed");
const status = document.querySelector("#app-status");
const filterButtons = [...document.querySelectorAll("[data-filter]")];
const filterCounts = [...document.querySelectorAll("[data-count]")];

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const taskElements = new Map();
const buttonAnimations = new WeakMap();

let currentFilter = "all";
let tasks = loadTasks();

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) throw new TypeError("Saved task data is not a list.");

    return parsed.filter((task) =>
      task &&
      typeof task.id === "string" &&
      typeof task.text === "string" &&
      typeof task.completed === "boolean"
    );
  } catch (error) {
    console.warn("Could not load saved tasks.", error);
    status.textContent = "Saved tasks could not be loaded. You can still add tasks.";
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    status.textContent = "";
  } catch (error) {
    console.error("Could not save tasks to local storage.", error);
    status.textContent = "Your changes could not be saved in this browser.";
  }
}

function makeTaskId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createDeleteIcon() {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 20 20");
  icon.setAttribute("fill", "none");
  icon.setAttribute("aria-hidden", "true");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M4.5 6h11m-9.5 0 .6 9h5.8l.6-9M8 6V4.5h4V6m-3 2.5v4m2-4v4");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-width", "1.4");
  icon.append(path);
  return icon;
}

function render() {
  const completedCount = tasks.filter((task) => task.completed).length;
  const activeCount = tasks.length - completedCount;
  const visibleTasks = tasks.filter((task) => {
    if (currentFilter === "active") return !task.completed;
    if (currentFilter === "completed") return task.completed;
    return true;
  });

  totalCount.textContent = String(tasks.length);
  remainingCount.textContent = activeCount === 0
    ? "Nothing waiting"
    : `${activeCount} ${activeCount === 1 ? "task" : "tasks"} left`;
  clearCompletedButton.hidden = completedCount === 0;
  taskList.hidden = false;

  filterCounts.forEach((count) => {
    const filter = count.dataset.count;
    const value = filter === "all"
      ? tasks.length
      : filter === "active"
        ? activeCount
        : completedCount;
    count.textContent = String(value);
  });

  filterButtons.forEach((button) => {
    const selected = button.dataset.filter === currentFilter;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  const visibleIds = new Set(visibleTasks.map((task) => task.id));
  const tasksById = new Map(tasks.map((task) => [task.id, task]));

  taskElements.forEach((row, id) => {
    const task = tasksById.get(id);
    if (task) updateTaskElement(row.item, task);
    if (!visibleIds.has(id) && !row.leaving) {
      if (row.item.contains(document.activeElement)) {
        const nextTask = visibleTasks.find((entry) => taskElements.has(entry.id));
        const nextCheckbox = nextTask && taskElements.get(nextTask.id).item.querySelector("input");
        (nextCheckbox || filterButtons.find((button) => button.dataset.filter === currentFilter)).focus();
      }
      row.leaving = true;
      row.item.inert = true;
      row.item.setAttribute("aria-hidden", "true");
      animateTaskRow(id, row, false);
    }
  });

  // Existing rows stay attached, preserving focus and in-progress state transitions.
  let nextItem = null;
  for (let index = visibleTasks.length - 1; index >= 0; index -= 1) {
    const task = visibleTasks[index];
    let row = taskElements.get(task.id);
    if (!row) {
      row = { item: createTaskElement(task), leaving: false, animation: null };
      taskElements.set(task.id, row);
      taskList.insertBefore(row.item, nextItem);
      animateTaskRow(task.id, row, true, true);
    } else if (row.leaving) {
      row.leaving = false;
      row.item.inert = false;
      row.item.removeAttribute("aria-hidden");
      animateTaskRow(task.id, row, true);
    }
    nextItem = row.item;
  }
  updateListVisibility();

  if (tasks.length === 0) {
    emptyState.querySelector(".empty-title").textContent = "Nothing on your list.";
    emptyState.querySelector(".empty-copy").textContent = "Add a task above and take it from there.";
  } else if (visibleTasks.length === 0) {
    emptyState.querySelector(".empty-title").textContent = currentFilter === "active"
      ? "All caught up."
      : "Nothing completed just yet.";
    emptyState.querySelector(".empty-copy").textContent = currentFilter === "active"
      ? "Every task is done. Enjoy the breathing room."
      : "Finished tasks will find a home here.";
  }
}

function updateListVisibility() {
  taskList.hidden = taskElements.size === 0;
  emptyState.hidden = taskElements.size !== 0;
}

function animateTaskRow(id, row, entering, isNew = false) {
  const { item } = row;
  const height = isNew ? 0 : item.getBoundingClientRect().height;
  const opacity = isNew ? 0 : Number(getComputedStyle(item).opacity);
  if (row.animation) row.animation.cancel();

  const finish = () => {
    row.animation = null;
    if (row.leaving) {
      item.remove();
      taskElements.delete(id);
    }
    updateListVisibility();
  };

  if (reducedMotion.matches) {
    finish();
    return;
  }

  // Animate layout height, not just a visual offset, so neighboring rows follow.
  const animation = item.animate([
    { height: `${height}px`, minHeight: 0, opacity, overflow: "hidden" },
    {
      height: `${entering ? item.getBoundingClientRect().height : 0}px`,
      minHeight: 0,
      opacity: entering ? 1 : 0,
      borderBottomWidth: entering ? "1px" : "0px",
      overflow: "hidden"
    }
  ], { duration: 240, easing: "ease-in-out" });
  row.animation = animation;
  animation.onfinish = () => {
    if (row.animation === animation) finish();
  };
}

function updateTaskElement(item, task) {
  const wasCompleted = item.classList.contains("is-completed");
  item.classList.toggle("is-completed", task.completed);
  if (!wasCompleted || !task.completed) {
    item.classList.toggle("is-completing", task.completed);
  }
  const checkbox = item.querySelector("input");
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `Mark "${task.text}" ${task.completed ? "active" : "completed"}`);
}

function createTaskElement(task) {
  const item = document.createElement("li");
  item.className = "task-item";
  item.classList.toggle("is-completed", task.completed);

  const checkbox = document.createElement("input");
  checkbox.className = "task-toggle";
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `Mark "${task.text}" ${task.completed ? "active" : "completed"}`);
  checkbox.addEventListener("change", () => {
    tasks = tasks.map((entry) =>
      entry.id === task.id ? { ...entry, completed: checkbox.checked } : entry
    );
    saveTasks();
    render();
  });

  const text = document.createElement("span");
  text.className = "task-text";
  text.textContent = task.text;

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.setAttribute("aria-label", `Delete "${task.text}"`);
  deleteButton.append(createDeleteIcon());
  deleteButton.addEventListener("click", () => {
    tasks = tasks.filter((entry) => entry.id !== task.id);
    saveTasks();
    render();
    status.textContent = `Deleted task: ${task.text}`;
  });

  item.append(checkbox, text, deleteButton);
  return item;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) {
    input.focus();
    return;
  }

  tasks.unshift({ id: makeTaskId(), text, completed: false });
  currentFilter = "all";
  input.value = "";
  saveTasks();
  render();
  status.textContent = `Added task: ${text}`;
  input.focus();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    render();
  });
});

clearCompletedButton.addEventListener("click", () => {
  const removedCount = tasks.filter((task) => task.completed).length;
  tasks = tasks.filter((task) => !task.completed);
  saveTasks();
  render();
  status.textContent = `Cleared ${removedCount} completed ${removedCount === 1 ? "task" : "tasks"}`;
});

// Keyboard-generated clicks do not consistently expose the native :active state.
document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || event.detail !== 0) return;
  buttonAnimations.get(button)?.cancel();
  const feedback = reducedMotion.matches
    ? [{ filter: "brightness(0.94)" }, { filter: "brightness(1)" }]
    : [{ transform: "scale(1)" }, { transform: "scale(0.97)", offset: 0.4 }, { transform: "scale(1)" }];
  buttonAnimations.set(button, button.animate(feedback, { duration: 140, easing: "ease-out" }));
});

reducedMotion.addEventListener("change", () => {
  if (!reducedMotion.matches) return;
  taskElements.forEach((row, id) => {
    row.animation?.cancel();
    row.animation = null;
    if (row.leaving) {
      row.item.remove();
      taskElements.delete(id);
    }
  });
  document.querySelectorAll("button").forEach((button) => buttonAnimations.get(button)?.cancel());
  updateListVisibility();
});

render();
