const nodemailer = require('nodemailer');

// Define the email configuration using your provided SMTP credentials
const smtpConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // TLS must be enabled for port 587
  auth: {
    user: 'boizphotos13@gmail.com', // Your email
    pass: 'vxfn zbyk ehjm qtdw'    // Your app password
  }
};

// Set up the email content (User and Rental details)
const user = {
  id: 1,
  name: 'Prashant',
  email: 'piru7399@gmail.com'
};

const car = {
  make: 'Toyota',
  model: 'Corolla',
  year: 2021,
  pricePerDay: 55.00
};

const rental = {
  id: 1008,
  userId: 1,
  carId: 2,
  startDate: '2024-11-25T10:00:00Z',
  endDate: '2024-11-30T10:00:00Z',
  totalPrice: 225.00
};

// Create a transporter using the SMTP configuration
const transporter = nodemailer.createTransport(smtpConfig);

// Define the email content
const subject = 'Car Rental Confirmation';
const plainText = `
  Dear Customer,

  Your car rental has been confirmed!

  Details:
  Car: ${car.make} ${car.model} (${car.year})
  Start Date: ${new Date(rental.startDate).toLocaleDateString()}
  End Date: ${new Date(rental.endDate).toLocaleDateString()}
  Total Price: $${rental.totalPrice}

  Thank you for choosing our service!

  Best regards,
  Car Rental System Team
`;

const htmlContent = `
  <p>Dear Customer,</p>
  <p>Your car rental has been confirmed!</p>
  <p><strong>Details:</strong><br/>
  Car: ${car.make} ${car.model} (${car.year})<br/>
  Start Date: ${new Date(rental.startDate).toLocaleDateString()}<br/>
  End Date: ${new Date(rental.endDate).toLocaleDateString()}<br/>
  Total Price: $${rental.totalPrice}</p>
  <p>Thank you for choosing our service!</p>
  <p>Best regards,<br/>Car Rental System Team</p>
`;

// Set up the email message object
const mailOptions = {
  from: '"Car Rental System" <boizphotos13@gmail.com>',
  to: user.email, // recipient email
  subject: subject,
  text: plainText,
  html: htmlContent
};

// Send the email
transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.log('Error occurred while sending the email:', error);
  } else {
    console.log('Email sent successfully:', info.response);
  }
});
