const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Navigate to the Wikipedia page containing the Ontario cities table
    await page.goto('https://en.wikipedia.org/wiki/List_of_cities_in_Ontario', { waitUntil: 'networkidle2' });

    // Extract the list of city names
    const ontarioCities = await page.evaluate(() => {
        const cities = [];
        const rows = document.querySelectorAll('.wikitable tbody tr');

        rows.forEach(row => {
            const cityNameCell = row.querySelector('td:nth-child(1) a');
            if (cityNameCell) {
                cities.push(cityNameCell.textContent.trim());
            }
        });

        return cities;
    });

    console.log(ontarioCities);

    await browser.close();
})();
