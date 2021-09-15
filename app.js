const express = require("express");
const cheerio = require("cheerio");
const bodyParser = require("body-parser");
const request = require("request");
const ejs = require("ejs");
const axios = require("axios");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const rateLimit = require("express-rate-limit");

// Maximum of 10 requestes per 10 seconds
const rateLimiter = rateLimit({
  windowMs: 10000, //window time
  max: 10, // maximum number of requests in window time
  message: "Too many requestes, please wait and try again later."
});

const {
  amazonScraping,
  ebayScraping,
  findImages,
  findHighlights,
  getTopProducts,
} = require("./public/js/scarping");

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static(__dirname + "/public"));
app.use(rateLimiter);

app.use(session({
  secret: "Noam Kanonich",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/dealerguyDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
  password: String,
  image: String,
  registerDate: String,
  history: Array // Search history
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(passportLocalMongoose, {
  usernameField: 'email'
});

// const User = mongoose.model("User", userSchema);

// passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());



const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(user, done) {
    done(null, user.id);
  });


const contactSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
  message: String,
});

const Contact = mongoose.model("Contact", contactSchema);

const productSchema = new mongoose.Schema({
  name: String,
  image: String,
  price: String,
  score: String, // product's score
  reviews: String, //number of reviews
  content: String,
});

const Product = mongoose.model("Product", productSchema);

const ebayUrl = "https://www.ebay.com/sch/";
const amazonUrl = "https://www.amazon.com/s?k=";

// let currentUser = undefined;

let related_products = [];
let related_images = [];


app.get("/", function (req, res) {
  console.log(req.user)
  res.render("index", { user: req.user });
});


app.post("/", function (req, res) {
  var email = req.body.email;
  console.log(email)
  User.findOne({ email: email }, function (err, userFound) {
    if (!userFound) {
      res.render("index", { user: undefined });
    } else {
      res.render("index", { user: userFound });
    }
  });
});


app.get("index", function (req, res) {
  User.findOne({ email: req.user.email }, function (userFound) {
    if (!userFound) {
      res.render("index", { user: undefined });
    } else {
      res.render("index", { user: req.user });
    }
  });
});


app.get("/products", function(req, res) {
  res.redirect("/");
})


app.post("/products", function (req, res) {
  // if user is login, it will update the history search
  if (req.user !== undefined) {
    var product = {
      name: req.body.productName,
      date: String(new Date()).slice(0, 24),
    };
    req.user.history.push(product);
    console.log(req.user.history);

    User.updateOne(
      { name: req.user.name },
      { history: req.user.history },
      { upsert: true },
      function (err) {
        console.log(err);
      }
    );
  }

  var productName = req.body.productName;
  var ebay = ebayUrl + productName;
  var promises = [];
  var images = [];
  var related = [];

  axios.get(ebay).then((response) => {
    const html = response.data;
    const $ = cheerio.load(html);
    $("div.srp-related-searches")
      .find("a")
      .each(function (i, element) {
        related.push($(element).text());
      });

    related.forEach(function (product) {
      const myUrl = amazonUrl + product;
      promises.push(axios.get(myUrl));
    });

    Promise.all(promises)
      .then(function (results) {
        results.forEach(function (response) {
          const html = response.data;
          const $ = cheerio.load(html);
          images.push(
            $("div.s-main-slot.s-result-list.s-search-results.sg-row div.s-include-content-margin.s-border-bottom.s-latency-cf-section div.sg-row")
              .find("img")
              .attr("src")
          );
        });
        related_products = related;
        related_images = images;

        res.render("products", {
          user: req.user,
          productName: productName,
          related: related,
          images: images,
        });
      })
      .catch(function (err) {
        console.log(err);
      });
  });
});


app.get("/results", function (req, res) {
  res.redirect("/");
  });


app.post("/results", function (req, res) {
  let amazon_list = [];
  let ebay_list = [];
  let productName = req.body.productName;
  let currentDate = new Date();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  if (req.body.moreProductsName !== undefined) {
    productName = req.body.moreProductsName;
  }

  var amazon = amazonUrl + productName;
  var ebay = ebayUrl + productName;

  let promises = [];
  promises.push(axios.get(amazon));
  promises.push(axios.get(ebay));

  // Scraping functions
  Promise.all(promises).then(function (results) {
    results.forEach(async function (response) {
      amazon_list = amazonScraping(results[0]);
      ebay_list = ebayScraping(results[1]);
    });

    // Related section
    let index = 0;
    let four_related = [];
    let four_images = [];

    for (i = 0; i < 4; i++) {
      index = parseInt(Math.random(0, 1) * 10);
      four_related.push(related_products[index]);
      four_images.push(related_images[index]);
    }

    res.render("results", {
      user: req.user,
      productName: productName,
      date: monthName,
      amazon_products: amazon_list,
      ebay_products: ebay_list,
      four_related: four_related,
      four_images: four_images,
    });
  });
});


