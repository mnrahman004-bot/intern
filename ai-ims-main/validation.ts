// Enhanced Password Strength Requirements
// Password must include at least one uppercase letter, one lowercase letter, one number, and one special character, and be at least 8 characters long
function validatePassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    return passwordRegex.test(password);
}

// Email Validation
function validateEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

// Indian Phone Number Validation
function validatePhoneNumber(phone) {
    const phoneRegex = /^\+91[7-9]\d{9}$/;
    return phoneRegex.test(phone);
}

// Product Name Validation
function validateProductName(productName) {
    const productNameRegex = /^[A-Za-z0-9 ]{3,50}$/;
    return productNameRegex.test(productName);
}