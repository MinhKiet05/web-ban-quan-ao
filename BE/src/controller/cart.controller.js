const {
    addItemAddToCartForUser,
    updateCartItemForUser,
    getCartByUserId,
    removeCartItemForUser,
} = require('../services/cart.service');
const { HTTP_STATUS } = require('../constants');

const CartController = {
    // GET /api/cart/items
    getCartItems: async (req, res, next) => {
        try {
            const user_id = req.user.id;
            const cartItems = await getCartByUserId(user_id);
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: cartItems,
            });
        } catch (err) {
            next(err);
        }
    },

    // POST /api/cart/add-item
    addItemAddToCart: async (req, res, next) => {
        try {
            const user_id = req.user.id;
            const { variant_id, quantity, added_price } = req.body;
            const cartItem = await addItemAddToCartForUser(user_id, variant_id, quantity, added_price);
            return res.status(HTTP_STATUS.CREATED).json({
                success: true,
                data: cartItem,
            });
        } catch (err) {
            next(err);
        }
    },

    // PUT /api/cart/update-item
    updateCartItem: async (req, res, next) => {
        try {
            const { cart_item_id, quantity, added_price } = req.body;
            const cartItem = await updateCartItemForUser(cart_item_id, quantity, added_price);
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: cartItem,
            });
        } catch (err) {
            next(err);
        }
    },

    // DELETE /api/cart/item/:id
    removeCartItem: async (req, res, next) => {
        try {
            const { id } = req.params;
            await removeCartItemForUser(id);
            return res.status(HTTP_STATUS.NO_CONTENT).send();
        } catch (err) {
            next(err);
        }
    },
};

module.exports = CartController;