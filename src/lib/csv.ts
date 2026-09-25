const MAX_CSV_BYTES = 2_000_000;

/**
 * Parses CSV text (RFC 4180 flavor: quoted fields, escaped quotes,
 * CRLF/CR/LF) into rows, stopping after maxRows. The caller is responsible
 * for interpreting headers and bounding what it reads from each row.
 */
export function parseCsv(text: string, maxRows: number): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0; // skip BOM

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  for (; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      endField();
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      endRow();
      if (rows.length >= maxRows) return rows;
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) endRow();
  return rows;
}

/** Reads an uploaded CSV file, or null when missing/empty/too large. */
export async function readCsvUpload(
  value: FormDataEntryValue | null,
): Promise<string | null> {
  if (!(value instanceof File)) return null;
  if (value.size === 0 || value.size > MAX_CSV_BYTES) return null;
  return value.text();
}
