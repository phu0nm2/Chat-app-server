const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const crypto = require("crypto");
//
const mailService = require("../services/mailer");
const User = require("../models/user");
const filterObj = require("../utils/filterObj");
const { promisify } = require("util");

// Sinup => Register - sendOTP - verifyOTP -

const signToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET);

// Register new user
exports.register = async (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;

  const filteredBody = filterObj(
    req.body,
    "firstName",
    "lastName",
    "email",
    "password",
  );

  // check if a verified user with given email exists
  const existing_user = await User.findOne({ email: email });

  // using and verified
  if (existing_user && existing_user.verified) {
    return res.status(400).json({
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

  const user = await User.findOneAndUpdate(userId, {
    otp_expiry_time,
  });

  user.otp = new_otp.toString();

  await user.save({ new: true, validateModifiedOnly: true });

  console.log("otp", new_otp);

  // todo send mail
  mailService.sendSGMail({
    from: "teppppp2@gmail.com",
    to: user.email,
    subject: "OTP for Talk app",
    html: otp(user.firstName, new_otp),
    attachments: [],
  });
  // .then(() => {
  //   res.status(200).json({
  //     status: "success",
  //     message: "OTP sent successfully",
  //   });
  // })
  // .catch(() => {
  //   res.status(400).json({
  //     status: "error",
  //     message: "server is not response",
  //   });
  // });

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
  // Getting token (JWT) and check if it's there

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  } else {
    req.status(400).json({
      status: "error",
      message: "You are not logged In! Please log in to get access!",
    });
  }

  // verification of token, decoded from JWT framework
  const decoded = await promisify(jwt.verify)(token.process.env.JWT_SECRET);

  // check if user still exist
  const this_user = await User.findById(decoded.userId);

  if (!this_user) {
    res.status(400).json({
      status: "error",
      message: "The user doesn't exist!",
    });
  }

  // check if user changed their password after token was issued
  if (this_user.changePasswordAfter(decoded.iat)) {
    res.status(400).json({
      status: "error",
      message: "User recently updated password! Please log in again!",
    });
  }

  //
  req.user = this_user;
  next();
};

// Types of routes => Protected (only logged in users can access these) & UnProtected
exports.forgotPassword = async (req, res, next) => {
  // 1. get user email

  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    res.status(400).json({
      status: "error",
      message: "There is no user with given email address!",
    });
  }

  // 2. Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  const resetURL = `http://localhost:3000/auth/new-password?token=${resetToken}`;

  try {
    //
    res.status(200).json({
      status: "success",
      message: "Reset password link sent to email",
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateBeforeSave: false });

    res.status(500).json({
      status: "error",
      message: "There was an error sending the email, please try again later",
    });
  }
  //
};
exports.resetPassword = async (req, res, next) => {
  // get user based on token

  const hashedToken = crypto
    .createHash("sha256")
    .update(req.body.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // if token has expired or submission is out of time window
  if (!user) {
    return res.status(400).json({
      status: "error",
      message: "Token is Invalid or Expired",
    });
  }

  // update users password and set resetToken & expiry to undefined
  user.passord = req.body.passord;
  user.passordConform = req.body.passordConform;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  // Login the user and send new JWT

  // TODO => send an email to user informing about password reset

  const token = signToken(user._id);
  res.status(200).json({
    status: "success",
    message: "Password reseted successfully",
    token,
  });
};
