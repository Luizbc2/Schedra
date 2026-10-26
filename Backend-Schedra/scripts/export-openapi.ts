import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { openApiDocument } from "../src/docs/openapi";

const destination = resolve(__dirname, "../../docs/api/openapi.json");
const content = JSON.stringify(openApiDocument, null, 2) + "\n";
async function run(): Promise<void> {
  if (process.argv.includes("--check")) {
    if (await readFile(destination, "utf8") !== content) throw new Error("OpenAPI export desatualizado; execute npm run docs:openapi.");
  } else {
    await mkdir(resolve(destination, ".."), { recursive: true });
    await writeFile(destination, content);
  }
  console.log("OpenAPI: docs/api/openapi.json corresponde ao contrato servido.");
}
void run().catch(error => { console.error(error); process.exitCode = 1; });
