const NODE_WIDTH = 164;
const NODE_HEIGHT = 64;
const HORIZONTAL_GAP = 92;
const VERTICAL_GAP = 56;
const PADDING = 40;

export function layoutFlowchart(model) {
  const incomingCount = new Map(model.nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(model.nodes.map((node) => [node.id, []]));

  for (const edge of model.edges) {
    incomingCount.set(edge.to, (incomingCount.get(edge.to) ?? 0) + 1);
    outgoing.get(edge.from)?.push(edge.to);
  }

  const roots = model.nodes
    .filter((node) => (incomingCount.get(node.id) ?? 0) === 0)
    .map((node) => node.id);

  const queue = roots.length > 0 ? [...roots] : model.nodes.map((node) => node.id);
  const visited = new Set();
  const levelMap = new Map();

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (visited.has(nodeId)) {
      continue;
    }

    visited.add(nodeId);
    const nextLevel = levelMap.get(nodeId) ?? 0;

    for (const targetId of outgoing.get(nodeId) ?? []) {
      const candidateLevel = nextLevel + 1;
      levelMap.set(targetId, Math.max(levelMap.get(targetId) ?? 0, candidateLevel));
      queue.push(targetId);
    }
  }

  for (const node of model.nodes) {
    if (!levelMap.has(node.id)) {
      levelMap.set(node.id, 0);
    }
  }

  const columns = new Map();
  for (const node of model.nodes) {
    const level = levelMap.get(node.id) ?? 0;
    const bucket = columns.get(level) ?? [];
    bucket.push(node);
    columns.set(level, bucket);
  }

  const sortedLevels = [...columns.keys()].sort((left, right) => left - right);
  const positions = new Map();

  sortedLevels.forEach((level) => {
    const bucket = columns.get(level) ?? [];
    bucket.forEach((node, index) => {
      const x = model.direction === "LR" || model.direction === "RL"
        ? PADDING + level * (NODE_WIDTH + HORIZONTAL_GAP)
        : PADDING + index * (NODE_WIDTH + HORIZONTAL_GAP);
      const y = model.direction === "LR" || model.direction === "RL"
        ? PADDING + index * (NODE_HEIGHT + VERTICAL_GAP)
        : PADDING + level * (NODE_HEIGHT + VERTICAL_GAP);

      positions.set(node.id, { x, y, width: NODE_WIDTH, height: NODE_HEIGHT });
    });
  });

  const maxX = Math.max(...[...positions.values()].map((position) => position.x + position.width), NODE_WIDTH);
  const maxY = Math.max(...[...positions.values()].map((position) => position.y + position.height), NODE_HEIGHT);

  return {
    positions,
    width: maxX + PADDING,
    height: maxY + PADDING,
  };
}
