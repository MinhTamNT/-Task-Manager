import nodemailer from "nodemailer";
import "dotenv/config";

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Email sending function
export const sendEmail = async (to, subject, text) => {
  const htmlContent = `
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f9f9f9;
        }
        .container {
          width: 100%;
          max-width: 600px;
          margin: 20px auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        .header {
          color: #ffffff;
          padding: 15px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .header img {
          max-width: 150px;
        }
        .content {
          padding: 20px;
        }
        .content p {
          margin: 0 0 10px;
        }
        .footer {
          background-color: #f1f1f1;
          padding: 10px;
          text-align: center;
          border-radius: 0 0 8px 8px;
        }
        .footer p {
          margin: 0;
          color: #777;
        }
        .button {
          display: inline-block;
          padding: 10px 15px;
          margin-top: 20px;
          font-size: 16px;
          font-weight: bold;
          color: #ffffff;
          background-color: #4CAF50;
          text-decoration: none;
          border-radius: 5px;
        }
        .button:hover {
          background-color: #45a049;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://play-lh.googleusercontent.com/pjUulZ-Vdo7qPKxk3IRhnk8SORPlgSydSyYEjm7fGcoXO8wDyYisWXwQqEjMryZ_sqK2" alt="Company Logo">
        </div>
        <div class="content">
          <h1>Hello, User!</h1>
          <p>Thank you for joining our service. We are excited to have you!</p>
          <p>If you have any questions, feel free to <a href="https://yourdomain.com/contact">contact us</a>.</p>
          <a href="https://yourdomain.com/task" class="button">View Task</a>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Your Company. All rights reserved.</p>
          <p><a href="https://yourdomain.com/unsubscribe">Unsubscribe</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const message = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(message);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Error sending email");
  }
};
