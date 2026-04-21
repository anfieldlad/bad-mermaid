import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
import {
  embedMermaidSourceInSvg,
  exportPngFile,
  exportSvgFile,
  extractMermaidSourceFromFile,
} from "./file-codec.js";
import { parseMermaidFlowchart } from "./parser.js";
import { serializeFlowchart } from "./serializer.js";
import { renderVisualEditor } from "./visual-editor.js";

const MERMAID_THEME_VARIABLES = {
  primaryColor: "#fafdff",
  primaryTextColor: "#142033",
  primaryBorderColor: "#3670aa",
  lineColor: "#3670aa",
  secondaryColor: "#f0fbfb",
  tertiaryColor: "#eef4ff",
  mainBkg: "#fafdff",
  nodeBorder: "#3670aa",
  clusterBkg: "#f1f7ff",
  clusterBorder: "#93b4de",
  defaultLinkColor: "#3670aa",
  edgeLabelBackground: "#f1f7ff",
  textColor: "#142033",
  fontFamily: "Space Grotesk, sans-serif",
};
const DROPZONE_ACTIVE_EVENTS = ["dragenter", "dragover"];
const DROPZONE_INACTIVE_EVENTS = ["dragleave", "drop"];
const PREVIEW_EDGE_SELECTOR = ".flowchart-link, .edgePath path, .arrowheadPath";

const elements = {
  copyButton: document.querySelector("#copyButton"),
  copyrightYear: document.querySelector("#copyrightYear"),
  directionSelect: document.querySelector("#directionSelect"),
  downloadPngButton: document.querySelector("#downloadPngButton"),
  downloadSvgButton: document.querySelector("#downloadSvgButton"),
  fileInput: document.querySelector("#fileInput"),
  input: document.querySelector("#mermaidInput"),
  preview: document.querySelector("#diagramPreview"),
  previewActions: document.querySelector("#previewActions"),
  previewPanel: document.querySelector("#previewPanel"),
  previewTabButton: document.querySelector("#previewTabButton"),
  renderButton: document.querySelector("#renderButton"),
  visualEditor: document.querySelector("#visualEditor"),
  visualEditorHint: document.querySelector("#visualEditorHint"),
  visualPanel: document.querySelector("#visualPanel"),
  visualTabButton: document.querySelector("#visualTabButton"),
  dropzone: document.querySelector("#dropzone"),
};

const state = {
  activeTab: "visual",
  fileName: "diagram",
  model: null,
  source: elements.input.value.trim(),
  svg: "",
};

const VISUAL_EDITOR_DEFAULT_HINT =
  "Double-click a node to rename it.";
const VISUAL_EDITOR_UNSUPPORTED_HINT =
  "Visual editing supports normalized flowcharts only for now.";
const DIAGRAM_EDGE_COLOR = "#3670aa";

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "loose",
  theme: "default",
  themeVariables: MERMAID_THEME_VARIABLES,
});

bootstrap();

function bootstrap() {
  elements.copyrightYear.textContent = new Date().getFullYear();
  bindEventListeners();
  setActiveTab("visual");
  renderDiagram();
}

function bindEventListeners() {
  elements.renderButton.addEventListener("click", () => renderDiagram());
  elements.copyButton.addEventListener("click", copyMarkdown);
  elements.downloadSvgButton.addEventListener("click", downloadSvg);
  elements.downloadPngButton.addEventListener("click", downloadPng);
  elements.visualTabButton.addEventListener("click", () => setActiveTab("visual"));
  elements.previewTabButton.addEventListener("click", () => setActiveTab("preview"));
  elements.directionSelect.addEventListener("change", handleDirectionChange);
  elements.fileInput.addEventListener("change", (event) => handleFileSelection(event.target.files));
  elements.input.addEventListener("keydown", handleEditorKeydown);

  DROPZONE_ACTIVE_EVENTS.forEach((eventName) => {
    elements.dropzone.addEventListener(eventName, handleDropzoneDragEnter);
  });
  DROPZONE_INACTIVE_EVENTS.forEach((eventName) => {
    elements.dropzone.addEventListener(eventName, handleDropzoneDragLeave);
  });

  elements.dropzone.addEventListener("drop", (event) => {
    handleFileSelection(event.dataTransfer.files);
  });
}

