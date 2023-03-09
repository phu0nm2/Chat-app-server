// express is web framwork for Node.js
const express = require("express");

const routes = require("./routes/index");

const authRouter = require("./routes/auth");
const userRouter = require("./routes/user");

// HTTP request logger middleware for node.js
const morgan = require("morgan");

// Basic rate-limiting middleware for Express
const rateLimit = require("express-rate-limit");

const helmet = require("helmet");

const bodyParser = require("body-parser");
const mongoSanitize = require("express-mongo-sanitize");

const xss = require("xss");

const cors = require("cors");

const app = express();

//

// app.use(xss());
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());

app.use(
  cors({
    origin: "*",
    methods: ["GET", "PATCH", "POST", "DELETE", "PUT"],
    credentials: true,
  }),
);
app.use(express.json({ limit: "10kb" }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(helmet());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

const limiter = rateLimit({
  max: 3000,
  windowMS: 60 * 68 * 1000, // in one hour
  message: "Too many requests from this IP, Please try again in an hour",
});

app.use("/talk", limiter);

app.use(routes);

module.exports = app;
