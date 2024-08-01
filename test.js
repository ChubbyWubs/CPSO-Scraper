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

const formData = new URLSearchParams();
formData.append("__VIEWSTATE", viewState);
formData.append("__VIEWSTATEGENERATOR", viewStateGenerator);
formData.append("searchType", "general");
formData.append("advancedState", "closed");
formData.append("ConcernsState", "closed");
formData.append("ActiveDoctors", "true");
formData.append("Gender", "M");
formData.append("DoctorType", "rdoDocTypeFamly");
formData.append("HospitalName", "-1");
formData.append("Language", "08");
formData.append("PracticeRestrictions", "true");
formData.append("PendingHearings", "true");
formData.append("PastHearings", "true");
formData.append("Concerns", "true");
formData.append("Notices", "true");
formData.append("p$lt$ctl01$pageplaceholder$p$lt$ctl02$CPSO_AllDoctorsSearch$btnSubmit1", "Submit");


const post = fetch("https://www.cpso.on.ca/en/Public/Doctor-Search?search=general", {
    method: "POST",
    headers: {
        "authority": "www.cpso.on.ca",
        "method": "POST",
        "path": "/en/Public/Doctor-Search?search=general",
        "scheme": "https",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-encoding": "gzip, deflate, br, ztsd",
        "accept-language": "en-US,en;q=0.6",
        "cache-control": "no-cache",
        "content-length": "446",
        "Content-Type": "application/x-www-form-urlencoded",
        "cookie": "ARRAffinity=aec962a496210b37b657c40cc572e3649d6aeab2cb2d0cb18a26f2772b307ce5; ARRAffinitySameSite=aec962a496210b37b657c40cc572e3649d6aeab2cb2d0cb18a26f2772b307ce5; ASP.NET_SessionId=nm4bkxualy1l3dzvuhgnnys1",
        "dnt": "1",
        "origin": "https://www.cpso.on.ca",
        "pragma": "no-cache",
        "referer": "https://www.cpso.on.ca/en/Public/Doctor-Search?search=general",
        "sec-ch-ua": '"Not)A;Brand";v="99", "Brave";v="127", "Chromium";v="127"',
        "sec-ch-ua-mobile": "?0",
        "sec-Ch-ua-platform": "Windows",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
    },
    body: JSON.stringify({ name, link }),
    });