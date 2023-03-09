const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, "First name is required!"],
  },
  lastName: {
    type: String,
    required: [true, "Last name is required!"],
  },
  avatar: {
    type: String,
  },
  email: {
    type: String,
    required: [true, "Email is required! "],
    validate: {
      validator: function (email) {
        return String(email)
          .toLowerCase()
          .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
          );
      },
      message: (props) => `Email (${props.value}) is invalid!`,
    },
  },
  password: {
    type: String,
  },
  passwordConfirm: {
    type: String,
  },
  passwordChangedAt: {
    type: Date,
  },
  passwordResetToken: {
    type: String,
  },
  passwordResetExpires: {
    type: Date,
  },
  createAt: {
    type: Date,
  },
  updatedAt: {
    type: Date,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  otp: {
    // after hash the otp
    type: String, // result: asdf1423gzxc 123456789asd
  },
  otp_expiry_time: {
    type: Date,
  },
});

// start middleware //
// encrypted OTP
userSchema.pre("save", async function (next) {
  // Only run this function if otp is actually modified

  if (!this.isModified("otp")) return next();

  // hash the otp with the cost of 12
  this.otp = await bcrypt.hash(this.otp, 12);

  next();
});

// encrypted password
userSchema.pre("save", async function (next) {
  // Only run this function if otp is actually modified

  if (!this.isModified("password")) return next();

  // hash the password with the cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  next();
});

// hash a password
userSchema.methods.correctPassword = async function (
  canditatePassword,
  userPassword,
) {
  return await bcrypt.compare(canditatePassword, userPassword);
};

//
userSchema.methods.correctOTP = async function (canditateOTP, userOTP) {
  return await bcrypt.compare(canditateOTP, userOTP);
};
// end middleware //

// crypto is no longer supported. It's now a built-in Node module
// can change to crypto-js
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  return resetToken;
};

// at this_user (auth) call this methods to handle
userSchema.methods.changePasswordAfter = function (timestamp) {
  return timestamp < this.passwordChangedAt;
};

const User = new mongoose.model("User", userSchema);

module.exports = User;
