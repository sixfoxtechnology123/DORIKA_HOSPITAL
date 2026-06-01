const User = require('../models/UserManagement');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createActivityLog } = require('../utils/activityLogger');

// 1. SEED FUNCTION - Creates ONLY the Main Admin
exports.seedAdmin = async () => {
    try {
        const username = 'sixfox';
        const exists = await User.findOne({ username });
        
        if (!exists) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('sixfox@2026', salt);

            await User.create({
                userId: 'user-1',
                fullName: 'Sixfox Technology',
                username: username,
                password: hashedPassword,
                role: 'Main Admin', // Always has full system access
                email: 'sixfoxtechnology12@gmail.com',
                mobile: '0000000000',
                status: 'Active',
                permissions: [] // Not needed for Main Admin due to Sidebar bypass
            });
            console.log('👤 Main Admin "sixfox" created successfully.');
        }
    } catch (err) {
        console.error('❌ Seed Error:', err.message);
    }
};

exports.loginUser = async (req, res) => {
    const { username, password } = req.body;
    try {
        // 1. Find user by username
        const user = await User.findOne({ username });

        // If user doesn't exist, show specific "User ID" error
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: "INCORRECT USER ID" 
            });
        }

        // 2. Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        
        // If password doesn't match, show specific "Password" error
        if (!isMatch) {
            return res.status(401).json({ 
                success: false, 
                message: "INCORRECT PASSWORD" 
            });
        }

        // 3. If both are correct, create token
        const token = jwt.sign(
            {
                id: user._id,
                role: user.role,
                username: user.username,
                fullName: user.fullName,
                userId: user.userId
            },
            process.env.JWT_SECRET || 'asha_secret',
            { expiresIn: '24h' }
        );

        await createActivityLog({
            module: 'Authentication',
            action: 'Login',
            details: `LOGIN SUCCESS - ${user.fullName || user.username}`,
            explicitUser: user,
            previous: null,
            current: {
                userId: user.userId,
                username: user.username,
                fullName: user.fullName,
                role: user.role,
                status: user.status
            },
            route: '/api/auth/login',
            method: 'POST',
            targetUser: {
                name: user.fullName || user.username,
                employeeID: user.userId || user.username,
                recordId: String(user._id)
            }
        });

        // Send response
        res.json({
            success: true,
            message: "Successfully Login",
            user: { 
                username: user.username, 
                fullName: user.fullName, 
                role: user.role,
                permissions: user.permissions 
            },
            token
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "SERVER ERROR" });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "Current password and new password are required" });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: "Current password incorrect" });
        if (currentPassword === newPassword) {
            return res.status(400).json({ success: false, message: "New password must be different from current password" });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        await createActivityLog({
            module: 'Authentication',
            action: 'Change Password',
            details: `PASSWORD CHANGED - ${user.fullName || user.username}`,
            req,
            previous: null,
            current: {
                userId: user.userId,
                username: user.username,
                fullName: user.fullName
            },
            route: '/api/auth/change-password',
            method: 'POST',
            targetUser: {
                name: user.fullName || user.username,
                employeeID: user.userId || user.username,
                recordId: String(user._id)
            }
        });

        res.json({ success: true, message: "Password updated successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};
