// utils/emailSender.js
const nodemailer = require('nodemailer');
const transporter = require('../config/mailConfig');

exports.sendVerificationEmail = (email, url) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'your-email@gmail.com',
            pass: 'your-password'
        }
    });

    const mailOptions = {
        from: 'your-email@gmail.com',
        to: email,
        subject: 'Verify your email',
        html: `<p>Verify your email by clicking <a href="${url}">here</a>.</p>`
    };

    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
};

exports.sendEmail = (to, subject, text) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        text,
    };

    return transporter.sendMail(mailOptions)
        .then(info => {
            console.log('Email sent:', info.response);
            return info;
        })
        .catch(error => {
            console.error('Error sending email:', error);
            throw error;
        });
};