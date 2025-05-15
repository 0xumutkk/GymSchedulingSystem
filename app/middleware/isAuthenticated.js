function isAuthenticated(req, res, next) {
  if (req.session.userId || req.session.isAdmin) {
    next();
  } else {
    res.redirect('/login');
  }
}

module.exports = isAuthenticated;
