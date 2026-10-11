const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../assets");
const failures = [];
let checked = 0;
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) { walk(filename); continue; }
    const extension = path.extname(filename).toLowerCase();
    if (![".png", ".jpg", ".jpeg"].includes(extension)) continue;
    const bytes = fs.readFileSync(filename);
    const valid = extension === ".png"
      ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    checked++;
    if (!valid) failures.push(path.relative(root, filename));
  }
}
walk(root);
if (failures.length) {
  console.error("Image content does not match its filename extension:\n" + failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated PNG/JPEG signatures for ${checked} image assets.`);
}
