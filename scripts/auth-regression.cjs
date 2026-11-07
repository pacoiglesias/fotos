const fs = require("fs"),
  vm = require("vm"),
  assert = require("assert"),
  { webcrypto } = require("crypto");
(async () => {
  const store = new Map(),
    elements = new Map();
  const element = (id) => {
    if (!elements.has(id))
      elements.set(id, {
        value: "",
        checked: false,
        textContent: "",
        offsetWidth: 0,
        classList: {
          add() {},
          remove() {},
          contains() {
            return false;
          },
        },
      });
    return elements.get(id);
  };
  const context = {
    console,
    crypto: webcrypto,
    TextEncoder,
    Date,
    Math,
    setTimeout,
    clearTimeout,
    AUTH_STORAGE_KEY: "synthetic-auth",
    DEFAULT_USER: "admin",
    DEFAULT_PIN_HASH: "test-default-hash",
    localStorage: {
      getItem: (k) => store.get(k) || null,
      setItem: (k, v) => store.set(k, String(v)),
    },
    $: element,
    document: { body: element("body") },
    showToast() {},
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("js/auth.js", "utf8"), context);
  context.logActivity = () => {};
  const password = "Synthetic-test-password-only",
    hash = await context.computeSha256(password);
  context.saveAuthData({
    users: [{ username: "admin", passwordHash: hash, role: "admin" }],
    currentUsername: "admin",
    sessionToken: null,
    sessionExpiry: 0,
  });
  element("loginUserInput").value = "admin";
  const results = [];
  for (const old of ["1313", "2026"]) {
    element("loginPassInput").value = old;
    await context.handleLoginSubmit({ preventDefault() {} });
    assert(
      !context.getAuthData().sessionToken,
      "Fixed password must not bypass a changed password",
    );
    assert.equal(context.getAuthData().users[0].passwordHash, hash);
    results.push("Fixed credential rejected after password change");
  }
  element("loginPassInput").value = password;
  await context.handleLoginSubmit({ preventDefault() {} });
  assert(
    context.getAuthData().sessionToken,
    "Changed password must still work",
  );
  results.push("Current password accepted");
  // F1: el login con un hash heredado (SHA-256) migra en silencio a PBKDF2
  // con sal, y el token de sesión es aleatorio (no Date.now()+Math.random).
  assert.ok(
    context.getAuthData().users[0].passwordHash.startsWith("pbkdf2$210000$"),
    "Legacy hash must migrate to PBKDF2 on first login",
  );
  assert.ok(
    context.getAuthData().sessionToken.startsWith("sess_"),
    "Session token must be random, not Date.now()+Math.random()",
  );
  results.push("Legacy password migrated to PBKDF2 with salt on login");
  // F1: mínimo de 12 caracteres para contraseñas nuevas.
  assert.ok(
    (await context.validateNewPassword("corta")) !== null,
    "Passwords shorter than 12 must be rejected",
  );
  assert.equal(
    await context.validateNewPassword("DoceCaracteres"),
    null,
    "A 12+ character password must be accepted",
  );
  results.push("New passwords require at least 12 characters");
  context.saveAuthData({
    users: [
      {
        username: "admin",
        passwordHash:
          context.LEGACY_PIN_HASH ||
          "158a323a7ba44870f23d96f1516dd70aa48e9a72db4ebb026b0a89e212a208ab",
        role: "admin",
      },
    ],
  });
  assert.equal(
    context.getAuthData().users[0].passwordHash,
    "158a323a7ba44870f23d96f1516dd70aa48e9a72db4ebb026b0a89e212a208ab",
  );
  results.push(
    "Loading stored accounts never silently resets an existing password",
  );
  fs.mkdirSync(".audit/repair-evidence", { recursive: true });
  fs.writeFileSync(
    ".audit/repair-evidence/auth.json",
    JSON.stringify(results, null, 2),
  );
  for (const name of results) console.log("PASS " + name);
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
