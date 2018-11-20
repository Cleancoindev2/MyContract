var passport = require('passport');
const jwt = require('jsonwebtoken');
var configAuth = require('../config/auth');
const ImageDataURI = require('image-data-uri');
var path = require('path');
var db = require('../database/models/index');
var client = db.client;
var User = db.user;
var ProjectConfiguration = db.projectConfiguration;
var fs = require('fs');
var icoListener = require('../icoHandler/listener');
var config = require('../config/paymentListener');
var Tx = require('ethereumjs-tx');
const Web3 = require('web3');
var ws_provider = config.ws_provider;
var provider = new Web3.providers.WebsocketProvider(ws_provider);
// let provider = new Web3.providers.WebsocketProvider('wss://ropsten.infura.io/ws');
var web3 = new Web3(provider);
const Sequelize = require('sequelize');
const Op = Sequelize.Op


module.exports = {
  //client setup
  contractInteraction: async function (req, res) {
    var projectArray = await getProjectArray(req.user.email);
    var address = req.cookies['address'];
    res.render(path.join(__dirname, './', 'dist', 'index.ejs'), {
      user: req.user,
      address: address,
      ProjectConfiguration: projectArray,
    });
  },
  icoDashboardSetup: async function (req, res) {
    let userCount = await User.count({ where: { 'projectConfigurationCoinName': req.params.projectName } })
    let verifiedUserCount = await User.count({ where: { 'projectConfigurationCoinName': req.params.projectName, "kyc_verified": "active" } })
    let projectConfi = await ProjectConfiguration.find({ where: { 'coinName': req.params.projectName } })
    let eth_address = await db.userCurrencyAddress.findAll({ where: { "client_id": req.user.uniqueId, "currencyType": "masterEthereum" }, raw: true, })
    let btc_address = await db.userCurrencyAddress.findAll({ where: { "client_id": req.user.uniqueId, "currencyType": "masterBitcoin" }, raw: true, })
    let transactionLog = await db.tokenTransferLog.findAll({ where: { 'project_id': req.params.projectName }, raw: true });
    Promise.all([icoListener.checkEtherBalance(eth_address[0].address), icoListener.checkBalance(btc_address[0].address), icoListener.checkTokenBalance(projectConfi.tokenContractAddress, projectConfi.tokenContractAddress), icoListener.checkTokenBalance(projectConfi.crowdsaleContractAddress, projectConfi.tokenContractAddress)]).then(([ethBalance, btcBalance, tokenBalance, crowdsaleBalance]) => {
      res.render('icoDashboard', {
        'ethBalance': ethBalance,
        'btcBalance': btcBalance,
        'user': req.user,
        'projectName': req.params.projectName,
        'userCount': userCount,
        'verifiedUserCount': verifiedUserCount,
        'transactionLog': transactionLog,
        'tokenBalance': tokenBalance,
        'crowdsaleBalance': crowdsaleBalance
      });
    });
  },
  tokenTrasfer: async function (req, res) {
    console.log(req.body)
    let projectConfi = await ProjectConfiguration.find({ where: { 'coinName': req.params.projectName } })
    let accountData = await db.userCurrencyAddress.find({ where: { 'client_id': req.user.uniqueId, 'currencyType': 'Ethereum' } })
    var escrowAbi = [{ "constant": true, "inputs": [], "name": "mintingFinished", "outputs": [{ "name": "", "type": "bool" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "name", "outputs": [{ "name": "", "type": "string" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "name": "spender", "type": "address" }, { "name": "value", "type": "uint256" }], "name": "approve", "outputs": [{ "name": "", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "totalSupply", "outputs": [{ "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "name": "from", "type": "address" }, { "name": "to", "type": "address" }, { "name": "value", "type": "uint256" }], "name": "transferFrom", "outputs": [{ "name": "", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [], "name": "destroyToken", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "decimals", "outputs": [{ "name": "", "type": "uint8" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "cap", "outputs": [{ "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "name": "spender", "type": "address" }, { "name": "addedValue", "type": "uint256" }], "name": "increaseAllowance", "outputs": [{ "name": "success", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [], "name": "unpause", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "name": "to", "type": "address" }, { "name": "amount", "type": "uint256" }], "name": "mint", "outputs": [{ "name": "", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "name": "value", "type": "uint256" }], "name": "burn", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "name": "value", "type": "uint256" }], "name": "upgrade", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [{ "name": "account", "type": "address" }], "name": "isPauser", "outputs": [{ "name": "", "type": "bool" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "paused", "outputs": [{ "name": "", "type": "bool" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "upgradeAgent", "outputs": [{ "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "upgradeMaster", "outputs": [{ "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [], "name": "renouncePauser", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [{ "name": "owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [], "name": "renounceOwnership", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [], "name": "acceptOwnership", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "name": "from", "type": "address" }, { "name": "value", "type": "uint256" }], "name": "burnFrom", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "name": "_tokens", "type": "uint256" }, { "name": "_address", "type": "address" }], "name": "sendTokensToCrowdsale", "outputs": [{ "name": "ok", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [], "name": "finishMinting", "outputs": [{ "name": "", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "name": "account", "type": "address" }], "name": "addPauser", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "getUpgradeState", "outputs": [{ "name": "", "type": "uint8" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [], "name": "pause", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "owner", "outputs": [{ "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "isOwner", "outputs": [{ "name": "", "type": "bool" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "symbol", "outputs": [{ "name": "", "type": "string" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "canUpgrade", "outputs": [{ "name": "", "type": "bool" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "name": "account", "type": "address" }], "name": "addMinter", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [], "name": "renounceMinter", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "name": "spender", "type": "address" }, { "name": "subtractedValue", "type": "uint256" }], "name": "decreaseAllowance", "outputs": [{ "name": "success", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "name": "to", "type": "address" }, { "name": "value", "type": "uint256" }], "name": "transfer", "outputs": [{ "name": "", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [{ "name": "account", "type": "address" }], "name": "isMinter", "outputs": [{ "name": "", "type": "bool" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "totalUpgraded", "outputs": [{ "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "newOwner", "outputs": [{ "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "name": "agent", "type": "address" }], "name": "setUpgradeAgent", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [{ "name": "owner", "type": "address" }, { "name": "spender", "type": "address" }], "name": "allowance", "outputs": [{ "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "name": "_tokens", "type": "uint256" }], "name": "sendTokensToOwner", "outputs": [{ "name": "ok", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "name": "_newOwner", "type": "address" }], "name": "transferOwnership", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "name": "_upgradeMaster", "type": "address" }], "name": "UpgradeableToken", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "name": "master", "type": "address" }], "name": "setUpgradeMaster", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "payable": false, "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": true, "name": "_from", "type": "address" }, { "indexed": true, "name": "_to", "type": "address" }, { "indexed": false, "name": "_value", "type": "uint256" }], "name": "Upgrade", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "name": "agent", "type": "address" }], "name": "UpgradeAgentSet", "type": "event" }, { "anonymous": false, "inputs": [], "name": "MintingFinished", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "name": "account", "type": "address" }], "name": "MinterAdded", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "name": "account", "type": "address" }], "name": "MinterRemoved", "type": "event" }, { "anonymous": false, "inputs": [], "name": "Paused", "type": "event" }, { "anonymous": false, "inputs": [], "name": "Unpaused", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "name": "account", "type": "address" }], "name": "PauserAdded", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "name": "account", "type": "address" }], "name": "PauserRemoved", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "name": "_from", "type": "address" }, { "indexed": true, "name": "_to", "type": "address" }], "name": "OwnershipTransferred", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "name": "previousOwner", "type": "address" }], "name": "OwnershipRenounced", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "name": "from", "type": "address" }, { "indexed": true, "name": "to", "type": "address" }, { "indexed": false, "name": "value", "type": "uint256" }], "name": "Transfer", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "name": "owner", "type": "address" }, { "indexed": true, "name": "spender", "type": "address" }, { "indexed": false, "name": "value", "type": "uint256" }], "name": "Approval", "type": "event" }]
    var contractfunc = new web3.eth.Contract(escrowAbi, projectConfi.tokenContractAddress, { from: accountData.address });
    let data = contractfunc.methods.sendTokensToCrowdsale('0x'+(req.body.tokenAmount).toString(16), req.body.tokenAddress).encodeABI()
    var mainPrivateKey = new Buffer(accountData.privateKey.replace("0x", ""), 'hex')
    let txData = {
      "nonce": await web3.eth.getTransactionCount(accountData.address),
      "gasPrice": "0x170cdc1e00",
      "gasLimit": "0x2dc6c0",
      "to": projectConfi.tokenContractAddress,
      "value": "0x0",
      "data": data,
      "chainId": 3
    }
    var tx = new Tx(txData);
    tx.sign(mainPrivateKey);
    var serializedTx = tx.serialize();
    try {
      web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
        .on('confirmation', async function (confirmationNumber, receipt) {
          if (confirmationNumber == 1) {
            console.log(confirmationNumber, receipt);
            res.redirect('/icoDashboard/icoDashboardSetup/project/' + req.params.projectName);
          }
        })
        .on('error', function (error) { res.render('error', { error: error }); })

    }
    catch (err) { console.log("in err") }
  },

  siteConfiguration: function (req, res) {
    console.log(req.params, "project")
    res.render('siteConfiguration', {
      user: req.user,
      projectName: req.params.projectName
    });
  },
  getSiteConfiguration: function (req, res) {
    console.log(req.params.projectName)
    ProjectConfiguration.find({
      where: {
        'coinName': req.params.projectName
      },
      attributes: {
        exclude: ['coinName', 'ETHRate', 'tokenContractCode', 'tokenABICode', 'crowdsaleABICode', 'tokenByteCode', 'tokenContractHash', 'crowdsaleContractCode', 'crowdsaleByteCode', 'crowdsaleContractHash']
      }
    }).then(values => {
      if (!values) {
        res.send({
          message: "null!"
        });
      } else {
        res.send({
          data: values.dataValues,
          message: "updated!",
          Buffer: values.dataValues.siteLogo
        })
      }
    })
  },
  updateSiteConfiguration: async function (req, res) {
    var projectdatavalues = await ProjectConfiguration.find({
      where: {
        "coinName": req.params.projectName
      }
    })
    if (req.files[0] != undefined)
      projectdatavalues.siteLogo = await ImageDataURI.encodeFromFile(req.files[0].path).catch(function (err) {
        res.render("error", { error: err, message: "unable to update!" })
      });
    projectdatavalues.siteName = req.body.site_name
    projectdatavalues.softCap = req.body.soft_cap
    projectdatavalues.hardCap = req.body.hard_cap
    projectdatavalues.startDate = req.body.start_date
    projectdatavalues.endDate = req.body.end_date
    projectdatavalues.homeURL = req.body.website_url
    projectdatavalues.minimumContribution = req.body.minimum_contribution
    projectdatavalues.save({ returning: false }).then(() => {
      console.log("Project updated successfully!");
      res.redirect("/icoDashboard/siteConfiguration/project/" + req.params.projectName)
    })
      .catch(function (err) {
        res.render("error", { error: err, message: "unable to update!" })
      });
  },

  getKYCPage: async function (req, res) {
    res.render("kyctab.ejs", {
      user: req.user,
      projectName: req.params.projectName
    })
  },
  getICOdata: async function (req, res) {
    userdata = new Object();
    userdata = await User.findAll({
      where: {
        "projectConfigurationCoinName": req.params.projectName
      },
      attributes: {
        exclude: ["mobile", "isd_code", "usertype_id", "updatedAt", "createdAt", "kycDoc3", "kycDocName3", "kycDoc2", "kycDocName2", "kycDoc1", "kycDocName1", "password"]
      }
    })
    userdata.forEach(element => {
      element.dataValues.link = "<a href='/icoDashboard/icoDashboardSetup/project/" + req.params.projectName + "/kyctab/" + element.dataValues.uniqueId + "/getUserData'>click Here</a>"
      // console.log(element)
    });
    res.send({
      data: userdata
    });
  },
  getUserData: async function (req, res) {
    var userdata = new Object();
    User.find({
      where: {
        "projectConfigurationCoinName": req.params.projectName,
        "uniqueId": req.params.uniqueId
      },
    }).then(async result => {
      userdata = result.dataValues;
      console.log("done")
      res.render("adminKYCpanel.ejs", {
        KYCdata: userdata,
        projectName: req.params.projectName
      })
    })
  },
  updateUserData: async function (req, res) {
    // console.log(req.body,"HEER")
    var userdata = await User.find({
      where: {
        "projectConfigurationCoinName": req.params.projectName,
        "uniqueId": req.params.uniqueId
      },
    })
    userdata.kyc_verified = req.body.kyc_verified;
    userdata.status = req.body.status;
    userdata.save().then(function (result, error) {
      if (!result)
        console.log("not updated");
      console.log("updated");
    })
    res.redirect("/icoDashboard/icoDashboardSetup/project/" + req.params.projectName + "/kyctab")
  },

  contractData: async function (req, res) {
    ProjectConfiguration.find({
      where: {
        'coinName': req.params.projectName,
        'client_id': req.user.uniqueId
      },
      attributes: {
        exclude: ['coinName', 'ETHRate', 'tokenContractCode', 'tokenByteCode', 'tokenContractHash', 'crowdsaleContractCode', 'crowdsaleByteCode', 'crowdsaleContractHash']
      }
    }).then(result => {
      if (result == undefined) {
        res.send({
          "tokenAddress": "you are not allowed to access this page",
          "crowdSaleAddress": "you are not allowed to access this page",
        })
      } else {
        res.send({
          "tokenAddress": result.dataValues.tokenContractAddress,
          "crowdSaleAddress": result.dataValues.crowdsaleContractAddress,
          "crowdsaleABICode": result.dataValues.crowdsaleABICode,
          "tokenABICode": result.dataValues.tokenABICode
        })
      }
    })
  },

  //user login
  userLogin: function (req, res) {
    res.render("userLogin.ejs", {
      message: req.flash('loginMessage')
    });
  },
  getUserSignup: function (req, res) {
    ProjectConfiguration.find({
      where: {
        coinName: req.params.projectName
      }
    }).then(project => {
      if (project) {
        res.render("userSignup.ejs", {
          projectName: req.params.projectName,
          message: req.flash('signupMessage')
        });
      }
      else {
        res.send("404 Not Found");
      }
    })
  },

  getUserLogin: function (req, res) {
    res.render("userLogin.ejs", {
      'projectName': req.params.projectName,
      message: req.flash('signupMessage')
    });
  },

  postUserLogin: async function (req, res, next) {
    passport.authenticate('user-login', {
      session: false
    }, async (err, user, info) => {
      console.log("Info" + info);
      try {
        if (err || !user) {
          const error = new Error('An Error occured')
          console.log();
          return res.json({
            'token': "failure",
            'message': info
          });
        }
        const token = jwt.sign({
          userEmail: user.email,
          projectName: user.projectConfigurationCoinName
        }, configAuth.jwtAuthKey.secret, {
            expiresIn: configAuth.jwtAuthKey.tokenLife
          });
        //Send back the token to the user
        res.cookie('token', token, {
          expire: 360000 + Date.now()
        });
        return res.json({
          'token': "success"
        });
      } catch (error) {
        return next(error);
      }
    })(req, res, next);
  },

  postUserSignup: function (req, res, next) {
    passport.authenticate('user-signup', {
      session: false
    }, async (err, user, info) => {
      console.log(user);
      try {
        if (err || !user) {
          return res.redirect('./userSignup');
        }
        return res.redirect('./userLogin');
      } catch (error) {
        return next(error);
      }
    })(req, res, next);
  },


  verifyMail: (req, res) => {
    console.log(req.query);
    db.user.find({
      where: {
        uniqueId: req.query.verificationId
      }
    }).then((user) => {
      user.emailVerified = true;
      user.save().then((user) => {
        res.redirect('./' + user.projectConfigurationCoinName + '/userLogin');
      });
    });
  },
  getTransaction: async (req, res) => {
    transactionLog = await db.tokenTransferLog.findAll(
      { where: { 'project_id': req.params.projectName }, raw: true }
    );
    // console.log(transactionLog)
    res.render("transaction.ejs", {
      user: req.user,
      projectName: req.params.projectName,
      transactionLog: transactionLog
    });
  },
  initiateTransferReq: async (req, res) => {
    console.log(req.body['accounts[]'].toString(), "here")
    let ids = []
    let address = [];
    let values = [];
    if (Array.isArray(req.body['accounts[]'])) {
      req.body['accounts[]'].forEach(element => {
        ids.push(element)
      });
    } else {
      ids.push(req.body['accounts[]'])
    }
    let projectdatavalues = await ProjectConfiguration.find({
      where: {
        "coinName": req.params.projectName
      }
    })
    let accountData = await db.userCurrencyAddress.find({ where: { 'client_id': req.user.uniqueId, 'currencyType': 'Ethereum' } })
    let tokenLogs = await db.tokenTransferLog.findAll({
      where: {
        "project_id": req.params.projectName,
        uniqueId: {
          [Op.or]: ids
        }
      }, raw: true
    })
    await Promise.all([icoListener.checkTokenStats(projectdatavalues.tokenContractAddress)]).then(([decimals]) => {
      console.log("here 2", decimals);
      for (let index = 0; index < tokenLogs.length; index++) {
        address.push(tokenLogs[index].address);
        values.push('0x' + ((tokenLogs[index].tokenAmount * 10 ** (decimals)) * projectdatavalues.ETHRate).toString(16))
      }
    })
    var escrowAbi = [{ "constant": false, "inputs": [{ "name": "_value", "type": "bool" }], "name": "updateBounsStatus", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "rate", "outputs": [{ "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "weiRaised", "outputs": [{ "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "wallet", "outputs": [{ "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "name": "_value", "type": "uint256" }], "name": "updateBounsRate", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "bonusRate", "outputs": [{ "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "name": "_value", "type": "uint256" }], "name": "updateTokenPrice", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "isBonusOn", "outputs": [{ "name": "", "type": "bool" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "name": "_investor", "type": "address" }, { "name": "_tokens", "type": "uint256" }], "name": "sendTokensToInvestors", "outputs": [{ "name": "ok", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [], "name": "stopCrowdSale", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "name": "_addresses", "type": "address[]" }, { "name": "_value", "type": "uint256[]" }], "name": "dispenseTokensToInvestorAddressesByValue", "outputs": [{ "name": "ok", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "name": "beneficiary", "type": "address" }], "name": "buyTokens", "outputs": [], "payable": true, "stateMutability": "payable", "type": "function" }, { "constant": false, "inputs": [], "name": "startCrowdSale", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "token", "outputs": [{ "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "inputs": [{ "name": "rate", "type": "uint256" }, { "name": "bonusRate", "type": "uint256" }, { "name": "wallet", "type": "address" }, { "name": "token", "type": "address" }, { "name": "isBonusOn", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "constructor" }, { "payable": true, "stateMutability": "payable", "type": "fallback" }, { "anonymous": false, "inputs": [{ "indexed": true, "name": "purchaser", "type": "address" }, { "indexed": true, "name": "beneficiary", "type": "address" }, { "indexed": false, "name": "value", "type": "uint256" }, { "indexed": false, "name": "amount", "type": "uint256" }], "name": "TokensPurchased", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "name": "beneficiary", "type": "address" }, { "indexed": false, "name": "amount", "type": "uint256" }], "name": "TokensPurchased", "type": "event" }]
    console.log(values, address, accountData.privateKey);
    var contractfunc = new web3.eth.Contract(escrowAbi, projectdatavalues.crowdsaleContractAddress, { from: accountData.address });
    let data = contractfunc.methods.dispenseTokensToInvestorAddressesByValue(address, values).encodeABI()
    var mainPrivateKey = new Buffer(accountData.privateKey.replace("0x", ""), 'hex')
    let txData = {
      "nonce": await web3.eth.getTransactionCount(accountData.address),
      "gasPrice": "0x170cdc1e00",
      "gasLimit": "0x2dc6c0",
      "to": projectdatavalues.crowdsaleContractAddress,
      "value": "0x0",
      "data": data,
      "chainId": 3
    }
    var tx = new Tx(txData);
    tx.sign(mainPrivateKey);
    var serializedTx = tx.serialize();
    try {
      web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
        .on('confirmation', async function (confirmationNumber, receipt) {
          if (confirmationNumber == 1) {
            console.log(confirmationNumber, receipt);
            await db.tokenTransferLog.update({ tokenTransferStatus: "Transferred", transaction_hash: receipt.transactionHash }, { where: { uniqueId: { [Op.or]: ids } } });
            res.send({ receipt: receipt, message: true });
          }
        })
        .on('error', function (error) { res.send({ receipt: error, message: false }); })

    }
    catch (err) { console.log("in err") }
  }
}

function getProjectArray(email) {
  var projectArray = [];
  return new Promise(async function (resolve, reject) {
    client.find({
      where: {
        'email': email
      },
      include: [{
        model: ProjectConfiguration,
        attributes: ['coinName', 'ETHRate', 'tokenContractAddress', 'tokenContractCode', 'tokenByteCode', 'tokenContractHash', 'crowdsaleContractAddress', 'crowdsaleContractCode', 'crowdsaleByteCode', 'crowdsaleContractHash']
      }],
    }).then(client => {
      client.projectConfigurations.forEach(element => {
        projectArray.push(element.dataValues);
      });
      // res.send({'projectArray': projectArray});
      resolve(projectArray);
    });
  });
}
