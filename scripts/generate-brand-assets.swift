import AppKit
import CoreGraphics
import Foundation

struct RGB {
  let r: CGFloat
  let g: CGFloat
  let b: CGFloat
  let a: CGFloat

  init(_ hex: UInt32, _ alpha: CGFloat = 1) {
    r = CGFloat((hex >> 16) & 0xff) / 255
    g = CGFloat((hex >> 8) & 0xff) / 255
    b = CGFloat(hex & 0xff) / 255
    a = alpha
  }

  var color: NSColor {
    NSColor(deviceRed: r, green: g, blue: b, alpha: a)
  }
}

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let brandDir = root.appendingPathComponent("src/assets/brand", isDirectory: true)
let staticBrandDir = root.appendingPathComponent("src/static/brand", isDirectory: true)
let androidResDir = root.appendingPathComponent("android/app/src/main/res", isDirectory: true)

let navy = RGB(0x0b1f3a)
let navy2 = RGB(0x132b4a)
let blue = RGB(0x2563eb)
let teal = RGB(0x10b8a6)
let amber = RGB(0xf7b731)
let red = RGB(0xe5484d)
let slate = RGB(0x5b677a)
let line = RGB(0xdbe5f1)
let paper = RGB(0xf4f8fc)

func ensureDirectory(_ url: URL) throws {
  try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
}

func savePng(_ image: NSImage, to url: URL) throws {
  guard let rep = image.representations.compactMap({ $0 as? NSBitmapImageRep }).first,
        let data = rep.representation(using: .png, properties: [:]) else {
    throw NSError(domain: "BrandAsset", code: 1, userInfo: [NSLocalizedDescriptionKey: "Unable to encode PNG"])
  }
  try ensureDirectory(url.deletingLastPathComponent())
  try data.write(to: url)
}

func makeImage(width: Int, height: Int, draw: (CGFloat, CGFloat) -> Void) -> NSImage {
  guard let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: width,
    pixelsHigh: height,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
  ) else {
    fatalError("Unable to create bitmap context")
  }
  rep.size = NSSize(width: width, height: height)
  guard let context = NSGraphicsContext(bitmapImageRep: rep) else {
    fatalError("Unable to create graphics context")
  }

  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = context
  context.imageInterpolation = .high
  context.cgContext.setAllowsAntialiasing(true)
  context.cgContext.setShouldAntialias(true)
  draw(CGFloat(width), CGFloat(height))
  NSGraphicsContext.restoreGraphicsState()

  let image = NSImage(size: NSSize(width: width, height: height))
  image.addRepresentation(rep)
  return image
}

func drawRoundedRect(_ rect: NSRect, radius: CGFloat, fill: NSColor, stroke: NSColor? = nil, lineWidth: CGFloat = 1) {
  let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
  fill.setFill()
  path.fill()
  if let stroke {
    stroke.setStroke()
    path.lineWidth = lineWidth
    path.stroke()
  }
}

func drawCircle(center: CGPoint, radius: CGFloat, fill: NSColor, stroke: NSColor? = nil, lineWidth: CGFloat = 1) {
  let rect = NSRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2)
  let path = NSBezierPath(ovalIn: rect)
  fill.setFill()
  path.fill()
  if let stroke {
    stroke.setStroke()
    path.lineWidth = lineWidth
    path.stroke()
  }
}

func drawLine(_ start: CGPoint, _ end: CGPoint, color: NSColor, width: CGFloat, dash: [CGFloat] = []) {
  let path = NSBezierPath()
  path.move(to: start)
  path.line(to: end)
  path.lineWidth = width
  path.lineCapStyle = .round
  if !dash.isEmpty {
    path.setLineDash(dash, count: dash.count, phase: 0)
  }
  color.setStroke()
  path.stroke()
}

