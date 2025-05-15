const express = require("express");
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const { spawn } = require("child_process");
const path = require("path");
const multer = require("multer");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const { v4: uuidv4 } = require("uuid");
const NewsAPI = require("newsapi");
const translations = require("./translations");
const axios = require("axios");

require("dotenv").config();

// Multer upload
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Get the type of file.
    const ext = file.mimetype.split("/")[0];

    cb(null, "uploads/images");
  },
  filename: (req, file, cb) => {
    // Combine the Date in milliseconds and original name and pass as filename
    cb(null, `${Date.now()}.${file.originalname}`);
  },
});

// Use diskstorage option in multer
const upload = multer({ storage: multerStorage });

// MySQL connection
const Options = {
  host: "localhost",
  user: "root",
  password: "asdf@#7367",
  database: "plantopedia",
};

//console.log(uuid());
const db = mysql.createConnection(Options).promise();
const sessionStore = new MySQLStore({}, db);

// MySQL connections ends

// Global Variables

// Disease API

function plantDisease(image) {
  var hardCodedFile = [image];

  const base64files = hardCodedFile.map((file) =>
    fs.readFileSync(file, "base64")
  );

  const data = {
    api_key: process.env.PLANT_ID_KEY,
    images: base64files,
    /* modifiers docs: https://github.com/flowerchecker/Plant-id-API/wiki/Modifiers */
    modifiers: ["crops_fast", "similar_images"],
    language: "en",
    /* disease details docs: https://github.com/flowerchecker/Plant-id-API/wiki/Disease-details */
    disease_details: [
      "cause",
      "common_names",
      "classification",
      "description",
      "treatment",
      "url",
    ],
  };

  return data;
}

//News API

const newsapi = new NewsAPI(process.env.NEWSAPI);

// Set the parameters for the API request
const options = {
  q: 'agriculture OR farming techniques OR crop prices OR agricultural technology OR farm subsidies OR organic farming OR sustainable agriculture OR weather farming OR agricultural market',
  sortBy: 'relevancy',
  language: 'en',
  pageSize: 12 // Increased number of articles
};

async function runCompletion() {
  await newsapi.v2
    .everything(options)
    .then((response) => {
      news = response.articles;
    })
    .catch((error) => {
      console.error(error);
    });
}

// News API Ends

// Plant ID Setup

var fs = require("fs");

// Plant ID ends

app.use(express.static(__dirname + "/assests"));
app.use('/voice_assistant', express.static(__dirname + '/voice_assistant'));

// Set the views directory explicitly
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

var USERNAME;
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);

app.use(
  session({
    genid: (req) => {
      return uuidv4(); // use UUIDs for session IDs
    },
    secret: "cookie_secret",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 600000,
      secure: false,
      httpOnly: true,
    },
    rolling: true,
    // assigning sessionStore to the session
  })
);

const redirectLogin = function (req, res, next) {
  if (!req.session.loggedin) {
    return res.redirect("/login");
  }
  next();
};

app.post("/signup", async function (req, res) {
  var { type, name_signup, username, phone, password } = req.body;

  var sql = "INSERT INTO users(username,name,phone) VALUES(?,?,?)";
  await db.query(sql, [username, name_signup, phone], function (err, result) {
    if (err) throw err;
    return result;
  });

  var sql = "INSERT INTO login(username,password,type) VALUES(?,?,?)";
  await db.query(sql, [username, password, type], function (err, result) {
    if (err) throw err;
    return result;
  });

  res.sendFile(__dirname + "/views/success.html");
});

app.get("/login", async function (req, res) {
  if (req.session.loggedin == true) {
    if (req.session.type == "farmer") {
      res.redirect("/farmer");
    } else {
      res.redirect("/business");
    }
  } else {
    var sql = "SELECT username FROM users";
    var all_usernames = await db.query(sql, [], function (err, result) {
      if (err) throw err;
      return result;
    });

    res.render("login", { usernames: all_usernames[0] });
  }
});

