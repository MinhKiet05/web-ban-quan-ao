/**
 * Account Service
 * @description Xử lý các chức năng bảo mật tài khoản (đổi mật khẩu, reset password...)
 */

const {
  AUTH_ERRORS,
  createError,
  DB_ERRORS,
  VALIDATION_ERRORS,
} = require("../constants");
const { createValidationError } = require("../constants/errors");
const {
    createAccount,
    findAccountByIdentifier,
    updateAccountPassword,
    verifyAccount,
    findAccountsByUserId
}= require("../model/account.model");
const bcrypt = require("bcrypt");

async function changePassword({ id, current_password, new_password }) {
    try {
        if(!id || !current_password || !new_password) {
            const errors = [];
            if (!id) errors.push({ field: "id", message: "Id là bắt buộc" });
            if (!current_password) errors.push({ field: "current_password", message: "Mật khẩu hiện tại là bắt buộc" });
            if (!new_password) errors.push({ field: "new_password", message: "Mật khẩu mới là bắt buộc" });
            throw createValidationError(errors);
        }
        
        const account = await findAccountsByUserId(id);

        if (!account || account.length === 0) {
            throw createError(AUTH_ERRORS.AUTH_ACCOUNT_NOT_FOUND);
        }

        const accountData = Array.isArray(account) ? account[0] : account;

        const isMatch = await bcrypt.compare(current_password, accountData.password_hash);
        if (!isMatch) {
            throw createError(AUTH_ERRORS.AUTH_CREDENTIALS_INVALID);
        }

        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(new_password, salt);

        const updatedAccount = await updateAccountPassword(accountData.id, newPasswordHash);
        return updatedAccount;

    } catch (error) {
        if (error.isOperational) {
            throw error;
        }
        console.error('Error changing password:', error);
        throw createError(DB_ERRORS.QUERY_FAILED, error.message || 'Lỗi khi đổi mật khẩu');
    }
}

module.exports = {
    changePassword,
};

