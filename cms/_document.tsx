// Custom Sanity Studio build-time Document component.
//
// Exists for exactly one reason: Sanity's own default HTML document
// (@sanity/cli-build's internal DefaultDocument) hardcodes
// `<title>Sanity Studio</title>` with no config hook -- confirmed by
// reading that component directly at
// node_modules/@sanity/cli-build/dist/actions/build/renderDocumentWorker/
// components/DefaultDocument.js. Neither sanity.config.js's `title` field
// (already "Urbanum Studio" -- that one drives the workspace switcher, not
// the browser tab) nor sanity.cli.js has any effect on this text. The only
// supported override point is this file: the build tool looks for
// _document.js or _document.tsx at the Studio root (see
// @sanity/cli-build's getPossibleDocumentComponentLocations and
// tryLoadDocumentComponent) and, when found, uses its default export in
// place of the built-in one for the entire generated HTML document.
//
// Everything below except the <title> text is a deliberate, faithful copy
// of Sanity's own DefaultDocument output (same meta tags, same global
// styles, same error-handling script, same no-JS fallback) -- the goal is
// one identifiable change, not a redesign of Studio's document shell. The
// favicon links below are unchanged from Sanity's default (still
// /static/favicon.ico, /static/favicon.svg, etc.) -- the actual favicon
// swap happens entirely through the file placed in cms/static/, per
// Sanity's documented static-folder convention, and needed no change here.
//
// Trade-off worth knowing: this replaces Sanity's document wholesale
// rather than wrapping it, because @sanity/cli-build's package.json
// "exports" field only exposes ./_internal/build, ./_internal/env, and
// ./_internal/extract -- none of which re-export DefaultDocument, so
// there's no stable import path to wrap instead of copy. Because this
// Studio has autoUpdates: true, a future Sanity version bump could change
// the real default document without this copy picking that up
// automatically -- worth a periodic diff against the installed
// DefaultDocument.js if Studio ever looks visually behind.

const globalStyles = `
  @font-face {
    font-family: Inter;
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: url("https://studio-static.sanity.io/Inter-Regular.woff2") format("woff2");
  }
  @font-face {
    font-family: Inter;
    font-style: italic;
    font-weight: 400;
    font-display: swap;
    src: url("https://studio-static.sanity.io/Inter-Italic.woff2") format("woff2");
  }
  @font-face {
    font-family: Inter;
    font-style: normal;
    font-weight: 500;
    font-display: swap;
    src: url("https://studio-static.sanity.io/Inter-Medium.woff2") format("woff2");
  }
  @font-face {
    font-family: Inter;
    font-style: italic;
    font-weight: 500;
    font-display: swap;
    src: url("https://studio-static.sanity.io/Inter-MediumItalic.woff2") format("woff2");
  }
  @font-face {
    font-family: Inter;
    font-style: normal;
    font-weight: 600;
    font-display: swap;
    src: url("https://studio-static.sanity.io/Inter-SemiBold.woff2") format("woff2");
  }
  @font-face {
    font-family: Inter;
    font-style: italic;
    font-weight: 600;
    font-display: swap;
    src: url("https://studio-static.sanity.io/Inter-SemiBoldItalic.woff2") format("woff2");
  }
  @font-face {
    font-family: Inter;
    font-style: normal;
    font-weight: 700;
    font-display: swap;
    src: url("https://studio-static.sanity.io/Inter-Bold.woff2") format("woff2");
  }
  @font-face {
    font-family: Inter;
    font-style: italic;
    font-weight: 700;
    font-display: swap;
    src: url("https://studio-static.sanity.io/Inter-BoldItalic.woff2") format("woff2");
  }
  @font-face {
    font-family: Inter;
    font-style: normal;
    font-weight: 800;
    font-display: swap;
    src: url("https://studio-static.sanity.io/Inter-ExtraBold.woff2") format("woff2");
  }
  @font-face {
    font-family: Inter;
    font-style: italic;
    font-weight: 800;
    font-display: swap;
    src: url("https://studio-static.sanity.io/Inter-ExtraBoldItalic.woff2") format("woff2");
  }
  @font-face {
    font-family: Inter;
    font-style: normal;
    font-weight: 900;
    font-display: swap;
    src: url("https://studio-static.sanity.io/Inter-Black.woff2") format("woff2");
  }
  @font-face {
    font-family: Inter;
    font-style: italic;
    font-weight: 900;
    font-display: swap;
    src: url("https://studio-static.sanity.io/Inter-BlackItalic.woff2") format("woff2");
  }
  html {
    @media (prefers-color-scheme: dark) {
      background-color: #13141b;
    }
    @media (prefers-color-scheme: light) {
      background-color: #ffffff;
    }
  }
  html,
  body,
  #sanity {
    height: 100%;
  }
  body {
    margin: 0;
    -webkit-font-smoothing: antialiased;
  }
`

