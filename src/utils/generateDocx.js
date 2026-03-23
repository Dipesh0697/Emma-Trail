import JSZip from "jszip";

/**
 * Converts AI-generated markdown-style text into a valid .docx blob.
 * Supports: # headings, ## headings, ### headings, **bold**, markdown tables.
 * @param {string} content  Markdown-style text from the AI
 * @returns {Promise<Blob>}  A .docx file blob ready for download
 */
export async function generateDocxBlob(content) {
  const bodyXml = buildBodyXml(content);

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const stylesXml = buildStylesXml();
  const relsXml   = buildRelsXml();
  const topRels   = buildTopRelsXml();
  const appXml    = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Closing Document Generator</Application></Properties>`;
  const coreXml   = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>Product Development Tool</dc:creator></cp:coreProperties>`;
  const typesXml  = buildContentTypesXml();

  const zip = new JSZip();
  zip.file("[Content_Types].xml", typesXml);
  zip.file("_rels/.rels",            topRels);
  zip.file("word/document.xml",      documentXml);
  zip.file("word/styles.xml",        stylesXml);
  zip.file("word/_rels/document.xml.rels", relsXml);
  zip.file("docProps/app.xml",       appXml);
  zip.file("docProps/core.xml",      coreXml);

  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderInline(line) {
  // Handle **bold** inline markers
  return line
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return `<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${esc(part.slice(2, -2))}</w:t></w:r>`;
      }
      return part ? `<w:r><w:t xml:space="preserve">${esc(part)}</w:t></w:r>` : "";
    })
    .join("");
}

function buildBodyXml(content) {
  let xml = "";
  const sections = content.split("\n\n");

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    // Headings
    if (trimmed.startsWith("### ")) {
      xml += `<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>${esc(trimmed.slice(4))}</w:t></w:r></w:p>`;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      xml += `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>${esc(trimmed.slice(3))}</w:t></w:r></w:p>`;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      xml += `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${esc(trimmed.slice(2))}</w:t></w:r></w:p>`;
      continue;
    }

    // Markdown table
    const lines = trimmed.split("\n");
    if (lines.some((l) => l.startsWith("|"))) {
      const tableLines = lines.filter((l) => l.startsWith("|"));
      const rows = tableLines
        .filter((l) => !l.match(/^\|[-| ]+\|$/))
        .map((l) =>
          l
            .split("|")
            .slice(1, -1)
            .map((c) => c.trim())
        );

      if (rows.length) {
        xml += `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="5000" w:type="pct"/></w:tblPr>`;
        rows.forEach((cells, ri) => {
          xml += `<w:tr>`;
          cells.forEach((cell) => {
            const bold = ri === 0 ? "<w:rPr><w:b/></w:rPr>" : "";
            xml += `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr><w:p><w:r>${bold}<w:t xml:space="preserve">${esc(cell)}</w:t></w:r></w:p></w:tc>`;
          });
          xml += `</w:tr>`;
        });
        xml += `</w:tbl><w:p/>`;
        continue;
      }
    }

    // Regular paragraph (with inline bold support)
    lines.forEach((line) => {
      xml += `<w:p>${renderInline(line)}</w:p>`;
    });
  }

  return xml;
}

function buildStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:sz w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:outlineLvl w:val="0"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="36"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:outlineLvl w:val="1"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="28"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:outlineLvl w:val="2"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="table" w:styleId="TableGrid">
    <w:name w:val="Table Grid"/>
    <w:tblPr>
      <w:tblBorders>
        <w:top    w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:left   w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:right  w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
      </w:tblBorders>
    </w:tblPr>
  </w:style>
</w:styles>`;
}

function buildRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"
    Target="styles.xml"/>
</Relationships>`;
}

function buildTopRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
    Target="word/document.xml"/>
  <Relationship Id="rId2"
    Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties"
    Target="docProps/core.xml"/>
  <Relationship Id="rId3"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties"
    Target="docProps/app.xml"/>
</Relationships>`;
}

function buildContentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml"  ContentType="application/xml"/>
  <Override PartName="/word/document.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/app.xml"
    ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml"
    ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;
}
