import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import nodemailer from "nodemailer";

admin.initializeApp();

/**
 * Creates and configures the Nodemailer transporter.
 * Supports SMTP (SendGrid, Resend, Brevo, custom) or Gmail App Passwords.
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  // 1. Generic SMTP (SendGrid, Resend, Brevo, Mailgun, etc.)
  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  // 2. Direct Gmail (using Google App Password)
  if (user && pass) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  return null;
}

/**
 * Cloud Function Trigger:
 * Listens to new documents created in the 'mail' collection and sends them via Nodemailer.
 */
export const sendEmailOnMailCreate = onDocumentCreated(
  {
    document: "mail/{mailId}",
    region: "us-central1",
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    if (!data || !data.to) {
      logger.warn(`Mail doc ${event.params.mailId} is missing required 'to' field.`);
      return;
    }

    const transporter = createTransporter();
    if (!transporter) {
      const errMsg =
        "Email transporter not configured. Please set SMTP_HOST, SMTP_USER, SMTP_PASS, or GMAIL_USER, GMAIL_APP_PASSWORD in your Firebase Functions environment.";
      logger.error(errMsg);
      await snap.ref.update({
        "delivery.state": "ERROR",
        "delivery.error": errMsg,
        "delivery.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    const fromAddress =
      process.env.SMTP_FROM ||
      process.env.GMAIL_USER ||
      '"Camoniku" <noreply@camoniku-app.firebaseapp.com>';

    const mailOptions = {
      from: fromAddress,
      to: Array.isArray(data.to) ? data.to.join(", ") : data.to,
      subject: data.message?.subject || "Notification from Camoniku",
      text: data.message?.text || "",
      html: data.message?.html || undefined,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${mailOptions.to}`, { messageId: info.messageId });

      await snap.ref.update({
        "delivery.state": "SUCCESS",
        "delivery.messageId": info.messageId,
        "delivery.sentAt": admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err: any) {
      logger.error("Failed to send email via transporter:", err);
      await snap.ref.update({
        "delivery.state": "ERROR",
        "delivery.error": err.message || String(err),
        "delivery.failedAt": admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
);
