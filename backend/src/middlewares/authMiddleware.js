const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.header("Authorixation");

    if(!token){
        return res.status(401).json({
            message: 'Access denied'
        })
    }

    try {
        const veryfied = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const user = veryfied;
        next();
    } catch (error) {
        return res.status(403).json({message: "Invalid token"})
    }
}