const errorHandlerScript = `
;(function () {
  var _caughtErrors = []

  var errorChannel = (function () {
    var subscribers = []

    function publish(msg) {
      for (var i = 0; i < subscribers.length; i += 1) {
        subscribers[i](msg)
      }
    }

    function subscribe(subscriber) {
      subscribers.push(subscriber)

      return function () {
        var idx = subscribers.indexOf(subscriber)

        if (idx > -1) {
          subscribers.splice(idx, 1)
        }
      }
    }

    return {publish, subscribe, subscribers}
  })()

  // NOTE: Store the error channel instance in the global scope so that the application can
  // access it and subscribe to errors.
  window.__sanityErrorChannel = {
    subscribe: errorChannel.subscribe,
  }

  function _nextTick(callback) {
    setTimeout(callback, 0)
  }

  function _handleError(error, params) {
    _nextTick(function () {
      // - If there are error channel subscribers, then we notify them (no console error).
      // - If there are no subscribers, then we log the error to the console and render the error overlay.
      if (errorChannel.subscribers.length) {
        errorChannel.publish({error, params})
      } else {
        console.error(error)

        _renderErrorOverlay(error, params)
      }
    })
  }

  var ERROR_BOX_STYLE = [
    'background: #fff',
    'border-radius: 6px',
    'box-sizing: border-box',
    'color: #121923',
    'flex: 1',
    "font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue','Liberation Sans',Helvetica,Arial,system-ui,sans-serif",
    'font-size: 16px',
    'line-height: 21px',
    'margin: 0 auto',
    'max-width: 960px',
    'max-height: 90dvh',
    'overflow: auto',
    'padding: 20px',
    'width: 100%',
  ].join(';')

  var ERROR_CODE_STYLE = [
    'color: #972E2A',
    "font-family: -apple-system-ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace",
    'font-size: 13px',
    'line-height: 17px',
    'margin: 0',
  ].join(';')

  function _renderErrorOverlay(error, params) {
    var errorElement = document.querySelector('#__sanityError') || document.createElement('div')
    var colno = params.event.colno
    var lineno = params.event.lineno
    var filename = params.event.filename

    errorElement.id = '__sanityError'
    errorElement.innerHTML = [
      '<div style="' + ERROR_BOX_STYLE + '">',
      '<div style="font-weight: 700;">Uncaught error: ' + error.message + '</div>',
      '<div style="color: #515E72; font-size: 13px; line-height: 17px; margin: 10px 0;">' +
        filename +
        ':' +
        lineno +
        ':' +
        colno +
        '</div>',
      '<pre style="' + ERROR_CODE_STYLE + '">' + error.stack + '</pre>',
      '</div>',
    ].join('')

    errorElement.style.position = 'fixed'
    errorElement.style.zIndex = 1000000
    errorElement.style.top = 0
    errorElement.style.left = 0
    errorElement.style.right = 0
    errorElement.style.bottom = 0
    errorElement.style.padding = '20px'
    errorElement.style.background = 'rgba(16,17,18,0.66)'
    errorElement.style.display = 'flex'
    errorElement.style.alignItems = 'center'
    errorElement.style.justifyContent = 'center'

    document.body.appendChild(errorElement)
  }

  // NOTE:
  // Yes - we're attaching 2 error listeners below
  // This is because React makes the same error throw twice (in development mode).
  // See: https://github.com/facebook/react/issues/10384

  // Error listener #1
  window.onerror = function (event, source, lineno, colno, error) {
    _nextTick(function () {
      if (_caughtErrors.indexOf(error) !== -1) return

      _caughtErrors.push(error)

      _handleError(error, {
        event,
        lineno,
        colno,
        source,
      })

      _nextTick(function () {
        var idx = _caughtErrors.indexOf(error)

        if (idx > -1) _caughtErrors.splice(idx, 1)
      })
    })

    // IMPORTANT: this callback must return \`true\` to prevent the error from being rendered in
    // the browser's console.
    return true
  }

  // Error listener #2
  window.addEventListener('error', function (event) {
    if (_caughtErrors.indexOf(event.error) !== -1) return true

    _caughtErrors.push(event.error)

    _handleError(event.error, {
      event,
      lineno: event.lineno,
      colno: event.colno,
    })

    _nextTick(function () {
      _nextTick(function () {
        var idx = _caughtErrors.indexOf(event.error)

        if (idx > -1) _caughtErrors.splice(idx, 1)
      })
    })

    return true
  })
})()
`

const noJsStyles = `
.sanity-app-no-js__root {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;
  background: #fff;
}

.sanity-app-no-js__content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  font-family: helvetica, arial, sans-serif;
}
`

const STUDIO_TITLE = 'Urbanum Studio'

export default function Document(props) {
  const {css = [], entryPath} = props

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
          name="viewport"
        />
        <meta content="noindex" name="robots" />
        <meta content="same-origin" name="referrer" />
        <link href="/static/favicon.ico" rel="icon" sizes="any" />
        <link href="/static/favicon.svg" rel="icon" type="image/svg+xml" />
        <link href="/static/apple-touch-icon.png" rel="apple-touch-icon" />
        <link href="/static/manifest.webmanifest" rel="manifest" />
        <title>{STUDIO_TITLE}</title>
        <script dangerouslySetInnerHTML={{__html: errorHandlerScript}} />
        {css.map((href) => (
          <link key={href} href={href} rel="stylesheet" />
        ))}
        <style dangerouslySetInnerHTML={{__html: globalStyles}} />
      </head>
      <body>
        <div id="sanity" />
        <script src={entryPath} type="module" />
        <noscript>
          <div className="sanity-app-no-js__root">
            <div className="sanity-app-no-js__content">
              <style type="text/css" dangerouslySetInnerHTML={{__html: noJsStyles}} />
              <h1>JavaScript disabled</h1>
              <p>
                Please <a href="https://www.enable-javascript.com/">enable JavaScript</a> in
                your browser and reload the page to proceed.
              </p>
            </div>
          </div>
        </noscript>
      </body>
    </html>
  )
}
