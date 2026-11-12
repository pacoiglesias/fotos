const cp = require("child_process");
const failures = [];
try {
  for (const script of [
    "check-version",
    "check",
    "build",
    "check-build",
    "pwa-activation-regression",
    "cache-lifecycle-regression",
    "auth-regression",
    "firebase-runner-regression",
    "backup-tag-regression",
    "audio-activation-regression",
    "paperless-regression",
    "paperless-ingest-regression",
    "paperless-explore-regression",
    "paperless-import-regression",
    "paperless-intake-regression",
    "ine-pair-detect-test",
    "regression",
    "diagnostics-regression",
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
    "final342-regression",
    "fixes3421-regression",
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
      // Anotación legible en la página de la ejecución de CI: nombra la
      // suite caída sin tener que abrir el registro completo.
      console.error("::error title=verify-fail::" + script);
      // An invalid build cannot be audited. Otherwise collect every failure
      // in one pass; publication still requires a zero exit status.
      if (script === "check-version" || script === "check" || script === "build" || script === "check-build") throw e;
    }
  }
  if (failures.length) { console.error("Failed checks: " + failures.join(", ")); process.exitCode = 1; }
  // En GitHub Actions, el resumen del job es legible sin abrir el log:
  // deja ahí el veredicto completo (suites fallidas o todo verde).
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      require("fs").appendFileSync(process.env.GITHUB_STEP_SUMMARY,
        "## RealScan verify\n\n" + (failures.length ? "Failed checks: " + failures.join(", ") + "\n" : "All checks passed.\n"));
    } catch {}
  }
} catch (e) {
  process.exitCode = 1;
}
