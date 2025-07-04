const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class authService {
    static async findUserByEmail(email) {
        return prisma.user.findUnique({ where: { email } });
    }

    static async registerUser(email, password, name) {
        const existingUser = await this.findUserByEmail(email);
        if (existingUser) {
            return {
                success: false,
                message: 'User already exists'
            };
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: name || null
            },
        });
        return {
            success: true,
            message: 'User registered successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        };
    };

    static async loginUser(email, password) {
        const user = await this.findUserByEmail(email);
        if (!user) {
            return {
                success: false,
                message: 'Invalid credentials - user not found'
            };
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return {
                success: false,
                message: 'Invalid credentials - incorrect password'
            };
        }
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        return {
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        };
    };
}



module.exports = authService