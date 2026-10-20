# Daymark

A small, dependency-free task tracker that runs in your browser. Tasks are saved in the browser's local storage.

## Run it

Open `index.html` in a modern browser. No installation or build step is needed.

You can also serve this folder with any static file server, then open its local URL. Tasks stay in the same browser profile and are not synced between devices.

## Test it

Browser regression tests use Playwright and require Node.js, npm, and Python 3 (for the local static server).

```sh
npm ci
npx playwright install chromium
npm test
```

Playwright starts and stops its own server at `http://127.0.0.1:4173`. Tests run in isolated browser contexts with fresh local storage. The rapid-toggle regression checks that completing, undoing, and completing a task leaves it completed without creating duplicates.
