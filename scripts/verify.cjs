const cp = require("child_process");
try {
  for (const script of [
    "check",
    "build",
    "auth-regression",
    "regression",
    "photo-layout-regression",
    "studio-regression",
    "service-flow-regression",
    "workbench-regression",
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
    "mobile-webkit-regression",
    "practical-regression",
    ...(process.env.REALSCAN_TEST_RELAY === "1" ? ["delivery-regression"] : []),
    "upgrade-regression",
    "legacy",
  ])
    cp.execFileSync(process.execPath, ["scripts/" + script + ".cjs"], {
      stdio: "inherit",
      env: {
        ...process.env,
        ...(script === "legacy" ? { REALSCAN_TEST_RELAY: "0" } : {}),
      },
    });
} catch (e) {
  process.exitCode = 1;
}
