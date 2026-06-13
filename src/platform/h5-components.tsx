import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, PropsWithChildren } from 'react'

type ViewProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>
type TextProps = PropsWithChildren<HTMLAttributes<HTMLSpanElement>>
type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>
type ScrollViewProps = ViewProps & {
  scrollX?: boolean
  scrollY?: boolean
}

declare const require: (moduleName: 'react') => typeof import('react')

const ReactRuntime = require('react')

function copyDomProps(props: Record<string, unknown>, excluded: string[] = []) {
  const next: Record<string, unknown> = {}

  Object.keys(props).forEach((key) => {
    if (key !== 'children' && !excluded.includes(key)) {
      next[key] = props[key]
    }
  })

  return next
}

export function View(props: ViewProps) {
  return ReactRuntime.createElement('div', copyDomProps(props as Record<string, unknown>), props.children)
}

export function Text(props: TextProps) {
  return ReactRuntime.createElement('span', copyDomProps(props as Record<string, unknown>), props.children)
}

export function Button(props: ButtonProps) {
  const domProps = copyDomProps(props as Record<string, unknown>)
  domProps.type = domProps.type ?? 'button'

  return ReactRuntime.createElement('button', domProps, props.children)
}

export function ScrollView(props: ScrollViewProps) {
  const domProps = copyDomProps(props as Record<string, unknown>, ['scrollX', 'scrollY'])
  const scrollStyle: CSSProperties = props.style ? Object.assign({}, props.style) : {}

  if (props.scrollX) {
    scrollStyle.overflowX = 'auto'
  }

  if (props.scrollY) {
    scrollStyle.overflowY = 'auto'
  }

  domProps.style = scrollStyle

  return ReactRuntime.createElement('div', domProps, props.children)
}
