const HEADER_PATTERN = /^(flowchart|graph)\s+(TD|TB|BT|LR|RL)$/i;
const EDGE_PATTERN = /^(.*?)\s*(-->|==>|-.->)\s*(?:\|([^|]+)\|)?\s*(.+)$/;
const NODE_PATTERNS = [
  { shape: "stadium", regex: /^([A-Za-z0-9_:-]+)\(\[(.*)\]\)$/ },
  { shape: "diamond", regex: /^([A-Za-z0-9_:-]+)\{(.*)\}$/ },
  { shape: "round", regex: /^([A-Za-z0-9_:-]+)\((.*)\)$/ },
  { shape: "rect", regex: /^([A-Za-z0-9_:-]+)\[(.*)\]$/ },
  { shape: "rect", regex: /^([A-Za-z0-9_:-]+)$/ },
];

export function parseMermaidFlowchart(source) {
  const lines = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("%%"));

  if (lines.length === 0) {
    return unsupported("Mermaid markdown is empty.");
  }

  const headerMatch = lines[0].match(HEADER_PATTERN);
  if (!headerMatch) {
    return unsupported("Visual editor supports simple flowcharts only.");
  }

  const direction = normalizeDirection(headerMatch[2]);
  const nodes = new Map();
  const edges = [];

  for (const line of lines.slice(1)) {
    const edgeMatch = line.match(EDGE_PATTERN);
    if (edgeMatch) {
      const [, leftToken, , edgeLabel, rightToken] = edgeMatch;
      const leftNode = parseNodeToken(leftToken);
      const rightNode = parseNodeToken(rightToken);

      if (!leftNode || !rightNode) {
        return unsupported(`Unsupported flowchart line: ${line}`);
      }

      mergeNode(nodes, leftNode);
      mergeNode(nodes, rightNode);
      edges.push({
        id: `${leftNode.id}-${rightNode.id}-${edges.length + 1}`,
        from: leftNode.id,
        to: rightNode.id,
        label: edgeLabel?.trim() ?? "",
      });
      continue;
    }

    const standaloneNode = parseNodeToken(line);
    if (!standaloneNode) {
      return unsupported(`Unsupported flowchart line: ${line}`);
    }

    mergeNode(nodes, standaloneNode);
  }

  if (nodes.size === 0) {
    return unsupported("No supported flowchart nodes were found.");
  }

  return {
    supported: true,
    reason: "",
    model: {
      type: "flowchart",
      direction,
      nodes: [...nodes.values()],
      edges,
    },
  };
}

function parseNodeToken(token) {
  const value = token.trim();
  for (const pattern of NODE_PATTERNS) {
    const match = value.match(pattern.regex);
    if (!match) {
      continue;
    }

    const [, id, rawLabel] = match;
    return {
      id,
      label: sanitizeLabel(rawLabel ?? id),
      shape: pattern.shape,
    };
  }

  return null;
}

function sanitizeLabel(label) {
  return label.replaceAll("&amp;", "&").trim();
}

function mergeNode(nodeMap, node) {
  const existing = nodeMap.get(node.id);
  if (!existing) {
    nodeMap.set(node.id, node);
    return;
  }

  if (existing.label === existing.id && node.label !== node.id) {
    existing.label = node.label;
  }

  if (existing.shape === "rect" && node.shape !== "rect") {
    existing.shape = node.shape;
  }
}

function normalizeDirection(direction) {
  return direction === "TB" ? "TD" : direction.toUpperCase();
}

function unsupported(reason) {
  return {
    supported: false,
    reason,
    model: null,
  };
}
