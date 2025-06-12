// This service handles sending notifications for demo bookings and reminders

interface NotificationOptions {
  to: string
  subject?: string
  message: string
  type: "email" | "sms"
}

export async function sendNotification(options: NotificationOptions): Promise<boolean> {
  try {
    // In a real application, you would integrate with an email service like SendGrid
    // or an SMS service like Twilio. This is a placeholder implementation.

    console.log(`Sending ${options.type} notification:`)
    console.log(`To: ${options.to}`)
    if (options.subject) console.log(`Subject: ${options.subject}`)
    console.log(`Message: ${options.message}`)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500))

    return true
  } catch (error) {
    console.error(`Failed to send ${options.type} notification:`, error)
    return false
  }
}

export async function sendBookingConfirmation(booking: any, notificationType: string): Promise<void> {
  const { name, email, phone, date, time } = booking
  const formattedDate = new Date(date).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const message = `Hello ${name}, your demo has been scheduled for ${formattedDate} at ${time}. We look forward to meeting with you!`

  if (notificationType === "email" || notificationType === "both") {
    await sendNotification({
      to: email,
      subject: "Demo Booking Confirmation",
      message,
      type: "email",
    })
  }

  if (notificationType === "phone" || notificationType === "both") {
    await sendNotification({
      to: phone,
      message,
      type: "sms",
    })
  }
}

export async function sendDemoReminder(booking: any, reminderType: string): Promise<void> {
  const { name, email, phone, date, time } = booking
  const formattedDate = new Date(date).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const message = `Reminder: Your demo is scheduled for today (${formattedDate}) at ${time}. We look forward to meeting with you!`

  if (reminderType === "email" || reminderType === "both") {
    await sendNotification({
      to: email,
      subject: "Your Demo Reminder",
      message,
      type: "email",
    })
  }

  if (reminderType === "phone" || reminderType === "both") {
    await sendNotification({
      to: phone,
      message,
      type: "sms",
    })
  }
}
