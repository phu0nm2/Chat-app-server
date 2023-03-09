const sgMail = require("@sendgrid/mail");

const dotenv = require("dotenv");
dotenv.config({ path: "../config.env" });

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendSGMail = async ({
  recipient,
  sender,
  subject,
  html,
  text,
  attachments,
}) => {
  try {
    const from = sender || "teppppp2@gmail.com";

    const msg = {
      to: recipient,
      from: from, // Use the email address or domain you verified above
      subject,
      html: html,
      text: text,
      attachments,
    };

    return sgMail.send(msg);
  } catch (error) {
    console.log(error);
  }
};

exports.sendSGMail = async (args) => {
  // if in this case 'development' mode, when we try to send any mail
  // just get a promise
  // but the email actual email is not going to be sent mail
  if (procees.env.NODE_ENV === "development") {
    return new Promise.resolve();
  } else {
    return sendSGMail(args);
  }
};
