const { createCart, addItemAddToCart, updateCartItem, getCartItemsByUserId, findCartByUserId, deleteCartItem } = require("../model/cart.model");
const { generateUniqueId } = require("../utils/generateId");

const { AUTH_ERRORS, createError, DB_ERRORS, VALIDATION_ERRORS } = require("../constants");


const getCartByUserId = async (user_id) => {
    try {
        if(!user_id){
            throw createError(VALIDATION_ERRORS.MISSING_REQUIRED_FIELD, 'userId là bắt buộc');
        }
        const cart = await getCartItemsByUserId(user_id);
        return cart;
    } catch (error) {
        throw error;
    }
}


/**
 * Tạo cart mới cho user
 * @param {*} user_id id của user cần tạo cart
 * @return cart vừa tạo
 * @throws lỗi nếu có vấn đề trong quá trình truy vấn cơ sở dữ liệu hoặc lỗi ràng buộc
 */
const createCartForUser = async (user_id) => {
    try {
        //kiểm tra ràng buộc
        if(!user_id){
            throw createError(VALIDATION_ERRORS.MISSING_REQUIRED_FIELD, 'userId là bắt buộc');
        }

        //generate cart_id
        const cart_id = await generateUniqueId('carts', 'id', 'crt', 8);

        //Gọi model tạo cart trên database
        const cart = await createCart(user_id, cart_id);

        //Trả về cart vừa tạo
        return cart;
    }catch(err){
        throw err;
    }
}

/**
 * Lấy cart items của user
 * @param {*} user_id id của user cần lấy cart items
 * @param {*} cart_id id của cart cần lấy items
 * @param {*} variant_id id của variant cần lấy items
 * @param {*} quantity số lượng cần lấy
 * @param {*} added_price giá thêm vào cần lấy
 * @return mảng cart items của user
 * @throws lỗi nếu có vấn đề trong quá trình truy vấn cơ sở dữ liệu
 */
const addItemAddToCartForUser = async (user_id, variant_id, quantity, added_price) => {
    try {
        //kiểm tra ràng buộc
        if(!user_id || !variant_id || !quantity || !added_price){
            throw createError(VALIDATION_ERRORS.MISSING_REQUIRED_FIELD, 'Các trường bắt buộc không được để trống');
        }

        //Lấy cart của user, nếu chưa có thì tạo mới
        let cart = await findCartByUserId(user_id);
        if(!cart){
            cart = await createCartForUser(user_id);
        }

        //Gọi model thêm item vào cart trên database
        const cartItem = await addItemAddToCart(user_id, cart.id, variant_id, quantity, added_price);

        //Trả về cartItem vừa tạo
        return cartItem;
    }catch(err){
        throw err;
    }
}

/**
 * Cập nhật thông tin của item trong cart
 * @param {*} cart_item_id id của cart item cần cập nhật
 * @param {*} quantity số lượng mới của item
 * @param {*} added_price giá thêm mới của item
 * @returns cartItem vừa cập nhật
 * @throws lỗi nếu có vấn đề trong quá trình truy vấn cơ sở dữ liệu hoặc lỗi ràng buộc
 * */
const updateCartItemForUser = async (cart_item_id, quantity, added_price) => {
    try {
        if(!cart_item_id){
            throw createError(VALIDATION_ERRORS.MISSING_REQUIRED_FIELD, 'Các trường bắt buộc không được để trống, cart_item_id là bắt buộc');
        }

        if(quantity <= 0){
             await deleteCartItem(cart_item_id);
             return null;
        }

        if(added_price < 0){
            throw createError(VALIDATION_ERRORS.VALIDATION_ERROR, 'Giá phải lớn hơn 0')
        }

        const cartItem = await updateCartItem(cart_item_id, quantity, added_price);
        return cartItem;
    } catch (error) {
        throw error;
    }
}

const removeCartItemForUser = async (cart_item_id) => {
    if (!cart_item_id) {
        throw createError(VALIDATION_ERRORS.MISSING_REQUIRED_FIELD, 'cart_item_id là bắt buộc');
    }
    await deleteCartItem(cart_item_id);
};

module.exports = { createCartForUser, addItemAddToCartForUser, updateCartItemForUser, getCartByUserId, removeCartItemForUser };
