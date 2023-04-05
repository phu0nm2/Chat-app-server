const app = require("./app");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
dotenv.config({ path: "./config.env" });

const path = require("path");

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
    await User.findByIdAndUpdate(user_id, { socket_id, status: "Online" });
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

    // handle text/link message
    socket.on("text_message", (data) => {
      console.log("Received Message", data);

      // data:{to, from, text}

      // create a new conversation if it doesn't exist yet or add new mess to the mess list

      // save to db

      // emit incoming_mess -> to user

      // emit outgoing_mess -> from user
    });

    socket.on("file_message", (data) => {
      console.log("Received Message", data);

      // data:{to, from, text, file}

      // get the file
      const fileExtension = path.extname(data.file.name);

      // generate a unique filename
      const fileName = `${Date.now()}_${Math.floor(
        Math.random() * 10000,
      )}${fileExtension}`;

      // update file to AWS s3

      // create a new conversation if it doesn't exist yet or add new mess to the mess list

      // save to db

      // emit incoming_mess -> to user

      // emit outgoing_mess -> from user
    });
  });

  socket.on("end", async (data) => {
    // find user_id and set the status is offline if user disconnected
    if (data.user_id) {
      await User.findByIdAndUpdate(data.user_id, { status: "Offline" });
    }

    //
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