func drawLightning(in rect: NSRect, color: NSColor) {
  let x = rect.origin.x
  let y = rect.origin.y
  let w = rect.width
  let h = rect.height
  let path = NSBezierPath()
  path.move(to: CGPoint(x: x + w * 0.55, y: y + h * 0.97))
  path.line(to: CGPoint(x: x + w * 0.18, y: y + h * 0.45))
  path.line(to: CGPoint(x: x + w * 0.47, y: y + h * 0.45))
  path.line(to: CGPoint(x: x + w * 0.34, y: y + h * 0.03))
  path.line(to: CGPoint(x: x + w * 0.83, y: y + h * 0.58))
  path.line(to: CGPoint(x: x + w * 0.52, y: y + h * 0.58))
  path.close()
  color.setFill()
  path.fill()
}

func drawShield(in rect: NSRect, fill: NSColor, stroke: NSColor, lineWidth: CGFloat) {
  let x = rect.origin.x
  let y = rect.origin.y
  let w = rect.width
  let h = rect.height
  let path = NSBezierPath()
  path.move(to: CGPoint(x: x + w * 0.5, y: y + h))
  path.curve(
    to: CGPoint(x: x + w * 0.1, y: y + h * 0.72),
    controlPoint1: CGPoint(x: x + w * 0.36, y: y + h * 0.95),
    controlPoint2: CGPoint(x: x + w * 0.22, y: y + h * 0.83)
  )
  path.curve(
    to: CGPoint(x: x + w * 0.5, y: y),
    controlPoint1: CGPoint(x: x + w * 0.07, y: y + h * 0.39),
    controlPoint2: CGPoint(x: x + w * 0.18, y: y + h * 0.14)
  )
  path.curve(
    to: CGPoint(x: x + w * 0.9, y: y + h * 0.72),
    controlPoint1: CGPoint(x: x + w * 0.82, y: y + h * 0.14),
    controlPoint2: CGPoint(x: x + w * 0.93, y: y + h * 0.39)
  )
  path.curve(
    to: CGPoint(x: x + w * 0.5, y: y + h),
    controlPoint1: CGPoint(x: x + w * 0.78, y: y + h * 0.83),
    controlPoint2: CGPoint(x: x + w * 0.64, y: y + h * 0.95)
  )
  path.close()
  fill.setFill()
  path.fill()
  stroke.setStroke()
  path.lineJoinStyle = .round
  path.lineWidth = lineWidth
  path.stroke()
}

func drawBrandMark(center: CGPoint, scale: CGFloat, includeBackground: Bool, roundBackground: Bool) {
  let side = 720 * scale
  let frame = NSRect(x: center.x - side / 2, y: center.y - side / 2, width: side, height: side)

  if includeBackground {
    if roundBackground {
      drawCircle(center: center, radius: side / 2, fill: navy.color)
    } else {
      drawRoundedRect(frame, radius: side * 0.22, fill: navy.color)
    }
    drawLine(
      CGPoint(x: frame.minX + side * 0.20, y: frame.minY + side * 0.28),
      CGPoint(x: frame.maxX - side * 0.18, y: frame.maxY - side * 0.24),
      color: RGB(0xffffff, 0.08).color,
      width: side * 0.022
    )
    drawLine(
      CGPoint(x: frame.minX + side * 0.16, y: frame.maxY - side * 0.22),
      CGPoint(x: frame.maxX - side * 0.20, y: frame.minY + side * 0.22),
      color: RGB(0xffffff, 0.08).color,
      width: side * 0.018
    )
  }

  let shieldRect = NSRect(
    x: center.x - side * 0.22,
    y: center.y - side * 0.26,
    width: side * 0.44,
    height: side * 0.56
  )
  drawShield(
    in: shieldRect,
    fill: RGB(0xffffff, includeBackground ? 0.14 : 0.92).color,
    stroke: RGB(0xffffff, includeBackground ? 0.36 : 0.98).color,
    lineWidth: max(2, side * 0.026)
  )
  drawLightning(
    in: NSRect(x: center.x - side * 0.095, y: center.y - side * 0.17, width: side * 0.22, height: side * 0.39),
    color: amber.color
  )

  let left = CGPoint(x: center.x - side * 0.33, y: center.y - side * 0.02)
  let right = CGPoint(x: center.x + side * 0.34, y: center.y - side * 0.02)
  drawLine(left, CGPoint(x: center.x - side * 0.15, y: center.y - side * 0.02), color: teal.color, width: side * 0.035)
  drawLine(CGPoint(x: center.x + side * 0.15, y: center.y - side * 0.02), right, color: teal.color, width: side * 0.035)
  drawCircle(center: left, radius: side * 0.048, fill: teal.color, stroke: RGB(0xffffff, 0.9).color, lineWidth: side * 0.014)
  drawCircle(center: right, radius: side * 0.048, fill: teal.color, stroke: RGB(0xffffff, 0.9).color, lineWidth: side * 0.014)
  drawCircle(center: CGPoint(x: center.x, y: center.y - side * 0.02), radius: side * 0.032, fill: amber.color)
}

