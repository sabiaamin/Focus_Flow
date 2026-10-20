# FocusFlow

FocusFlow is a simple daily planner built with HTML, CSS, and JavaScript. Add tasks, set priorities and time estimates, and arrange the work you want to get through today. The layout adapts to desktop and mobile screens.

## Features

- Add tasks to the schedule or keep them in a separate list for later.
- Set each task’s priority, estimated duration, due time, and notes.
- Mark tasks complete and track daily progress.
- Set your working hours and the break between scheduled tasks.
- Re-plan the day when priorities change.
- Get planning suggestions based on the tasks and priorities you entered.
- Save tasks and settings in your browser.

The planning suggestions use simple JavaScript rules. They do not connect to an AI service or send task details anywhere.

## Run the project

### Option 1: Open the file

Open `index.html` in a current web browser.

### Option 2: Use a local server

If your browser restricts local files, run a server from the project folder.

**Using VS Code:** Open the folder, install the Live Server extension, then right-click `index.html` and choose **Open with Live Server**.

**Using Python:** Open a terminal in the project folder and run:

```bash
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in your browser.

No package installation or API key is needed.

## Project files

- `index.html` — page structure and task forms.
- `styles.css` — layout, colors, and responsive styles.
- `app.js` — task management, schedule rendering, browser storage, and planning suggestions.

## Saving data

Tasks and settings save automatically in the browser. FocusFlow uses device storage when available and falls back to session storage if needed. If the browser blocks both, changes stay available until the page is closed. Data is stored locally and is not synced between browsers or devices.
