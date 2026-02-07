import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, X, Clock, MessageCircle } from 'lucide-react';
import type { SheriffState } from '@/services/sheriff';

interface SheriffCampaignPanelProps {
  sheriffState: SheriffState;
  currentUserSeat: number | null;
  timeRemaining: number;
  onRegister: () => void;
  onWithdraw: () => void;
  onVote: (targetSeat: number) => void;
  onSkipVote: () => void;
  hasRegistered: boolean;
  hasVoted: boolean;
  canRegister: boolean;
  canWithdraw: boolean;
  canVote: boolean;
  /** 当前发言者座位号（仅 speech/pk_speech 阶段） */
  currentSpeakerSeat: number | null;
}

export default function SheriffCampaignPanel({
  sheriffState,
  currentUserSeat,
  timeRemaining,
  onRegister,
  onWithdraw,
  onVote,
  onSkipVote,
  hasRegistered,
  hasVoted,
  canRegister,
  canWithdraw,
  canVote,
  currentSpeakerSeat,
}: SheriffCampaignPanelProps) {
  const { stage, signupSeats, speechOrder, speechIndex, votes, pkRound, pkSeats } = sheriffState;

  const candidates = stage === 'pk_speech' || stage === 'pk_vote' ? pkSeats : signupSeats;
  const voteCounts: Record<number, number> = {};
  for (const v of Object.values(votes || {})) {
    if (v != null && candidates.includes(v)) {
      voteCounts[v] = (voteCounts[v] ?? 0) + 1;
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-primary/40 bg-primary/5 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-primary" />
          <h3 className="font-display text-lg font-bold text-primary">
            第1天 · 警长竞选
            {pkRound > 0 && ` · PK${pkRound}`}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <Badge variant="outline" className="tabular-nums">
            {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
          </Badge>
        </div>
      </div>

      {stage === 'signup' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">上警报名中（20秒），点击「我要上警」报名竞选警长</p>
          {signupSeats.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground">已报名：</span>
              {signupSeats.map((s) => (
                <Badge key={s} variant="default" className="bg-primary/20">
                  {s}号
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            {!hasRegistered && canRegister && (
              <Button variant="gold" onClick={onRegister} className="flex-1">
                <Crown className="w-4 h-4 mr-2" />
                我要上警
              </Button>
            )}
            {hasRegistered && (
              <Badge variant="default" className="bg-primary">
                <Check className="w-4 h-4 mr-1" />
                已报名
              </Badge>
            )}
          </div>
        </div>
      )}

      {(stage === 'speech' || stage === 'pk_speech') && (
        <div className="space-y-3">
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
            <p className="text-sm font-medium text-primary">
              {currentSpeakerSeat != null ? `${currentSpeakerSeat}号玩家正在发言` : '等待发言'}
              （{speechIndex + 1}/{speechOrder.length}）
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stage === 'pk_speech' ? 'PK发言' : '警上发言'}：60秒/人，发言请使用聊天窗口
            </p>
          </div>
          {currentUserSeat != null && speechOrder.includes(currentUserSeat) && canWithdraw && (
            <Button variant="outline" size="sm" onClick={onWithdraw} className="w-full">
              <X className="w-4 h-4 mr-2" />
              退水（退出竞选）
            </Button>
          )}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">发言顺序：</span>
            {speechOrder.map((s, idx) => (
              <Badge
                key={s}
                variant={idx === speechIndex ? 'default' : 'outline'}
                className={idx === speechIndex ? 'bg-primary' : ''}
              >
                {s}号{idx === speechIndex && ' 🎤'}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {(stage === 'vote' || stage === 'pk_vote') && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            警下投票（15秒），请选择你支持的警长候选人
            {stage === 'pk_vote' && `（PK${pkRound}轮）`}
          </p>
          {!canVote && currentUserSeat != null && (
            <p className="text-sm text-amber-600 font-medium">
              {stage === 'vote'
                ? '参与警长竞选的玩家不能参与投票，仅未竞选的玩家可投票。'
                : '你是 PK 玩家，本轮不能投票；其他玩家（含退水的竞选玩家）均可投票。'}
            </p>
          )}
          <div className="grid grid-cols-3 gap-2">
            {candidates.map((seat) => {
              const count = voteCounts[seat] ?? 0;
              return (
                <Button
                  key={seat}
                  variant="outline"
                  onClick={() => onVote(seat)}
                  disabled={!canVote || hasVoted}
                  className="flex-col gap-1 h-auto py-3"
                >
                  <Crown className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">{seat}号</span>
                  {count > 0 && <span className="text-xs text-primary">{count}票</span>}
                </Button>
              );
            })}
          </div>
          <Button variant="outline" onClick={onSkipVote} disabled={!canVote || hasVoted} className="w-full">
            弃票
          </Button>
          {hasVoted && (
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-center">
              <Check className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-sm text-primary font-medium">已投票</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
