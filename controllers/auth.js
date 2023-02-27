const jwt = require("jsonwebtoken");

//
const User = require("../models/user");

const signToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET);
exports.login = async (request, res, next) => {
  const { email, password } = request.body;
  if (!email || !password) {
    res.status(400).json({
      status: "error",
      message: "Both email and password are required!",
    });
  }
  const userDoc = await User.findOne({ email: email }).select("+password");
  if (!userDoc || !(await userDoc.correctPassword(password, userDoc.passord))) {
    res.status(400).json({
      status: "error",
      message: "Email or password is incorrect!",
    });
  }

  const token = signToken(userDoc._id);
  res.status(200).json({
    status: "success",
    message: "Logger is successfully",
    token,
  });
};
