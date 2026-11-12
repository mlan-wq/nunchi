// Renders scripts/banners.html scenes to src/banners/*.jpg (run locally with Playwright; outputs are committed).
const { chromium } = require("playwright"); const fs = require("fs");
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.goto("file://" + __dirname + "/banners.html"); const names = await p.evaluate(() => window.sceneNames);
  fs.mkdirSync(__dirname + "/../src/banners", { recursive: true });
  for (const n of names) { const url = await p.evaluate(n => window.render(n), n); fs.writeFileSync(`${__dirname}/../src/banners/${n}.jpg`, Buffer.from(url.split(",")[1], "base64")); }
  fs.writeFileSync(__dirname + "/../src/banners/index.json", JSON.stringify(names)); console.log(names.length, "banners"); await b.close(); })();
