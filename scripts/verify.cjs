const cp = require("child_process");
const failures = [];
try {
  for (const script of [
    "check-version",
    "check",
    "build",
    "check-build",
    "id-pdf-intake-regression",
    "counter335-regression",
    "review-settings-regression",
    "counter-evolution-regression",
    "review-complete-regression",
    "document-tools-regression",
    "identity-preparation-regression",
    "blank-pages-regression",
    "stage-completion-regression",
    "diagnostics-regression",
    "auto-straighten-test",
    "quality-check-test",
    "ocr-extract-test",
    "annotations-regression",
    "print-usability-regression",
    "cloud-recovery-regression",
  ]) {
    try { cp.execFileSync(process.execPath, [...(process.platform === "win32" ? ["--require", "./scripts/windows-browser-runtime.cjs"] : []), "scripts/" + script + ".cjs"], {
      stdio: "inherit",
      env: { ...process.env },
    }); } catch (e) {
      failures.push(script);
      console.error("FAIL " + script);
      if (script === "check-version" || script === "check" || script === "build" || script === "check-build") throw e;
    }
  }
  if (failures.length) { console.error("Failed checks: " + failures.join(", ")); process.exitCode = 1; }
} catch (e) {
  process.exitCode = 1;
}
