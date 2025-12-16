# SCXML -> UML Viewer

Modern, read-only SCXML viewer that renders UML-style hierarchical state diagrams with zero node overlap. Paste or load `.scxml` files, inspect nested states, and explore transitions without mutating your source.

## Features
- **Realtime rendering** – Monaco editor edits trigger debounced parsing, ELK.js layout via a dedicated worker, and smooth diagram updates that keep the last good layout on errors.
- **Accurate layout** – Text-measured nodes, container padding, and generous ELK spacing guarantee readable, non-overlapping diagrams for deep hierarchies, parallel states, finals, histories, and initials.
- **Interactive diagram** – SVG pan/zoom, fit-to-screen, zoom controls, hover edge highlighting, node focus/search, and best-effort editor reveal when clicking nodes.
- **Local library** – Open a folder (Chromium File System Access API) or import multiple files via picker, then load any `.scxml` into the editor with one click.
- **Dark/light theme** – Tailwind-powered responsive UI with theme toggle, subtle grid background, and modern three-pane layout (library | editor | diagram).

## Getting Started
### Fast launch (Windows)
- Double-click `StartViewer.bat` (installs deps on first run, then starts the server and opens your browser).

### Manual
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start Vite dev server:
   ```bash
   npm run start
   ```
3. Open the printed localhost URL (default http://localhost:5173) in a modern browser. For folder access, use Chromium-based browsers (Chrome, Edge, Arc, etc.). Other browsers can still import multiple files via the "Import Files" button.

To create a production build, run `npm run build`.

## Sample SCXML
Paste the snippet below to see nested states, parallels, and history markers:

```xml
<scxml initial="Authentication" xmlns="http://www.w3.org/2005/07/scxml">
  <state id="Authentication" initial="Login">
    <state id="Login">
      <transition event="success" target="Dashboard" />
      <transition event="failure" target="Locked" cond="retry &lt; 3" />
    </state>
    <state id="Locked">
      <transition event="reset" target="Login" />
    </state>
    <final id="AuthComplete" />
  </state>

  <parallel id="Dashboard">
    <state id="Metrics" initial="Summary">
      <state id="Summary" />
      <state id="Detail" />
      <transition event="openDetail" target="Detail" />
    </state>
    <state id="Notifications">
      <state id="Idle">
        <transition event="new" target="Busy" />
      </state>
      <state id="Busy">
        <transition event="clear" target="Idle" />
      </state>
    </state>
  </parallel>

  <state id="Goodbye">
    <final id="Done" />
  </state>
</scxml>
```

## Repository Structure
```
src/
  app/            # App shell, sample data, theme context
  components/     # Library, editor, diagram, and shared UI pieces
  diagram/        # Parser, measurement, ELK graph conversion, render helpers
  hooks/          # Debounce, layout worker, resize observer
  workers/        # ELK layout worker
```

## Usage Tips
- Hover a node to highlight its outgoing/incoming edges. Click a node to center it in the viewport and reveal its `id="..."` in the editor.
- Use the search box (top-right of the diagram pane) to jump to specific states by id or label.
- Use zoom buttons or scroll/pinch to navigate large diagrams; `Fit` recenters content instantly.
- Use the ◂ buttons in the Library/SCXML headers to collapse panes and give more space to the diagram; the state is remembered locally.
- Folder open requires granting read access; no files are uploaded or modified.
