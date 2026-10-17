const cp = require("child_process");
try {
  for (const script of [
    "check",
    "build",
    "auth-regression",
    "regression",
    "photo-layout-regression",
    "mobile-workflow-regression",
    "functional-audit-regression",
    "counter-regression",
    "navigation-regression",
    "capture-regression",
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
