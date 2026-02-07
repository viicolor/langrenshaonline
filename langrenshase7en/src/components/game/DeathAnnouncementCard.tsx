import { Card, CardContent } from '@/components/ui/card';
import { Skull, Moon } from 'lucide-react';

/** 死讯区：白天阶段展示昨夜死亡名单或平安夜，符合 UI 设计规范（深色卡片、金色点缀、圆角） */
interface DeathAnnouncementCardProps {
  /** 昨夜死亡玩家名称列表，空表示平安夜 */
  deathNames: string[];
  /** 当前回合（用于显示“第 X 天”） */
  round?: number;
  className?: string;
}

const DeathAnnouncementCard = ({ deathNames, round, className = '' }: DeathAnnouncementCardProps) => {
  const isPeaceNight = deathNames.length === 0;

  return (
    <Card
      className={`border-primary/30 bg-card/80 backdrop-blur-sm rounded-xl shadow-lg ${className}`}
      aria-label={isPeaceNight ? '昨夜平安夜' : '昨夜死亡名单'}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              isPeaceNight ? 'bg-primary/20 text-primary' : 'bg-wolf-red/20 text-wolf-red'
            }`}
          >
            {isPeaceNight ? (
              <Moon className="h-5 w-5" aria-hidden />
            ) : (
              <Skull className="h-5 w-5" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-semibold text-foreground">
              {round != null ? `第 ${round} 天` : '白天'} · 死讯
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {isPeaceNight
                ? '昨夜是平安夜，无人死亡。'
                : `昨夜死亡的玩家：${deathNames.join('、')}`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeathAnnouncementCard;
