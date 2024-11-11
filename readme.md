### OTP Provider
**user:** 
boizphotos13@gmail.com

**pass:** 
vxfn zbyk ehjm qtdw

### Features
* `sendUnauthorizedReport`: This function creates a detailed email report of the unauthorized attempt and sends it to the administrator.

* Tracking Device Information: Each time a user logs in successfully, the deviceInfo object is stored in `authorizedDevices` and compared with future login attempts to detect new, potentially unauthorized devices.
The list of authorized Devices can be checked using the endpoint: http://localhost:3000/api/devices

* Generating a Report: When an unauthorized attempt is detected, a report containing the device and location details is generated and sent to the users as well as administrator via email.

* OTP verification: Users can mark devices as `"remembered"` which adds their device information to authorizedDevices. Alongwith OTP, the requesting device info is also shared in the same email.

* Login check: Each login attempt verifies if the device is authorized and, if not, sends an alert email.

* Alert Email: Automatically sends the administrator an email detailing any unauthorized login attempt.

### Core Technologies/Modules:

Express.js: A minimalist web framework for Node.js.
npm install express

Nodemailer: For sending emails, including OTPs.
npm install nodemailer
npm install axios

bcrypt: For securely hashing and comparing passwords.
npm install bcrypt

cors: For enabling Cross-Origin Resource Sharing (CORS) to allow requests from different origins.
npm install cors

dotenv: For securely storing environment variables like email credentials.
npm install dotenv