// Exercises the deployed rules using disposable anonymous accounts and synthetic records.
const fs = require("fs"),
  crypto = require("crypto"),
  assert = require("assert"),
  vm = require("vm");
const cfg = { window: {} };
vm.runInNewContext(fs.readFileSync("js/firebase-config.js", "utf8"), cfg);
const c = cfg.window.REALSCAN_FIREBASE_CONFIG;
async function guest() {
  const r = await fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" + c.apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true }),
    },
  );
  if (!r.ok) throw Error("Cannot create disposable test account");
  return r.json();
}
async function request(path, token, method = "GET", body) {
  return fetch(
    c.databaseURL +
      "/" +
      path +
      ".json" +
      (token ? "?auth=" + encodeURIComponent(token) : ""),
    {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
  );
}
(async () => {
  const [owner, client] = await Promise.all([guest(), guest()]),
    secret = crypto.randomBytes(32).toString("hex"),
    container = "transfers/" + owner.localId + "/receive",
    path = container + "/sessions/" + secret,
    results = [];
  const check = (name, ok) => {
    assert(ok, name);
    results.push(name);
    console.log("PASS " + name);
  };
  try {
    const created = await request(container, owner.idToken, "PUT", {
      token: secret,
      sessions: {
        [secret]: {
          ownerUid: owner.localId,
          kind: "receive",
          createdAt: { ".sv": "timestamp" },
          expiresAt: Date.now() + 6000,
        },
      },
    });
    check("Owner can create a bounded temporary session", created.ok);
    check(
      "Unauthenticated listing denied",
      !(await request("transfers", null)).ok,
    );
    check(
      "Authenticated listing denied",
      !(await request("transfers", client.idToken)).ok,
    );
    check(
      "Owner identity does not permit enumerating session secrets",
      !(await request("transfers/" + owner.localId, client.idToken)).ok,
    );
    check(
      "Valid bearer link works during its lifetime",
      (await request(path, client.idToken)).ok,
    );
    check(
      "Wrong session secret denied",
      !(
        await request(
          container + "/sessions/" + crypto.randomBytes(32).toString("hex"),
          client.idToken,
        )
      ).ok,
    );
    const file = {
      name: "synthetic.png",
      type: "image/png",
      dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB",
      size: 32,
      hash: "a".repeat(64),
      senderUid: client.localId,
      createdAt: { ".sv": "timestamp" },
      accepted: false,
    };
    check(
      "Ninth file slot denied",
      !(await request(path + "/files/8", client.idToken, "PUT", file)).ok,
    );
    check(
      "Invalid file format denied",
      !(
        await request(path + "/files/0", client.idToken, "PUT", {
          ...file,
          type: "text/html",
        })
      ).ok,
    );
    check(
      "Oversized payload declaration denied",
      !(
        await request(path + "/files/0", client.idToken, "PUT", {
          ...file,
          size: 7 * 1024 * 1024,
        })
      ).ok,
    );
    check(
      "Active client can submit a file",
      (await request(path + "/files/0", client.idToken, "PUT", file)).ok,
    );
    check(
      "Client cannot acknowledge its own upload",
      !(
        await request(path + "/files/0", client.idToken, "PATCH", {
          accepted: true,
        })
      ).ok,
    );
    check(
      "Client cannot delete or revoke the operator session",
      !(await request(container, client.idToken, "DELETE")).ok,
    );
    await new Promise((r) => setTimeout(r, 6500));
    check(
      "Expired session denied by server clock",
      !(await request(path, client.idToken)).ok,
    );
    check(
      "Late upload denied by server clock",
      !(await request(path + "/files/1", client.idToken, "PUT", file)).ok,
    );
  } finally {
    await request(container, owner.idToken, "DELETE");
  }
  fs.mkdirSync(".audit/repair-evidence", { recursive: true });
  fs.writeFileSync(
    ".audit/repair-evidence/rules.json",
    JSON.stringify(results, null, 2),
  );
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
