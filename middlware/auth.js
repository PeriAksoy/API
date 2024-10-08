const jwt = require("jsonwebtoken");
const config = process.env;

const auth = (req,res,next) => {
  try{
    const token = req.headers["authorization"]?.split(" ")[1]; 
    // console.log(req.headers["authorization"]);

   if(!token){
    return res.status(403).send("Token eksik");
   }

   const decodedToken = jwt.verify(token,config.JWT_KEY);
   req.user = decodedToken;
  next();
  }catch(err){
    console.log(err);
    return res.status(403).send("gecersiz token");
  }
  
}

module.exports = auth;