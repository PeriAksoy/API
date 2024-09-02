var express = require("express");
var cors = require("cors");

var r = require("rethinkdbdash")({
   servers:[
      {
      host:"localhost",
      port:28015   
      }
   ],
});

var app = express();
app.use(express.json());
app.use(cors());

app.post("/Signup",(req,res)=>{
  r.db("test")
   .table("users")
      .insert(req.body)
      .run()
      .then((result)=>{
         res.json({succsess : true ,result})
      })
      .catch((err)=>{
         res.json({succsess:false, message:err.message});
      });
});

app.listen(3001,()=>{
   console.log("Başarılı");
})