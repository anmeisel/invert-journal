import { Hono } from 'hono'
import { cors } from 'hono/cors'
import Mustache from 'mustache'
import yaml from 'js-yaml'
import { marked } from 'marked'

const app = new Hono()
const ARENA_API = 'https://api.are.na/v2'

// Middleware
app.use('*', cors())

// Template cache
const templates = {}
async function loadTemplate(templateName, assetsBinding) {
  if (templates[templateName]) return templates[templateName]

  try {
    const url = `http://localhost/views/${templateName}.html`
    const res = await assetsBinding.fetch(url)
    if (!res.ok) throw new Error(`Template ${templateName} not found`)
    const text = await res.text()
    templates[templateName] = text
    return text
  } catch (err) {
    console.error('Template load error:', err)
    throw err
  }
}

async function loadPartials(template, assetsBinding, loaded = {}) {
  const partialRegex = /\{\{>\s*([^\}]+)\s*\}\}/g
  let match
  while ((match = partialRegex.exec(template)) !== null) {
    const name = match[1].trim()
    if (loaded[name]) continue
    try {
      const content = await loadTemplate(name, assetsBinding)
      loaded[name] = content
      await loadPartials(content, assetsBinding, loaded)
    } catch {
      loaded[name] = `<!-- partial ${name} not found -->`
    }
  }
  return loaded
}

async function renderMustache(name, data, assetsBinding) {
  const template = await loadTemplate(name, assetsBinding)
  const partials = await loadPartials(template, assetsBinding)
  return Mustache.render(template, data, partials)
}

// Helpers
function encodeURL(str) {
  return String(str)
    .replace(/\s+/g, '-')
    .toLowerCase()
}

// Fetch Are.na channel dynamically
async function fetchArenaChannel(channelSlug, token) {
  const url = `${ARENA_API}/channels/${channelSlug}?page=1&per=64&direction=desc`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(`Are.na API error ${res.status}`)
  const channel = await res.json()

  // Render markdown for each block
  channel.contents.forEach(block => {
    block.content_html = marked(block.content || '')
    block.description_html = marked(block.description || '')
    block.truncTitle = encodeURL(block.title || '')
  })

  const about = channel.contents.pop()
  const config = yaml.load(channel.metadata.description || '')
  return { config, contents: channel.contents, about }
}

// Routes
app.get('/', async c => {
  const env = c.env
  const view = c.req.query('view')
  const blog = c.req.query('blog')

  try {
    const { config, contents, about } = await fetchArenaChannel(env.arenaChannel, env.arenaPAT)
    const data = { static_url: env.cdn, live: env.live, config, about, arena: contents }

    if (view === 'channel') return c.json(contents)
    if (view) data.open = view
    if (blog) {
      const block = contents.find(b => b.id === parseInt(blog))
      if (block) data.blog = blog
    }

    const html = await renderMustache('index', data, env.ASSETS)
    return c.html(html)
  } catch (err) {
    console.error('Error fetching Are.na:', err)

    const cacheYaml = await env.ASSETS.fetch('http://localhost/api/config.yaml')
    const cacheText = await cacheYaml.text()
    const cache = yaml.load(cacheText)
    cache.details.title = 'Error 😭'

    const html = await renderMustache(
      'index',
      { static_url: env.cdn, live: env.live, config: cache, loading: [{ status: 500, message: 'Error loading Are.na' }] },
      env.ASSETS
    )
    return c.html(html, 500)
  }
})

app.get('/articles', async c => {
  const env = c.env
  try {
    // Fetch channel from Are.na
    const { config, contents, about } = await fetchArenaChannel(env.arenaChannel, env.arenaPAT)

    // Separate articles if needed (example: last 8 blocks are not articles)
    const articles = contents.slice(0, contents.length - 8)
    const arena = contents.slice(contents.length - 8) // remaining blocks

    const data = {
      static_url: env.cdn,
      live: env.live,
      config,
      about,
      articles,
      arena
    }

    // Render Mustache template from /views/articles.html
    const html = await renderMustache('articles', data, env.ASSETS)
    return c.html(html)
  } catch (err) {
    console.error('Error loading /articles:', err)

    // fallback config
    const cacheYaml = await env.ASSETS.fetch('http://localhost/api/config.yaml')
    const cacheText = await cacheYaml.text()
    const cache = yaml.load(cacheText)
    cache.details.title = 'Error 😭'

    const html = await renderMustache(
      'articles',
      { static_url: env.cdn, live: env.live, config: cache, loading: [{ status: 500, message: 'Error loading Are.na' }] },
      env.ASSETS
    )
    return c.html(html, 500)
  }
})

// Example: Blog post route
app.get('/blog/:blogId', async c => {
  const blogId = c.req.param('blogId')
  const env = c.env

  try {
    const blockRes = await fetch(`${ARENA_API}/blocks/${blogId}`, { headers: { Authorization: `Bearer ${env.arenaPAT}` } })
    if (!blockRes.ok) throw new Error(`Are.na block fetch error ${blockRes.status}`)
    const block = await blockRes.json()

    const cacheYaml = await env.ASSETS.fetch('http://localhost/api/config.yaml')
    const cacheText = await cacheYaml.text()
    const config = yaml.load(cacheText)

    const blogCacheRes = await env.ASSETS.fetch('http://localhost/api/articles.json')
    const channelCache = await blogCacheRes.json()

    const html = await renderMustache(
      'blog',
      { static_url: env.cdn, config, live: env.live, blogPost: block, arena: channelCache, loading: [{ status: 200, message: `Loaded "${block.title}"` }] },
      env.ASSETS
    )
    return c.html(html)
  } catch (err) {
    console.error('Error loading blog block:', err)
    const html = await renderMustache('blog', { static_url: env.cdn, live: env.live, loading: [{ status: 503, message: `Error: ${err}` }] }, env.ASSETS)
    return c.html(html, 503)
  }
})

