export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return next();

  try {
    const user = await verifyGoogleToken(token);
    req.user = user;
    res.locals.sub = user?.sub;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};
