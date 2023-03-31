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
const User = require("./models/user");

const { Server } = require("socket.io");

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const DB = process.env.DBURL.replace("<PASSWORD>", process.env.DBPASSWORD);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((con) => {
    console.log("DB connection is successful");
  })
  .catch((err) => {
    console.log("err", err);
  });
// port: 3000, 5000
const port = process.env.PORT || 8000;

io.on("connection", async (socket) => {
  console.log(socket);

  const user_id = socket.handshake.query("user_id");

  const socket_id = socket_id;
  console.log(`User connected ${socket_id}`);

  // when valid user, fetch that user's document and update this socket ID
  if (user_id) {
    await User.findByIdAndUpdate(user_id, { socket_id });
  }

  // in a listener
  socket.on("friend_request", async (data) => {
    console.log(data.to);

    const to = await User.findById(data.to);
    io.to(to.socket_id).emit("new_friend_request", {
      //
    });
  });
});

server.listen(port, () => {
  console.log(`app running on port ${port}`);
});

process.on("unhandledRejection", (err) => {
  console.log(err);
  server.close(() => {
    process.exit(1);
  });
});
