export function serializeFlowchart(model) {
  const lines = [`flowchart ${model.direction}`];

  for (const edge of model.edges) {
    const fromNode = getNode(model, edge.from);
    const toNode = getNode(model, edge.to);
    const fromToken = serializeNode(fromNode);
    const toToken = serializeNode(toNode);
    const edgeLabel = edge.label ? `|${edge.label}| ` : "";

    lines.push(`    ${fromToken} -->${edgeLabel}${toToken}`);
  }

  const connectedIds = new Set(model.edges.flatMap((edge) => [edge.from, edge.to]));
  for (const node of model.nodes) {
    if (!connectedIds.has(node.id)) {
      lines.push(`    ${serializeNode(node)}`);
    }
  }

  return lines.join("\n");
}

function serializeNode(node) {
  const label = escapeLabel(node.label);

  switch (node.shape) {
    case "diamond":
      return `${node.id}{${label}}`;
    case "round":
      return `${node.id}(${label})`;
    case "stadium":
      return `${node.id}([${label}])`;
    case "rect":
    default:
      return `${node.id}[${label}]`;
  }
}

function getNode(model, id) {
  return model.nodes.find((node) => node.id === id);
}

function escapeLabel(label) {
  return label.replaceAll("[", "(").replaceAll("]", ")");
}
