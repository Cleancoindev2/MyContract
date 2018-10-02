const impl = require("./impl");
var db = require('../database/models/index');
var client = db.client;
var projectConfiguration = db.projectConfiguration


module.exports = function (app) {

  app.get('/customContract', isLoggedIn, impl.getCustomContractForm);
  app.get('/erc721Contract', isLoggedIn, impl.getERC721ContractForm);
  app.get('/generatedContract', isLoggedIn, impl.getGeneratedContract);
  // app.post("/createContract", isLoggedIn,coinNameExist, hasPackage1, impl.createContract);
  app.post("/createERC721", isLoggedIn,coinNameExist, hasPackage1, impl.createERC721Contract);
  // app.get('/api/checkPackage', isLoggedIn, impl.checkPackage);

  app.post('/createERC20Contract',isLoggedIn,coinNameExist,hasPackage1,impl.createERC20Contract);
}

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

  // if user is authenticated in the session, carry on
  if (req.isAuthenticated())
    return next();

  // if they aren't redirect them to the home page
  res.redirect('/');

}

function coinNameExist(req, res, next) {
  console.log(req.body)
  projectConfiguration.find({
    where: {
      'coinSymbol': req.body.token_symbol
    }
  }).then(result => {
    console.log(result)
    if (result==null) {
      console.log("next");
      return next();
    } else {
      console.log("exist");
      req.flash('project_flash', "Token Name Already Exist! Please Try Different Name.");
      res.redirect('/customContract');
    }
  })
}

// route middleware to check package 1
function hasPackage1(req, res, next) {
  console.log("Here");
  client.find({
    where: {
      'email': req.user.email
    }
  }).then(result => {
    if (result.package1 > 0) {
      return next();
    } else {
      req.flash('package_flash', "You need to buy Package 1 by contributing 1200000 XDCe");
      res.redirect('/generatedContract');
    }
  });
}