app.post("/login", function (req, res) {

  const user = new User({
    email: req.body.email,
    password: req.body.password
  })

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    }
    else {
      passport.authenticate("local")(req, res, function () {
        User.findOne({ email: req.body.email }, function (err, userFound) {
          if (err) {
            console.log(err)
          } else {
            res.render("profile", { user: userFound });
          }
        })
      })
    }
  })
});


app.post("/register", function (req, res) {
  User.register({ email: req.body.email }, req.body.password, function (err, newUser) {
      if (err) {
          console.log(err);
          res.redirect("/");
      }
      else {
          passport.authenticate("local")(req, res, function () {
            console.log(newUser)
            res.redirect("profile");
          })
      }
  })
  res.get("/");
});


app.get("/signout", function (req, res) {
  req.logout();
  res.redirect("/");
});


app.post("/contact", function (req, res) {
  var newContact = new Contact({
    name: req.body.fullname,
    phone: req.body.phone,
    email: req.body.email,
    message: req.body.message,
  });
  newContact.save();

  res.redirect("/");
});


app.get("/profile", function (req, res) {
  // res.render("profile", { user: currentU;ser });
  if (req.isAuthenticated()) {
    User.findById(req.user.id, function (err, userFound) {
      if (err) {
        console.log(err)
      }
      else if (userFound) {
        res.render("profile", { user: userFound });
      }
    })
  }
  else {
    res.redirect("/");
  }
});


app.post("/profile", function (req, res) {
  var img_url = req.body.url;
  if (img_url === undefined) {
    res.redirect("profile");
  }

  User.updateOne(
    { name: req.user.name },
    { image: img_url },
    { upsert: true },
    function (err) {
      console.log(err);
    }
  );

  console.log(req.user.email)
  User.findOne({ email: req.user.email }, function (err, userFound) {
    if (err) {
      console.log(err);
    } else {
      // currentUser = userFound;
      res.redirect("profile");
    }
  });
});


app.listen(3000, function () {
  console.log("Server started on port 3000");
});



// API
app.get("/amazon/:product", function (req, res) {
  const amazonUrl = "https://www.amazon.com/s?k=";
  var productName = req.params.product;
  var promises = []
  promises.push(axios.get(amazonUrl + productName))
  Promise.all(promises).then(function (results) {
    results.forEach(async function (response) {
      amazon_list = amazonScraping(results[0]);
    })
    res.send(amazon_list)
  })
})

app.get("/ebay/:product", function (req, res) {
  const ebayUrl = "https://www.ebay.com/sch/";
  var productName = req.params.product;
  var promises = []
  promises.push(axios.get(ebayUrl + productName))
  Promise.all(promises).then(function (results) {
    results.forEach(async function (response) {
      ebay_list = ebayScraping(results[0]);
    })
    res.send(ebay_list)
  })
})





// app.post("/register", function (req, res) {
  //   // Register a new user to the database
  //   // var newUser = new User({
  //   //   name: req.body.fullname,
  //   //   phone: req.body.phone,
  //   //   email: req.body.email,
  //   //   password: req.body.password,
  //   //   image: "http://ssl.gstatic.com/accounts/ui/avatar_2x.png",
  //   //   registerDate: String(new Date()).slice(4, 15),
  //   //   history: [],
  //   // });

  //   // currentUser = newUser;

  //   // Checks if user is already exists in database
  //   // User.findOne({ name: newUser.name, email: newUser.email }, function (err, userFound) {
  //   //   if (!userFound) {
  //   //     newUser.save();
  //   //     res.render("profile", { user: newUser });
  //   //   } else {
  //   //     console.log(
  //   //       "This user is already register, redirectinig to home page."
  //   //     );
  //   //     res.redirect("/");
  //   //   }
  //   // });

  // app.post("/login", function (req, res) {
    // User.findOne(
    //   { email: req.body.email, password: req.body.password },
    //   function (err, userFound) {
    //     if (!userFound) {
    //       console.log("User not found! redirect to home page");
    //       res.render("index", { user: currentUser });
    //     } else {
    //       currentUser = userFound;
    //       res.render("profile", { user: userFound });
    //     }
    //   }
    // );
