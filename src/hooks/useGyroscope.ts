'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useMotionValue, useSpring, type MotionValue } from 'framer-motion';

export type GyroPermissionState = 'unknown' | 'granted' | 'denied' | 'unavailable';

export type UseGyroscopeResult = {
  normX: MotionValue<number>;
  normY: MotionValue<number>;
  shock: MotionValue<number>;
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

  // ── 가속도 쇼크 효과 ───────────────────────────────────────
  const shockRaw = useMotionValue(0);
  // shockRaw 값이 바뀌면 스프링 애니메이션으로 shock 값이 업데이트됨
  const shock = useSpring(shockRaw, { stiffness: 500, damping: 20 });
  const shockTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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

  const handleDeviceMotion = useCallback((e: DeviceMotionEvent) => {
    // 가속도 센서 미지원 시 중단
    const acc = e.acceleration;
    if (!acc || acc.x === null || acc.y === null) return;
    
    const x = acc.x;
    const y = acc.y;

    // 가속도 벡터의 크기 계산 (수평면 기준)
    const magnitude = Math.sqrt(x * x + y * y);
    
    const SHOCK_THRESHOLD = 4; // 흔들림 감지 민감도 (m/s^2)

    if (magnitude > SHOCK_THRESHOLD) {
      if (shockTimeoutRef.current) clearTimeout(shockTimeoutRef.current);

      // 흔드는 세기에 비례하여 shock 값 설정 (0~1 범위)
      const shockValue = Math.min((magnitude - SHOCK_THRESHOLD) / 5, 1.0);
      shockRaw.set(shockValue);

      // 150ms 후 자동으로 0으로 복귀 (스프링 효과로 부드럽게 돌아옴)
      shockTimeoutRef.current = setTimeout(() => {
        shockRaw.set(0);
      }, 150);
    }
  }, [shockRaw]);

  const startListening = useCallback(() => {
    if (listeningRef.current) return;
    listeningRef.current = true;
    window.addEventListener('deviceorientation', handleOrientation, true);
    window.addEventListener('devicemotion', handleDeviceMotion, true);
    setIsActive(true);
    setPermissionState('granted');
  }, [handleOrientation, handleDeviceMotion]);

  const requestPermission = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const DOE = DeviceOrientationEvent as any;
    // iOS 13+ — 사용자 제스처에서만 호출 가능
    if (typeof DOE?.requestPermission === 'function') {
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

    // DeviceMotionEvent는 권한 요청 API가 별도로 없음
    const isMobile = 'ontouchstart' in window && typeof DeviceOrientationEvent !== 'undefined';
    if (!isMobile) {
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
      window.removeEventListener('devicemotion', handleDeviceMotion, true);
      if (shockTimeoutRef.current) clearTimeout(shockTimeoutRef.current);
    };
  }, [startListening, handleOrientation, handleDeviceMotion]);

  return { normX, normY, shock, isActive, permissionState, requestPermission };
}
