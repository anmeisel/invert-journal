/**
 * Fakes email sending and shows alert
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  if (request.method !== 'POST') {
    return Response.redirect('/views/contact/feedback_form.html', 302)
  }

  const formData = await request.formData()
  const email_address = formData.get('email_address')
  const first_name = formData.get('first_name')
  const comments = formData.get('comments')

  const error_page = '/views/contact/error_message.html'
  const thankyou_page = '/views/contact/thank_you.html'

  // Basic validation
  if (!email_address || !first_name) {
    return Response.redirect(error_page, 302)
  }

  // Prevent email injection
  const isInjected = str => /(\n|\r|\t|%0A|%0D|%08|%09)/i.test(str)
  if (isInjected(email_address) || isInjected(first_name) || isInjected(comments)) {
    return Response.redirect(error_page, 302)
  }

  // Fake email sending
  console.log(`Fake send email:
    From: ${first_name} <${email_address}>
    Comments: ${comments}
  `)

  // Instead of redirecting, you could also return a JS alert page
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><title>Contact Form</title></head>
    <body>
      <script>
        alert("This contact form is out of service. Please contact the emails below directly.");
        window.location.href = "/";
      </script>
    </body>
    </html>
  `

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  })
}
