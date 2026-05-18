/**
 * Avatar Utilities
 * @description Helper functions for avatar display
 */

/**
 * Get the initial letter for avatar placeholder
 * @param {Object} userObj - User object with fullName, first_name, email, etc.
 * @returns {string} - Single letter for avatar
 */
export const getAvatarInitial = (userObj) => {
  if (!userObj) return 'U';
  
  // Try fullName first (common property)
  if (userObj.fullName) {
    return userObj.fullName.charAt(0).toUpperCase();
  }
  
  // Try full_name (database property)
  if (userObj.full_name) {
    return userObj.full_name.charAt(0).toUpperCase();
  }
  
  // Try firstName
  if (userObj.firstName) {
    return userObj.firstName.charAt(0).toUpperCase();
  }
  
  // Try first_name
  if (userObj.first_name) {
    return userObj.first_name.charAt(0).toUpperCase();
  }
  
  // Try email
  if (userObj.email) {
    return userObj.email.charAt(0).toUpperCase();
  }
  
  return 'U';
};

/**
 * Get avatar URL or placeholder
 * @param {string} avatarUrl - Avatar URL from user
 * @param {Object} userObj - User object for initial
 * @returns {Object} - { url, initial } object
 */
export const getAvatarData = (avatarUrl, userObj) => {
  return {
    url: avatarUrl,
    initial: getAvatarInitial(userObj)
  };
};
