'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useMotionValue, type MotionValue } from 'framer-motion';

export type GyroPermissionState = 'unknown' | 'granted' | 'denied' | 'unavailable';

export type UseGyroscopeResult = {
  normX: MotionValue<number>;
  normY: MotionValue<number>;
  isActive: boolean;
  permissionState: GyroPermissionState;
  requestPermission: () => Promise<void>;
};

// 기울기를 normX/normY(-0.5 ~ 0.5)로 변환할 때 사용하는 기준 각도 범위
const GAMMA_RANGE = 30; // 좌우 기울기 범위 (°)
const BETA_RANGE  = 30; // 전후 기울기 범위 (°)

export function useGyroscope(): UseGyroscopeResult {
  const normX = useMotionValue(0);
  const normY = useMotionValue(0);
  const [permissionState, setPermissionState] = useState<GyroPermissionState>('unknown');
  const [isActive, setIsActive] = useState(false);

  // 첫 이벤트 수신 시 beta 기준값 보정 (자연스러운 파지 자세 기준)
  const betaBaseRef = useRef<number | null>(null);
  const listeningRef = useRef(false);

  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    if (e.gamma === null || e.beta === null) return;

    if (betaBaseRef.current === null) {
      betaBaseRef.current = e.beta;
    }

    const gx = Math.max(-0.5, Math.min(0.5, e.gamma / (GAMMA_RANGE * 2)));
    const gy = Math.max(-0.5, Math.min(0.5, (e.beta - betaBaseRef.current) / (BETA_RANGE * 2)));

    normX.set(gx);
    normY.set(gy);
  }, [normX, normY]);

  const startListening = useCallback(() => {
    if (listeningRef.current) return;
    listeningRef.current = true;
    window.addEventListener('deviceorientation', handleOrientation, true);
    setIsActive(true);
    setPermissionState('granted');
  }, [handleOrientation]);

  const requestPermission = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const DOE = DeviceOrientationEvent as any;
    if (typeof DOE?.requestPermission === 'function') {
      // iOS 13+ — 사용자 제스처에서만 호출 가능
      try {
        const result: string = await DOE.requestPermission();
        if (result === 'granted') {
          startListening();
        } else {
          setPermissionState('denied');
        }
      } catch {
        setPermissionState('denied');
      }
    } else {
      // Android / 구형 iOS — 별도 권한 불필요
      startListening();
    }
  }, [startListening]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isMobile = 'ontouchstart' in window;
    if (!isMobile || typeof DeviceOrientationEvent === 'undefined') {
      setPermissionState('unavailable');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const needsPermission = typeof (DeviceOrientationEvent as any).requestPermission === 'function';
    if (!needsPermission) {
      // Android — 권한 요청 없이 바로 수신 시작
      startListening();
    }
    // iOS는 'unknown' 상태로 유지 → 사용자 탭 후 requestPermission 호출

    return () => {
      listeningRef.current = false;
      betaBaseRef.current = null;
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [startListening, handleOrientation]);

  return { normX, normY, isActive, permissionState, requestPermission };
}
