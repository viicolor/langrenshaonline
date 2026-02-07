import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

interface IdentityOverlayProps {
  roleName: string;
  imageUrl?: string | null;
  /** 本地倒计时秒数（仅当未传 endsAtTimestamp 时使用） */
  countdownSeconds?: number;
  /** 身份展示结束时间戳（毫秒）。传入时倒计时以该时刻为准，多端一致，不依赖本地计时 */
  endsAtTimestamp?: number;
  onCountdownEnd: () => void;
}

const IdentityOverlay = ({
  roleName,
  imageUrl,
  countdownSeconds = 10,
  endsAtTimestamp,
  onCountdownEnd,
}: IdentityOverlayProps) => {
  const computeSecondsLeft = () =>
    endsAtTimestamp != null
      ? Math.max(0, Math.ceil((endsAtTimestamp - Date.now()) / 1000))
      : countdownSeconds;

  const [secondsLeft, setSecondsLeft] = useState(computeSecondsLeft);
  const [imageError, setImageError] = useState(false);
  const onCountdownEndFiredRef = useRef(false);

  const showImage = imageUrl && !imageError;

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (!onCountdownEndFiredRef.current) {
        onCountdownEndFiredRef.current = true;
        onCountdownEnd();
      }
      return;
    }
    const t = setInterval(() => {
      if (endsAtTimestamp != null) {
        setSecondsLeft(computeSecondsLeft());
      } else {
        setSecondsLeft((s) => s - 1);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [secondsLeft, onCountdownEnd, endsAtTimestamp]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md">
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="w-[min(80vw,28rem)] h-[min(80vw,28rem)] rounded-full bg-primary/15 blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center">
        <div
          className="mb-6 flex flex-col items-center gap-6 rounded-3xl border-2 border-primary/30 bg-card/80 px-12 py-12 shadow-2xl"
          style={{ minWidth: 'min(92vw, 520px)' }}
        >
          {/* 身份牌插画：无方形背景色，与卡牌边框自然融合 */}
          <div className="flex h-80 w-80 min-h-[20rem] min-w-[20rem] items-center justify-center rounded-2xl overflow-hidden">
            {showImage ? (
              <img
                src={imageUrl}
                alt={roleName}
                className="h-full w-full object-contain"
                onError={() => setImageError(true)}
              />
            ) : null}
            {!showImage && (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl">
                <span className="font-display text-4xl text-primary/60">{roleName.slice(0, 1)}</span>
              </div>
            )}
          </div>
          <p className="font-display text-xl tracking-wider text-muted-foreground">
            您本局的身份为
          </p>
          <p
            className="font-display text-2xl font-bold tracking-wider text-primary md:text-4xl"
            style={{ color: 'var(--primary)' }}
          >
            {roleName}
          </p>
        </div>

        <p className="mb-2 text-sm text-muted-foreground">
          {secondsLeft > 0 ? `${secondsLeft} 秒后开始游戏` : '开始游戏…'}
        </p>
        <div className="flex flex-col items-center gap-3">
          <div
            key={secondsLeft}
            className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-primary/40 bg-primary/10"
          >
            <span className="font-display text-3xl font-bold tabular-nums text-primary">
              {Math.max(0, secondsLeft)}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={onCountdownEnd}>
            跳过
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IdentityOverlay;