app.post("/login", async function (req, res) {
  var { type, username, password } = req.body;

  var sql1 = "SELECT * FROM login WHERE username=(?)";

  try {
    var login_details = await db.query(
      sql1,
      [username],
      function (err, result) {
        if (err) throw err;
        return result;
      }
    );

    var password_in_db = login_details[0][0].password;
    var type_in_db = login_details[0][0].type;

    if (password_in_db == password && type_in_db == type) {
      req.session.loggedin = true;
      req.session.username = username;
      req.session.type = type;

      if (type == "farmer") {
        res.redirect("/farmer");
      } else {
        res.redirect("/business");
      }
    } else {
      res.sendFile(__dirname + "/views/error.html");
    }
  } catch (err) {
    // If the username is not in Database
    res.sendFile(__dirname + "/views/error.html");
  }
});

app.post("/allBidsFarmer", async function (req, res) {
  var { bid_username } = req.body;

  var sql2 = "SELECT * FROM users WHERE username=(?)";
  var username = await db.query(sql2, [bid_username], function (err, result) {
    if (err) throw err;
    return result;
  });
  var sql =
    "SELECT * FROM bids_farmer inner join bids_business on bids_farmer.bid_id_farmer=bids_business.bid_id_farmer where bids_farmer.username_farmer=(?) and bids_business.bid_accepted=1 ORDER BY bids_farmer.bid_id_farmer DESC;";
  var my_user = await db.query(sql, [bid_username], function (err, result) {
    if (err) throw err;
    return result;
  });

  res.render("farmer_accepted_bids", {
    all_bids: my_user[0],
    username: username[0][0],
  });
});

app.get("/business", redirectLogin, async function (req, res) {
  var username = req.session.username;

  var sql2 = "SELECT * FROM users WHERE username=(?)";
  var business_details = await db.query(
    sql2,
    [username],
    function (err, result) {
      if (err) throw err;
      return result;
    }
  );
  var sql =
    "SELECT * FROM bids_farmer WHERE bids_farmer.bid_id_farmer NOT IN (SELECT bid_id_farmer FROM  bids_business WHERE bids_business.username_business =(?)) AND bids_farmer.bid_accepted=0 ORDER BY bids_farmer.bid_id_farmer DESC;";
  var all_bids = await db.query(sql, [username], function (err, result) {
    if (err) throw err;
    return result;
  });

  res.render("businessPage", {
    all_bids: all_bids[0],
    business_details: business_details[0][0],
  });
});

app.post("/business_bid", async function (req, res) {
  var { username, bid_amount, bid_id_farmer } = req.body;

  var sql =
    "INSERT INTO bids_business(bid_id_farmer,bid,username_business) VALUES(?,?,?)";
  await db.query(
    sql,
    [bid_id_farmer, bid_amount, username],
    function (err, result) {
      if (err) throw err;
      return result;
    }
  );
  res.redirect("/business");
});

app.post("/business_own_bids", async function (req, res) {
  var { bid_username } = req.body;

  var sql2 = "SELECT * FROM users WHERE username=(?)";
  var username = await db.query(sql2, [bid_username], function (err, result) {
    if (err) throw err;
    return result;
  });
  var sql =
    "SELECT * FROM bids_farmer inner join bids_business on bids_farmer.bid_id_farmer=bids_business.bid_id_farmer where bids_business.username_business=(?) ORDER BY bids_farmer.bid_id_farmer DESC;";
  var my_user = await db.query(sql, [bid_username], function (err, result) {
    if (err) throw err;
    return result;
  });
  // res.send(my_user[0])

  res.render("business_owns_bid", {
    all_bids: my_user[0],
    username: username[0][0],
  });
});

