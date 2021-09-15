const axios = require("axios");
const cheerio = require("cheerio");

// Amazon Scraping function
function amazonScraping(response) {
    let products = {
        names: [],
        price: [],
        scores: [],
        reviews: [],
        images: [],
        deals: [],
        related: [],
        highlights: []
    };
    const names = [];
    const deals = [];
    const amazon_list = [];
    const html = response.data;
    const $ = cheerio.load(html);

    $("div.a-section.a-spacing-none.a-spacing-top-micro")
        .find("span.a-size-base")
        .each(function (i, element) {
            products.reviews.push($(element).text().trim());
        });

    $("div.a-section.a-spacing-none.a-spacing-top-micro")
        .find("span.a-icon-alt")
        .each(function (i, element) {
            var s = parseFloat($(element).text().trim().slice(0, 3)) * 2;
            products.scores.push(s);
        });


    $("div.s-main-slot.s-result-list.s-search-results.sg-row div.s-include-content-margin.s-border-bottom.s-latency-cf-section div.sg-row")
    .each(function (i, element) {
        if ($(element).find("img").attr("src") !== undefined) {
            products.images.push($(element).find("img").attr("src"));
        }
    });

    $("div.sg-row div.a-section.a-spacing-none")
        .find("h2")
        .each(function (i, element) {
            if (names[i - 1] !== $(element).text().trim()) {
                products.names.push($(element).text().trim().slice(0, 70));
            }
        });

  $("div.a-section.a-spacing-none.a-spacing-top-small").each(function(element){
      var a = $(element).find("a");
      console.log(a.text())
  })

    $("a.a-link-normal.a-text-normal").each(function (i, element) {
        deals.push(String($(element).attr("href")));
    });

    deals.forEach(function (deal, i) {
        if (deals[i] !== deals[i - 1]) {
            products.deals.push(deals[i]);
        }
    });

    if (products.names.length !== 0) {
        for (i = 0; i < 10; i++) {
            var newProduct = {
                name: products.names[i],
                score: products.scores[i],
                review: products.reviews[i],
                image: products.images[i],
                deal: products.deals[i],
            };
            amazon_list.push(newProduct);
        }
    } else {
        amazon_list = [];
    }

    return amazon_list;
}



function productDescription(response) {
    const html = response.data;
    const $ = cheerio.load(html);
    var highlight = $("#productDescription").find("p").text();
    console.log(highlight)
    return highlight;
}


function findHighlights(response) {
    const html = response.data;
    const $ = cheerio.load(html);
    var highlight = $("div.a-section.a-spacing-medium.a-spacing-top-small").find("span").text();
    return highlight
}



// eBay Scraping function
function ebayScraping(response) {
    let products = {
        names: [],
        scores: [],
        reviews: [],
        images: [],
        deals: [],
        prices: [],
    };
    const ebay_list = [];

    const html = response.data;
    const $ = cheerio.load(html);

    $("div.s-item__wrapper.clearfix").each(function (i, element) {
        products.names.push($(element).find("h3").text());
        products.images.push($(element).find("img").attr("src"));
        products.prices.push($(element).find("span.s-item__price").text());
    });

    $("div.s-item__info.clearfix")
        .find("a")
        .each(function (i, element) {
            products.deals.push($(element).attr("href"));
        });

    $("div.s-item__reviews")
        .find("span.clipped")
        .each(function (i, element) {
            if ($(element).text().includes("out of")) {
                var s = parseFloat($(element).text().trim().slice(0, 3)) * 2;
                products.scores.push(s);
            }
        });

    if (products.names.length !== 0) {
        for (i = 0; i < 10; i++) {
            var newProduct = {
                name: products.names[i],
                score: products.scores[i],
                review: 1,
                image: products.images[i],
                deal: products.deals[i],
                price: products.prices[i],
            };
            ebay_list.push(newProduct);
        }
    } else {
        ebay_list = [];
    }
    return ebay_list;
}

function getTopProducts(response) {
    const topProducts = [];
    const html = response.data;
    const $ = cheerio.load(html);

    for (i = 0; i < 5; i++) {
        var product = {
            title: "",
            image: ""
        }
        product.title = push($("p.bb-p").find("h3").text())
        product.image = push($("p.bb-p").find("img").attr("src"))
        console.log(product)
        topProducts.push(product);
    }

    return topProducts;
}

function findImages(related, url) {
    var images = [];
    console.log("THIS IS THE findImages function")
    related.forEach(function (product) {
        var ebay = url + product.trim();

        axios.get(ebay).then((response) => {
            const html = response.data;
            const $ = cheerio.load(html);
            console.log("Noam")
            images.push($("div.s-item__wrapper.clearfix").find("img").attr("src"));
        }).catch(err => {
            console.log(err)
        })
    })

    return images;
}


module.exports = { amazonScraping, ebayScraping, findImages, findHighlights, getTopProducts, productDescription };
