const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

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
    default: true,
  },
  otp: {
    // after hash the otp
    type: String, // result: asdf1423gzxc 123456789asd
  },
  otp_expiry_time: {
    type: Date,
  },
  socket_id: {
    type: String,
  },
  friend: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  ],
  status: {
    type: String,
    enum: ["Online", "Offline"],
  },
});

// start middleware //
// encrypted OTP
userSchema.pre("save", async function (next) {
  // Only run this function if otp is actually modified

  if (!this.isModified("otp") || !this.otp) return next();

  // hash the otp with the cost of 12
  this.otp = await bcrypt.hash(this.otp.toString(), 12);

  console.log(this.otp.toString(), "FROM PRE SAVE HOOK");

  next();
});

// encrypted password
userSchema.pre("save", async function (next) {
  // Only run this function if password is actually modified

  if (!this.isModified("password") || !this.password) return next();

  // hash the password with the cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  next();
});

// userSchema.pre("save", function (next) {
//   if (!this.isModified("password") || this.isNew || !this.password)
//     return next();

//   this.passwordChangedAt = Date.now() - 1000;
//   next();
// });

// hash a password
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

//
userSchema.methods.correctOTP = async function (candidateOTP, userOTP) {
  return await bcrypt.compare(candidateOTP, userOTP);
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
