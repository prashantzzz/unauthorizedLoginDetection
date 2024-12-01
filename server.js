// Dependencies and Initializations
const express = require('express');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const cors = require('cors');
const axios = require('axios');
const os = require('os');
const app = express();
const port = 3000;
const path = require('path');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// In-memory storage (replace with actual database in production)
const users = new Map();
const otpStore = new Map();
const authorizedDevices = new Map(); // Structure: { email: [{ ip, userAgent, timestamp }] }

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'boizphotos13@gmail.com',
        pass: 'vxfn zbyk ehjm qtdw'
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.log('Email server error:', error);
    } else {
        console.log('Email server is ready');
    }
});

// Helper Functions
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper function to get client IP address
async function getIpAddress(req) {
    let ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.ip;
    
    if (ipAddress === '::1') { // For local development environment
        const response = await axios.get('https://api.ipify.org?format=json');
        ipAddress = response.data.ip;
    }
    return ipAddress;
}

// Function to fetch location based on IP address
async function getLocation(ipAddress) {
    const IPSTACK_API_KEY = '54db51abfe3e156ab867da92b84379e9';
    try {
        const response = await axios.get(`http://api.ipstack.com/${ipAddress}?access_key=${IPSTACK_API_KEY}`);
        const locationData = response.data;
        return {
            city: locationData.city,
            country: locationData.country_name,
            region: locationData.region_name,
            latitude: locationData.latitude,
            longitude: locationData.longitude
        };
    } catch (error) {
        console.error('Error fetching location:', error);
        return null;
    }
}

// Function to send an email
async function sendEmail(to, subject, text) {
    const mailOptions = {
        from: 'boizphotos13@gmail.com',
        to,
        subject,
        text
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(subject, 'Email sent:', info.response);
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}

// Function to send OTP email
async function sendOTP(email, otp, deviceInfo, location) {
    const otpText = `Your OTP for login is: ${otp}. This OTP will expire in 5 minutes.\n\n` +
                    `Device Information:\n${JSON.stringify(deviceInfo, null, 2)}\n\n` +
                    `Location: ${location ? `${location.city}, ${location.country}` : 'Location not available'}\n` +
                    `IP Address: ${deviceInfo.ipAddress}\n` +
                    `User Agent: ${deviceInfo.userAgent}\n\n` +
                    `Please ignore if you did not generate this OTP.`;
    await sendEmail(email, 'Login OTP', otpText);
}

// Function to send unauthorized login report email
async function sendUnauthorizedReport(email, deviceInfo, location) {
    const reportText = `An unauthorized login attempt was detected for user: ${email}.\n\n` +
                       `Device Information:\n${JSON.stringify(deviceInfo, null, 2)}\n\n` +
                       `Location: ${location ? `${location.city}, ${location.country}` : 'Location not available'}\n` +
                       `IP Address: ${deviceInfo.ipAddress}\n` +
                       `User Agent: ${deviceInfo.userAgent}\n\n` +
                       `Please review the login attempt details.`;
    await sendEmail(`boizphotos13@gmail.com, ${email}`, `Unauthorized Login Attempt Detected for ${email}`, reportText);
}

// Endpoints
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (users.has(email)) {
            console.log('User already exists');
            return res.status(400).json({ error: 'User already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        users.set(email, { password: hashedPassword, name });
        console.log("Registration successful for", email);
        res.status(201).json({ message: 'Registration successful' });
    } catch (error) {
        console.log("Registration failed for", email)
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password, deviceInfo } = req.body;
        console.log('Login attempt:', email);

        if (!users.has(email)) {
            console.log('User with email ' + email + ' not found!');
            return res.status(400).json({ error: 'User not found' });
        }

        const userData = users.get(email);
        const validPassword = await bcrypt.compare(password, userData.password);

        if (!validPassword) {
            console.log('Invalid password!');
            return res.status(400).json({ error: 'Invalid password' });
        }

        const ipAddress = await getIpAddress(req);
        const location = await getLocation(ipAddress);
        const currentDevice = { ip: ipAddress, userAgent: deviceInfo.userAgent };

        const authorizedDevicesList = authorizedDevices.get(email) || [];
        const isAuthorized = authorizedDevicesList.some(
            device => device.ip === ipAddress && device.userAgent === deviceInfo.userAgent
        );

        if (!isAuthorized) {
            await sendUnauthorizedReport(email, currentDevice, location);
            console.log('Unauthorized device detected, mail sent to admin and user');
        }

        const otp = generateOTP();
        otpStore.set(email, { otp, expires: Date.now() + 5 * 60 * 1000, deviceInfo, name: userData.name });
        
        await sendOTP(email, otp, deviceInfo, location);
        res.json({ message: 'OTP sent successfully' });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/api/verify-otp', async (req, res) => {
    const { email, otp, rememberDevice } = req.body;
    console.log('OTP verification attempt:', email, otp);
    
    const storedOTPData = otpStore.get(email);

    if (!storedOTPData || storedOTPData.otp !== otp) {
        console.log('Invalid OTP!');
        return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (Date.now() > storedOTPData.expires) {
        otpStore.delete(email);
        console.log('Expired OTP!');
        return res.status(400).json({ error: 'OTP expired' });
    }

    otpStore.delete(email);

    const ipAddress = await getIpAddress(req);
    const location = await getLocation(ipAddress);

    if (rememberDevice) {
        const deviceData = {
            ip: ipAddress,
            userAgent: storedOTPData.deviceInfo.userAgent,
            timestamp: new Date().toISOString()
        };

        if (!authorizedDevices.has(email)) {
            authorizedDevices.set(email, []);
        }

        authorizedDevices.get(email).push(deviceData);
        console.log('Device authorized:', deviceData);
    }
    console.log("Login successful!");
    res.json({
        message: 'Login successful',
        deviceInfo: storedOTPData.deviceInfo,
        ipAddress,
        location,
        userName: storedOTPData.name
    });
});

// To get the list of all the authorized devices
app.get('/api/devices', (req, res) => {
    res.json(Object.fromEntries(authorizedDevices));
});

// Route to serve index.html at the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Function to retrieve the local IP addresses
function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1'; // Default to localhost if no other address found
}

// Start the server on all network interfaces
const localIP = getLocalIPAddress();
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://${localIP}:${port} on your local network`);
    console.log(`Server running at http://localhost:${port} on this device`);
    console.log("Make sure your firewall is configured to allow traffic on this port.");
});