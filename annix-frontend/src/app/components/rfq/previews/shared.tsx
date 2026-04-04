"use client";

import { useThree } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";

export function CaptureHelper(props: {
  captureRef: React.MutableRefObject<(() => string | null) | null>;
}) {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    props.captureRef.current = () => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL("image/png");
    };
    return () => {
      props.captureRef.current = null;
    };
  }, [gl, scene, camera, props.captureRef]);

  return null;
}

export const useDebouncedProps = <T extends Record<string, any>>(
  props: T,
  delay: number = 150,
): T => {
  const [debouncedProps, setDebouncedProps] = useState(props);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setDebouncedProps(props);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [props, delay]);

  return debouncedProps;
};
