const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Data = require("../models/data");
const auth = require("../middleware/auth");
const jwt = require("jsonwebtoken");

router.get("/", (req, res, next) => {
  return res.render("index.ejs");
});

router.post("/", (req, res, next) => {
  let personInfo = req.body;

  if (
    !personInfo.email ||
    !personInfo.username ||
    !personInfo.password ||
    !personInfo.passwordConf
  ) {
    res.send();
  } else {
    if (personInfo.password == personInfo.passwordConf) {
      User.findOne({ email: personInfo.email }, (err, data) => {
        if (!data) {
          let c;
          User.findOne({}, (err, data) => {
            if (data) {
              c = data.unique_id + 1;
            } else {
              c = 1;
            }

            let newPerson = new User({
              unique_id: c,
              email: personInfo.email,
              username: personInfo.username,
              password: personInfo.password,
              passwordConf: personInfo.passwordConf,
            });

            newPerson.save((err, Person) => {
              if (err) console.log(err);
              else console.log("Success");
            });
            const token = jwt.sign(
              { user_id: newPerson._id, email : personInfo.email  },
              process.env.TOKEN_KEY,
              {
                expiresIn: 86400,
              }
            );
            // save user token
            newPerson.token = token;
          })
            .sort({ _id: -1 })
            .limit(1);
            
          res.send({ Success: "You are regestered,You can login now." });
        } else {
          res.send({ Success: "Email is already used." });
        }
      });
    } else {
      res.send({ Success: "password is not matched" });
    }
  }
});

router.get("/login", (req, res, next) => {
  return res.render("login.ejs");
});

router.post("/login", async(req, res, next) => {
  User.findOne({ email: req.body.email }, async(err, data) => {
    if (data) {
      if (data.password == req.body.password) {
        req.session.userId = data.unique_id;
        const user = await User.findOne({ email : req.body.email });
        const token = jwt.sign(
          { user_id: user._id, email : req.body.email  },
          process.env.TOKEN_KEY,
          {
            expiresIn: 86400,
          }
        );
  
        // save user token
        user.token = token;
        console.log(token);
        res.send({ Success: "Success!",token});
      } else {
        res.send({ Success: "Wrong password!" });
      }
    } else {
      res.send({ Success: "This Email Is not regestered!" });
    }
  });
});

router.get("/profile", (req, res, next) => {
  User.findOne({ unique_id: req.session.userId }, (err, data) => {
    if (!data) {
      res.redirect("/");
    } else {
      let val;
      if (data.role == "admin") {
        Data.find({}, (err, datas) => {
          if (err) console.log(err);
          else {
            console.log(datas);
            return res.render("data.ejs", {
              name: data.username,
              email: data.email,
              role: data.role,
              value: JSON.stringify(datas),
            });
          }
        });
      } else {
        Data.find({ modifiedBy: data.username }, (err, datas) => {
          if (err) console.log(err);
          else {
            console.log(datas);
            return res.render("data.ejs", {
              name: data.username,
              email: data.email,
              role: data.role,
              value: JSON.stringify(datas),
            });
          }
        });
      }
    }
  });
});

router.get("/logout", (req, res, next) => {
  if (req.session) {
    // delete session object
    req.session.destroy((err) => {
      if (err) {
        return next(err);
      } else {
        return res.redirect("/login");
      }
    });
  }
});




router.post("/postData", (req, res) => {
  Data.findOne({ name: req.body.name }, (err, data) => {
    console.log();
    if (data) {
      data.modifiedBy = req.body.user;
      data.modifiedAt = new Date();
      data.numbers = [...data.numbers, ...req.body.numbers];
      data.save((err, Person) => {
        if (err) console.log(err);
        else console.log("Success");
      });
    } else {
      let newData = new Data({
        name: req.body.name,
        numbers: req.body.numbers,
        modifiedBy: req.body.user,
      });

      newData.save((err, Data) => {
        if (err) console.log(err);
        else console.log("Success");
      });
    }
  });
  console.log(req.body);
  res.status(200).json({ msg: "success" });
});

module.exports = router;
