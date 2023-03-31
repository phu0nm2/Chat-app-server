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
      message: "Email is already in use, please try with other email!",
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
    otp_expiry_time: otp_expiry_time,
  });

  user.otp = new_otp.toString();

  await user.save({ new: true, validateModifiedOnly: true });

  console.log("otp is", new_otp);

  // todo send mail
  mailService.sendSGMail({
    from: "teppppp2@gmail.com",
    to: user.email,
    subject: "OTP for Talk app",
    html: `Your is ${new_otp}. This is valid for 10 mins`,
    // html: otp(user.firstName, new_otp),
    attachments: [],
  });

  res.status(200).json({
    status: "success",
    message: "OTP sent successfully, login now!",
  });
};

// still get error: opt is not defined
// sent mail from sendgrid to our email need around 24hours so can't verify otp in 10mins
// hardcode verify = true to login
exports.verifyOTP = async (req, res, next) => {
  // verify OTP and update user record accordingly
  const { email, otp } = await req.body;

  const user = await User.findOne({
    email,
    otp_expiry_time: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      status: "error",
      message: "Email is invalid or otp expired!",
    });
  }

  if (user.verified) {
    return res.status(400).json({
      status: "error",
      message: "email is already verified!",
    });
  }
  // otp fail
  if (!(await user.correctOTP(otp, user.otp))) {
    res.status(400).json({
      status: "error",
      message: "OTP is incorrect!",
    });

    return;
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
    user_id: user_id,
  });
};

// user login
exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  // console.log(email, password);

  if (!email || !password) {
    res.status(400).json({
      status: "error",
      message: "Both email and password are required!",
    });

    return;
  }

  const user = await User.findOne({ email: email }).select("+password");

  if (!user || !user.password) {
    res.status(400).json({
      status: "error",
      message:
        "Your email is not already register or Incorrect password. Please register now!",
    });

    return;
  }

  if (!user || !(await user.correctPassword(password, user.password))) {
    // console.log(user);
    // console.log(password, user.password);
    res.status(400).json({
      status: "error",
      message: "Email or password is incorrect",
    });

    return;
  }

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "Logged in successfully!",
    token,
    user_id: user._id,
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
  await user.save({ validateBeforeSave: false });

  // send it to user email
  try {
    const resetURL = `http://localhost:3000/auth/new-password?token=${resetToken}`;

    // todo send mail
    mailService.sendSGMail({
      from: "teppppp2@gmail.com",
      to: user.email,
      subject: "Talk app - Reset password",
      html: `Click this link to reset your password ${resetURL}`,

      attachments: [],
    });

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

// still not working with the token
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
  // password + passwordConform + token
  user.password = req.body.password;
  user.passwordConform = req.body.passwordConform;
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
