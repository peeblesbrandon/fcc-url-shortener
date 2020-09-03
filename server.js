const express = require("express");
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const dns = require('dns');
var mongoose = require('mongoose');
const URL = require('./models/URL.js');

app.use(express.static("public"));
app.use(cors());
app.use(express.json());
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });


// https://expressjs.com/en/starter/basic-routing.html
app.get("/", (request, response) => {
  response.sendFile(__dirname + "/views/index.html");
});

app.post("/api/shorturl/new", (req, res) => {
  var inputURL = req.body.inputURL.toLowerCase();
  // handle invalid URL format
  if (!is_url(inputURL)) {
    res.status(400).json({error: "Invalid URL format. Must begin with https:// or http://"});
  } else {
    const domain = parseDomain(inputURL);
    if (domain === false) { res.status(400).json({error: "Invalid URL format. Must begin with https:// or http://"}); }
    
    lookupDomain(domain)
      .then(result => {
        console.log(result);
        if (result.address == undefined) {
          res.status(502).json({error: "Invalid URL. DNS could not locate address."});  
        } else {
          // look up first in case it already exists
          URL.findOne({url: inputURL})
            .exec()
            .then(doc => {
              if (doc) {
                console.log(doc);
                res.status(200).json({short_url: doc.short_id, original_url: doc.url});    
              } else { 
                // insert into DB if it doesnt already exist
                URL.countDocuments() // get a small unique id to use for the url (works only if we never delete docs)
                  .then(number => {
                    const url = new URL({
                      url: inputURL,
                      short_id: number + 1
                    });
                    url.save()
                      .then(result => {
                        console.log(result);
                        res.status(200).json({short_url: result.short_id, original_url: result.url});    
                      })
                      .catch(err => {
                        console.log(err);
                        res.status(500).json({error: err});
                    });
                  })
                  .catch(err => {
                    console.log(err);
                    res.status(500).json({error: "Failed to generate short link. Please try again.", errorDescription: err});
                  });
                }  
              })
            .catch(err => {
              console.log(err);
              res.status(500).json({error: "Failed to generate short link. Please try again.", errorDescription: err});
            });
        }
      })
      .catch(err => { // dns lookup returned an error
        console.log(err);
        res.status(502).json({error: "Invalid URL. DNS server didn't respond."});  
      });
  }
});


app.get("/api/shorturl/:id", (req, res) => {
  const id = req.params.id
  URL.findOne({ short_id: id })
    .exec()
    .then(doc => {
      console.log(doc);
      if (doc) {
        res.status(301).redirect(doc.url);
      } else {
        res.status(404).json({error: "Site not found. Not a valid shortlink."})
      }
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({error: "Server could not locate the corresponding URL", errorDescription: err});
    });
})


// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

// helper function for validating URLs
function is_url(str) {
  let host = str;
  
  // test for https:// or http:// at start
  var regex = /^https?:\/\//i; 
  let httpMatch = str.match(regex);
  if (httpMatch == null) {
    return false; 
  }
  
  // regex on rest of url
  let regexp =  /^(?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/;
        if (regexp.test(str))
        {
          return true;
        }
        else
        {
          return false;
        }
};

function parseDomain(url) {
    // validate that URL is correct and points to real site
  let host = url;
  
  //get the http(s)://and remove it
  var regex = /^https?:\/\//i; 
  let httpMatch = url.match(regex);
  if (httpMatch != null) {
    host = host.slice(httpMatch[0].length, host.length);  
  } else {
    return false; 
  }
  console.log(host);
  // locate the last slash so we can remove path after it
  regex = /\//; 
  let slashIndex = host.match(regex);
  if (slashIndex != null) {
    host = host.slice(0, slashIndex[1]); 
  }
  return host
}

function lookupDomain(domain) {
  return new Promise((resolve, reject) => {
    dns.lookup(domain, (err, address, family) => {
      if (err) {
        reject(err);
      } else {
        resolve({ address, family })
      }
    })
  })
}


