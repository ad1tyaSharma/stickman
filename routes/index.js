const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Data = require("../models/data");
const auth = require("../middleware/auth");
const axios = require("axios");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const puppeteer = require("puppeteer");

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
              { user_id: newPerson._id, email: personInfo.email },
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

router.post("/login", async (req, res, next) => {
  User.findOne({ email: req.body.email }, async (err, data) => {
    if (data) {
      if (data.password == req.body.password) {
        req.session.userId = data.unique_id;
        const user = await User.findOne({ email: req.body.email });
        const token = jwt.sign(
          { user_id: user._id, email: req.body.email },
          process.env.TOKEN_KEY,
          {
            expiresIn: 86400,
          }
        );

        // save user token
        user.token = token;
        console.log(token);
        res.send({ Success: "Success!", token });
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
            // console.log(datas);
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
            // console.log(datas);
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

router.get("/export/html", (req, res) => {
  const templateData = {};

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
            return res.render("template.html", {
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
            return res.render("template.html", {
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
router.get("/export/pdf", (req, res) => {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto("http://localhost:3000/login");
    await page.type("#email", "admin@123.com");
    await page.type("#password", "123456");
    await page.click("#submit");
    const buffer = await page.pdf({
      path: `result.pdf`,
      format: "A4",
      landscape: true,
      printBackground: true,
    });
    res.type("application/pdf");
    res.send(buffer);
    browser.close();
  })();
});

router.post("/getPDF", async (req, res) => {
  let data = req.body;
  const dummy = [
    {
      modifiedAt: "2022-12-16T10:21:52.970Z",
      modifiedBy: "John",
      name: "Patrick Hooper",
      numbers:[]
    },
    {
      modifiedAt: "2022-12-16T10:21:52.970Z",
      modifiedBy: "John",
      name: "Patrick Hooper",
      numbers:[]
    },
    {
      modifiedAt: "2022-12-16T10:21:52.970Z",
      modifiedBy: "John",
      name: "Patrick Hooper",
      numbers:[]
    }

  ];
  data = [...data,...dummy]
  console.log(data.length);
  let tg = "";
  let cnt = 10000;
  for (let i = 0; i < data.length; i++) {
    let str = "";
   if(i<data.length-3)
   {
    for (let j = 0; j < data[i].numbers.length; j++) {
      str += `<p> ${++cnt}-${data[i].numbers[j]}</p>`;
    }
    tg += `<div class="page" style="page-break-after: always; page-break-inside: avoid;">
   <h2>Name :${data[i].name}</h2>
   <h4>Modified by : ${data[i].modifiedBy}</h4>
   <h4>Modified at : ${new Date(data[i].modifiedAt).getDate()}/ ${
      new Date(data[i].modifiedAt).getMonth() + 1
    }/${new Date(data[i].modifiedAt).getFullYear()} at ${new Date(
      data[i].modifiedAt
    ).getHours()}:${new Date(data[i].modifiedAt).getMinutes()}</h4>
   <h4>Numbers</h4>
   ${str}
   `;
   }
    // console.log(tg);
    else
    {
      for (let j = 0; j < data[i].numbers.length; j++) {
        str += `<p> ${++cnt}-${data[i].numbers[j]}</p>`;
      }
      tg += `<div class="page" style="page-break-after: always; page-break-inside: avoid; visibility: hidden;">
     <h2>Name :${data[i].name}</h2>
     <h4>Modified by : ${data[i].modifiedBy}</h4>
     <h4>Modified at : ${new Date(data[i].modifiedAt).getDate()}/ ${
        new Date(data[i].modifiedAt).getMonth() + 1
      }/${new Date(data[i].modifiedAt).getFullYear()} at ${new Date(
        data[i].modifiedAt
      ).getHours()}:${new Date(data[i].modifiedAt).getMinutes()}</h4>
     <h4>Numbers</h4>
     ${str}
     `;
    }
  }

await axios
    .post(
      "https://api.html2pdf.app/v1/generate",
      {
        html: `<html>
  <head>
    <meta http-equiv="content-type" content="text/html; charset=UTF-8" />
    <title>Paginated HTML</title>
    <style>
      div.page
      {
        page-break-after: always; page-break-inside: avoid;
       
      }
    </style>
  </head>
  <body>
  ${tg}
  </body>
  </html>`,
        apiKey:
          "jeSRZ9WSjtPZ3zNmIhXvbmDnRC1srNmFejdEOMupr0rioCgprwfs3TByTZb49Taq",
      },
      { responseType: "arraybuffer" }
    )
    .then((response) => {
      fs.writeFileSync("./document.pdf", response.data);
    })
    .catch((err) => {
      console.log(err.message);
    });
   
 res.json({msg:'success',
status : 1})
});
router.get('/pdf',(req,res)=>
{
  res.download('./document.pdf')
})

module.exports = router;
