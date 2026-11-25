import juice from "juice"

export function inlineCss(html: string) {
  return juice(html, {
    removeStyleTags: true,
    preserveMediaQueries: true,
    applyWidthAttributes: true,
  })
}
