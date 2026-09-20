import fs from "node:fs";
import path from "node:path";
import { questionsRoot } from "./questions-fs";

const src = questionsRoot();
const destCandidates = [
  path.resolve(process.cwd(), "apps/web/public/questions"),
  path.resolve(process.cwd(), "public/questions"),
];
const dest = fs.existsSync(path.dirname(destCandidates[0]))
  ? destCandidates[0]
  : destCandidates[1];

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log(`Copied questions to ${dest}`);
