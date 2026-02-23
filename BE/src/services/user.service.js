const { createUser: createUserInDB } = require('../model/user.model');
const { createAccount } = require('../model/account.model');
const { generateUniqueId } = require('../utils/generateId');
const bcrypt = require('bcrypt');

/**
 * Create a new user with account (authentication)
 * This function creates both user profile and account for authentication
 * following the separated users + accounts architecture
 */
const createUser = async (email, password, fullName, phone, role = 'customer') => {
    try {
        if (!email || !password || !fullName || !phone) {
            throw new Error('Missing required fields: email, password, fullName, phone');
        }

        // Generate unique IDs
        const userId = await generateUniqueId('users', 'id', 'usr', 3);
        const accountId = await generateUniqueId('accounts', 'id', 'acc', 3);

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user profile (no password here)
        const userData = {
            id: userId,
            fullName: fullName,
            email: email,
            phone: phone,
            role: role
        };

        const user = await createUserInDB(userData);

        // Create account for authentication
        const accountData = {
            id: accountId,
            userId: userId,
            accountType: 'email',
            identifier: email,
            passwordHash: hashedPassword
        };

        const account = await createAccount(accountData);

        return {
            user,
            account: {
                id: account.id,
                accountType: account.account_type,
                identifier: account.identifier,
                isVerified: account.is_verified
            }
        };
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
};

module.exports = {
    createUser
};