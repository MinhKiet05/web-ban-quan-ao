const express = require("express");
const router = express.Router();
const CartController = require("../controller/cart.controller");
const { authenticate } = require("../middlewares/authMiddleware");


router.get("/items", authenticate, CartController.getCartItems);
router.post("/add-item", authenticate, CartController.addItemAddToCart);
router.put("/update-item", authenticate, CartController.updateCartItem);
router.delete("/item/:id", authenticate, CartController.removeCartItem);

module.exports = router;