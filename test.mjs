import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Point the program's output at a temp dir before importing main.ts,
// because importing it runs main() once.
process.env.MAKEFUN_OUTPUT_DIR = mkdtempSync(join(tmpdir(), "obl-test-"));
const { validateEntry, ENTRY, MAX_CHARS, main } = await import("./main.ts");

test("entry passes the validator and fits the 1-200 char gate", () => {
  assert.equal(validateEntry(ENTRY), ENTRY);
  const chars = [...ENTRY].length;
  assert.ok(chars >= 1 && chars <= MAX_CHARS, `chars=${chars}`);
  assert.equal(ENTRY.includes("\n"), false);
});

test("two runs in different output dirs are byte-identical", () => {
  const dirA = mkdtempSync(join(tmpdir(), "obl-a-"));
  const dirB = mkdtempSync(join(tmpdir(), "obl-b-"));
  process.env.MAKEFUN_OUTPUT_DIR = dirA;
  main();
  process.env.MAKEFUN_OUTPUT_DIR = dirB;
  main();
  const a = readFileSync(join(dirA, "entry.txt"));
  const b = readFileSync(join(dirB, "entry.txt"));
  assert.deepEqual(a, b);
  assert.equal(a.toString("utf8"), ENTRY);
});

test("validator rejects an entry over 200 characters", () => {
  assert.throws(() => validateEntry("x".repeat(201)), /200/);
  assert.throws(() => validateEntry(ENTRY + " ".repeat(200)), /200/);
});

test("validator rejects whitespace-only and empty entries", () => {
  assert.throws(() => validateEntry("   "), /whitespace/);
  assert.throws(() => validateEntry(""), /1-200/);
});

test("validator rejects multi-line entries", () => {
  assert.throws(() => validateEntry("line one\nline two"), /single line/);
  assert.throws(() => validateEntry("line one\rline two"), /single line/);
});

test("validator rejects leading and trailing whitespace", () => {
  assert.throws(() => validateEntry(" " + ENTRY), /leading or trailing/);
  assert.throws(() => validateEntry(ENTRY + " "), /leading or trailing/);
  assert.throws(() => validateEntry(ENTRY + "\t"), /leading or trailing/);
});

test("validator rejects control characters", () => {
  assert.throws(() => validateEntry("funny\x07line"), /control/);
  assert.throws(() => validateEntry("funny\x1bline"), /control/);
});

test("validator rejects entries with no letters", () => {
  assert.throws(() => validateEntry("12345 !!!"), /letter/);
});

test("validator accepts exactly 200 characters", () => {
  const ok = "a".repeat(199) + ".";
  assert.equal(validateEntry(ok), ok);
});
