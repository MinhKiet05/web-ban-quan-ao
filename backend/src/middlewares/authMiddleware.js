const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.header("Authorization");

    if(!token){
        return res.status(401).json({
            message: 'Access denied'
        })
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = verified;
        next();
    } catch (error) {
        return res.status(403).json({message: "Invalid token"})
    }
}

