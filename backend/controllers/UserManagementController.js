const UserManagement = require('../models/UserManagement');
const bcrypt = require('bcryptjs');

/**
 * 1. GET ALL USERS
 * Fetches the list for the table view
 */
exports.getAllUsers = async (req, res) => {
    try {
        // Sort by newest first
        const users = await UserManagement.find().sort({ createdAt: -1 });
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch users: " + error.message });
    }
};

/**
 * 2. GET LATEST ID 
 * Generates the next ID in format: user-1, user-2...
 */
exports.getLatestId = async (req, res) => {
    try {
        // Find the user created last to get the highest number
        const lastUser = await UserManagement.findOne().sort({ createdAt: -1 });
        
        let nextId = "user-1"; // Starting default

        if (lastUser && lastUser.userId) {
            // Logic to split "user-5" and increment to "user-6"
            const parts = lastUser.userId.split('-');
            if (parts.length === 2) {
                const lastNum = parseInt(parts[1]);
                if (!isNaN(lastNum)) {
                    nextId = `user-${lastNum + 1}`;
                }
            }
        }
        res.json({ success: true, nextId });
    } catch (error) {
        res.status(500).json({ success: false, message: "ID Generation error: " + error.message });
    }
};

/**
 * 3. UPSERT USER (SAVE & UPDATE)
 * Handles both creating a new user and updating an existing one
 */
exports.upsertUser = async (req, res) => {
    try {
        const { id, userId, fullName, mobile, email, username, password, role, status, permissions } = req.body;
        const formattedFullName = String(fullName || "").trim().toUpperCase();

        // Create the base data object
        let userData = { 
            userId, 
            fullName: formattedFullName,
            mobile, 
            email, 
            username, 
            role, 
            status, 
            permissions 
        };

        // PASSWORD LOGIC:
        // If password is provided (new user or changing pass), hash it.
        // If password is empty (editing user and keeping old pass), don't touch it.
        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            userData.password = await bcrypt.hash(password, salt);
        }

        if (id) {
            // --- UPDATE MODE ---
            const updatedUser = await UserManagement.findByIdAndUpdate(
                id,
                { $set: userData },
                { returnDocument: 'after' }
            );

            if (!updatedUser) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            return res.json({ success: true, message: "USER UPDATED SUCCESSFULLY", data: updatedUser });
        } else {
            // --- CREATE MODE ---
            // Verify uniqueness for username/email/userId
            const existing = await UserManagement.findOne({ 
                $or: [{ username }, { email }, { userId }] 
            });

            if (existing) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Username, Email, or User ID already exists" 
                });
            }

            // Password is mandatory for new users
            if (!password || password.trim() === "") {
                return res.status(400).json({ success: false, message: "Password is required for new users" });
            }

            const newUser = new UserManagement(userData);
            await newUser.save();
            
            res.status(201).json({ success: true, message: "USER CREATED SUCCESSFULLY" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 4. DELETE USER
 */
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedUser = await UserManagement.findByIdAndDelete(id);

        if (!deletedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ success: true, message: "USER DELETED SUCCESSFULLY" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Delete failed: " + error.message });
    }
};