app.post("/acceptBid", async function (req, res) {
  var { bid_id_business, bid_id_farmer } = req.body;

  var sql = "UPDATE bids_business SET bid_accepted=1 WHERE bid_id_business=(?)";
  await db.query(sql, [bid_id_business], function (err, result) {
    if (err) throw err;
    return result;
  });
  var sql = "UPDATE bids_farmer  SET bid_accepted=1 WHERE bid_id_farmer=(?)";
  await db.query(sql, [bid_id_farmer], function (err, result) {
    if (err) throw err;
    return result;
  });
  res.redirect("/farmer");
});

app.get("/farmer", redirectLogin, async function (req, res) {
  var sql2 = "SELECT * FROM users WHERE username=(?)";
  var farmer_details = await db.query(
    sql2,
    [req.session.username],
    function (err, result) {
      if (err) throw err;
      return result;
    }
  );

  var farmers_bids;
  var sql3 =
    "SELECT * FROM bids_farmer WHERE username_farmer=(?) AND bid_accepted=0";
  var sql4 =
    "SELECT * FROM bids_business WHERE bid_id_farmer=(?)  ORDER BY bid DESC LIMIT 3";
  try {
    var farmers_bids = await db.query(
      sql3,
      [req.session.username],
      function (err, result) {
        if (err) throw err;
        return result;
      }
    );

    farmers_bids = farmers_bids[0];

    for (let i in farmers_bids) {
      var business_bids = await db.query(
        sql4,
        [farmers_bids[i].bid_id_farmer],
        function (err, result) {
          if (err) throw err;
          return result;
        }
      );

      farmers_bids[i].business_bids = business_bids[0];
    }
  } catch (err) {
    throw err;
  }

  res.render("farmersPage", {
    data: farmers_bids,
    farmer_details: farmer_details[0][0],
  });
});

app.post("/farmer_post", async function (req, res) {
  var { farmer, crop, base, quantity } = req.body;

  try {
    var sql2 =
      "INSERT INTO bids_farmer(crop,base,quantity,username_farmer) VALUES(?,?,?,?)";
    await db.query(
      sql2,
      [crop, base, quantity, farmer],
      function (err, result) {
        if (err) throw err;
        return result;
      }
    );

    res.redirect("/farmer");
  } catch (err) {
    res.send("Some Error Occured");
  }
});

app.get("/logout", function (req, res) {
  req.session.destroy((err) => {
    res.redirect("/");
  });
});

app.get("/homepage.html", function (req, res) {
  res.render("homepage", { t: translations[req.session.language || 'en'], language: req.session.language || 'en' });
});
app.get("/", function (req, res) {
  res.render("homepage", { t: translations[req.session.language || 'en'], language: req.session.language || 'en' });
});

// Plantopedia Backend Starts Here

app.get("/plantopedia.html", function (req, res) {
  res.sendFile(__dirname + "/views/plantopedia.html");
});
app.post("/plantopedia", async function (req, res) {
  var plant = req.body.plant_name;
  var DATA;

  try {
    var sql1 = "SELECT * FROM plants WHERE name=(?)";
    DATA = await db.query(sql1, [plant], function (err, result) {
      if (err) throw err;
      return result;
    });
    DATA = DATA[0][0];
    DATA.isInDB = 1;
  } catch (err) {
    DATA = {
      name: plant,
      message:
        "Sorry we do not have the data of the plant. We are constantly updating our systems to serve all requests. Please check after some time.",
      isInDB: 0,
    };
  }

  res.render("plant", { data: DATA });
});

app.get("/news", async function (req, res) {
  await runCompletion();
  res.render("news", { news: news });
  //res.sendFile(__dirname+"/views/news.ejs")
});

app.get("/allUsers", async function (req, res) {
  var sql = "SELECT * from users";
  var allUser = await db.query(sql, [], function (err, result) {
    if (err) throw err;
    return result;
  });
  res.render("allUsers", { allUsers: allUser[0] });
});

