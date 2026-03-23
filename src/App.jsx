import { useState } from "react";
import FileDropZone from "./components/FileDropZone";
import { Step }  from "./components/Step";
import { Badge } from "./components/Step";
import { readExcel }    from "./utils/readExcel";
import { readWordFile, loadMammoth } from "./utils/readWord";
import { buildPrompt }  from "./utils/buildPrompt";
import { generateDocxBlob } from "./utils/generateDocx";

const STAGES = ["upload_template", "upload_sources", "describe", "generating", "done"];

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const MODEL   = "claude-sonnet-4-20250514";

const card = {
  background: "var(--color-bg-primary)",
  border: "0.5px solid var(--color-border-tertiary)",
  borderRadius: "var(--border-radius-lg)",
  padding: "22px",
  marginTop: 14,
};

const btnStyle = (bg, color, disabled) => ({
  background: disabled ? "var(--color-bg-tertiary)" : bg,
  color:      disabled ? "var(--color-text-tertiary)" : color,
  border: "none",
  borderRadius: "var(--border-radius-md)",
  padding: "9px 20px",
  fontWeight: 500,
  fontSize: 13,
  cursor: disabled ? "not-allowed" : "pointer",
});

export default function App() {
  const [stage, setStage]               = useState("upload_template");
  const [templateText, setTemplateText] = useState("");
  const [templateFile, setTemplateFile] = useState(null);
  const [excelFiles, setExcelFiles]     = useState([]);
  const [wordFiles, setWordFiles]       = useState([]);
  const [parsedExcels, setParsedExcels] = useState([]);
  const [parsedWords, setParsedWords]   = useState([]);
  const [description, setDescription]   = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [error, setError]               = useState("");

  const stageIdx      = STAGES.indexOf(stage);
  const hasAnySources = parsedExcels.length > 0 || parsedWords.length > 0;

  // ── Template upload ──────────────────────────────────────────────────────
  const handleTemplateUpload = async (files) => {
    const f = files[0];
    setTemplateFile(f);
    if (f.name.endsWith(".txt")) {
      setTemplateText(await f.text());
    } else if (f.name.match(/\.docx?$/i)) {
      await loadMammoth();
      const parsed = await readWordFile(f);
      setTemplateText(parsed.text);
    }
  };

  // ── Excel uploads ────────────────────────────────────────────────────────
  const handleExcelUpload = async (files) => {
    const updated = [...excelFiles, ...files].slice(0, 10);
    setExcelFiles(updated);
    setParsedExcels(await Promise.all(updated.map(readExcel)));
  };

  const removeExcel = async (idx) => {
    const updated = excelFiles.filter((_, i) => i !== idx);
    setExcelFiles(updated);
    setParsedExcels(await Promise.all(updated.map(readExcel)));
  };

  // ── Word uploads ─────────────────────────────────────────────────────────
  const handleWordUpload = async (files) => {
    await loadMammoth();
    const updated = [...wordFiles, ...files].slice(0, 10);
    setWordFiles(updated);
    setParsedWords(await Promise.all(updated.map(readWordFile)));
  };

  const removeWord = async (idx) => {
    await loadMammoth();
    const updated = wordFiles.filter((_, i) => i !== idx);
    setWordFiles(updated);
    setParsedWords(await Promise.all(updated.map(readWordFile)));
  };

  // ── Generate ─────────────────────────────────────────────────────────────
  const generate = async () => {
    setStage("generating");
    setError("");

    const prompt = buildPrompt({ templateText, parsedExcels, parsedWords, description });

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      const content = data.content?.find((b) => b.type === "text")?.text ?? "";
      setGeneratedContent(content);
      setStage("done");
    } catch (e) {
      setError("AI error: " + e.message);
      setStage("describe");
    }
  };

  // ── Download ─────────────────────────────────────────────────────────────
  const downloadDocx = async () => {
    try {
      const blob = await generateDocxBlob(generatedContent);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = "closing_document.docx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError("Download error: " + e.message);
    }
  };

  // ── Reset ────────────────────────────────────────────────────────────────
  const reset = () => {
    setStage("upload_template");
    setTemplateText(""); setTemplateFile(null);
    setExcelFiles([]); setWordFiles([]);
    setParsedExcels([]); setParsedWords([]);
    setDescription(""); setGeneratedContent(""); setError("");
  };

  // ── Shared file list renderer ────────────────────────────────────────────
  const FileList = ({ files, onRemove, icon }) =>
    files.length > 0 ? (
      <div style={{ marginTop: 8 }}>
        {files.map((f, i) => (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              fontSize: 12, color: "var(--color-text-secondary)",
              padding: "3px 0", borderBottom: "0.5px solid var(--color-border-tertiary)",
            }}
          >
            <span>{icon} {f.name}</span>
            <span
              onClick={() => onRemove(i)}
              style={{ cursor: "pointer", color: "var(--color-text-danger)", fontSize: 14, padding: "0 4px" }}
              title="Remove"
            >
              ×
            </span>
          </div>
        ))}
      </div>
    ) : null;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)" }}>
          Closing Document Generator
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>
          Combine Excel phase files + Word source documents into one final closing document
        </p>
      </div>

      {/* Progress steps */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 4 }}>
        {[["1","Template"],["2","Source files"],["3","Generate"],["4","Download"]].map(([n, label], i) => (
          <Step key={n} n={n} label={label} active={stageIdx === i} done={stageIdx > i} />
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          background: "var(--color-bg-danger)", color: "var(--color-text-danger)",
          borderRadius: "var(--border-radius-md)", padding: "9px 13px", fontSize: 13, marginTop: 10,
        }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Step 1: Template ── */}
      {stage === "upload_template" && (
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: 3 }}>Upload or paste your Word template</h2>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 14 }}>
            This defines the structure of the final closing document.
          </p>
          <FileDropZone
            label="Drop template here"
            accept=".txt,.docx,.doc"
            multiple={false}
            onFiles={handleTemplateUpload}
            hint=".txt or .docx"
          />
          {templateFile && (
            <p style={{ fontSize: 12, color: "var(--color-text-success)", marginTop: 6 }}>
              ✓ {templateFile.name} loaded
            </p>
          )}
          <p style={{ margin: "10px 0 4px", fontSize: 13, color: "var(--color-text-secondary)" }}>
            Or type / paste the structure:
          </p>
          <textarea
            value={templateText}
            onChange={(e) => setTemplateText(e.target.value)}
            placeholder={"# Supplier Closing Document\n\n## Project Details\nProject: {{project_name}}\nSupplier: {{supplier}}\nDate: {{date}}\n\n## Phase Sign-offs\n{{phase_table}}\n\n## Specifications\n{{specs}}"}
            style={{
              width: "100%", minHeight: 130, fontSize: 12,
              background: "var(--color-bg-secondary)", color: "var(--color-text-primary)",
              border: "0.5px solid var(--color-border-secondary)",
              borderRadius: "var(--border-radius-md)", padding: 10, resize: "vertical",
            }}
          />
          <div style={{ marginTop: 14 }}>
            <button
              style={btnStyle("var(--color-text-info)", "#fff")}
              onClick={() => setStage("upload_sources")}
            >
              {templateText || templateFile ? "Next →" : "Skip (AI infers structure)"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Source files ── */}
      {stage === "upload_sources" && (
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: 3 }}>Upload your source files</h2>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>
            Add any mix of Excel phase files and Word documents from earlier stages.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            {/* Excel column */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                <span>📊</span>
                <span style={{ fontWeight: 500, fontSize: 13 }}>Excel files</span>
                <Badge color="green">{parsedExcels.length} loaded</Badge>
              </div>
              <FileDropZone
                label="Drop Excel files" accept=".xlsx,.xls,.csv"
                multiple={true} onFiles={handleExcelUpload} hint=".xlsx / .xls / .csv"
              />
              <FileList files={excelFiles} onRemove={removeExcel} icon="📊" />
            </div>

            {/* Word column */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                <span>📝</span>
                <span style={{ fontWeight: 500, fontSize: 13 }}>Word documents</span>
                <Badge color="blue">{parsedWords.length} loaded</Badge>
              </div>
              <FileDropZone
                label="Drop Word files" accept=".docx,.doc,.txt"
                multiple={true} onFiles={handleWordUpload} hint=".docx / .doc / .txt"
              />
              <FileList files={wordFiles} onRemove={removeWord} icon="📝" />
            </div>
          </div>

          {/* Summary */}
          {hasAnySources && (
            <div style={{
              background: "var(--color-bg-secondary)", borderRadius: "var(--border-radius-md)",
              padding: "10px 12px", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 14,
            }}>
              {parsedExcels.map((pf, i) => (
                <div key={i}>📊 <strong>{pf.name}</strong> — {Object.entries(pf.sheets).map(([k, v]) => `${k} (${v.length} rows)`).join(", ")}</div>
              ))}
              {parsedWords.map((pf, i) => (
                <div key={i}>📝 <strong>{pf.name}</strong> — {pf.text.length} characters extracted</div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button style={btnStyle("var(--color-bg-secondary)", "var(--color-text-secondary)")} onClick={() => setStage("upload_template")}>← Back</button>
            <button style={btnStyle("var(--color-text-info)", "#fff", !hasAnySources)} disabled={!hasAnySources} onClick={() => setStage("describe")}>Next →</button>
          </div>
        </div>
      )}

      {/* ── Step 3: Describe ── */}
      {stage === "describe" && (
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: 3 }}>Additional instructions (optional)</h2>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 10 }}>
            Tell the AI anything specific about how to combine and present the data.
          </p>
          <div style={{
            background: "var(--color-bg-secondary)", borderRadius: "var(--border-radius-md)",
            padding: "9px 12px", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 12,
          }}>
            <strong>Ready to process: </strong>
            {parsedExcels.length > 0 && <><Badge color="green">{parsedExcels.length} Excel file{parsedExcels.length > 1 ? "s" : ""}</Badge>{" "}</>}
            {parsedWords.length > 0  && <><Badge color="blue">{parsedWords.length} Word doc{parsedWords.length > 1 ? "s" : ""}</Badge></>}
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Use supplier name from column B of Sheet 1 in the Excel. Include the full specification section from the Word doc. Label phase sections as Phase 1 – Design Freeze, Phase 2 – Prototype Sign-off."
            style={{
              width: "100%", minHeight: 90, fontSize: 13,
              background: "var(--color-bg-secondary)", color: "var(--color-text-primary)",
              border: "0.5px solid var(--color-border-secondary)",
              borderRadius: "var(--border-radius-md)", padding: 10, resize: "vertical",
            }}
          />
          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <button style={btnStyle("var(--color-bg-secondary)", "var(--color-text-secondary)")} onClick={() => setStage("upload_sources")}>← Back</button>
            <button style={btnStyle("var(--color-text-info)", "#fff")} onClick={generate}>✨ Generate document</button>
          </div>
        </div>
      )}

      {/* ── Generating ── */}
      {stage === "generating" && (
        <div style={{ ...card, textAlign: "center", padding: "44px 24px" }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>⚙️</div>
          <p style={{ fontWeight: 500, marginBottom: 6 }}>Generating your closing document…</p>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
            Reading all source files and populating your template.
          </p>
        </div>
      )}

      {/* ── Done ── */}
      {stage === "done" && (
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 22 }}>✅</span>
            <div>
              <p style={{ fontWeight: 500 }}>Document ready!</p>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                Review the preview below, then download your .docx file.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <button style={btnStyle("var(--color-text-success)", "#fff")} onClick={downloadDocx}>⬇ Download .docx</button>
            <button style={btnStyle("var(--color-bg-secondary)", "var(--color-text-secondary)")} onClick={reset}>Start over</button>
          </div>
          <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 6 }}>Preview</p>
          <pre style={{
            background: "var(--color-bg-secondary)", border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-md)", padding: 14, maxHeight: 400, overflowY: "auto",
            fontSize: 12, lineHeight: 1.7, color: "var(--color-text-primary)", whiteSpace: "pre-wrap",
            fontFamily: "var(--font-mono)",
          }}>
            {generatedContent}
          </pre>
        </div>
      )}
    </div>
  );
}