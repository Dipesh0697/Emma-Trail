/**
 * Dynamically loads the Mammoth library (browser bundle) if not already present.
 * @returns {Promise<void>}
 */
 export function loadMammoth() {
  return new Promise((resolve, reject) => {
    if (window.mammoth) return resolve();
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Failed to load Mammoth library"));
    document.head.appendChild(script);
  });
}

/**
 * Extracts plain text from a .docx / .doc / .txt file.
 * Requires loadMammoth() to have been called first for .docx/.doc files.
 * @param {File} file
 * @returns {Promise<{ name: string, type: "word", text: string }>}
 */
export async function readWordFile(file) {
  if (file.name.endsWith(".txt")) {
    const text = await file.text();
    return { name: file.name, type: "word", text };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const result = await window.mammoth.extractRawText({
          arrayBuffer: e.target.result,
        });
        resolve({ name: file.name, type: "word", text: result.value });
      } catch {
        resolve({
          name: file.name,
          type: "word",
          text: `[Could not extract text from "${file.name}"]`,
        });
      }
    };
    reader.onerror = () =>
      resolve({
        name: file.name,
        type: "word",
        text: `[Could not read "${file.name}"]`,
      });
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Converts parsed Word documents to a text block for the AI prompt.
 * @param {Array} parsedFiles
 * @returns {string}
 */
export function wordToPromptText(parsedFiles) {
  return parsedFiles
    .map((pf) => `[WORD DOC] ${pf.name}\n${pf.text}`)
    .join("\n\n---\n\n");
}