app.get("/plantDisease.html", function (req, res) {
  res.sendFile(__dirname + "/views/plantDisease.html");
});
app.post("/plantDisease", upload.single("mypic"), async function (req, res) {
  var data = plantDisease(req.file.path);

  var plant_disease = await axios
    .post("https://api.plant.id/v2/health_assessment", data)
    .then((res) => {
      return res.data;
    })
    .catch((error) => {
      console.error("Error: ", error);
    });
  var is_healthy_probability =
    plant_disease.health_assessment.is_healthy_probability;
  var is_healthy = plant_disease.health_assessment.is_healthy;
  var disease_details =
    plant_disease.health_assessment.diseases[0].disease_details;

  var image = plant_disease.images[0].url;
  sendDATA = {
    probaility: is_healthy_probability,
    is_healthy: is_healthy,
    disease_details: disease_details,
    image: image,
  };

  res.render("plantDiseaseInfo", sendDATA);
});
app.get("/plantDiseaseResult", function (req, res) {
  res.render("plantDiseaseInfo");
});

// Plantopedia Backend Ends Here

// Plant Lab start here

app.get("/plantLab.html", function (req, res) {
  res.sendFile(__dirname + "/views/plantLab.html");
});
app.post("/labForm", function (req, res) {
  var dataToSend = '';
  // spawn new child process to call the python script
  let a = req.body.nitrogen;
  let b = req.body.phosphorus;
  let c = req.body.potassium;
  let d = req.body.temperature;
  let e = req.body.humidity;
  let f = req.body.ph;
  let g = req.body.rainfall;

  // Check if all required parameters are present
  if (!a || !b || !c || !d || !e || !f || !g) {
    return res.render("plantLabResult", { 
      data: "ERROR: Please provide all required parameters",
      error: true 
    });
  }

  // Convert parameters to numbers and validate ranges
  const params = {
    nitrogen: parseFloat(a),
    phosphorus: parseFloat(b),
    potassium: parseFloat(c),
    temperature: parseFloat(d),
    humidity: parseFloat(e),
    ph: parseFloat(f),
    rainfall: parseFloat(g)
  };

  // Validate ranges
  if (params.nitrogen < 0 || params.nitrogen > 140 ||
      params.phosphorus < 5 || params.phosphorus > 145 ||
      params.potassium < 5 || params.potassium > 205 ||
      params.temperature < 8 || params.temperature > 43 ||
      params.humidity < 14 || params.humidity > 100 ||
      params.ph < 3 || params.ph > 10 ||
      params.rainfall < 20 || params.rainfall > 300) {
    return res.render("plantLabResult", { 
      data: "ERROR: Parameters out of valid range",
      error: true 
    });
  }

  // Set up Python process with absolute paths
  const pythonScript = path.join(__dirname, "python.py");
  process.env.PYTHONPATH = __dirname;  // Set Python path to include the current directory
  
  const python = spawn("python3", [
    pythonScript,
    params.nitrogen,
    params.phosphorus,
    params.potassium,
    params.temperature,
    params.humidity,
    params.ph,
    params.rainfall
  ], {
    cwd: __dirname  // Set working directory to where model.joblib is located
  });
  
  // collect data from script
  python.stdout.on("data", function (data) {
    console.log("Pipe data from python script ...");
    dataToSend += data.toString();
  });

  // Handle potential errors
  python.stderr.on('data', (data) => {
    console.error(`Error from python script: ${data}`);
    dataToSend = "ERROR: Could not process your request";
  });

  // in close event we are sure that stream from child process is closed
  python.on("close", (code) => {
    console.log(`child process close all stdio with code ${code}`);
    
    // If no data was received, set a default error message
    if (!dataToSend) {
      dataToSend = "ERROR: No result received from analysis";
    }

    res.render("plantLabResult", { 
      data: dataToSend.trim(),
      error: dataToSend.startsWith("ERROR")
    });
  });

  // Handle potential spawn errors
  python.on('error', (err) => {
    console.error('Failed to start python process:', err);
    res.render("plantLabResult", { 
      data: "ERROR: Failed to process your request",
      error: true
    });
  });
});