async function renderDiagram(sourceOverride) {
  const source = getCurrentSource(sourceOverride);

  if (!source) {
    showEmptyDiagramState(
      "Enter Mermaid syntax to render a diagram.",
      "Enter Mermaid syntax to open the visual editor.",
    );
    return;
  }

  try {
    await renderDiagramFromSource(source);
  } catch (error) {
    console.error(error);
    showEmptyDiagramState(
      "Render failed. Check your Mermaid syntax.",
      "Render failed. The visual editor could not sync this source.",
    );
  }
}

async function renderDiagramFromSource(source) {
  const renderId = `mermaid-${crypto.randomUUID()}`;
  const { svg } = await mermaid.render(renderId, source);
  const svgWithMetadata = embedMermaidSourceInSvg(svg, source);

  updateDiagramState({
    fileName: createFileName(source),
    source,
    svg: svgWithMetadata,
  });

  renderPreview(svgWithMetadata);
  syncVisualEditor(source);
  syncTabControls();
}

function syncVisualEditor(source) {
  const result = parseMermaidFlowchart(source);

  if (!result.supported) {
    resetVisualEditorState();
    setVisualEditorEmpty(result.reason);
    return;
  }

  state.model = result.model;
  elements.directionSelect.value = state.model.direction;
  elements.visualEditor.classList.remove("diagram-empty");
  elements.visualEditorHint.hidden = state.activeTab !== "visual";
  elements.visualEditorHint.textContent = VISUAL_EDITOR_DEFAULT_HINT;

  renderVisualEditor(elements.visualEditor, state.model, {
    onRenameNode: renameNodeFromVisualEditor,
  });
}

function renameNodeFromVisualEditor(nodeId, nextLabel) {
  if (!state.model) {
    return;
  }

  const node = state.model.nodes.find((item) => item.id === nodeId);
  if (!node) {
    return;
  }

  node.label = nextLabel;
  applySerializedModel();
}

function handleDirectionChange(event) {
  if (!state.model) {
    return;
  }

  state.model.direction = event.target.value;
  applySerializedModel();
}

function applySerializedModel() {
  if (!state.model) {
    return;
  }

  const nextSource = serializeFlowchart(state.model);
  elements.input.value = nextSource;
  renderDiagram(nextSource);
}

function renderPreview(svg) {
  elements.preview.classList.remove("diagram-empty");
  elements.preview.innerHTML = svg;
  applyPreviewColorOverrides();
}

function setPreviewEmpty(message) {
  elements.preview.classList.add("diagram-empty");
  elements.preview.textContent = message;
}

function setVisualEditorEmpty(message) {
  elements.visualEditor.classList.add("diagram-empty");
  elements.visualEditor.textContent = message;
  elements.visualEditorHint.hidden = state.activeTab !== "visual";
  elements.visualEditorHint.textContent = VISUAL_EDITOR_UNSUPPORTED_HINT;
}

function setActiveTab(tab) {
  state.activeTab = tab;
  syncTabControls();
}

function syncTabControls() {
  const isVisual = state.activeTab === "visual";
  const showPreviewActions = !isVisual && Boolean(state.svg);

  elements.visualPanel.hidden = !isVisual;
  elements.previewPanel.hidden = isVisual;
  elements.visualTabButton.classList.toggle("is-active", isVisual);
  elements.previewTabButton.classList.toggle("is-active", !isVisual);
  elements.visualTabButton.setAttribute("aria-selected", String(isVisual));
  elements.previewTabButton.setAttribute("aria-selected", String(!isVisual));
  elements.visualEditorHint.hidden = !isVisual;
  elements.directionSelect.disabled = !isVisual || !state.model;
  elements.previewActions.hidden = !showPreviewActions;
  elements.previewActions.setAttribute("aria-hidden", String(!showPreviewActions));
}

