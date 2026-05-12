const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Korisnik nije autentifikovan.",
      });
    }

    if (!allowedRoles.includes(req.user.role_name)) {
      return res.status(403).json({
        message: "Nemate dozvolu za ovu akciju.",
      });
    }

    next();
  };
};

module.exports = checkRole;
