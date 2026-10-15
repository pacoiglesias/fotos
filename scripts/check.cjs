const fs = require("fs"),
  cp = require("child_process"),
  assert = require("assert");
for (const file of [
  "package.json",
  "firebase.json",
  "firebase.secondary.json",
  "database.rules.json",
  "manifest.json",
])
  JSON.parse(fs.readFileSync(file, "utf8"));
for (const dir of ["js", "scripts", "src"])
  for (const f of fs
    .readdirSync(dir)
    .filter((x) => /\.(js|cjs|mjs)$/.test(x))) {
    cp.execFileSync(process.execPath, ["--check", dir + "/" + f], {
      stdio: "inherit",
    });
  }
for (const file of ["index.html", "phone-upload.html", "phone-download.html"]) {
  const source = fs.readFileSync(file, "utf8");
  assert(
    !/https:\/\/(cdn\.tailwindcss|cdnjs\.cloudflare)/.test(source),
    file + " still loads runtime CDNs",
  );
  for (const m of source.matchAll(
    /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g,
  )) {
    new Function(m[1]);
  }
}
console.log("Syntax and local dependencies verified.");
