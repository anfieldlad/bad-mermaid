import { layoutFlowchart } from "./layout.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const EDGE_COLOR = "#3670aa";

export function renderVisualEditor(container, model, options) {
  const { onRenameNode } = options;
  const layout = layoutFlowchart(model);
  const svg = document.createElementNS(SVG_NS, "svg");
  const markerId = `graph-arrow-${crypto.randomUUID()}`;

  svg.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);
  svg.setAttribute("class", "visual-graph");
  svg.append(createArrowMarker(markerId));

  for (const edge of model.edges) {
    const from = layout.positions.get(edge.from);
    const to = layout.positions.get(edge.to);
    if (!from || !to) {
      continue;
    }

    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", buildEdgePath(from, to, model.direction));
    path.setAttribute("class", "graph-edge");
    path.setAttribute("marker-end", `url(#${markerId})`);
    svg.append(path);

    if (edge.label) {
      const label = document.createElementNS(SVG_NS, "text");
      const labelPosition = getEdgeLabelPosition(from, to, model.direction);
      label.setAttribute("x", String(labelPosition.x));
      label.setAttribute("y", String(labelPosition.y));
      label.setAttribute("class", "graph-edge-label");
      label.textContent = edge.label;
      svg.append(label);
    }
  }

  for (const node of model.nodes) {
    const position = layout.positions.get(node.id);
    if (!position) {
      continue;
    }

    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("class", "graph-node");
    group.setAttribute("transform", `translate(${position.x}, ${position.y})`);
    group.setAttribute("data-node-id", node.id);
    group.addEventListener("dblclick", () => {
      const nextLabel = window.prompt(`Rename "${node.id}"`, node.label);
      if (typeof nextLabel !== "string") {
        return;
      }

      const trimmed = nextLabel.trim();
      if (!trimmed || trimmed === node.label) {
        return;
      }

      onRenameNode(node.id, trimmed);
    });

    group.append(createNodeShape(node, position.width, position.height));

    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("x", String(position.width / 2));
    label.setAttribute("y", String(position.height / 2 + 4));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("class", "graph-node-label");
    label.textContent = node.label;
    group.append(label);
    svg.append(group);
  }

  container.replaceChildren(svg);
}

function createArrowMarker(markerId) {
  const defs = document.createElementNS(SVG_NS, "defs");
  const marker = document.createElementNS(SVG_NS, "marker");
  const path = document.createElementNS(SVG_NS, "path");

  marker.setAttribute("id", markerId);
  marker.setAttribute("viewBox", "0 0 10 10");
  marker.setAttribute("refX", "9");
  marker.setAttribute("refY", "5");
  marker.setAttribute("markerWidth", "8");
  marker.setAttribute("markerHeight", "8");
  marker.setAttribute("orient", "auto-start-reverse");

  path.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
  path.setAttribute("fill", EDGE_COLOR);

  marker.append(path);
  defs.append(marker);
  return defs;
}

function createNodeShape(node, width, height) {
  switch (node.shape) {
    case "diamond":
      return polygon([
        [width / 2, 0],
        [width, height / 2],
        [width / 2, height],
        [0, height / 2],
      ]);
    case "round":
      return rect(width, height, 22);
    case "stadium":
      return rect(width, height, 32);
    case "rect":
    default:
      return rect(width, height, 16);
  }
}

function rect(width, height, radius) {
  const shape = document.createElementNS(SVG_NS, "rect");
  shape.setAttribute("width", String(width));
  shape.setAttribute("height", String(height));
  shape.setAttribute("rx", String(radius));
  shape.setAttribute("class", "graph-node-shape");
  return shape;
}

function polygon(points) {
  const shape = document.createElementNS(SVG_NS, "polygon");
  shape.setAttribute("points", points.map(([x, y]) => `${x},${y}`).join(" "));
  shape.setAttribute("class", "graph-node-shape");
  return shape;
}

function buildEdgePath(from, to, direction) {
  const start = direction === "LR" || direction === "RL"
    ? { x: from.x + from.width, y: from.y + from.height / 2 }
    : { x: from.x + from.width / 2, y: from.y + from.height };
  const end = direction === "LR" || direction === "RL"
    ? { x: to.x, y: to.y + to.height / 2 }
    : { x: to.x + to.width / 2, y: to.y };

  const mid = direction === "LR" || direction === "RL"
    ? { x: (start.x + end.x) / 2, y: start.y }
    : { x: start.x, y: (start.y + end.y) / 2 };

  return direction === "LR" || direction === "RL"
    ? `M ${start.x} ${start.y} C ${mid.x} ${mid.y}, ${mid.x} ${end.y}, ${end.x} ${end.y}`
    : `M ${start.x} ${start.y} C ${mid.x} ${mid.y}, ${end.x} ${mid.y}, ${end.x} ${end.y}`;
}

function getEdgeLabelPosition(from, to, direction) {
  return direction === "LR" || direction === "RL"
    ? {
        x: (from.x + from.width + to.x) / 2,
        y: (from.y + to.y + from.height) / 2 - 10,
      }
    : {
        x: (from.x + to.x + from.width) / 2 + 10,
        y: (from.y + from.height + to.y) / 2 - 6,
      };
}
