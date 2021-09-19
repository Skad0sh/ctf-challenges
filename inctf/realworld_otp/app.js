const express = require('express')
const crypto = require('crypto')
const bodyParser = require("body-parser");
const session = require('express-session')
var nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3').verbose();
const app = express()
const port = 3003

app.use(session({
  
    // It holds the secret key for session
    secret: 'leavemealone',
  
    // Forces the session to be saved
    // back to the session store
    resave: true,
  
    // Forces a session that is "uninitialized"
    // to be saved to the store
    saveUninitialized: true
}))


app.use(express.static('static'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

let db= new sqlite3.Database('data.db',(err)=>{
    if(err){
        console.log(err.message);
    }
    else{
        console.log("connection sucessful");
    }
});

app.get('/', (req, res) => {
  res.sendFile(__dirname+'/static/login.html')
})

app.get('/home', (req, res) => {
    if(req.session.name){
        res.render('home.ejs')
    }
    else{
        res.send("<h1>unauthorised</h1>")
    }
})

app.get('/register', (req, res) => {
    res.sendFile(__dirname+'/static/register.html')
})

app.get('/forgot_password', (req, res) => {
    res.sendFile(__dirname+'/static/forgotpass.html')
})

app.get("/otp/:email",function(req,res){
    if(req.session.user==1){
        var otp='flag{07p_sh0uld_b3_h4ndl3d_w17h_c4r3}'
    }
    else{
        var otp=crypto.randomBytes(6).toString('hex');
    }
    var email=req.params.email
    console.log(email)
    let sql3= `update users set otp=? where id=?`
    db.all(sql3,[otp,req.session.user],(err1,row1)=>{
        if(err1){
            throw err1;
        }
        row1.forEach((row1)=>{
            console.log(row1.msg)
        })
    })
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'codesecure64@gmail.com',
          pass: 'leavemealone2001'
        }
      });
      
      var mailOptions = {
        from: 'codesecure64@gmail.com',
        to: email,
        subject: 'Your OTP for reseting account',
        text: 'your otp for reseting password is '+otp
      };
      
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      }); 
    res.send("ok")
})

app.post("/reset",function(req,res){
    username=req.body.username
    let sql2= `select * from users where username=?`
    db.all(sql2,[username],(err,row)=>{
        if(err){
            throw err;
        }
        if(row.length==1){
            console.log(row[0]["id"])
            req.session.user=row[0]["id"]
            res.render('reset.ejs',{email:row[0]["email"]})
        }
        if(row.length<1){
            res.render('reset.ejs',{email:'can\'t find any account'})
        }
    })

});

app.post('/registernow',function(req,res){
    password=req.body.pass
    email=req.body.email
    username=req.body.username
    let sql1= `insert into users (username,password,email) values(?,?,?)`
    db.all(sql1,[username,password,email],(err,row)=>{
        if(err){
            throw err;
        }
        row.forEach((row)=>{
            console.log(row.msg)
        })
    })
    res.redirect('/')
})



app.post('/login',function(req,res){
    password=req.body.pass
    email=req.body.email
    let sql2= `select * from users where email=? and password=?`
    db.all(sql2,[email,password],(err,row)=>{
        if(err){
            throw err;
        }
        if(row.length==1){
            req.session.name = true
            res.redirect('/home')
        }
        if(row.length<1){
            res.render('login_err.ejs',{message:'wrong email or password'})
        }
    })
})



app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
