const cp = require("child_process");
const failures = [];
try {
  for (const script of [
    "check-version",
    "check",
    "build",
    "check-build",
    "auth-regression",
    "firebase-runner-regression",
    "backup-tag-regression",
    "paperless-regression",
    "ine-pair-detect-test",
    "regression",
    "photo-layout-regression",
    "counter-desk-regression",
    "counter-desk-webkit-regression",
    "counter-desk-2-regression",
    "counter-desk-2-webkit-regression",
    "counter-final-regression",
    "counter-final-webkit-regression",
    "studio-regression",
    "service-flow-regression",
    "workbench-regression",
    "modern-regression",
    "workspace-polish-regression",
    "release329-regression",
    "operations330-regression",
    "id-pdf-intake-regression",
    "counter335-regression",
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
    "iphone-capture-regression",
    "document-regression",
    "mobile-local-regression",
    "mobile-experience-regression",
    "mobile-experience-webkit-regression",
    "mobile-webkit-regression",
    "practical-regression",
    ...(process.env.REALSCAN_TEST_RELAY === "1" ? ["delivery-regression"] : []),
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
      // An invalid build cannot be audited. Otherwise collect every failure
      // in one pass; publication still requires a zero exit status.
      if (script === "check-version" || script === "check" || script === "build" || script === "check-build") throw e;
    }
  }
  if (failures.length) { console.error("Failed checks: " + failures.join(", ")); process.exitCode = 1; }
} catch (e) {
  process.exitCode = 1;
}