app.post("/play", function (req, res) {
  res.sendFile(__dirname + "/views/plantLab.html");
});

// Plant lab ends

// Sell Here

app.get("/sellHere.html", function (req, res) {
  res.sendFile(__dirname + "/views/sellHere.html");
});
app.post("/sellHereForm", async function (req, res) {
  var crop = req.body.crop;
  var district = req.body.district;

  var sql1 =
    "SELECT * FROM distance Inner join crop_price where distance.from=(?) and distance.to=crop_price.district and crop_price.crop=(?) ORDER BY crop_price.price-(distance.distance*distance.fare) DESC";
  var SellHere = await db.query(sql1, [district, crop], function (err, result) {
    if (err) throw err;
    return result;
  });

  SellHere = SellHere[0];

  res.render("sellHereResult", { data: SellHere });
});

// Sell Here ends

app.post("/contact", async function (req, res) {
  var name = req.body.name;
  var email = req.body.email;
  var message = req.body.message;

  var sql1 = "INSERT INTO contact (name,email,message) VALUES (?,?,?)";
  await db.query(sql1, [name, email, message], function (err, result) {
    if (err) throw err;
    return result;
  });

  res.redirect("/homepage.html");
});

app.get("/switch-language/:lang", function (req, res) {
  const lang = req.params.lang;
  if (translations[lang]) {
    req.session.language = lang;
  }
  res.redirect(req.headers.referer || '/');
});

// Chat room management
const chatRooms = {
    general: new Set(),
    crops: new Set(),
    market: new Set(),
    tech: new Set()
};

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('getUsername', () => {
        if (socket.request.session.username) {
            socket.emit('setUsername', socket.request.session.username);
        }
    });

    socket.on('joinRoom', (room) => {
        if (chatRooms[room]) {
            socket.join(room);
            chatRooms[room].add(socket.request.session.username);
            io.to(room).emit('updateUsers', Array.from(chatRooms[room]));
        }
    });

    socket.on('leaveRoom', (room) => {
        if (chatRooms[room]) {
            socket.leave(room);
            chatRooms[room].delete(socket.request.session.username);
            io.to(room).emit('updateUsers', Array.from(chatRooms[room]));
        }
    });

    socket.on('chatMessage', (data) => {
        io.to(data.room).emit('message', {
            username: socket.request.session.username,
            message: data.message,
            language: data.language,
            timestamp: new Date()
        });
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
        // Remove user from all rooms
        Object.keys(chatRooms).forEach(room => {
            chatRooms[room].delete(socket.request.session.username);
            io.to(room).emit('updateUsers', Array.from(chatRooms[room]));
        });
    });
});

// Share session with Socket.IO
const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
io.use(wrap(session({
    genid: (req) => {
        return uuidv4();
    },
    secret: "cookie_secret",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
        maxAge: 600000,
        secure: false,
        httpOnly: true,
    },
    rolling: true,
})));

// Add chat forum route
app.get('/chat-forum', redirectLogin, (req, res) => {
    res.render('chat-forum', {
        t: translations[req.session.language || 'en'],
        language: req.session.language || 'en'
    });
});

// Add market prices route
app.get('/market-prices', redirectLogin, (req, res) => {
    res.render('market-prices', {
        t: translations[req.session.language || 'en'],
        language: req.session.language || 'en'
    });
});

