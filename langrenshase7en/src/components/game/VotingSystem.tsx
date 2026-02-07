import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

export interface Vote {
  voterId: string;
  voterName: string;
  targetId: string;
  targetName: string;
}

interface VotingSystemProps {
  players: Array<{ id: string; name: string; avatar: string; isAlive: boolean }>;
  currentUserId?: string;
  votes: Vote[];
  timeRemaining?: number;
  onVote: (targetId: string) => void;
  onSkip?: () => void;
  isVotingOpen: boolean;
  hasVoted?: boolean;
}

const VotingSystem = ({
  players,
  currentUserId,
  votes,
  timeRemaining,
  onVote,
  onSkip,
  isVotingOpen,
  hasVoted = false,
}: VotingSystemProps) => {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  const voteCounts = votes.reduce((acc, vote) => {
    acc[vote.targetName] = (acc[vote.targetName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalVotes = votes.length;
  const maxVotes = Math.max(...Object.values(voteCounts), 0);
  const alivePlayers = players.filter(p => p.isAlive);

  const handleVote = (targetId: string) => {
    if (!isVotingOpen || hasVoted) return;
    setSelectedTarget(targetId);
    onVote(targetId);
  };

  const handleSkip = () => {
    if (!isVotingOpen || hasVoted) return;
    onSkip?.();
  };

  const getVotePercentage = (count: number) => {
    if (totalVotes === 0) return 0;
    return (count / totalVotes) * 100;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-primary" />
          <h3 className="font-display text-lg font-bold">投票阶段</h3>
        </div>
        {timeRemaining !== undefined && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <Badge variant="outline" className="text-sm">
              {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
            </Badge>
          </div>
        )}
      </div>

      {hasVoted && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center">
          <CheckCircle className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-sm font-medium text-primary">您已经投票了</p>
          {selectedTarget && (
            <p className="text-xs text-muted-foreground mt-1">
              投票给: {alivePlayers.find(p => p.id === selectedTarget)?.name}
            </p>
          )}
        </div>
      )}

      {!hasVoted && isVotingOpen && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground text-center">
            请选择要投票的玩家，或选择弃票
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {alivePlayers.map((player) => (
              <Button
                key={player.id}
                variant={selectedTarget === player.id ? 'gold' : 'night'}
                onClick={() => handleVote(player.id)}
                disabled={!isVotingOpen}
                className="h-auto py-4 flex-col gap-2"
              >
                <img
                  src={player.avatar}
                  alt={player.name}
                  className="w-10 h-10 rounded-full"
                />
                <span className="text-sm">{player.name}</span>
                {voteCounts[player.name] > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {voteCounts[player.name]}票
                  </Badge>
                )}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={!isVotingOpen}
            className="w-full"
          >
            <XCircle className="w-4 h-4 mr-2" />
            弃票
          </Button>
        </div>
      )}

      {!isVotingOpen && (
        <div className="bg-secondary/50 border border-border rounded-lg p-4 text-center">
          <AlertTriangle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">投票已结束</p>
        </div>
      )}

      {totalVotes > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">投票统计</h4>
          <div className="space-y-2">
            {Object.entries(voteCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([playerName, count]) => {
                const percentage = getVotePercentage(count);
                const isLeading = count === maxVotes;
                return (
                  <div key={playerName} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className={isLeading ? 'font-bold text-primary' : ''}>
                        {playerName}
                      </span>
                      <span className="text-muted-foreground">
                        {count}票 ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default VotingSystem;
