"use client"

import CodeMirror from "@uiw/react-codemirror"
import { html } from "@codemirror/lang-html"
import { oneDark } from "@codemirror/theme-one-dark"
import { useTheme } from "next-themes"

export function TemplateEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { resolvedTheme } = useTheme()
  return (
    <CodeMirror
      value={value}
      height="640px"
      theme={resolvedTheme === "dark" ? oneDark : "light"}
      extensions={[html()]}
      onChange={onChange}
      basicSetup={{ lineNumbers: true, foldGutter: false }}
      className="h-full overflow-hidden rounded-2xl text-sm"
    />
  )
}
