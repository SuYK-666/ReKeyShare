export type ParsedEvidenceArtifact = {
  name: string;
  type: string;
  status: string;
  summary: string;
};

export async function parseEvidenceArtifact(file: File): Promise<ParsedEvidenceArtifact> {
  const text = await file.text();
  let status = "parsed";
  let summary = `${file.name} · ${file.size.toLocaleString()} bytes`;

  if (file.name.endsWith(".json")) {
    const data = JSON.parse(text) as Record<string, unknown>;
    const keys = Object.keys(data).slice(0, 8).join(", ");
    summary = `JSON fields: ${keys || "empty"}`;
    status = "json-ready";
  } else if (file.name.endsWith(".csv")) {
    const rows = text.trim().split(/\r?\n/).length;
    summary = `CSV rows: ${rows}`;
    status = "csv-ready";
  } else if (file.name.endsWith(".md")) {
    const headings = (text.match(/^#/gm) ?? []).length;
    summary = `Markdown headings: ${headings}`;
    status = "markdown-ready";
  }

  return { name: file.name, type: file.type || "artifact", status, summary };
}
