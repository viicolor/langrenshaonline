import { Trophy, Users, Clock, Skull, Shield, FlaskConical, Eye, Crosshair, Award, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface GameStatsProps {
  totalRounds: number;
  totalVotes: number;
  totalDeaths: number;
  wolfKills: number;
  witchSaves: number;
  witchPoisons: number;
  guardProtects: number;
  seerChecks: number;
  duration: number;
  winner?: 'good' | 'wolf';
  winnerReason?: string;
  mvp?: {
    name: string;
    avatar: string;
    role: string;
    contribution: {
      kills: number;
      saves: number;
      votes: number;
      correctVotes: number;
    };
  };
}

const GameStats = ({
  totalRounds,
  totalVotes,
  totalDeaths,
  wolfKills,
  witchSaves,
  witchPoisons,
  guardProtects,
  seerChecks,
  duration,
  winner,
  winnerReason,
  mvp,
}: GameStatsProps) => {
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}小时${minutes}分${secs}秒`;
    }
    if (minutes > 0) {
      return `${minutes}分${secs}秒`;
    }
    return `${secs}秒`;
  };

  const getVoteParticipationRate = () => {
    if (totalRounds === 0) return 0;
    return Math.round((totalVotes / (totalRounds * 12)) * 100);
  };

  const getAverageVotesPerRound = () => {
    if (totalRounds === 0) return 0;
    return Math.round(totalVotes / totalRounds);
  };

  const getMVPBadge = () => {
    if (!mvp) return null;
    
    const score = mvp.contribution.correctVotes * 2 + mvp.contribution.saves * 3 - mvp.contribution.kills * 1;
    
    if (score >= 10) {
      return <Badge variant="gold">MVP</Badge>;
    }
    if (score >= 5) {
      return <Badge variant="secondary">优秀</Badge>;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-card/50">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-xl font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-primary" />
              游戏统计
            </h3>
            {winner && (
              <Badge variant={winner === 'good' ? 'default' : 'destructive'} className="text-sm">
                {winner === 'good' ? '好人胜利' : '狼人胜利'}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm">游戏时长</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {formatDuration(duration)}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="text-sm">总回合数</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {totalRounds}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Award className="w-4 h-4" />
                <span className="text-sm">总投票数</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {totalVotes}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">投票参与率</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {getVoteParticipationRate()}%
              </div>
            </div>
          </div>

          <div className="h-px bg-border my-6" />

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-wolf-red">
                <Skull className="w-4 h-4" />
                <span className="text-sm">狼人击杀</span>
              </div>
              <div className="text-2xl font-bold text-wolf-red">
                {wolfKills}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-role-villager">
                <Shield className="w-4 h-4" />
                <span className="text-sm">女巫救人</span>
              </div>
              <div className="text-2xl font-bold text-role-villager">
                {witchSaves}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-accent">
                <FlaskConical className="w-4 h-4" />
                <span className="text-sm">女巫毒杀</span>
              </div>
              <div className="text-2xl font-bold text-accent">
                {witchPoisons}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Eye className="w-4 h-4" />
                <span className="text-sm">预言家查验</span>
              </div>
              <div className="text-2xl font-bold text-primary">
                {seerChecks}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Crosshair className="w-4 h-4" />
                <span className="text-sm">守卫守护</span>
              </div>
              <div className="text-2xl font-bold text-primary">
                {guardProtects}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="text-sm">总死亡数</span>
              </div>
              <div className="text-2xl font-bold text-muted-foreground">
                {totalDeaths}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm">平均每轮投票</span>
              </div>
              <div className="text-2xl font-bold text-muted-foreground">
                {getAverageVotesPerRound()}
              </div>
            </div>
          </div>

          {winnerReason && (
            <div className="mt-6 p-4 bg-secondary/20 rounded-lg">
              <p className="text-sm text-muted-foreground text-center">
                {winnerReason}
              </p>
            </div>
          )}

          {mvp && (
            <div className="mt-6 p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <div className="flex items-center gap-4">
                <img
                  src={mvp.avatar}
                  alt={mvp.name}
                  className="w-12 h-12 rounded-full"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{mvp.name}</span>
                    {getMVPBadge()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {mvp.role === 'werewolf' ? '狼人' : 
                     mvp.role === 'villager' ? '村民' : 
                     ['seer', 'witch', 'hunter', 'guard', 'idiot'].includes(mvp.role || '') ? '神职' : '未知'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">
                    <div>击杀：{mvp.contribution.kills}</div>
                    <div>救人：{mvp.contribution.saves}</div>
                    <div>投票：{mvp.contribution.votes}</div>
                    <div>正确：{mvp.contribution.correctVotes}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default GameStats;
