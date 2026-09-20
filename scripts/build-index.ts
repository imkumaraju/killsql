import fs from "node:fs";
import path from "node:path";
import { loadAllQuestions, questionsRoot, toSummary } from "./questions-fs";

const questions = loadAllQuestions();
const index = questions.map(toSummary);
const out = path.join(questionsRoot(), "index.json");
fs.writeFileSync(out, JSON.stringify(index, null, 2) + "\n");
console.log(`Wrote ${index.length} questions to ${out}`);