app.get('/posts', async c => {
  const env = c.env
  try {
    const { config, contents, about } = await fetchArenaChannel(env.arenaChannel, env.arenaPAT)

    // Format dates & truncate titles
    const tinydate = date => new Date(date).toLocaleString() // simple replacement
    contents.forEach(block => {
      block.date = tinydate(block.created_at)
      block.truncTitle = encodeURL(block.title)
    })

    const html = await renderMustache(
      'posts',
      {
        static_url: env.cdn,
        live: env.live,
        config,
        about,
        arena: contents
      },
      env.ASSETS
    )

    return c.html(html)
  } catch (err) {
    console.error('Error loading /posts:', err)
    const html = await renderMustache(
      'posts',
      {
        static_url: env.cdn,
        live: env.live,
        config: { details: { title: 'Error 😭' } },
        loading: [{ status: 500, message: 'Error loading Are.na' }]
      },
      env.ASSETS
    )
    return c.html(html, 500)
  }
})

app.get('/pandemic-inquiries', async c => {
  const env = c.env
  try {
    const { config, contents, about } = await fetchArenaChannel(env.arenaChannel, env.arenaPAT)

    // Last 8 blocks are pandemic inquiries
    const pandemic = contents.slice(-8)
    const arena = contents.slice(0, contents.length - 8)

    const html = await renderMustache(
      'pandemic-inquiries',
      {
        static_url: env.cdn,
        live: env.live,
        config,
        about,
        pandemic,
        arena
      },
      env.ASSETS
    )

    return c.html(html)
  } catch (err) {
    console.error('Error loading /pandemic-inquiries:', err)
    const html = await renderMustache(
      'pandemic-inquiries',
      {
        static_url: env.cdn,
        live: env.live,
        config: { details: { title: 'Error 😭' } },
        loading: [{ status: 500, message: 'Error loading Are.na' }]
      },
      env.ASSETS
    )
    return c.html(html, 500)
  }
})

app.get('/contact', async c => {
  const env = c.env
  try {
    const cacheYaml = await env.ASSETS.fetch('http://localhost/api/config.yaml')
    const cacheText = await cacheYaml.text()
    const config = yaml.load(cacheText)

    const html = await renderMustache(
      'contact/feedback_form',
      {
        static_url: env.cdn,
        live: env.live,
        config
      },
      env.ASSETS
    )

    return c.html(html)
  } catch (err) {
    console.error('Error loading /contact:', err)
    const html = await renderMustache(
      'contact/error_message',
      {
        static_url: env.cdn,
        live: env.live,
        config: { details: { title: 'Error 😭' } }
      },
      env.ASSETS
    )
    return c.html(html, 500)
  }
})

app.get('/contact/thank_you', async c => {
  const env = c.env
  const html = await renderMustache(
    'contact/thank_you',
    {
      static_url: env.cdn,
      live: env.live
    },
    env.ASSETS
  )
  return c.html(html)
})

app.notFound(async c => {
  const env = c.env
  const html = await renderMustache('404', { url: c.req.url }, env.ASSETS)
  return c.html(html, 404)
})

app.post('/contact/send_mail', async c => {
  const formData = await c.req.formData()
  const email_address = formData.get('email_address')
  const first_name = formData.get('first_name')
  const comments = formData.get('comments')

  // Basic validation
  if (!email_address || !first_name) {
    return c.redirect('/contact/error_message')
  }

  // Prevent email injection
  const isInjected = str => /(\n|\r|\t|%0A|%0D|%08|%09)/i.t
  est(str)
  if (isInjected(email_address) || isInjected(first_name) || isInjected(comments)) {
    return c.redirect('/contact/error_message')
  }

  // Log the form submission
  console.log(`Contact form 
  submission:
      From: ${first_name} 
  <${email_address}>
      Comments: ${comments}
    `)

  // TODO: Send email using  MailChannels or similar

  return c.redirect('/contact/thank_you')
})

// Static routes
app.get('/stylesheets/*', c => c.env.ASSETS.fetch(new Request(`http://localhost${c.req.path}`)))
app.get('/js/*', c => c.env.ASSETS.fetch(new Request(`http://localhost${c.req.path}`)))
app.get('/assets/*', c => c.env.ASSETS.fetch(new Request(`http://localhost${c.req.path}`)))
app.get('/fonts/*', c => c.env.ASSETS.fetch(new Request(`http://localhost${c.req.path}`)))

// Favicon
app.get('/favicon.ico', c => c.body(null, 204))

// 404
app.notFound(c => {
  const html = `<h1>404 - Page not found</h1><p>The page ${c.req.url} could not be found.</p>`
  return c.html(html, 404)
})

export default app
