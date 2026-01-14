import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const STUDENTS_DIR = path.join(ROOT, "data", "students");

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function listDirs(p) {
  if (!exists(p)) return [];
  return fs.readdirSync(p, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

function listJsonFiles(p) {
  if (!exists(p)) return [];
  return fs.readdirSync(p, { withFileTypes: true })
    .filter(d => d.isFile() && d.name.toLowerCase().endsWith(".json"))
    .map(d => d.name);
}

function yymmddToDate(yyMMdd) {
  // "260114" -> "2026-01-14" (2000년대 가정)
  if (!/^\d{6}$/.test(yyMMdd)) return null;
  const yy = Number(yyMMdd.slice(0, 2));
  const mm = Number(yyMMdd.slice(2, 4));
  const dd = Number(yyMMdd.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const year = 2000 + yy;
  const mm2 = String(mm).padStart(2, "0");
  const dd2 = String(dd).padStart(2, "0");
  return `${year}-${mm2}-${dd2}`;
}

function buildIndexForStudent(prefix, studentId) {
  const studentDir = path.join(STUDENTS_DIR, prefix, studentId);
  const setsDir = path.join(studentDir, "sets");

  const files = listJsonFiles(setsDir);

  // sets/*.json 파일명에서 ".json" 제거 후 정렬(최신이 위로)
  const items = files
    .map(fn => {
      const base = fn.replace(/\.json$/i, "");
      const date = yymmddToDate(base);
      const label = date ?? base;
      const relPath = `data/students/${prefix}/${studentId}/sets/${fn}`;
      return { yyMMdd: base, date, label, path: relPath };
    })
    .sort((a, b) => {
      // date 있으면 date 기준 내림차순, 없으면 문자열 내림차순
      if (a.date && b.date) return b.date.localeCompare(a.date);
      if (a.date && !b.date) return -1;
      if (!a.date && b.date) return 1;
      return b.yyMMdd.localeCompare(a.yyMMdd);
    });

  const out = {
    schemaVersion: 1,
    studentId,
    generatedAt: new Date().toISOString(),
    sets: items
  };

  const outPath = path.join(studentDir, "index.json");
  writeJson(outPath, out);

  return { studentId, count: items.length, outPath };
}

function main() {
  if (!exists(STUDENTS_DIR)) {
    console.log("No data/students directory. Nothing to do.");
    return;
  }

  const prefixes = listDirs(STUDENTS_DIR);
  let totalStudents = 0;

  for (const prefix of prefixes) {
    const prefixDir = path.join(STUDENTS_DIR, prefix);
    const studentIds = listDirs(prefixDir);

    for (const studentId of studentIds) {
      const setsDir = path.join(prefixDir, studentId, "sets");
      if (!exists(setsDir)) continue;

      const result = buildIndexForStudent(prefix, studentId);
      totalStudents++;
      console.log(`✅ ${result.studentId}: ${result.count} sets -> ${path.relative(ROOT, result.outPath)}`);
    }
  }

  console.log(`Done. Students processed: ${totalStudents}`);
}

main();