// Add market prices API endpoint
app.get('/api/market-prices', async (req, res) => {
    try {
        const today = new Date();
        const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
        
        // Make API call to Agmarknet API
        const response = await axios.get('https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070', {
            params: {
                'api-key': process.env.AGMARKNET_API_KEY,
                format: 'json',
                offset: 0,
                limit: 1000,
                'filters[arrival_date]': formattedDate,
                'filters[state]': 'Maharashtra,Uttar Pradesh,Punjab,Haryana,Karnataka',
                'filters[commodity]': 'Rice,Wheat,Maize,Potato,Onion,Tomato,Cotton,Soyabean'
            }
        });

        if (!response.data || !response.data.records) {
            throw new Error('Invalid data received from Agmarknet API');
        }

        // Process and aggregate the data
        const priceMap = new Map();
        
        response.data.records.forEach(record => {
            const commodity = record.commodity;
            if (!priceMap.has(commodity)) {
                priceMap.set(commodity, {
                    minPrices: [],
                    maxPrices: [],
                    modalPrices: [],
                    prevModalPrices: [],
                    commodityHindi: record.commodity_hindi || commodity
                });
            }
            
            const prices = priceMap.get(commodity);
            if (record.min_price) prices.minPrices.push(parseFloat(record.min_price));
            if (record.max_price) prices.maxPrices.push(parseFloat(record.max_price));
            if (record.modal_price) prices.modalPrices.push(parseFloat(record.modal_price));
            if (record.price_date && record.modal_price) {
                prices.prevModalPrices.push(parseFloat(record.modal_price));
            }
        });

        // Transform data into required format
        const prices = Array.from(priceMap.entries()).map(([commodity, data]) => {
            const minPrice = Math.min(...data.minPrices);
            const maxPrice = Math.max(...data.maxPrices);
            const modalPrice = data.modalPrices.reduce((a, b) => a + b, 0) / data.modalPrices.length;
            const prevModalPrice = data.prevModalPrices.length > 0 ? 
                data.prevModalPrices.reduce((a, b) => a + b, 0) / data.prevModalPrices.length : 
                modalPrice;

            return {
                commodity,
                commodityHindi: data.commodityHindi,
                minPrice: Math.round(minPrice),
                maxPrice: Math.round(maxPrice),
                modalPrice: Math.round(modalPrice),
                trend: modalPrice > prevModalPrice ? 'up' : 'down',
                date: formattedDate
            };
        });

        res.json({
            success: true,
            data: prices,
            lastUpdated: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching market prices:', error);
        
        // Fallback data in case of API failure
        const fallbackPrices = [
            { commodity: "Rice", commodityHindi: "चावल", minPrice: 2500, maxPrice: 3000, modalPrice: 2750, trend: "up", date: new Date().toLocaleDateString() },
            { commodity: "Wheat", commodityHindi: "गेहूं", minPrice: 2200, maxPrice: 2600, modalPrice: 2400, trend: "up", date: new Date().toLocaleDateString() },
            { commodity: "Maize", commodityHindi: "मक्का", minPrice: 1800, maxPrice: 2200, modalPrice: 2000, trend: "down", date: new Date().toLocaleDateString() },
            { commodity: "Potato", commodityHindi: "आलू", minPrice: 1500, maxPrice: 1800, modalPrice: 1650, trend: "up", date: new Date().toLocaleDateString() },
            { commodity: "Onion", commodityHindi: "प्याज", minPrice: 2000, maxPrice: 2500, modalPrice: 2250, trend: "down", date: new Date().toLocaleDateString() },
            { commodity: "Tomato", commodityHindi: "टमाटर", minPrice: 2500, maxPrice: 3000, modalPrice: 2750, trend: "up", date: new Date().toLocaleDateString() },
            { commodity: "Cotton", commodityHindi: "कपास", minPrice: 5500, maxPrice: 6000, modalPrice: 5750, trend: "down", date: new Date().toLocaleDateString() },
            { commodity: "Soyabean", commodityHindi: "सोयाबीन", minPrice: 3500, maxPrice: 4000, modalPrice: 3750, trend: "up", date: new Date().toLocaleDateString() }
        ];

        res.json({
            success: true,
            data: fallbackPrices,
            lastUpdated: new Date().toISOString(),
            usingFallback: true
        });
    }
});

http.listen(3000, function () {
    console.log("Server is running on port 3000");
});
