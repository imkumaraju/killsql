import { splitSqlStatements } from "./validator";

export type SchemaColumn = {
  name: string;
  type: string;
};

export type SchemaTable = {
  name: string;
  columns: SchemaColumn[];
  rows: Record<string, unknown>[];
};

function skipWs(input: string, index: number) {
  while (index < input.length && /\s/.test(input[index] ?? "")) index += 1;
  return index;
}

function isIdentChar(char: string | undefined) {
  return Boolean(char && /[A-Za-z0-9_]/.test(char));
}

function parseQuoted(input: string, start: number): { value: string; next: number } {
  if (input[start] !== "'") {
    throw new Error(`Expected quoted string at ${start}`);
  }
  let index = start + 1;
  let value = "";
  while (index < input.length) {
    const char = input[index];
    if (char === "'" && input[index + 1] === "'") {
      value += "'";
      index += 2;
      continue;
    }
    if (char === "'") {
      return { value, next: index + 1 };
    }
    value += char;
    index += 1;
  }
  throw new Error("Unclosed string literal");
}

function parseLiteral(input: string, start: number): { value: unknown; next: number } {
  const index = skipWs(input, start);
  const rest = input.slice(index);
  const upper = rest.toUpperCase();

  if (upper.startsWith("NULL") && !isIdentChar(rest[4])) {
    return { value: null, next: index + 4 };
  }
  if (upper.startsWith("TRUE") && !isIdentChar(rest[4])) {
    return { value: true, next: index + 4 };
  }
  if (upper.startsWith("FALSE") && !isIdentChar(rest[5])) {
    return { value: false, next: index + 5 };
  }
  if (upper.startsWith("DATE") && !isIdentChar(rest[4])) {
    return parseQuoted(input, skipWs(input, index + 4));
  }
  if (upper.startsWith("TIMESTAMP") && !isIdentChar(rest[9])) {
    return parseQuoted(input, skipWs(input, index + 9));
  }
  if (rest.startsWith("'")) {
    return parseQuoted(input, index);
  }

  const number = rest.match(/^[+-]?\d+(?:\.\d+)?/);
  if (number) {
    return { value: Number(number[0]), next: index + number[0].length };
  }

  throw new Error(`Unexpected SQL value near "${rest.slice(0, 24)}"`);
}

function splitTopLevel(input: string, delimiter: string) {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  let inString = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (inString) {
      current += char;
      if (char === "'" && input[index + 1] === "'") {
        current += input[index + 1];
        index += 1;
      } else if (char === "'") {
        inString = false;
      }
      continue;
    }
    if (char === "'") {
      inString = true;
      current += char;
      continue;
    }
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === delimiter && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseCreateTable(sql: string): SchemaTable | null {
  const match = sql.match(
    /^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z_][\w]*)\s*\(([\s\S]*)\)\s*$/i,
  );
  if (!match) return null;
  const columns = splitTopLevel(match[2], ",").flatMap((part) => {
    const column = part.trim().match(/^([A-Za-z_][\w]*)\s+(.+)$/);
    if (!column) return [];
    return [{ name: column[1], type: column[2].trim() }];
  });
  return { name: match[1], columns, rows: [] };
}

function parseInsert(sql: string): { table: string; rows: unknown[][] } | null {
  const match = sql.match(/^INSERT\s+INTO\s+([A-Za-z_][\w]*)\s+VALUES\s*([\s\S]*)$/i);
  if (!match) return null;

  const rows: unknown[][] = [];
  let index = skipWs(match[2], 0);
  while (index < match[2].length) {
    index = skipWs(match[2], index);
    if (index >= match[2].length) break;
    if (match[2][index] !== "(") {
      throw new Error(`Expected '(' in INSERT for ${match[1]}`);
    }
    index += 1;
    const values: unknown[] = [];
    while (index < match[2].length) {
      const parsed = parseLiteral(match[2], index);
      values.push(parsed.value);
      index = skipWs(match[2], parsed.next);
      const next = match[2][index];
      if (next === ",") {
        index += 1;
        continue;
      }
      if (next === ")") {
        index += 1;
        break;
      }
      throw new Error(`Expected ',' or ')' in INSERT for ${match[1]}`);
    }
    rows.push(values);
    index = skipWs(match[2], index);
    if (match[2][index] === ",") {
      index += 1;
      continue;
    }
    break;
  }

  return { table: match[1], rows };
}

export function parseSchemaSql(sql: string): SchemaTable[] {
  const tables: SchemaTable[] = [];
  const byName = new Map<string, SchemaTable>();

  for (const statement of splitSqlStatements(sql)) {
    const created = parseCreateTable(statement);
    if (created) {
      tables.push(created);
      byName.set(created.name.toLowerCase(), created);
      continue;
    }

    const inserted = parseInsert(statement);
    if (!inserted) continue;
    const table = byName.get(inserted.table.toLowerCase());
    if (!table) continue;
    for (const values of inserted.rows) {
      const row: Record<string, unknown> = {};
      table.columns.forEach((column, index) => {
        row[column.name] = values[index] ?? null;
      });
      table.rows.push(row);
    }
  }

  return tables;
}
