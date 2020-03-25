const app = require("express")();
const server = require("http").createServer(app);
const io = require("socket.io").listen(server);
const msql = require("mysql2");
let cors = require("cors");
const crypto = require("crypto-js");
const sql = require("sqlite3").verbose();
const path = require('path')
const port = process.env.PORT || 3000



app.use(require("express").json());
app.use(require("express").urlencoded({ extended: true }));
app.use(cors());
 

const db = new sql.Database("./db.sqlite3", sql.OPEN_READWRITE, err => {
  if (err) return console.log("error of connecting to database");
  console.log("Connected to database!");
});

 

app.engine("html", require("ejs").renderFile);

app.post("/main", (req, res) => {
  if (req.body.login && req.body.password) {
    const { login, password } = req.body;

    db.all(
      `SELECT * FROM Users WHERE Nickname LIKE '${login}'`,
      (err, results) => {
        console.log(results);
        if (err) {
          res.json({
            result: "error",
            description: "Что то с базой, подключение проверь"
          });
        } else {
          if (
            results.length != 0 &&
            password ==
              crypto.AES.decrypt(results[0].Password, "secretPass").toString(
                crypto.enc.Utf8
              ) &&
            results[0].Nickname === "Admin"
          ) {
            res.json({
              result: "admin",
              description: "Администратор авторизировался"
            });
          } else if (
            results.length != 0 &&
            password ==
              crypto.AES.decrypt(results[0].Password, "secretPass").toString(
                crypto.enc.Utf8
              )
          ) {
            res.json({
              result: "success",
              description: "Авторизация прошла успешно",
              content: results
            });
          } else if (results.length == 0 || results != 0) {
            res.json({
              result: "error",
              description: "Неверный логин или пароль"
            });
          }
        }
      }
    );
  } else {
    res.json({
      result: "error",
      description: "Данные не введены"
    });
  }
});

app.post("/admin", (req, res) => {
  if (req.body.login && req.body.login !== "Admin") {
    const { login } = req.body;

    db.run(`DELETE FROM Users WHERE Nickname='${login}'`, err => {
      if (err) {
        res.json({
          result: "db",
          description: "Отсутствует подключениие к базе данных"
        });
      } else {
        res.json({
          result: "success",
          description: "Запись удалена"
        });
      }
    });
  } else {
    res.json({
      result: "error",
      description: "Данные полей пусты"
    });
  }
});

app.post("/sign", (req, res) => {
  if (
    req.body.login &&
    req.body.password &&
    req.body.password.length >= 5 &&
    req.body.login !== "Admin" &&
    req.body.login !== "admin"
  ) {
    const { login, password } = req.body;

    const hashPass = crypto.AES.encrypt(password, "secretPass").toString();
    db.run(
      `INSERT INTO Users(Nickname, Password) VALUES("${login}", "${hashPass}")`,
      (RunResult, err) => {
        
        if (err) {
          res.json({
            result: "error",
            description: "Ошибка отправки"
          });
        } else if (RunResult === null) {
          res.json({
            result: "success",
            description: "Данные успешно отправлены"
          });
        }
      }
    );
  } else {
    res.json({
      result: "error",
      description: "Данные не введены или введен недопустимый пароль"
    });
  }
});

server.listen(port, "172.18.18.66", () => {
  console.log(`Server has been started on port ${port}...`);
});

let users = {};
let connections = [];

io.sockets.on("connection", socket => {
  console.log("You are successfully connected!");
  connections.push(socket);
  console.log(users);

  socket.on("disconnect", data => {
    connections.slice(connections.indexOf(socket), 1);
    console.log("You were disconnected");
    delete users[socket.id];
    io.emit("online", Object.values(users));
  });

  socket.on("join", username => {
    users[socket.id] = username;
    io.emit("online", Object.values(users));
  });

  socket.on("send mess", data => {
    io.emit("add mess", { mess: data.mess, name: data.name });
  });
});
