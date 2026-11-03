const express = require("express");
const cors = require("cors");
const path = require("path");
const authRouter = require("./routes/auth");
const userRouter = require("./routes/users");
const courseRouter = require("./routes/course");
const categoryRouter = require("./routes/category");
const commentRouter = require("./routes/comment");
const contactRouter = require("./routes/contact");
const newsletterRouter = require("./routes/newsletter");
const searchRouter = require("./routes/search");
const notificationRouter = require("./routes/notification");
const offRouter = require("./routes/off");
const articleRouter = require("./routes/article");
const orderRouter = require("./routes/order");
const ticketRouter = require("./routes/ticket");
const menuRouter = require("./routes/menu");
const bodyParser = require("body-parser");

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  "/courses/covers",
  express.static(path.join(__dirname, "public", "courses", "covers")),
);

app.use("/v1/auth/", authRouter);
app.use("/v1/users/", userRouter);
app.use("/v1/category/", categoryRouter);
app.use("/v1/course/", courseRouter);
app.use("/v1/comment/", commentRouter);
app.use("/v1/contact/", contactRouter);
app.use("/v1/newsletter/", newsletterRouter);
app.use("/v1/search/", searchRouter);
app.use("/v1/notification/", notificationRouter);
app.use("/v1/off/", offRouter);
app.use("/v1/article/", articleRouter);
app.use("/v1/order/", orderRouter);
app.use("/v1/ticket/", ticketRouter);
app.use("/v1/menu/", menuRouter);

module.exports = app;
