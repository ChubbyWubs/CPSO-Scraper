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

            const locationHeader = Array.from(doctor.querySelectorAll('h4')).find(h4 => h4.textContent.includes('Location of practice'));
            const locationElement = locationHeader ? locationHeader.nextElementSibling : null;
            let streetAddress = null, cityInfo = null, postalCode = null, phoneNumber = null, faxNumber = null;

            if (locationElement) {
                const locationParts = locationElement.innerHTML.split('<br>').map(part => part.trim());
                const phoneFaxIndex = locationParts.findIndex(part => part.startsWith('Phone:') || part.startsWith('Fax:'));

                // Assume everything before phoneFaxIndex is the address
                const addressParts = phoneFaxIndex >= 0 ? locationParts.slice(0, phoneFaxIndex) : locationParts;
                streetAddress = addressParts.join(', ');

                // Extract phone and fax numbers
                phoneNumber = locationParts.find(part => part.startsWith('Phone:'))?.replace('Phone:', '').trim() || null;
                faxNumber = locationParts.find(part => part.startsWith('Fax:'))?.replace('Fax:', '').trim() || null;

                // Split streetAddress further if needed
                const addressLines = streetAddress.split(', ');
                if (addressLines.length >= 3) {
                    streetAddress = addressLines.slice(0, -2).join(', ');
                    cityInfo = addressLines.slice(-2, -1)[0];
                    postalCode = addressLines.slice(-1)[0];
                }
            }

            results.push({ name, link, streetAddress, cityInfo, postalCode, phoneNumber, faxNumber });
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
            { id: 'streetAddress', title: 'Street Address' },
            { id: 'cityInfo', title: 'City Info' },
            { id: 'postalCode', title: 'Postal Code' },
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