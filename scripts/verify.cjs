const cp = require("child_process");
const failures = [];
try {
  for (const script of [
    "check",
    "build",
    "auth-regression",
    "firebase-runner-regression",
    "regression",
    "photo-layout-regression",
    "studio-regression",
    "service-flow-regression",
    "workbench-regression",
    "modern-regression",
    "annotations-regression",
    "print-usability-regression",
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
    try { cp.execFileSync(process.execPath, ["scripts/" + script + ".cjs"], {
      stdio: "inherit",
      env: {
        ...process.env,
        ...(script === "legacy" ? { REALSCAN_TEST_RELAY: "0" } : {}),
      },
    }); } catch (e) { failures.push(script); console.error("FAIL " + script); if (["check", "build"].includes(script)) throw e; }
  }
  if (failures.length) { console.error("Failed checks: " + failures.join(", ")); process.exitCode = 1; }
} catch (e) {
  process.exitCode = 1;
}
