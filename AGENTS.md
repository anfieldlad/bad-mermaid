# AGENTS.md

## Purpose

This repository is a static browser app for authoring Mermaid diagrams, previewing them, exporting `SVG` and `PNG`, and restoring Mermaid source from files exported by the app.

Agents working here should keep changes small, browser-safe, and dependency-light. There is no build step and no framework runtime.

## Project Layout

- `index.html`: App shell and UI structure.
- `styles.css`: All styling for layout, controls, preview, and visual editor surfaces.
- `app.js`: Main browser entry point. Wires DOM events, Mermaid rendering, export/import actions, and visual editor sync.
- `parser.js`: Parses a limited Mermaid flowchart subset into the internal model used by the visual editor.
- `serializer.js`: Serializes the internal flowchart model back to Mermaid source.
- `visual-editor.js`: Renders the lightweight visual editor and handles visual interactions.
- `file-codec.js`: Embeds Mermaid source in exported files and restores source from exported `SVG` and `PNG`.
- `layout.js`: Layout logic used by the visual editor.
- `assets/`: Screenshots and preview assets used in docs.
- `vercel.json`: Static deployment config.

## Runtime Constraints

- The app runs entirely in the browser.
- Mermaid is loaded from a CDN in `app.js`.
- Do not introduce Node-only APIs into runtime code.
- Prefer plain ES modules and browser APIs already used in the repo.
- Source recovery is only expected to work for files exported by this app.

## Working Rules

- Preserve the static-site setup. Do not add a build system unless explicitly requested.
- Keep imports relative and browser-compatible.
- Favor targeted changes over broad refactors.
- Maintain current formatting/style unless the file already needs localized cleanup.
- Avoid adding dependencies for problems that can be solved with existing browser APIs.
- When publishing to GitHub from this repo, use the SSH remote form (`git@github.com:anfieldlad/bad-mermaid.git`) rather than HTTPS.
- If `origin` is not using SSH, switch it before pushing so agent-driven publishes follow the configured SSH workflow on this machine.

## Change Guidance

- For editor or rendering changes, inspect `app.js` first because it coordinates most user flows.
- For visual editor support changes, keep `parser.js`, `serializer.js`, and `visual-editor.js` behavior aligned.
- For export/import changes, update `file-codec.js` carefully so metadata embedding and extraction stay compatible.
- If you change supported Mermaid syntax, verify both rendering and round-trip serialization behavior.

## Verification

There is no formal test suite in this repository today.

For validation, use a local static server and test in a browser:

```bash
python3 -m http.server 8080
```

Then check:

- Mermaid text renders successfully.
- Visual editor still works for supported flowcharts.
- `SVG` export works.
- `PNG` export works.
- Import restores Mermaid source from files exported by the app.

## Deployment

- Deployment target is Vercel as a static site.
- No build command or output directory is required.
- See `DEPLOY_VERCEL.md` for the current deployment flow.
