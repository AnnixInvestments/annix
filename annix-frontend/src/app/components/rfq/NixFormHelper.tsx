'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'

interface Position {
  x: number
  y: number
}

interface NixFormHelperProps {
  isVisible: boolean
  onClose: () => void
  onReactivate: () => void
  isMinimized: boolean
}

const STORAGE_KEY = 'nix-form-helper-position'
const BOTTOM_TOOLBAR_HEIGHT = 72

export default function NixFormHelper({
  isVisible,
  onClose,
  onReactivate,
  isMinimized,
}: NixFormHelperProps) {
  const [position, setPosition] = useState<Position | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showHoverDialog, setShowHoverDialog] = useState(false)
  const [hasBeenDragged, setHasBeenDragged] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)
  const dragOffset = useRef<Position>({ x: 0, y: 0 })
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && position === null) {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const savedPosition = JSON.parse(saved)
          setPosition(savedPosition)
          setHasBeenDragged(true)
        } catch {
          setDefaultPosition()
        }
      } else {
        setDefaultPosition()
      }
    }
  }, [position])

  const setDefaultPosition = () => {
    setPosition({
      x: 20,
      y: window.innerHeight - BOTTOM_TOOLBAR_HEIGHT - 100,
    })
  }

  const savePosition = useCallback((pos: Position) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos))
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!avatarRef.current) return
    e.preventDefault()
    const rect = avatarRef.current.getBoundingClientRect()
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
    setIsDragging(true)
    setShowHoverDialog(false)
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return
      const newX = Math.max(0, Math.min(window.innerWidth - 80, e.clientX - dragOffset.current.x))
      const newY = Math.max(
        0,
        Math.min(window.innerHeight - BOTTOM_TOOLBAR_HEIGHT - 80, e.clientY - dragOffset.current.y)
      )
      const newPos = { x: newX, y: newY }
      setPosition(newPos)
      setHasBeenDragged(true)
    },
    [isDragging]
  )

  const handleMouseUp = useCallback(() => {
    if (isDragging && position) {
      savePosition(position)
    }
    setIsDragging(false)
  }, [isDragging, position, savePosition])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!avatarRef.current) return
    const touch = e.touches[0]
    const rect = avatarRef.current.getBoundingClientRect()
    dragOffset.current = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    }
    setIsDragging(true)
    setShowHoverDialog(false)
  }, [])

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return
      const touch = e.touches[0]
      const newX = Math.max(0, Math.min(window.innerWidth - 80, touch.clientX - dragOffset.current.x))
      const newY = Math.max(
        0,
        Math.min(window.innerHeight - BOTTOM_TOOLBAR_HEIGHT - 80, touch.clientY - dragOffset.current.y)
      )
      const newPos = { x: newX, y: newY }
      setPosition(newPos)
      setHasBeenDragged(true)
    },
    [isDragging]
  )

  const handleTouchEnd = useCallback(() => {
    if (isDragging && position) {
      savePosition(position)
    }
    setIsDragging(false)
  }, [isDragging, position, savePosition])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('touchmove', handleTouchMove)
      window.addEventListener('touchend', handleTouchEnd)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

  const handleMouseEnter = useCallback(() => {
    if (!isDragging) {
      hoverTimeoutRef.current = setTimeout(() => {
        setShowHoverDialog(true)
      }, 300)
    }
  }, [isDragging])

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setShowHoverDialog(false)
  }, [])

  const handleClose = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setShowHoverDialog(false)
      onClose()
    },
    [onClose]
  )

  if (!isVisible || position === null) return null

  return (
    <div
      ref={avatarRef}
      className={`fixed z-[9990] select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: position.x,
        top: position.y,
        transition: isDragging ? 'none' : 'box-shadow 0.2s ease',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative">
        <div
          className={`w-16 h-16 rounded-full overflow-hidden shadow-lg border-3 border-orange-400 hover:border-orange-500 transition-all duration-200 ${
            isDragging ? 'scale-110 shadow-xl' : 'hover:scale-105'
          }`}
          style={{
            boxShadow: isDragging
              ? '0 20px 40px rgba(0, 0, 0, 0.3)'
              : '0 8px 24px rgba(0, 0, 0, 0.2)',
          }}
        >
          <Image
            src="/nix-avatar.png"
            alt="Nix AI Assistant"
            width={64}
            height={64}
            className="object-cover object-top scale-125"
            draggable={false}
          />
        </div>

        <button
          onClick={handleClose}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center text-xs font-bold shadow-lg transition-colors z-10"
          title="Close Nix helper"
        >
          X
        </button>

        <div
          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full animate-pulse"
          style={{ backgroundColor: '#FFA500' }}
        />
      </div>

      {showHoverDialog && !isDragging && (
        <div
          className="absolute bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-72 z-[9991]"
          style={{
            left: position.x < window.innerWidth / 2 ? '100%' : 'auto',
            right: position.x >= window.innerWidth / 2 ? '100%' : 'auto',
            marginLeft: position.x < window.innerWidth / 2 ? '12px' : '0',
            marginRight: position.x >= window.innerWidth / 2 ? '12px' : '0',
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden border-2 border-orange-400">
              <Image
                src="/nix-avatar.png"
                alt="Nix"
                width={40}
                height={40}
                className="object-cover object-top scale-125"
              />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">Hi, I&apos;m Nix!</h4>
              <p className="text-xs text-gray-600 mt-1">
                I&apos;m here to help you with adding items, bends, and fittings to your RFQ. Click on
                me if you need any assistance!
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 italic">
              {hasBeenDragged
                ? 'I\u0027ll stay right here where you put me.'
                : 'Tip: You can drag me to a more convenient location, and I\u0027ll stay there!'}
            </p>
          </div>
          <div
            className={`absolute w-3 h-3 bg-white border-gray-200 rotate-45 ${
              position.x < window.innerWidth / 2
                ? 'left-0 -translate-x-1/2 border-l border-b'
                : 'right-0 translate-x-1/2 border-r border-t'
            }`}
            style={{ top: '50%', marginTop: '-6px' }}
          />
        </div>
      )}
    </div>
  )
}

export function NixMinimizedButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors hover:bg-indigo-800"
      title="Reactivate Nix helper"
    >
      <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-orange-400">
        <Image
          src="/nix-avatar.png"
          alt="Nix"
          width={24}
          height={24}
          className="object-cover object-top scale-125"
        />
      </div>
      <span className="text-xs font-medium text-orange-400 hidden sm:inline">Nix</span>
    </button>
  )
}