func drawIcon(size: Int, round: Bool = false) -> NSImage {
  makeImage(width: size, height: size) { w, h in
    NSColor.clear.setFill()
    NSRect(x: 0, y: 0, width: w, height: h).fill()
    drawBrandMark(center: CGPoint(x: w / 2, y: h / 2), scale: w / 1024, includeBackground: true, roundBackground: round)
  }
}

func drawForeground(size: Int) -> NSImage {
  makeImage(width: size, height: size) { w, h in
    NSColor.clear.setFill()
    NSRect(x: 0, y: 0, width: w, height: h).fill()
    drawBrandMark(center: CGPoint(x: w / 2, y: h / 2), scale: w / 1240, includeBackground: false, roundBackground: false)
  }
}

func drawSplash(width: Int, height: Int, portrait: Bool) -> NSImage {
  makeImage(width: width, height: height) { w, h in
    let bg = NSGradient(colors: [paper.color, RGB(0xeaf2fb).color])!
    bg.draw(in: NSRect(x: 0, y: 0, width: w, height: h), angle: 90)

    let gridStep = max(42, min(w, h) * 0.055)
    line.color.withAlphaComponent(0.62).setStroke()
    for x in stride(from: gridStep, through: w - gridStep, by: gridStep) {
      drawLine(CGPoint(x: x, y: h * 0.14), CGPoint(x: x, y: h * 0.86), color: line.color.withAlphaComponent(0.36), width: 1)
    }
    for y in stride(from: h * 0.14, through: h * 0.86, by: gridStep) {
      drawLine(CGPoint(x: w * 0.08, y: y), CGPoint(x: w * 0.92, y: y), color: line.color.withAlphaComponent(0.36), width: 1)
    }

    let center = CGPoint(x: w / 2, y: portrait ? h * 0.56 : h * 0.58)
    let traceWidth = max(8, min(w, h) * 0.012)
    drawLine(CGPoint(x: w * 0.18, y: center.y), CGPoint(x: center.x - min(w, h) * 0.16, y: center.y), color: red.color, width: traceWidth)
    drawLine(CGPoint(x: center.x + min(w, h) * 0.16, y: center.y), CGPoint(x: w * 0.82, y: center.y), color: teal.color, width: traceWidth)
    drawCircle(center: CGPoint(x: w * 0.18, y: center.y), radius: traceWidth * 1.25, fill: red.color)
    drawCircle(center: CGPoint(x: w * 0.82, y: center.y), radius: traceWidth * 1.25, fill: teal.color)

    let iconScale = min(w, h) / (portrait ? 1500 : 1350)
    drawBrandMark(center: center, scale: iconScale, includeBackground: true, roundBackground: false)

    let titleSize = max(30, min(w, h) * (portrait ? 0.058 : 0.05))
    let subtitleSize = max(16, min(w, h) * (portrait ? 0.028 : 0.024))
    let titleRect = NSRect(x: w * 0.12, y: center.y - min(w, h) * 0.34, width: w * 0.76, height: titleSize * 1.4)
    let subtitleRect = NSRect(x: w * 0.12, y: titleRect.minY - subtitleSize * 1.8, width: w * 0.76, height: subtitleSize * 1.5)
    let titleAttrs: [NSAttributedString.Key: Any] = [
      .font: NSFont.systemFont(ofSize: titleSize, weight: .bold),
      .foregroundColor: navy.color,
      .paragraphStyle: centeredParagraph()
    ]
    let subtitleAttrs: [NSAttributedString.Key: Any] = [
      .font: NSFont.systemFont(ofSize: subtitleSize, weight: .medium),
      .foregroundColor: slate.color,
      .paragraphStyle: centeredParagraph()
    ]
    NSString(string: "电工大师").draw(in: titleRect, withAttributes: titleAttrs)
    NSString(string: "电路仿真与电工取证训练").draw(in: subtitleRect, withAttributes: subtitleAttrs)

    let badgeWidth = min(w * 0.48, 360)
    let badgeHeight = max(38, min(w, h) * 0.046)
    let badge = NSRect(x: (w - badgeWidth) / 2, y: subtitleRect.minY - badgeHeight * 1.8, width: badgeWidth, height: badgeHeight)
    drawRoundedRect(badge, radius: badgeHeight / 2, fill: NSColor.white.withAlphaComponent(0.82), stroke: line.color, lineWidth: 1)
    NSString(string: "实训 · 测量 · 排障").draw(
      in: NSRect(x: badge.minX, y: badge.minY + badgeHeight * 0.22, width: badge.width, height: badgeHeight * 0.7),
      withAttributes: [
        .font: NSFont.systemFont(ofSize: max(13, badgeHeight * 0.33), weight: .semibold),
        .foregroundColor: blue.color,
        .paragraphStyle: centeredParagraph()
      ]
    )
  }
}

