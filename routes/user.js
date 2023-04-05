const router = require("express").Router();

const authController = require("../controllers/auth");
const userController = require("../controllers/user");

router.patch("/update-me", authController.protect, userController.updateMe);

router.get("/get-users", authController.protect, userController.getUsers);

router.get("/get-friends", authController.protect, userController.getFriends);

router.get(
  "/get-friends-requests",
  authController.protect,
  userController.getFriends,
);

router.get(
  "get-friends-request",
  authController.protect,
  userController.getFriendRequest,
);

module.exports = router;
