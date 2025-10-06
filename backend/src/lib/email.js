import nodemailer from "nodemailer";

// Create transporter
const createTransporter = () => {
  // For development: Use Gmail or a test service like Ethereal
  
  // Gmail (for testing)
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Gmail address
      pass: process.env.EMAIL_PASSWORD // Gmail app password
    }
  });
};

export const sendResetPasswordEmail = async (email, resetUrl, userName) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request - Realtime Chat App - Chatter',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .warning { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 10px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hi ${userName || 'there'},</p>
              <p>We received a request to reset your password for your Realtime Chat App account.</p>
              <p>Click the button below to reset your password:</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" style="display:inline-block;
                      padding:12px 30px;
                      background-color:#4F46E5;
                      color:#ffffff;
                      text-decoration:none;
                      border-radius:5px;
                      font-size:16px;
                      weight:600;
                      font-family: Arial, sans-serif;">
                Reset Password
                </a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #4F46E5;">${resetUrl}</p>
              <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul>
                  <li>This link will expire in 1 hour</li>
                  <li>If you didn't request this, please ignore this email</li>
                  <li>Your password won't change until you click the link above</li>
                </ul>
              </div>
              <p>If you're having trouble, please contact our support team.</p>
              <p>Best regards,<br>The Realtime Chat Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email, please do not reply.</p>
              <p>&copy; ${new Date().getFullYear()} Realtime Chat App. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;

  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};