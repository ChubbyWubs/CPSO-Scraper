const puppeteer = require('puppeteer');
const fs = require('fs');
const csvWriter = require('csv-writer').createObjectCsvWriter;

const extractDataFromPage = async (page) => {
    return await page.evaluate(() => {
        const results = [];
        const doctorElements = document.querySelectorAll('.doctor-search-results--result');

        doctorElements.forEach(doctor => {
            const nameElement = doctor.querySelector('h3 a');
            const name = nameElement ? nameElement.textContent.trim() : null;
            const link = nameElement ? nameElement.href : null;

            const locationHeader = Array.from(doctor.querySelectorAll('h4')).find(h4 => h4.textContent.includes('Location of Practice'));
            const locationElement = locationHeader ? locationHeader.nextElementSibling : null;
            let address = "DNE", phoneNumber = "DNE", faxNumber = "DNE";

            if (locationElement) {
                address = locationElement.textContent.trim().replace(/\s+/g, ' ').replace(/Â/g, '');

                const paragraphs = locationElement.parentElement.querySelectorAll('p');
                paragraphs.forEach(p => {
                    if (p.textContent.includes('Phone:')) {
                        phoneNumber = p.textContent.split('Phone:')[1].split('\n')[0].trim();
                    }
                    if (p.textContent.includes('Fax:')) {
                        faxNumber = p.textContent.split('Fax:')[1].split('\n')[0].trim();
                    }
                });
            }

            results.push({ name, link, address, phoneNumber, faxNumber });
        });

        return results;
    });
};

const saveDataToCsv = (data) => {
    const csv = csvWriter({
        path: 'doctors.csv',
        header: [
            { id: 'name', title: 'Name' },
            { id: 'link', title: 'Link' },
            { id: 'address', title: 'Address' },
            { id: 'phoneNumber', title: 'Phone Number' },
            { id: 'faxNumber', title: 'Fax Number' },
        ]
    });

    csv.writeRecords(data)
        .then(() => console.log('Data written to CSV successfully.'));
};

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Navigate to the initial page
    await page.goto('https://www.cpso.on.ca/en/Public/Doctor-Search?search=general');

    try {
        // Set only the necessary fields
        await page.evaluate(() => {
            const setCheckedValue = (selector, checked) => {
                const element = document.querySelector(selector);
                if (element) {
                    element.checked = checked;
                } else {
                    console.warn(`Element not found for selector: ${selector}`);
                }
            };

            setCheckedValue('input[name="Gender"][value="M"]', true);
            setCheckedValue('input[name="DocType"][value="rdoDocTypeFamly"]', true);

            // Click the submit button
            const submitButton = document.querySelector('input[name="p$lt$ctl01$pageplaceholder$p$lt$ctl02$CPSO_AllDoctorsSearch$btnSubmit1"]');
            if (submitButton) {
                submitButton.click();
            } else {
                console.error('Submit button not found.');
            }
        });

        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        const allResults = [];
        const totalPages = 3;
        let pageCount = 1;
        let hasNextPage = true;

        while (hasNextPage && pageCount <= totalPages) {
            // Extract data from the current page
            const results = await extractDataFromPage(page);
            allResults.push(...results);

            // Update page numbers for the next iteration
            const nextPage = pageCount + 1;

            // Click the pagination button
            hasNextPage = await page.evaluate((nextPage) => {
                const nextPageButton = document.querySelector(`button[name="newPageNumber"][value="${nextPage}"]`);
                if (nextPageButton) {
                    nextPageButton.click();
                    return true;
                } else {
                    console.error(`Pagination button for page ${nextPage} not found.`);
                    return false;
                }
            }, nextPage);

            if (!hasNextPage) {
                console.error('Failed to navigate to the next page.');
                break;
            }

            // Wait for the navigation to complete
            try {
                await page.waitForNavigation({ waitUntil: 'networkidle2' });
            } catch (error) {
                console.error('Navigation error:', error);
                hasNextPage = false;
                break;
            }

            pageCount++;
        }

        await browser.close();

        // Save results to CSV
        saveDataToCsv(allResults);
    } catch (error) {
        console.error('Error during script execution:', error);
        await browser.close();
    }
})();