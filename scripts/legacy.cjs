const fs = require("fs"),
  cp = require("child_process");
const results = [];
for (const file of fs.readdirSync(".").filter((x) => /^test_.*\.js$/.test(x))) {
  const result = cp.spawnSync(process.execPath, [file], {
    encoding: "utf8",
    timeout: 120000,
  });
  fs.mkdirSync(".audit/repair-evidence", { recursive: true });
  fs.writeFileSync(
    ".audit/repair-evidence/" + file + ".log",
    (result.stdout || "") + (result.stderr || ""),
  );
  results.push({ file, exit: result.status });
  console.log((result.status === 0 ? "PASS " : "FAIL ") + file);
  if (result.status !== 0) {
    console.error((result.stderr || result.stdout || "").slice(-1800));
    process.exitCode = 1;
  }
}
fs.writeFileSync(
  ".audit/repair-evidence/legacy-tests.json",
  JSON.stringify(results, null, 2),
);
