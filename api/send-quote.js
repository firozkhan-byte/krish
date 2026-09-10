// Vercel serverless function: POST /api/send-quote
// Sends the quote-request form (#quoteForm in index.html) as an email via Gmail SMTP.
// Requires env vars SMTP_USER, SMTP_PASS (Gmail App Password), TO_EMAIL — set in Vercel project settings.
const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, country, company, product, message } = req.body || {};

  if (!name || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid name and email.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const lines = [
      `Name: ${name}`,
      `Email: ${email}`,
      country ? `Country: ${country}` : null,
      company ? `Company: ${company}` : null,
      product ? `Product interest: ${product}` : null,
      message ? `Message:\n${message}` : null,
    ].filter(Boolean);

    await transporter.sendMail({
      from: `"Kirish NX Website" <${process.env.SMTP_USER}>`,
      to: process.env.TO_EMAIL || process.env.SMTP_USER,
      replyTo: email,
      subject: `New quote request from ${name}`,
      text: lines.join('\n'),
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('send-quote error:', err);
    return res.status(500).json({ error: 'Could not send your request right now. Please try again later.' });
  }
};
