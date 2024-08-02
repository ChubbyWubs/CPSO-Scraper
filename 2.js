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
                const locationText = locationElement.textContent.trim().replace(/Â/g, '').replace(/\s+/g, ' ');
                const phoneIndex = locationText.indexOf('Phone:');
                const faxIndex = locationText.indexOf('Fax:');

                if (phoneIndex !== -1) {
                    address = locationText.substring(0, phoneIndex).trim();
                    phoneNumber = locationText.substring(phoneIndex, faxIndex !== -1 ? faxIndex : locationText.length).replace('Phone:', '').trim();
                } else {
                    address = locationText;
                }

                if (faxIndex !== -1) {
                    faxNumber = locationText.substring(faxIndex).replace('Fax:', '').trim();
                }

                // Clean up any remaining unwanted characters from phone and fax numbers
                phoneNumber = phoneNumber.replace(/[^0-9()\- ]/g, '');
                faxNumber = faxNumber.replace(/[^0-9()\- ]/g, '');
            }

            // Create hyperlink for the name
            const hyperlink = `=HYPERLINK("${link}", "${name}")`;

            results.push({ hyperlink, address, phoneNumber, faxNumber });
        });

        return results;
    });
};

const saveDataToCsv = async (data, filename, retryCount = 3) => {
    const csv = csvWriter({
        path: filename,
        header: [
            { id: 'hyperlink', title: 'Name' },
            { id: 'address', title: 'Address' },
            { id: 'phoneNumber', title: 'Phone Number' },
            { id: 'faxNumber', title: 'Fax Number' },
        ]
    });

    for (let attempt = 0; attempt < retryCount; attempt++) {
        try {
            await csv.writeRecords(data);
            console.log(`Data written to ${filename} successfully.`);
            return;
        } catch (error) {
            if (error.code === 'EBUSY') {
                console.error(`File is busy. Retry attempt ${attempt + 1}/${retryCount}`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before retrying
            } else {
                throw error;
            }
        }
    }

    console.error(`Failed to write to ${filename} after multiple attempts.`);
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

            setCheckedValue('input[name="Gender"][value=""]', true);
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

        let allResults = [];
        const pagesPerFile = 500;
        let pageCount = 1;
        let hasNextPage = true;

        while (hasNextPage) {
            // Extract data from the current page
            const results = await extractDataFromPage(page);
            allResults.push(...results);

            // Save data to CSV every 500 pages
            if (pageCount % pagesPerFile === 0) {
                const filename = `doctors_part${pageCount / pagesPerFile}.csv`;
                await saveDataToCsv(allResults, filename);
                allResults = []; // Reset results after saving
            }

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

        // Save remaining data if any
        if (allResults.length > 0) {
            const filename = `doctors_part${Math.ceil(pageCount / pagesPerFile)}.csv`;
            await saveDataToCsv(allResults, filename);
        }

        await browser.close();
    } catch (error) {
        console.error('Error during script execution:', error);
        await browser.close();
    }
})();