func centeredParagraph() -> NSParagraphStyle {
  let style = NSMutableParagraphStyle()
  style.alignment = .center
  return style
}

try ensureDirectory(brandDir)

try savePng(drawIcon(size: 1024), to: brandDir.appendingPathComponent("app-icon-1024.png"))
try savePng(drawSplash(width: 1280, height: 1920, portrait: true), to: brandDir.appendingPathComponent("splash-portrait-1280x1920.png"))
try savePng(drawSplash(width: 1920, height: 1280, portrait: false), to: brandDir.appendingPathComponent("splash-landscape-1920x1280.png"))

try savePng(drawIcon(size: 180), to: staticBrandDir.appendingPathComponent("apple-touch-icon.png"))
try savePng(drawIcon(size: 192), to: staticBrandDir.appendingPathComponent("icon-192.png"))
try savePng(drawIcon(size: 512), to: staticBrandDir.appendingPathComponent("icon-512.png"))

let iconSizes: [(String, Int, Int)] = [
  ("mipmap-mdpi", 48, 108),
  ("mipmap-hdpi", 72, 162),
  ("mipmap-xhdpi", 96, 216),
  ("mipmap-xxhdpi", 144, 324),
  ("mipmap-xxxhdpi", 192, 432)
]

for (folder, launcherSize, foregroundSize) in iconSizes {
  let dir = androidResDir.appendingPathComponent(folder, isDirectory: true)
  try savePng(drawIcon(size: launcherSize), to: dir.appendingPathComponent("ic_launcher.png"))
  try savePng(drawIcon(size: launcherSize, round: true), to: dir.appendingPathComponent("ic_launcher_round.png"))
  try savePng(drawForeground(size: foregroundSize), to: dir.appendingPathComponent("ic_launcher_foreground.png"))
}

let splashes: [(String, Int, Int, Bool)] = [
  ("drawable/splash.png", 480, 320, false),
  ("drawable-port-mdpi/splash.png", 320, 480, true),
  ("drawable-port-hdpi/splash.png", 480, 800, true),
  ("drawable-port-xhdpi/splash.png", 720, 1280, true),
  ("drawable-port-xxhdpi/splash.png", 960, 1600, true),
  ("drawable-port-xxxhdpi/splash.png", 1280, 1920, true),
  ("drawable-land-mdpi/splash.png", 480, 320, false),
  ("drawable-land-hdpi/splash.png", 800, 480, false),
  ("drawable-land-xhdpi/splash.png", 1280, 720, false),
  ("drawable-land-xxhdpi/splash.png", 1600, 960, false),
  ("drawable-land-xxxhdpi/splash.png", 1920, 1280, false)
]

for (relative, width, height, portrait) in splashes {
  try savePng(drawSplash(width: width, height: height, portrait: portrait), to: androidResDir.appendingPathComponent(relative))
}

print("Generated Electric Master app icon and splash assets.")
