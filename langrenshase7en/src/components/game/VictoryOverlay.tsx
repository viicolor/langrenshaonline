import { useEffect, useRef, useState } from 'react';
import { Trophy } from 'lucide-react';

const WINNER_LABELS: Record<string, string> = {
  good: '好人阵营',
  wolf: '狼人阵营',
  test_restart: '测试重启',
};

interface VictoryOverlayProps {
  winnerTeam: string | null;
  countdownSeconds?: number;
  onCountdownEnd: () => void;
}

const VictoryOverlay = ({
  winnerTeam,
  countdownSeconds = 10,
  onCountdownEnd,
}: VictoryOverlayProps) => {
  const [secondsLeft, setSecondsLeft] = useState(countdownSeconds);
  const onCountdownEndFiredRef = useRef(false);

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (!onCountdownEndFiredRef.current) {
        onCountdownEndFiredRef.current = true;
        onCountdownEnd();
      }
      return;
    }
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [secondsLeft, onCountdownEnd]);

  const label = winnerTeam ? (WINNER_LABELS[winnerTeam] ?? winnerTeam) : '未知';

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md">
      {/* 背景光效 */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="w-[min(80vw,28rem)] h-[min(80vw,28rem)] rounded-full bg-primary/15 blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center">
        {/* 祝贺插画：大奖杯 + 阵营名 */}
        <div
          className="mb-6 flex flex-col items-center gap-4 rounded-3xl border-2 border-primary/30 bg-card/80 px-10 py-8 shadow-2xl"
          style={{ minWidth: 'min(90vw, 360px)' }}
        >
          <div className="rounded-full bg-primary/20 p-6">
            <Trophy className="h-24 w-24 text-primary" strokeWidth={1.5} />
          </div>
          <p className="font-display text-lg tracking-wider text-muted-foreground">
            祝贺
          </p>
          <p
            className="font-display text-3xl font-bold tracking-wider text-primary md:text-4xl"
            style={{ color: 'var(--primary)' }}
          >
            {label}获胜
          </p>
        </div>

        {/* 10 秒倒计时 */}
        <p className="mb-2 text-sm text-muted-foreground">
          {secondsLeft > 0
            ? `${secondsLeft} 秒后返回房间，可准备开始下一局`
            : '正在返回房间…'}
        </p>
        <div
          key={secondsLeft}
          className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-primary/40 bg-primary/10"
        >
          <span className="font-display text-4xl font-bold tabular-nums text-primary">
            {Math.max(0, secondsLeft)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VictoryOverlay;
