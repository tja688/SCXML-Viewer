# SCXML → UML State Diagram Viewer (Read-only) — Agent Guide

## 0. Mission
Build a modern, beautiful, read-only web app that:
1) Displays an UML-style state diagram from SCXML.
2) Supports paste/edit SCXML with realtime re-layout (no drag/edit on graph).
3) Guarantees readability: NO node overlaps, adequate spacing, correct nested/hierarchical rendering.
4) Supports local project library: list SCXML files from a selected folder and open on click.
5) Runs locally as a standard frontend project.

This is a "view-only" tool: no interactive editing of the diagram structure. Only view interactions (zoom/pan/search/highlight) are allowed.

## 1. Tech Stack (Required)
- Vite + React + TypeScript
- Tailwind CSS for modern UI (dark/light mode)
- Monaco Editor for SCXML input
- ELK.js for layout (hierarchical layout)
- Web Worker for layout computation (avoid UI jank)
- SVG rendering (crisp, scalable)
- Zoom/pan interaction (SVG pan/zoom)
- File System Access API for directory browsing (Chromium). Fallback to file input picker.

## 2. Core Non-Negotiable Requirements
### 2.1 "Never Overlap" Layout Rule
- The diagram must never draw overlapping nodes.
- If needed, the diagram can become very large; overlap is unacceptable.
- Achieve this via ELK.js layout with:
  - accurate node width/height estimation from measured text + padding + icon sizes
  - generous spacing defaults
  - hierarchical handling for nested states

### 2.2 Hierarchical / Nested States
- Support SCXML nesting: states within states.
- Render parent state as a container box with padding; children inside.
- Parallel/history/final/initial must be visually distinguishable.

### 2.3 Realtime Redraw
- SCXML edits trigger debounced parsing + layout.
- Use a Worker for ELK layout.
- While layout is computing, keep the last valid layout displayed (no flashing).
- On error, show a friendly error panel and keep last valid diagram.

### 2.4 Local Library (Phase 3 included)
- "Open Folder" (File System Access API): show file list (recursive optional; at least top-level + subfolders is preferred).
- Click a file to load contents into editor and re-render.
- Fallback for browsers without folder access:
  - allow selecting multiple `.scxml` files via `<input type="file" multiple>`
  - show selected file list similarly

## 3. Project Structure (Expected)
- /src
  - /app (layout, pages)
  - /components
    - EditorPane (Monaco + toolbar)
    - LibraryPane (folder/files list)
    - DiagramPane (SVG viewer + controls)
    - ErrorToast / ErrorPanel
    - SearchBox (find state by id/name)
  - /diagram
    - scxmlParser.ts (SCXML -> internal graph model)
    - model.ts (types)
    - measure.ts (text measurement)
    - elkGraph.ts (convert internal model -> ELK graph)
    - render.ts (ELK layout -> render model)
  - /workers
    - layout.worker.ts (ELK layout)
- /public (optional)
- AGENTS.md

## 4. SCXML Support Scope (Practical)
Implement enough SCXML to be useful in real projects:
- <scxml> root with initial attribute
- <state id="..."> nesting
- <parallel id="..."> nesting
- <final id="...">
- <history type="shallow|deep" ...> if present
- <initial> child with <transition target="...">
- <transition event="..." cond="..." target="...">
- ignore <script>, <datamodel> execution; treat cond as label text only
- If multiple targets, draw multiple edges or one edge with labels (choose readable approach).
- Unrecognized tags should not crash; warn gracefully.

## 5. Visual / UX Requirements (Modern, not industrial)
- Clean, modern UI: soft borders, spacing, subtle shadows, pleasant typography.
- Dark & Light theme toggle.
- Layout: 3 panes
  - left: Library (files)
  - center: Editor
  - right: Diagram
- Diagram viewer:
  - zoom/pan + "fit to screen" + zoom in/out buttons
  - minimap optional (nice-to-have)
  - hover highlight edges from a node
  - click node: highlight + scroll editor to its id if possible (best-effort)
  - search box to focus a node by id/name
- Node styling:
  - state: rounded rect
  - parallel: distinct border or header tag
  - final: double circle or filled terminal marker (UML-ish)
  - initial: filled dot marker
  - history: small circle with H / H* indicator
- Edge styling:
  - arrowheads
  - label near edge: event / cond summary
  - handle self-loops cleanly
- Render as SVG only (no canvas). Use markers for arrows.

## 6. Layout Algorithm (Implementation Notes)
### 6.1 Measure Node Size
- Choose one font family for diagram text (match UI).
- Use an offscreen canvas to measure text:
  - compute width for:
    - title (id)
    - optional stereotypes/badges (Parallel/Final/History)
    - transition label is for edges, not node size
- Node size = max(minWidth, measuredTextWidth + paddingX*2 + iconWidth) and height similarly.
- For container (parent) nodes:
  - add header height + inner padding
  - allow ELK to compute with children; but set minimums.

### 6.2 ELK Options (Default)
Use generous spacing and hierarchical layout:
- algorithm: layered
- direction: RIGHT (LR) by default; allow toggle to DOWN (TB)
- spacing:
  - nodeNode: >= 40
  - layer: >= 80
  - edgeNode: >= 30
- hierarchyHandling: INCLUDE_CHILDREN (or equivalent)
- edge routing: ORTHOGONAL (or SPLINES if clearer)
- port constraints: FREE or FIXED_ORDER (choose stability)
Make sure to set `elk.padding` on nodes and containers.

### 6.3 Worker Protocol
Main thread:
- parse -> internal model -> ELK graph
- send to worker: { graph, options, requestId }
Worker:
- run elk.layout(graph, options)
- return { layout, requestId }
Main:
- accept only latest requestId result

## 7. Acceptance Checklist
- `npm install` then `npm run dev` works.
- Pasting SCXML renders a readable diagram with no overlaps.
- Editing SCXML triggers debounced redraw; UI does not freeze.
- Nested states render as containers with children inside.
- "Open Folder" lists files and loads on click (Chromium).
- Fallback file picker works elsewhere.
- Fit-to-screen works and diagram can be panned/zoomed.
- Friendly error display for invalid XML; last good diagram remains.

## 8. Deliverables
- Fully working app with the above features.
- Clear README in repository root:
  - how to run
  - browser requirements for folder access
  - sample SCXML snippet(s)
- Keep dependencies reasonable; avoid huge frameworks beyond required.

## 9. Coding Style
- TypeScript strict.
- Small components, clear types.
- No console spam; use a tiny logger with debug flag.
- Good error handling (parse errors, layout errors, file access errors).

