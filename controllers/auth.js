const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");

//
const User = require("../models/user");
const filterObj = require("../utils/filterObj");

const signToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET);

// Register new user
exports.register = async (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;

  const filteredBody = filterObj(
    req.body,
    "firstName",
    "lastName",
    "password",
    "email",
  );

  // check if a verified user with given email exists
  const existing_user = await User.findOne({ email: email });

  // using and verified
  if (existing_user && existing_user.verified) {
    res.status(400).json({
      status: "error",
      message: "Email is already in use, please login.!",
    });
  }
  // using but not verified
  else if (existing_user) {
    await User.findOneAndUpdate({ email: email }, filteredBody, {
      new: true,
      validateModifiedOnly: true,
    });

    //
    req.userId = existing_user._id;
    next();
  } else {
    // if user record is not available in DB
    const new_user = await User.create(filteredBody);

    // generate OTP and send mail to user
    req.userId = new_user._id;
    next();
  }
};

exports.sendOTP = async (req, res, next) => {
  const { userId } = req;
  const new_otp = otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });

  const otp_expiry_time = Date.now() + 10 * 6 * 1000; // 10 mints after otp is sent

  await User.findOneAndUpdate(userId, {
    otp: new_otp,
    otp_expiry_time,
  });

  // send mail
  res.status(200).json({
    status: "success",
    message: "OTP sent successfully",
  });
};

exports.verifyOTP = async (req, res, next) => {
  // verify OTP and update user record accordingly
  const { email, otp } = req.body;
  const user = await User.findOne({
    email,
    otp_expiry_time: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400).json({
      status: "error",
      message: "Email is invalid or otp expired!",
    });
  }

  // otp fail
  if (!(await user.correctOTP(otp, user.otp))) {
    res.status(400).json({
      status: "error",
      message: "OTP is incorrect!",
    });
  }

  // otp is correct
  user.verified = true;
  user.otp = verified;

  await user.save({ new: true, validateModifiedOnly: true });

  const token = signToken(user._id);
  res.status(200).json({
    status: "success",
    message: "OTP verified successfully",
    token,
  });
};
exports.login = async (req, res, next) => {
  const { email, password } = req.body;
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

exports.protect = async (req, res, next) => {
  //
};

exports.forgotPassword = async (req, res, next) => {
  //
};
exports.resetPassword = async (req, res, next) => {
  //
};
