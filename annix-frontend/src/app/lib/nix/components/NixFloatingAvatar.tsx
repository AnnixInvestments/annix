"use client";

import Image from "next/image";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface NixFloatingAvatarProps {
  isVisible: boolean;
  onOpenChat?: () => void;
}

interface Position {
  x: number;
  y: number;
}

export default function NixFloatingAvatar({ isVisible, onOpenChat }: NixFloatingAvatarProps) {
  const [position, setPosition] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef<Position>({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!avatarRef.current) return;

    const rect = avatarRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setPosition({ x: rect.left, y: rect.top });
    setIsDragging(true);
    setHasDragged(false);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      setHasDragged(true);
      const newX = Math.max(0, Math.min(window.innerWidth - 80, e.clientX - dragOffset.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 80, e.clientY - dragOffset.current.y));

      setPosition({ x: newX, y: newY });
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!avatarRef.current) return;

    const touch = e.touches[0];
    const rect = avatarRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
    setPosition({ x: rect.left, y: rect.top });
    setIsDragging(true);
    setHasDragged(false);
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;

      setHasDragged(true);
      const touch = e.touches[0];
      const newX = Math.max(
        0,
        Math.min(window.innerWidth - 80, touch.clientX - dragOffset.current.x),
      );
      const newY = Math.max(
        0,
        Math.min(window.innerHeight - 80, touch.clientY - dragOffset.current.y),
      );

      setPosition({ x: newX, y: newY });
    },
    [isDragging],
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleTouchEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const handleClick = useCallback(() => {
    if (!hasDragged && onOpenChat) {
      onOpenChat();
    }
  }, [hasDragged, onOpenChat]);

  if (!isVisible) return null;

  return (
    <div
      ref={avatarRef}
      className={`fixed z-[9998] cursor-pointer select-none ${isDragging ? "cursor-grabbing" : ""} ${position === null ? "left-6 bottom-24" : ""}`}
      style={
        position !== null
          ? {
              left: position.x,
              top: position.y,
              transition: isDragging ? "none" : "box-shadow 0.2s ease",
            }
          : undefined
      }
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
    >
      <div className="relative group">
        <div
          className={`relative w-16 h-16 rounded-full overflow-hidden shadow-lg border-3 border-orange-400 hover:border-orange-500 transition-all duration-200 ${
            isDragging ? "scale-110 shadow-xl" : "hover:scale-105"
          }`}
          style={{
            boxShadow: isDragging
              ? "0 20px 40px rgba(0, 0, 0, 0.3)"
              : "0 8px 24px rgba(0, 0, 0, 0.2)",
          }}
        >
          <Image
            src="/nix-avatar.png"
            alt="Nix AI Assistant"
            fill
            className="object-cover"
            draggable={false}
          />
        </div>

        <div
          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full animate-pulse"
          style={{ backgroundColor: "#FFA500" }}
        />

        <div className="absolute -top-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none">
          Chat with Nix
        </div>
      </div>
    </div>
  );
}
