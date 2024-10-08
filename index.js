require('dotenv').config(); 
const Schema =  require("./middlware/validations");
const jwt = require("jsonwebtoken");
const express = require("express");
const bcrypt = require('bcryptjs');
const Boom = require("@hapi/boom");
const cors = require("cors");
const auth = require("./middlware/auth");
const {JWT_KEY} = process.env;

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

//********REGISTER*******//

app.post("/user/Signup",async(req,res,next)=>{

   try{
      //Kullanıcı kontrol
      const exitingUser = await r.db("test")
            .table("users")
            .filter({"emailadress": req.body.emailadress})
            .run();

            if (exitingUser.length) {
               return res.status(400).json({ message:"This e-mail address is already in use" });
             }
      
      const {passwordConfirm,dateofbirth,...userData} = req.body;

      const {error} = Schema.validate(userData);
       
      if(error){
         return next(Boom.badRequest(error.details[0].message));
      }

      const hashedPassword = await bcrypt.hash(req.body.password,10);

      //Kullanıcı kayıt

      const result = await r.db("test")
      .table("users")
      .insert({
         ...userData,
         "password":hashedPassword,
         
      },{ returnChanges: true })
      .run();
    
      //Token oluşturma
      const token = jwt.sign({ _id: result.generated_keys[0], emailadress: req.body.emailadress, username:req.body.username}, JWT_KEY,{expiresIn:"24h"});
      result.token = token;
      res.status(201).json(result);

   }catch(err){
      console.log(err);
   }

});


//********LOGIN********//

app.post("/user/Login",async(req,res,next)=>{

   try{
      
      //Kullanıcı kontrol

      const users = await r.db("test")
            .table("users")
            .filter({"emailadress": req.body.emailadress})
            .run();

      if(!users.length){
         return res.status(400).json({message:"E-mail adress not found"});
      }

      const {emailadress,password} = req.body;
      const {error} = Schema.validate({emailadress,password});

      if(error){
         return next(Boom.badRequest(error.details[0].message));
      }

      //password e-mail kontrol

      const user = users[0]; //e-mail adresi eşleşen kullanıcı
      const isMatch = await bcrypt.compare(req.body.password,user.password);

      if(!isMatch){
         return res.status(400).json({message:"Incorrect password or email adress"});
      }

      //Token oluşturma

      const token = jwt.sign({ _id: user.id, emailadress: user.emailadress ,username:user.username},JWT_KEY,{expiresIn:"30h"});
      user.token = token;
      return res.json({ success: true, token });
      
   }catch(err){
      console.log(err);
   }
   
});

//***PROFILE***//

app.get("/user/getMyProfile",auth,async(req,res)=>{

   try{
   const userId = req.user._id;

   const userProfile =   await r.db("test")
         .table("users")
         .get(userId)
         .pluck("namesurname","username")
         .run();
   //console.log(userProfile);
   res.status(200).json(userProfile);
    
   }catch(error){
      console.log("Veritabanı hatası:",error);
      res.status(500).json({message:"Error fetching profile data"})
   }

})

//****QUOTATİON****//

//Post

app.post("/quotation",auth,async(req,res)=>{
   try{

      const{text,book}=req.body;
      const userId=req.user._id;
      const username = req.user.username;

      const result = await r.db("quotations")
                           .table("quotation")
                           .insert({
                              userId:userId,
                              username:username,
                              text:text,
                              book:book,
                           })
                           .run();
      res.json(result);
         
   }catch(error){
      console.error(error);
      res.status(500).json({message:"Error saving quotation"});
   }
})

//Get

app.get("/quotation",auth,async(req,res)=>{
   try{
      const userId=req.user._id;
      const quotations = await r.db("quotations")
                               .table("quotation")
                               .filter({userId})
                               .pluck("id","text","book","username")
                               .run();
     // console.log(quotations);
      res.json(quotations);

   }catch(err){
      console.error(err);
      res.status(500).json({message:"Error fetching quotation data"});
   }

})

//Delete

app.delete("/quotation/:id",async (req,res)=>{
   const id = req.params.id;
   try{
     const result = await r.db("quotations")
                        .table("quotation")
                        .get(id)
                        .delete();  
    res.json(result);
   }catch(error){
      res.status(500).json({message:"Error deleting quotation"});
   }
})

//Edit

app.put("/quotation/:id",async(req,res)=>{
   const id = req.params.id;
   const updateData = req.body;
   try{
      const result = await r.db ("quotations")
                           .table("quotation")
                           .get(id)
                           .update(updateData);
   res.json(result);
   }catch(error){
      res.status(500).json({message:"Error editing quotation"})
   }
})

//*****BOOKS*****/

//Post

app.post("/books",auth,async(req,res)=>{
   try{

      const{bookname,author}=req.body;
      const userId=req.user._id;
 

      const result = await r.db("books")
                           .table("book")
                           .insert({
                              userId:userId,
                              bookname:bookname,
                              author:author,
                           
                           })
                           .run();
      res.json(result);
         
   }catch(error){
      console.error(error);
      res.status(500).json({message:"Error saving book"});
   }

})

//Get

app.get("/books",auth,async(req,res)=>{
   try{
      const userId=req.user._id;
      const response = await r.db("books")
                               .table("book")
                               .filter({userId})
                               .pluck("id","bookname","author")
                               .run();
      res.json(response);

   }catch(err){
      console.error(err);
      res.status(500).json({message:"Error fetching book data"});
   }
})

//Delete

app.delete("/books/:id",async (req,res)=>{
   const id = req.params.id;
   try{
     const result = await r.db("books")
                        .table("book")
                        .get(id)
                        .delete();  
    res.json(result);
   }catch(error){
      res.status(500).json({message:"Error deleting quotation"});
   }
})


//*****HOME&FAVORITES*****/

//Get-all-card

app.get("/quotation/all",auth,async(req,res)=>{
   try{
      const quotations = await r.db("quotations")
                               .table("quotation")
                               .pluck("id","text","book","username")
                               .run();
      res.json(quotations);

   }catch(err){
      console.error(err);
      res.status(500).json({message:"Error fetching quotation data"});
   }
})

//Post


app.post("/favorites",auth,async(req,res)=>{
   try{

      const{text,bookname}=req.body;
      const username=req.user.username;
      const userId = req.user._id;

      const result = await r.db("favorites")
                           .table("favorite")
                           .insert({
                              username:username,
                              userId:userId,
                              text:text,
                              bookname:bookname,
                           })
                           .run();
      res.json(result);
         
   }catch(error){
      console.error(error);
      res.status(500).json({message:"Error saving favorites"});
   }
})

//Get

app.get("/favorites",auth,async(req,res)=>{
   const userId=req.user._id;
   console.log(userId);
   try{
      const favorites = await r.db("favorites")
                               .table("favorite")
                               .filter({userId})
                               .pluck("id","text","bookname","username")
                               .run();
      res.json(favorites);

   }catch(err){
      console.error(err);
      res.status(500).json({message:"Error fetching favorite data"});
   }
})

//Delete 

app.delete("/favorites/:id",async (req,res)=>{
   const id= req.params.id;
   try{
     const result = await r.db("favorites")
                        .table("favorite")
                        .get(id)
                        .delete()
    res.json(result);
   }catch(error){
      res.status(500).json({message:"Error deleting favorite"});
   }
})


app.listen(3001,()=>{
   console.log("Başarılı");
})
