<p align="center"><img src="assets/4others.png"/></p>

## Abstract

This is the template we use for projects at _4 us & 4 others_, configured for [▲ Now](https://now.sh) deployments.

This template was built with client work in mind — quick enough to deploy for use when prototyping, and scalable enough to viable for production. We've also found it to be flexible enough for use in small net art projects that require dynamic elements, and tbh, these projects are probably more valuable than any client work will ever be.

It uses [Express](https://expressjs.com/) for Node.js, and [Mustache](https://mustache.github.io/mustache.5.html) for templating.

It's currently configured to use [Compass](http://compass-style.org/) for SCSS, and [Grunt](https://gruntjs.com) (soon, [Parcel](https://parceljs.org/)) to uglify Javascript for production.

This branch, `are.na`, is configured to use an Are.na channel as a light CMS.

## Installation

1. Download [`im-sorry-i-have-2-leave-the-lobby-but-i-will-never-forget-you.zip`](https://github.com/mwvd/im-sorry-i-have-2-leave-the-lobby-but-i-will-never-forget-you/archive/are.na.zip) (`are.na` branch)
2. Install dependencies
    ```shell
    $ yarn install
    ```

## Setup

### Environment

1. Protect `.env*` files from being committed to git ⤵

    ```shell
    $ git update-index --assume-unchanged .env .env.development
    ```

### Are.na

1. Create a new application on [dev.are.na](https://dev.are.na/oauth/applications/new) and fill out the application info to register it.
    > The "**Redirect URI**" doesn't really matter here, since we are not creating an application that signs in on behalf of a user (_right?_), although it is probably a good idea to add your production URL here, along with `urn:ietf:wg:oauth:2.0:oob` (their preferred URL for local tests).
2. Add the **Personal Access Token** for your application to your [`.env`](.env) file as a variable ⤵
    ```toml
    arenaPAT="yourPersonalAccessToken"
    ```
    > ⚠️ Do not commit your Personal Access Token to version control, or include it anywhere it can be seen publically.
    >
    > From Are.na:
    >
    > > _This <span style="color:red">**should <span style="text-decoration: underline">not</span> be**</span> included in any client-side code or commited to any public repositories._
3. Add the Are.na channel you want to display to your [`.env`](.env) file as a variable by using the slug from the URL ⤵

    <details><summary>What's a slug?</summary>
    <p>

    ```
    Using the link to your channel:

    https://www.are.na/mackenzie-davidson/shoes-screenshots
                                          ^^^^^^^^^^^^^^^^^
                                          this is your slug
    ```

    </p>
    </details>

    ```toml
    arenaChannel="yourArenaChannelSlug"
    ```

    > 🔐 This repo was designed to use with both public and private channels on Are.na. This is why we use the Personal Access Token to authenticate our requests.

## Run

Watch for `.scss` changes and compile to `.css` ⤵

```shell
$ compass watch
```

At this point, there are two options for running locally. Open a new tab in your terminal and you can run ⤵

|     | `$ nodemon`                                                                                               | `$ now dev`                                                                                                                                    |
| --- | :-------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| ❓  | Start a local server                                                                                      | Compile source files into [lambdas](https://zeit.co/docs/v2/deployments/concepts/lambdas) and start a local (serverless? lol) server           |
| 📋  | Running `nodemon` allows the server to hot reload on file changes. This is useful **during development**. | Running `now dev` builds the repo. This is useful for testing your build **before deploying** to Now to see if your build succeeds             |
| 📈  | Quick — No need to rebuild after changes                                                                  | Accurate build environment                                                                                                                     |
| 📉  | May not 100% accurate to the final build environment                                                      | `@now/node-server` is **slow** to build. Changes to static files will cause you to have to stop the server and rebuild, which takes 10-15 secs |

> _Another important note_ —— Starting the server with `nodemon` starts the server with `NODE_ENV` set to `development`. This allows `.env.development` to override `.env` and set the environment accordingly. This is because each environment uses a different `app.listen()` configuration in [`index.js`](index.js).

## ▲ Now

### Environment Variables & Secrets

Since your `.env` files will not be deployed to Now, you will need to add your `.env` environment variables to your [now.json](now.json) file before deploying using the `"env"` key. Example ⤵

```json
"env": {
    "key": "yourValue"
}
```

This is good for [`.env`](.env) variables that are not considered sensitive (eg. public variables). However, since [now.json](now.json) is committed to version control, there may be variables that we don't want exposed here (such as our Are.na Personal Access Token), so we will need to add these variables to Now directly. This is done with [Now Secrets ↗](https://zeit.co/docs/v2/environment-variables-and-secrets/?query=secrets#).

Adding your secrets (make sure you are using the right context by running `$ now switch` — for this you will want to be on the team account) ⤵

```shell
$ now secrets add secret-name secret-value
```

You can then reference a secret you've added to Now in your [now.json](now.json) file with `@secret-name` as your value ⤵

```json
"env": {
    "key": "@secret-name"
}
```

> _A quick note on naming secrets_
>
> When adding secrets, maybe helpful to use the following naming convention for naming secrets: `project_secret-name`
>
> This will keep things organized on our end!

### Deploy

```bash
# Deploy your build
$ now
```

If you would like to alias your build to [`staging`](https://zeit.co/docs/v2/domains-and-aliases/aliasing-a-deployment/#staging) or [`production`](https://zeit.co/docs/v2/domains-and-aliases/aliasing-a-deployment/#production), you can use one of the following commands ⤵

```bash
# Deploy your build and alias to staging
# See here for more information about what that URL will look like, depending on context ⤵
# https://zeit.co/docs/v2/domains-and-aliases/aliasing-a-deployment/#staging
$ now --target staging
```

```bash
# Deploy your build and alias to production
# (this is configured in the deployment in the https://zeit.co dashboard)
$ now --prod
```

Alternatively, you can deploy automatically from Github by changing `github.enabled` to `true` in [now.json](now.json). This will create a now.sh deploy every time you `git push` to the repo.

---

<details><summary>Notes</summary>
<p>

## Some considerations

This build uses the `@now/node-server` builder to build a server lambda, and `@now/static` builders to build routes for static assets.

If anything, in it's current state, this build process is a little bit inefficient. The exciting thing about Now is building applications that are _serverless_. In our case what I imagine that looks like is a build that is a mix of static files as a frontend, and `node.js` / `Go` / `Python` files that are being used for handling server tasks and API calls.

Perhaps what makes the most sense is to change the architecture from Node/Express to a static site generator (like [Gatsby](https://github.com/gatsbyjs/gatsby), [Next.js](https://nextjs.org), or even just a Mustache compiler that compiles views into static `HTML` files). This template was originally built for Heroku before being ported to Now. It was built w Express/Mustache to accomodate views/partials/templates, and to make API calls. With API calls easily broken out into lambdas with Now, the next step here would be to figure out how to best leverage static builds.

<table border="0" width="100%">
 <tr>
    <td style="font-size:16px">Now (ideally)</td>
    <td style="font-size:16px">Now (currently, re: @node-server)</td>
 </tr>
 <tr border="0">
    <td style="vertical-align:top">
        •   Less complexity if considered from the beginning of a project<br/>
        •   Multiple languages inside monorepo<br/>
        •   Inexpensive compared to Heroku<br/>
        •   Faster (possibly nominal in most cases)<br/>
    </td>
    <td style="vertical-align:top">
        •   Doesn't take advantage of Now's strengths (mainly, the monorepo)<br/>
        •   Slow build process when changing rendered views and static files (maybe set to watch <code>views</code>)<br/>
        •   Has to recompile every time you make changes.<br/>
    </td>
 </tr>
</table>

Certainly some things to think about.

</p>
</details>
<details><summary>To Do</summary>
<p>

### `im-sorry`

-   [ ] `config.yaml`
    -   [ ] get from channel description on are.na
    -   [ ] save to cache
-   [ ] reconsider `compass` for scss (`ON HOLD`)
-   [ ] Replace [Grunt](https://gruntjs.com) with [Parcel](https://parceljs.org/)
-   [ ] Move to `4-us-4-others`

### For a new repo (fuck a monorepo i can't even believe i just thought of that while writing this lmao) ?

-   [ ] API lambda examples
    -   [x] Are.na
    -   [ ] Airtable
-   [ ] Better templating / Static generator

</p>
</details>

<p align="center"><img src="https://i.imgur.com/43EFHoY.png" alt="4 others"/></p>
