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
    "image-enhance-regression",
    "mobile-workflow-regression",
    "functional-audit-regression",
    "counter-regression",
    "journey-regression",
    "navigation-regression",
    "capture-regression",
    "quick-photos-regression",
    "quick-mode-docs-regression",
    "iphone-capture-regression",
    "document-regression",
    "mobile-local-regression",
    "mobile-experience-regression",
    "mobile-experience-webkit-regression",
    "mobile-webkit-regression",
    "practical-regression",
    "upgrade-regression",
    "legacy",
  ]) {
    try { cp.execFileSync(process.execPath, [...(process.platform === "win32" ? ["--require", "./scripts/windows-browser-runtime.cjs"] : []), "scripts/" + script + ".cjs"], {
      stdio: "inherit",
      env: {
        ...process.env,
        ...(script === "legacy" ? { REALSCAN_TEST_RELAY: "0" } : {}),
      },
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
