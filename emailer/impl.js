const nodemailerAuth =require("../config/auth").nodemailerAuth;
var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
    service: "gmail",
    auth: nodemailerAuth
});

module.exports = {
  sendContractEmail: function(email, result){
    var mailOptions = {
      from: "smartplatformsc@gmail.com",
      to: email,
      subject: "ERC20 based SM",
      text: "This is an ERC20 compliant smart contract automatically developed by AutoCoin. This smart contract is developed along the features that are considered important by XinFin",
      attachments: [{
        filename: "coin.sol",
        content: result
      }]
    };
    transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
        return;
      }
    });
  }
}