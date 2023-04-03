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
const FriendRequest = require("./models/friendRequest");

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

// socket.io
io.on("connection", async (socket) => {
  console.log(socket.handshake.query);

  const user_id = socket.handshake.query("user_id");

  const socket_id = socket_id;
  console.log(`User connected ${socket_id}`);

  // when valid user, fetch that user's document and update this socket ID
  if (Boolean(user_id)) {
    await User.findByIdAndUpdate(user_id, { socket_id });
  }

  // in a listener
  socket.on("friend_request", async (data) => {
    console.log(data.to);

    const to_user = await User.findById(data.to).select("socket_id");
    const from_user = await User.findById(data.from).select("socket_id");

    // create a friend request
    await FriendRequest.create({
      sender: data.from,
      recipient: data.to,
    });

    // email event => "new_friend_request"
    io.to(to_user.socket_id).emit("new_friend_request", {
      //
      message: "New friend request received!",
    });
    io.to(from_user.socket_id).emit("request_sent", {
      //
      message: "Request sent successfully!",
    });
    // emit event => "request sent"
  });

  socket.on("accept_request", async (data) => {
    console.log(data);

    //
    const request_doc = await FriendRequest.findById(data.request_id);
    console.log(request_doc);

    const sender = await User.findById(request_doc.sender);
    const receiver = await User.findById(request_doc.recipient);

    sender.friends.push(request_doc.recipient);
    receiver.friends.push(request_doc.sender);

    await receiver.save({ new: true, validateModifiedOnly: true });
    await sender.save({ new: true, validateModifiedOnly: true });

    await FriendRequest.findByIdAndDelete(data.request_id);

    io.to(sender.socket_id).emit("request_accepted", {
      message: "Friend request accepted!",
    });
    io.to(receiver.socket_id).emit("request_accepted", {
      message: "Friend request accepted!",
    });
  });

  socket.on("end", function () {
    console.log("Closing connection");
    socket.disconnect(); // 0
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
