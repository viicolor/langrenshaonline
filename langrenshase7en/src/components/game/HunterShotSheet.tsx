import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Crosshair, Clock, Skull } from 'lucide-react';

/** 猎人开枪：出局后 10 秒内选择击杀目标，符合 UI 设计规范（深色、金色点缀、圆角） */
interface HunterShotSheetProps {
  open: boolean;
  /** 可选目标（存活玩家，排除自己） */
  targets: Array<{ id: string; name: string; avatar?: string }>;
  /** 剩余秒数 */
  timeRemaining: number;
  /** 已选目标 id */
  selectedTargetId: string | null;
  onSelectTarget: (targetId: string) => void;
  onConfirm: () => void;
  onSkip?: () => void;
}

const HunterShotSheet = ({
  open,
  targets,
  timeRemaining,
  selectedTargetId,
  onSelectTarget,
  onConfirm,
  onSkip,
}: HunterShotSheetProps) => {
  return (
    <Sheet open={open}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-t border-primary/30 bg-card backdrop-blur-md max-h-[85vh] overflow-y-auto"
        aria-label="猎人请选择开枪目标"
      >
        <SheetHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-hunter-orange/20 text-hunter-orange">
              <Crosshair className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <SheetTitle className="font-display text-lg text-foreground">
                猎人请选择开枪目标
              </SheetTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">
                出局后可开枪带走一名玩家，被毒杀不可开枪
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
            <Badge variant="outline" className="tabular-nums font-medium text-primary border-primary/50">
              {timeRemaining} 秒
            </Badge>
          </div>
        </SheetHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">选择要击杀的玩家：</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {targets.map((t) => {
              const selected = selectedTargetId === t.id;
              return (
                <Button
                  key={t.id}
                  type="button"
                  variant={selected ? 'default' : 'outline'}
                  size="sm"
                  className={`h-auto py-3 px-4 rounded-xl font-normal justify-start gap-2 ${
                    selected
                      ? 'bg-wolf-red/90 hover:bg-wolf-red border-wolf-red text-primary-foreground'
                      : 'border-border hover:border-primary/50 hover:bg-primary/5'
                  }`}
                  onClick={() => onSelectTarget(t.id)}
                  aria-pressed={selected}
                  aria-label={`选择 ${t.name}`}
                >
                  {t.avatar ? (
                    <img
                      src={t.avatar}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Skull className="h-4 w-4 text-muted-foreground" />
                    </span>
                  )}
                  <span className="truncate">{t.name}</span>
                </Button>
              );
            })}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="gold"
              size="md"
              className="rounded-xl flex-1"
              onClick={onConfirm}
              disabled={!selectedTargetId}
            >
              确认开枪
            </Button>
            {onSkip && (
              <Button
                variant="outline"
                size="md"
                className="rounded-xl border-border"
                onClick={onSkip}
              >
                放弃
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default HunterShotSheet;
