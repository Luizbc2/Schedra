import { DatabaseSync } from "node:sqlite";
import { writeFile } from "node:fs/promises";
import { schemaSql } from "../src/shared/database/schema.ts";

const db = new DatabaseSync(":memory:");
db.exec(schemaSql);
const names = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map((row) => row.name);
const types = { TEXT: "text", INTEGER: "integer", REAL: "double", BLOB: "blob" };
const lines = [
  "// Schema local implementado. Gerado do SQL real por npm run docs:local-db.",
  "// IDs de cliente/profissional/servico em appointments sao IDs da API, sem FK entre bancos.",
  "// preferences.scopeId tambem aceita device; por isso nao possui FK para scopes.",
  "Project Schedra_Local {", "  database_type: 'SQLite'", "  Note: 'Persistencia do aplicativo. Tokens ficam no SecureStore. Outbox de avatar ativa; comandos de negocio offline ainda pendentes.'", "}", "",
];
const references = [];
for (const name of names) {
  lines.push(`Table ${name} {`);
  for (const column of db.prepare(`PRAGMA table_info(${name})`).all()) {
    const settings = [];
    if (column.pk) settings.push("pk");
    if (column.notnull) settings.push("not null");
    if (column.dflt_value !== null) settings.push(`default: ${column.dflt_value}`);
    lines.push(`  ${column.name} ${types[column.type]}${settings.length ? ` [${settings.join(", ")}]` : ""}`);
  }
  const indices = db.prepare(`PRAGMA index_list(${name})`).all().filter((row) => row.origin !== "pk");
  if (indices.length) {
    lines.push("", "  indexes {");
    for (const index of indices) {
      const columns = db.prepare(`PRAGMA index_info(${index.name})`).all().map((row) => row.name);
      const settings = [index.unique ? "unique" : null, index.origin === "c" ? `name: '${index.name}'` : null].filter(Boolean);
      lines.push(`    (${columns.join(", ")})${settings.length ? ` [${settings.join(", ")}]` : ""}`);
    }
    lines.push("  }");
  }
  lines.push("}", "");
  const grouped = new Map();
  for (const key of db.prepare(`PRAGMA foreign_key_list(${name})`).all()) {
    const group = grouped.get(key.id) ?? [];
    group.push(key);
    grouped.set(key.id, group);
  }
  for (const keys of grouped.values()) {
    keys.sort((a, b) => a.seq - b.seq);
    const columns = (field) => keys.length === 1 ? keys[0][field] : `(${keys.map((row) => row[field]).join(", ")})`;
    references.push(`Ref: ${name}.${columns("from")} > ${keys[0].table}.${columns("to")}${keys[0].on_delete === "CASCADE" ? " [delete: cascade]" : ""}`);
  }
}
db.close();
lines.push(...references, "");
await writeFile(new URL("../../docs/diagrams/schedra-local.dbml", import.meta.url), lines.join("\n"));
console.log(`${names.length} tabelas e ${references.length} relacionamentos exportados para docs/diagrams/schedra-local.dbml`);
