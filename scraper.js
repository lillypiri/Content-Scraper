var request = require("request");
var cheerio = require("cheerio");
var fs = require("fs");
var URL = require("url-parse");
var json2csv = require("json2csv");

var data = './data';
var START_URL = "http://shirts4mike.com/shirts.php";

var pagesVisited = {};
var pagesToVisit = [];
var shirtsToCsv = [];
var url = new URL(START_URL);
var baseUrl = url.protocol + "//" + url.hostname + "/";

pagesToVisit.push(START_URL);
scrape();

// if the data folder doesn't exist, make it
if (!fs.existsSync(data)) {
    fs.mkdirSync(data);
}

// visit each shirt page
function scrape() {
    var nextPage = pagesToVisit.pop();
    if (nextPage in pagesVisited) {
        scrape();
    } else  if (nextPage === undefined) {
        return;
    } else {
        visitPage(nextPage, scrape);
    }
}

function visitPage(url, callback) {
    request(url, function(error, response, body) {
      // if there's an error, let the user know
      if (error) {
          console.log("Error: ", error.message)
          fs.appendFileSync("scraper-error.log", "[" + Date() + "] : Error: " + error.message + '\n');
          return;
      } else if (response.statusCode !== 200) {
          console.log("There's been a " + response.statusCode + " error");
          fs.appendFileSync("scraper-error.log", "[" + Date() + "] : Error: " + response.statusCode + '\n');
        callback();
        return;
      }
      //get the price, title, url and image url from the product page and create a text file with the scraped data
      var $ = cheerio.load(body);
      var title = $("title").text();
      var price = $("span.price").text();
      var imgUrl = $("div.shirt-picture img").attr("src");
      // set up csv file properties
      var now = new Date();
      var csv_filename = './data/' + now.toISOString().substring(0, 10) + '.csv';
      var fields = ['Title', 'Price', 'Image URL', 'URL', 'Time'];

      var shirt =
          {
          "Title": title,
          "Price": price,
          "Image URL": imgUrl,
          "URL": url,
          "Time": Date(),
        }
      ;


    if (price) {
        shirtsToCsv.push(shirt);
    }

      var shirtscsv = json2csv({data: shirtsToCsv, fields: fields});
      fs.writeFileSync(csv_filename, shirtscsv);
      collectShirtLinks($);
      callback();
  });
}


// get the links for the shirts and put them in an array we can use
function collectShirtLinks($) {
  var shirtLinks = $("a[href^='shirt.php?id=']");

  shirtLinks.each(function() {
    pagesToVisit.push(baseUrl + $(this).attr("href"));
  });
}
