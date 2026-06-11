import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const appRoot = process.cwd();
const workspaceRoot = path.resolve(appRoot, "..");
const markdownDir = path.join(workspaceRoot, "amc8-markdown");
const pdfDir = path.join(workspaceRoot, "Material", "AMC8 Problems");
const outputDir = path.join(appRoot, "public", "content");
const contestDir = path.join(outputDir, "contests");

if (!existsSync(markdownDir) || !existsSync(pdfDir)) {
  console.log(
    "Local source materials are not present; using the committed contest dataset.",
  );
  process.exit(0);
}

await mkdir(contestDir, { recursive: true });

const markdownFiles = (await readdir(markdownDir))
  .filter((name) => /^AMC8_\d{4}\.md$/.test(name))
  .sort();
const pdfFiles = (await readdir(pdfDir))
  .filter((name) => /\.pdf$/i.test(name))
  .sort();

const answerKeys = new Map();
for (const file of markdownFiles) {
  const year = Number(file.match(/\d{4}/)?.[0]);
  const content = await readFile(path.join(markdownDir, file), "utf8");
  const answerSection = content.split(/## Answer Key/i)[1] ?? "";
  const answers = [...answerSection.matchAll(/\|\s*(\d{1,2})\s*\|\s*\*\*([A-E])\*\*\s*\|/g)]
    .sort((a, b) => Number(a[1]) - Number(b[1]))
    .map((match) => match[2]);
  if (answers.length === 25) {
    answerKeys.set(year, answers);
  }
}

const contests = [];
for (const file of pdfFiles) {
  const year = Number(file.match(/\d{4}/)?.[0]);
  const normalizedName = `AMC8_${year}.pdf`;
  await copyFile(path.join(pdfDir, file), path.join(contestDir, normalizedName));
  contests.push({
    year,
    questionCount: 25,
    durationMinutes: 40,
    pdfUrl: `/content/contests/${normalizedName}`,
    answers: answerKeys.get(year) ?? null,
    sourceUrl:
      year >= 2025
        ? `https://live.poshenloh.com/past-contests/amc8/${year}`
        : `https://artofproblemsolving.com/wiki/index.php/${year}_AMC_8_Problems`,
    status: answerKeys.has(year) ? "scored" : "practice-only",
  });
}

contests.sort((a, b) => b.year - a.year);
await writeFile(
  path.join(outputDir, "contests.json"),
  `${JSON.stringify(contests, null, 2)}\n`,
  "utf8",
);

console.log(
  `Imported ${contests.length} contest PDFs; ${answerKeys.size} have complete answer keys.`,
);
