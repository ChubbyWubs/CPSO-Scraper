const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://example.com');
  await page.screenshot({ path: 'example.png' });

  await browser.close();
})();

const doc = document.querySelectorAll(".doctor-search-results--result");

doc.forEach((d) => {
  const name = d.querySelector("h3").innerText.trim();
  const link = d.querySelector("a").href;

  console.log(name, link);
});

const post = fetch("https://example.com", {
    method: "POST",
    headers: {
        
        "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, link }),
    });