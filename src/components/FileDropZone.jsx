import { useRef, useState } from "react";

export default function FileDropZone({ label, accept, multiple, onFiles, hint }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  const handle = (fileList) => {
    const exts = accept.split(",").map((e) => e.trim().replace(/^\./, "").toLowerCase());
    const arr = Array.from(fileList).filter((f) =>
      exts.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    if (arr.length) onFiles(arr);
  };

  return (
    <div
      onClick={() => inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files); }}
      style={{
        border: `1.5px dashed ${dragging ? "var(--color-text-info)" : "var(--color-border-secondary)"}`,
        borderRadius: "var(--border-radius-lg)",
        padding: "20px 16px",
        textAlign: "center",
        cursor: "pointer",
        background: dragging ? "var(--color-bg-info)" : "var(--color-bg-secondary)",
        transition: "all 0.15s",
        userSelect: "none",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: "none" }}
        onChange={(e) => handle(e.target.files)}
      />
      <div style={{ fontSize: 24, marginBottom: 6 }}>📂</div>
      <div style={{ fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 3, fontSize: 14 }}>
        {label}
      </div>
      {hint && (
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{hint}</div>
      )}
    </div>
  );
}