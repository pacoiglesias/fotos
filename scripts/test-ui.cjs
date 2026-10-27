// Open the actual disclosure before exercising per-image legacy controls.
// No forced clicks: the controls must be reachable through the visible UI.
async function openImageTools(page) {
  await page.waitForFunction(() => !!window.RealScanWorkspacePolish && !!document.getElementById('workspaceSlotOptions'));
  const panel = page.locator('#workspaceSlotOptions');
  if (!(await panel.evaluate(e => e.open))) await panel.locator(':scope > summary').click();
}
module.exports = {openImageTools};
