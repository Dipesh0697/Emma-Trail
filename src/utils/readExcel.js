import * as XLSX from "xlsx";

/**
 * Reads an Excel (.xlsx/.xls/.csv) file and returns structured sheet data.
 * @param {File} file
 * @returns {Promise<{ name: string, type: "excel", sheets: Record<string, object[]> }>}
 */
export function readExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array" });
        const sheets = {};
        wb.SheetNames.forEach((name) => {
          sheets[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: "" });
        });
        resolve({ name: file.name, type: "excel", sheets });
      } catch (err) {
        reject(new Error(`Failed to parse Excel file "${file.name}": ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error(`Could not read file "${file.name}"`));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Converts parsed Excel data to a human-readable text block for the AI prompt.
 * @param {Array} parsedFiles
 * @returns {string}
 */
export function excelToPromptText(parsedFiles) {
  return parsedFiles
    .map((pf) => {
      const sheetTexts = Object.entries(pf.sheets)
        .map(([sheetName, rows]) => {
          if (!rows.length) return `  Sheet "${sheetName}": (empty)`;
          const cols = Object.keys(rows[0]);
          const header = cols.join(" | ");
          const lines = rows
            .slice(0, 50)
            .map((row) => cols.map((c) => String(row[c] ?? "")).join(" | "));
          return `  Sheet "${sheetName}":\n  ${header}\n  ${lines.join("\n  ")}`;
        })
        .join("\n\n");
      return `[EXCEL] ${pf.name}\n${sheetTexts}`;
    })
    .join("\n\n---\n\n");
}