async function copyMarkdown() {
  try {
    await navigator.clipboard.writeText(elements.input.value);
  } catch (error) {
    console.error(error);
  }
}

function downloadSvg() {
  if (!state.svg) {
    return;
  }

  exportSvgFile(state.svg, state.fileName);
}

async function downloadPng() {
  if (!state.svg) {
    return;
  }

  try {
    await exportPngFile(state.svg, state.source, state.fileName);
  } catch (error) {
    console.error(error);
  }
}

async function handleFileSelection(fileList) {
  const [file] = Array.from(fileList);
  if (!file) {
    return;
  }

  try {
    const source = await extractMermaidSourceFromFile(file);
    if (!source) {
      throw new Error("This file does not contain Mermaid metadata.");
    }

    elements.input.value = source;
    await renderDiagram(source);
  } catch (error) {
    console.error(error);
  } finally {
    elements.fileInput.value = "";
  }
}

function updateDiagramState(nextState) {
  state.fileName = nextState.fileName;
  state.source = nextState.source;
  state.svg = nextState.svg;
}

function resetDiagramState() {
  updateDiagramState({
    fileName: "diagram",
    source: "",
    svg: "",
  });
  resetVisualEditorState();
  syncTabControls();
}

function resetVisualEditorState() {
  state.model = null;
  elements.directionSelect.value = "TD";
}

function showEmptyDiagramState(previewMessage, visualMessage) {
  resetDiagramState();
  setPreviewEmpty(previewMessage);
  setVisualEditorEmpty(visualMessage);
}

function createFileName(source) {
  const match = source.match(/^\s*([a-zA-Z0-9_-]+)/);
  const base = match?.[1]?.toLowerCase() ?? "diagram";
  return `${base}-${new Date().toISOString().slice(0, 10)}`;
}

function getCurrentSource(sourceOverride) {
  return (sourceOverride ?? elements.input.value).trim();
}

function applyPreviewColorOverrides() {
  const svg = elements.preview.querySelector("svg");
  if (!svg) {
    return;
  }

  colorizePreviewMarkers(svg);
  colorizePreviewEdges(svg);

  for (const edgeLabel of svg.querySelectorAll(".edgeLabel")) {
    edgeLabel.style.color = DIAGRAM_EDGE_COLOR;
    edgeLabel.setAttribute("fill", DIAGRAM_EDGE_COLOR);
  }
}

function colorizePreviewMarkers(svg) {
  for (const markerPath of svg.querySelectorAll("marker path")) {
    markerPath.setAttribute("fill", DIAGRAM_EDGE_COLOR);
    markerPath.style.fill = DIAGRAM_EDGE_COLOR;
    markerPath.style.stroke = DIAGRAM_EDGE_COLOR;
  }
}

function colorizePreviewEdges(svg) {
  for (const edgePath of svg.querySelectorAll(PREVIEW_EDGE_SELECTOR)) {
    edgePath.setAttribute("stroke", DIAGRAM_EDGE_COLOR);
    edgePath.style.stroke = DIAGRAM_EDGE_COLOR;

    if (edgePath.classList.contains("arrowheadPath")) {
      edgePath.setAttribute("fill", DIAGRAM_EDGE_COLOR);
      edgePath.style.fill = DIAGRAM_EDGE_COLOR;
    }
  }
}

function handleDropzoneDragEnter(event) {
  event.preventDefault();
  elements.dropzone.classList.add("is-dragging");
}

function handleDropzoneDragLeave(event) {
  event.preventDefault();
  elements.dropzone.classList.remove("is-dragging");
}

function handleEditorKeydown(event) {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    renderDiagram();
  }
}
