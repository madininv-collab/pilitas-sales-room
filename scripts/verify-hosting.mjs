import {readFileSync} from "node:fs";
const expected = process.argv[2];
if (!expected) throw new Error("Provide the intended destination project ID.");
const source = JSON.parse(readFileSync(new URL("../.openai/hosting.json", import.meta.url), "utf8"));
const built = JSON.parse(readFileSync(new URL("../dist/.openai/hosting.json", import.meta.url), "utf8"));
if (source.project_id !== expected || built.project_id !== expected)
  throw new Error("Hosting identity mismatch. Set the intended destination before rebuilding.");
console.log("Source and build match the intended project.");
