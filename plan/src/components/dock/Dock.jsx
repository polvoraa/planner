import { motion as Motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'motion/react'
import { Children, cloneElement, useEffect, useMemo, useRef, useState } from 'react'

import './Dock.css'

function DockItem({
  children,
  className = '',
  onClick,
  isActive = false,
  mouseX,
  spring,
  distance,
  magnification,
  baseItemSize,
  orientation,
}) {
  const ref = useRef(null)
  const isHovered = useMotionValue(0)

  const mouseDistance = useTransform(mouseX, (value) => {
    const rect = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      y: 0,
      width: baseItemSize,
      height: baseItemSize,
    }

    const axisStart = orientation === 'vertical' ? rect.y : rect.x
    const axisSize = orientation === 'vertical' ? rect.height : rect.width

    return value - axisStart - axisSize / 2
  })

  const targetSize = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [baseItemSize, magnification, baseItemSize],
  )
  const size = useSpring(targetSize, spring)

  return (
    <Motion.button
      ref={ref}
      type="button"
      style={{
        width: size,
        height: size,
      }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      className={`dock-item ${isActive ? 'is-active' : ''} ${className}`.trim()}
      aria-pressed={isActive}
    >
      {Children.map(children, (child) => cloneElement(child, { isHovered }))}
    </Motion.button>
  )
}

function DockLabel({ children, className = '', orientation = 'horizontal', ...rest }) {
  const { isHovered } = rest
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const unsubscribe = isHovered.on('change', (latest) => {
      setIsVisible(latest === 1)
    })

    return () => unsubscribe()
  }, [isHovered])

  return (
    <AnimatePresence>
      {isVisible ? (
        <Motion.div
          initial={{ opacity: 0, x: 0, y: 0 }}
          animate={orientation === 'vertical' ? { opacity: 1, x: 10 } : { opacity: 1, y: -10 }}
          exit={{ opacity: 0, x: 0, y: 0 }}
          transition={{ duration: 0.2 }}
          className={`dock-label dock-label--${orientation} ${className}`.trim()}
          role="tooltip"
          style={orientation === 'horizontal' ? { x: '-50%' } : undefined}
        >
          {children}
        </Motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function DockIcon({ children, className = '' }) {
  return <div className={`dock-icon ${className}`.trim()}>{children}</div>
}

export default function Dock({
  items,
  className = '',
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = 64,
  distance = 180,
  panelHeight = 72,
  dockHeight = 96,
  baseItemSize = 52,
  orientation = 'horizontal',
}) {
  const mouseX = useMotionValue(Infinity)
  const isHovered = useMotionValue(0)

  const maxHeight = useMemo(
    () => Math.max(dockHeight, magnification + magnification / 2 + 8),
    [magnification, dockHeight],
  )
  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight])
  const height = useSpring(heightRow, spring)
  const primaryItems = items.filter((item) => item.placement !== 'bottom')
  const bottomItems = items.filter((item) => item.placement === 'bottom')

  const renderItems = (groupItems) =>
    groupItems.map((item) => (
      <DockItem
        key={item.key}
        onClick={item.onClick}
        className={item.className}
        isActive={item.isActive}
        mouseX={mouseX}
        spring={spring}
        distance={distance}
        magnification={magnification}
        baseItemSize={baseItemSize}
        orientation={orientation}
      >
        <DockIcon>{item.icon}</DockIcon>
        <DockLabel orientation={orientation}>{item.label}</DockLabel>
      </DockItem>
    ))

  return (
    <Motion.div
      style={orientation === 'vertical' ? { height: '100%', scrollbarWidth: 'none' } : { height, scrollbarWidth: 'none' }}
      className={`dock-outer dock-outer--${orientation}`}
    >
      <Motion.div
        onMouseMove={(event) => {
          isHovered.set(1)
          mouseX.set(orientation === 'vertical' ? event.pageY : event.pageX)
        }}
        onMouseLeave={() => {
          isHovered.set(0)
          mouseX.set(Infinity)
        }}
        className={`dock-panel dock-panel--${orientation} ${className}`.trim()}
        style={orientation === 'horizontal' ? { height: panelHeight } : undefined}
        role="toolbar"
        aria-label="Atalhos do workspace"
      >
        <div className="dock-primary-items">{renderItems(primaryItems)}</div>
        {bottomItems.length ? <div className="dock-bottom-items">{renderItems(bottomItems)}</div> : null}
      </Motion.div>
    </Motion.div>
  )
}
