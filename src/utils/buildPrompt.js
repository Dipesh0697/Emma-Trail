import { excelToPromptText } from "./readExcel.js";
import { wordToPromptText } from "./readWord.js";

/**
 * Builds the prompt sent to the Claude API.
 * @param {{ templateText: string, parsedExcels: Array, parsedWords: Array, description: string }} opts
 * @returns {string}
 */
export function buildPrompt({ templateText, parsedExcels, parsedWords, description }) {
  const excelSection = parsedExcels.length
    ? `## Excel phase files (${parsedExcels.length} file(s))\n\n${excelToPromptText(parsedExcels)}`
    : "";

  const wordSection = parsedWords.length
    ? `## Word source documents (${parsedWords.length} file(s))\n\n${wordToPromptText(parsedWords)}`
    : "";

  return `You are a document automation assistant for a product development team.

Your job: populate a final supplier closing Word document using data from Excel phase files and Word source documents.

## Template structure
${templateText || "(No template provided — infer a professional closing document structure)"}

${excelSection}

${wordSection}

## Additional instructions from user
${description || "None."}

## Task
- Extract all key fields (supplier names, dates, part numbers, approval statuses, references) from ALL source files.
- Include relevant tables from Excel data using markdown table format (| col | col |).
- Incorporate relevant content from the Word documents (specifications, agreements, descriptions).
- Do NOT duplicate content — if the same information appears in multiple source files, include it once.
- Format the output as a professional supplier development closing document.
- Use markdown: # for the main title, ## for section headers, ### for subsections, **bold** for field labels.
- Output ONLY the document content — no preamble, no explanation, just the document.`;
}
