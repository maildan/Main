import { useEffect, useRef } from 'react';

/**
 * 주기적으로 콜백 함수를 실행하는 커스텀 훅
 * @param callback 실행할 콜백 함수
 * @param delay 실행 간격(ms), null이면 타이머를 실행하지 않음
 */
export function useInterval(callback: () => void, delay: number | null) {
    const savedCallback = useRef<() => void>();

    // 콜백 함수가 변경되면 저장
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    // delay가 변경될 때마다 interval 설정
    useEffect(() => {
        function tick() {
            if (savedCallback.current) {
                savedCallback.current();
            }
        }

        if (delay !== null) {
            const id = setInterval(tick, delay);
            return () => clearInterval(id);
        }
        return undefined;
    }, [delay]);
}