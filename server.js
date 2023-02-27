const app = require("./app");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: "./config.env" });

process.on("uncaughtException", (err) => {
  console.log(err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

const http = require("http");

const server = http.createServer(app);

const DB = process.env.DBURL.replace("<PASSWORD>", process.env.DBPASSWORD);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedToplogy: true,
  })
  .then((con) => {
    console.log("DB connection is successful");
  })
  .catch((err) => {
    console.log("err", err);
  });
// port: 3000, 5000
const port = process.env.PORT || 8000;

server.listen(port, () => {
  console.log(`app running on port ${port}`);
});

process.on("unhandledRejection", (err) => {
  console.log(err);
  server.close(() => {
    process.exit(1);
  });
});
