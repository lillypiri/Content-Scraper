const request = require("request");
const fs = require("fs");
const URL = require("url-parse");
// the spinner
const ora = require("ora");

// chosen scraping and csv packages 
const cheerio = require("cheerio");
const json2csv = require("json2csv");


var data = "./data";
var START_URL = "http://shirts4mike.com/shirts.php";

function scrapeUrl(url) {
  return new Promise((resolve, reject) => {
    request(url, function(error, response, body) {
      if (error || response.statusCode !== 200) {
        return reject(
          new Error("There was an error. Cannot connect to " + url)
        );
      }

      //get the price, title, url and image url from the product page
      var $ = cheerio.load(body);
      var title = $("title").text();
      var price = $("span.price").text();
      var baseUrl = "http://shirts4mike.com/"
      var imgUrl = baseUrl + $("div.shirt-picture img").attr("src");
      var time = new Date();

      var shirt = {
        Title: title,
        Price: price,
        "Image URL": imgUrl,
        URL: url,
        Time: time.toString()
      };

      return resolve(shirt);
    });
  });
}

function scrapeAll(urls) {
  return Promise.all(urls.map(scrapeUrl)).then(shirts => {
    return shirts;
  });
}

function getShirtUrls(startUrl) {
  return new Promise((resolve, reject) => {
    request(startUrl, function(error, response, body) {
      if (error) {
        return reject(new Error("There was an error when scraping the site."));
      } else if (response.statusCode !== 200) {
        return reject(
          new Error("There was an error. Cannot connect to " + startUrl)
        );
      }
      var $ = cheerio.load(body);
      var url = new URL(START_URL);
      var baseUrl = url.protocol + "//" + url.hostname + "/";
      var shirtUrls = [];
      $("a[href^='shirt.php?id=']").each(function() {
        shirtUrls.push(baseUrl + $(this).attr("href"));
      });
      return resolve(shirtUrls);
    });
  });
}

function writeCSV(json) {
  if (!fs.existsSync(data)) {
    fs.mkdirSync(data);
  }

  var now = new Date();
  var csv_filename = "./data/" + now.toISOString().substring(0, 10) + ".csv";
  var fields = ["Title", "Price", "Image URL", "URL", "Time"];

  var shirtscsv = json2csv({ data: json, fields: fields });
  fs.writeFileSync(csv_filename, shirtscsv);
}

const spinner = ora("Scraping shirts").start();

getShirtUrls(START_URL)
  .then(shirtsUrls => {
    spinner.text = "Getting shirt information";
    return scrapeAll(shirtsUrls);
  })
  .then(shirts => {
    spinner.text = "Writing to CSV file";
    writeCSV(shirts);
    spinner.succeed("CSV file written to ./data");
  })
  .catch(error => {
    spinner.fail(error.message);
    fs.appendFileSync(
      "scraper-error.log",
      "[" + new Date() + "] : Error: " + error.message + "\n"
    );
  });
