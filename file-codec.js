const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const PNG_METADATA_KEYWORD = "MermaidSource";
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const SVG_XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";

export function embedMermaidSourceInSvg(svg, source) {
  const safeSource = source.replaceAll("]]>", "]]]]><![CDATA[>");
  const metadata = `<metadata id="mermaid-source"><![CDATA[${safeSource}]]></metadata>`;
  return svg.replace(/<svg([^>]*)>/, `<svg$1>${metadata}`);
}

export function extractMermaidSourceFromSvg(svgText) {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(svgText, "image/svg+xml");
  const metadata = documentNode.querySelector("#mermaid-source");
  return metadata?.textContent?.trim() ?? "";
}

export async function exportSvgFile(svg, fileName) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  triggerDownload(blob, `${fileName}.svg`);
}

export async function exportPngFile(svg, source, fileName) {
  const pngBlob = await convertSvgToPngBlob(svg);
  const buffer = await pngBlob.arrayBuffer();
  const embeddedBuffer = injectMermaidSourceIntoPng(buffer, source);
  triggerDownload(new Blob([embeddedBuffer], { type: "image/png" }), `${fileName}.png`);
}

export async function extractMermaidSourceFromFile(file) {
  if (isSvgFile(file)) {
    return extractMermaidSourceFromSvg(await file.text());
  }

  if (isPngFile(file)) {
    return extractMermaidSourceFromPng(await file.arrayBuffer());
  }

  throw new Error("File format is not supported.");
}

function isSvgFile(file) {
  return file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
}

function isPngFile(file) {
  return file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
}

function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

async function convertSvgToPngBlob(svgText) {
  const normalizedSvg = normalizeSvgForRasterization(svgText);
  const { width, height } = getSvgDimensions(normalizedSvg);
  const image = await loadImage(createSvgDataUrl(normalizedSvg));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas 2D is not available in this browser.");
  }

  canvas.width = width;
  canvas.height = height;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("Canvas failed to convert SVG to PNG."));
    }, "image/png");
  });
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image."));
    image.src = source;
  });
}

function normalizeSvgForRasterization(svgText) {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(svgText, "image/svg+xml");
  const svg = documentNode.documentElement;

  if (!svg.getAttribute("xmlns")) {
    svg.setAttribute("xmlns", SVG_NAMESPACE);
  }

  if (!svg.getAttribute("xmlns:xlink")) {
    svg.setAttribute("xmlns:xlink", SVG_XLINK_NAMESPACE);
  }

  const { width, height } = getSvgDimensions(svg.outerHTML);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));

  return svg.outerHTML;
}

function getSvgDimensions(svgText) {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(svgText, "image/svg+xml");
  const svg = documentNode.documentElement;
  const viewBox = svg.getAttribute("viewBox");

  if (viewBox) {
    const [, , width, height] = viewBox
      .split(/[\s,]+/)
      .map((value) => Number.parseFloat(value));

    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return {
        width: Math.ceil(width),
        height: Math.ceil(height),
      };
    }
  }

  return {
    width: parseSvgLength(svg.getAttribute("width")) || 1200,
    height: parseSvgLength(svg.getAttribute("height")) || 800,
  };
}

function parseSvgLength(value) {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.ceil(parsed) : 0;
}

function createSvgDataUrl(svgText) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
}

function injectMermaidSourceIntoPng(arrayBuffer, source) {
  const signature = new Uint8Array(arrayBuffer.slice(0, 8));
  const chunks = readPngChunks(arrayBuffer);
  const chunkData = textEncoder.encode(`${PNG_METADATA_KEYWORD}\0${source}`);
  const textChunk = buildPngChunk("tEXt", chunkData);

  const chunkBytes = [signature];
  for (const chunk of chunks) {
    if (chunk.type === "IEND") {
      chunkBytes.push(textChunk);
    }
    chunkBytes.push(chunk.raw);
  }

  return concatenateUint8Arrays(chunkBytes);
}

function extractMermaidSourceFromPng(arrayBuffer) {
  const chunks = readPngChunks(arrayBuffer);
  for (const chunk of chunks) {
    if (chunk.type !== "tEXt") {
      continue;
    }

    const content = textDecoder.decode(chunk.data);
    const separatorIndex = content.indexOf("\0");
    if (separatorIndex === -1) {
      continue;
    }

    if (content.slice(0, separatorIndex) === PNG_METADATA_KEYWORD) {
      return content.slice(separatorIndex + 1).trim();
    }
  }

  return "";
}

function readPngChunks(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const chunks = [];
  let offset = 8;

  while (offset < bytes.length) {
    const length = readUint32(bytes, offset);
    const typeBytes = bytes.slice(offset + 4, offset + 8);
    const type = textDecoder.decode(typeBytes);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4;

    chunks.push({
      type,
      data: bytes.slice(dataStart, dataEnd),
      raw: bytes.slice(offset, chunkEnd),
    });

    offset = chunkEnd;
  }

  return chunks;
}

function buildPngChunk(type, data) {
  const typeBytes = textEncoder.encode(type);
  const lengthBytes = new Uint8Array(4);
  new DataView(lengthBytes.buffer).setUint32(0, data.length);

  const crcInput = concatenateUint8Arrays([typeBytes, data]);
  const crcBytes = new Uint8Array(4);
  new DataView(crcBytes.buffer).setUint32(0, crc32(crcInput));

  return concatenateUint8Arrays([lengthBytes, typeBytes, data, crcBytes]);
}

function concatenateUint8Arrays(parts) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
}

function readUint32(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
}

function crc32(bytes) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}
