import { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Eye, EyeOff, Clock, MessageCircle, Skull, Shield, FlaskConical, Crosshair, UserX, Trophy, X } from 'lucide-react';
import { format } from 'date-fns';

export interface SpectatorRecord {
  id: string;
  gameId: string;
  roomId: string;
  type: 'phase_change' | 'player_death' | 'player_saved' | 'vote_cast' | 'skill_used' | 'game_end';
  data: Record<string, unknown>;
  timestamp: number;
}

interface SpectatorRecordProps {
  gameId: string;
  roomId: string;
  records: SpectatorRecord[];
  perspective?: 'god_view' | 'follow_player' | 'follow_role';
  followTargetId?: string;
  followRole?: string;
  isSpectator: boolean;
  /** 观战模式下显示「上桌参与游戏」按钮，放在类型选择旁 */
  onJoinGame?: () => void;
  joinGameDisabled?: boolean;
}

const getRecordIcon = (type: string) => {
  switch (type) {
    case 'phase_change':
      return <Clock className="w-4 h-4 text-primary" />;
    case 'player_death':
      return <Skull className="w-4 h-4 text-wolf-red" />;
    case 'player_saved':
      return <Shield className="w-4 h-4 text-role-villager" />;
    case 'vote_cast':
      return <MessageCircle className="w-4 h-4 text-accent" />;
    case 'skill_used':
      return <FlaskConical className="w-4 h-4 text-primary" />;
    case 'game_end':
      return <Trophy className="w-4 h-4 text-primary" />;
    default:
      return <Eye className="w-4 h-4" />;
  }
};

const getRecordColor = (type: string) => {
  switch (type) {
    case 'phase_change':
      return 'bg-primary/10 border-primary/30';
    case 'player_death':
      return 'bg-wolf-red/10 border-wolf-red/30';
    case 'player_saved':
      return 'bg-role-villager/10 border-role-villager/30';
    case 'vote_cast':
      return 'bg-accent/10 border-accent/30';
    case 'skill_used':
      return 'bg-primary/10 border-primary/30';
    case 'game_end':
      return 'bg-primary/10 border-primary/30';
    default:
      return 'bg-secondary/10 border-border';
  }
};

const getRecordBadge = (type: string) => {
  switch (type) {
    case 'phase_change':
      return <Badge variant="secondary">阶段</Badge>;
    case 'player_death':
      return <Badge variant="destructive">死亡</Badge>;
    case 'player_saved':
      return <Badge variant="default">存活</Badge>;
    case 'vote_cast':
      return <Badge variant="outline">投票</Badge>;
    case 'skill_used':
      return <Badge variant="secondary">技能</Badge>;
    case 'game_end':
      return <Badge variant="default">结束</Badge>;
    default:
      return <Badge variant="secondary">记录</Badge>;
  }
};

const SpectatorRecord = ({
  gameId,
  roomId,
  records,
  perspective,
  followTargetId,
  followRole,
  isSpectator,
  onJoinGame,
  joinGameDisabled,
}: SpectatorRecordProps) => {
  const [filter, setFilter] = useState<'all' | 'phase' | 'death' | 'vote' | 'skill'>('all');
  const [showDetails, setShowDetails] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SpectatorRecord | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [records]);

  const filteredRecords = records.filter(record => {
    if (filter === 'all') return true;
    if (filter === 'phase') return record.type === 'phase_change';
    if (filter === 'death') return record.type === 'player_death';
    if (filter === 'vote') return record.type === 'vote_cast';
    if (filter === 'skill') return record.type === 'skill_used';
    return true;
  });

  const getRecordText = (record: SpectatorRecord): string => {
    switch (record.type) {
      case 'phase_change': {
        const transition = record.data.transition as { from: string; to: string; round: number };
        return `第 ${transition?.round || '0'} ${transition?.from === 'night' ? '夜' : '天'} → ${transition?.to === 'night' ? '夜' : '天'}`;
      }
      case 'player_death':
        return `${record.data.playerName || '玩家'} ${record.data.cause === 'wolf_kill' ? '被狼人袭击' : record.data.cause === 'poison' ? '被毒死' : '被投票出局'}`;
      case 'player_saved':
        return `${record.data.playerName || '玩家'} 被救活`;
      case 'vote_cast':
        return `${record.data.voterName || '玩家'} 投票给 ${record.data.targetName || '未知'}`;
      case 'skill_used': {
        const action = record.data.action as { type: string; targetName?: string };
        const actionText = {
          'wolf_kill': '袭击',
          'seer_check': '查验',
          'witch_save': '使用解药',
          'witch_poison': '使用毒药',
          'guard_protect': '守护',
        }[action?.type] || action?.type || '使用技能';
        return `${record.data.actorName || '玩家'} ${actionText}${action?.targetName ? ` ${action.targetName}` : ''}`;
      }
      case 'game_end':
        return `游戏结束，${record.data.winner === 'good' ? '好人' : '狼人'}阵营获胜`;
      default:
        return '未知记录';
    }
  };

  const shouldShowRecord = (record: SpectatorRecord): boolean => {
    if (!isSpectator) return true;
    if (perspective === 'god_view') return true;
    
    // 跟随玩家视角：只看该玩家的行动与公开信息
    if (perspective === 'follow_player' && followTargetId) {
      if (record.type === 'vote_cast' && record.data.voterId === followTargetId) return true;
      if (record.type === 'skill_used' && record.data.actorId === followTargetId) return true;
      if (record.type === 'player_death') return true;
      if (record.type === 'player_saved') return true;
      if (record.type === 'phase_change') return true;
      if (record.type === 'game_end') return true;
      // 狼人技能/聊天不可见（除非跟随的就是狼）
      const actorCamp = record.data.actorCamp as string | undefined;
      if (actorCamp === 'werewolf' && record.data.actorId !== followTargetId) return false;
      return false;
    }
    
    // 跟随身份视角：只看该阵营的行动
    if (perspective === 'follow_role' && followRole) {
      const camp = followRole === 'werewolf' ? 'werewolf' : 'good';
      if (record.type === 'skill_used') {
        const actorCamp = record.data.actorCamp as string | undefined;
        if (camp === 'werewolf' && actorCamp === 'werewolf') return true;
        if (camp === 'good' && actorCamp !== 'werewolf') return true;
        return false;
      }
      if (record.type === 'player_death') return true;
      if (record.type === 'phase_change') return true;
      if (record.type === 'game_end') return true;
      return false;
    }
    
    return false;
  };

  const exportRecords = (format: 'json' | 'csv') => {
    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'json') {
      content = JSON.stringify(records, null, 2);
      filename = `game_records_${gameId}.json`;
      mimeType = 'application/json';
    } else if (format === 'csv') {
      const headers = ['时间', '类型', '内容'];
      const rows = records.map(r => [
        format(new Date(r.timestamp), 'HH:mm:ss'),
        r.type,
        getRecordText(r),
      ]);
      content = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
      filename = `game_records_${gameId}.csv`;
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          <h3 className="font-display text-lg font-bold">观战记录</h3>
          {isSpectator && (
            <Badge variant="outline" className="ml-2">
              {perspective === 'god_view' ? '上帝视角' : perspective === 'follow_player' ? '跟随玩家' : '跟随身份'}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => exportRecords('json')}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'gold' : 'night'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            全部
          </Button>
          <Button
            variant={filter === 'phase' ? 'gold' : 'night'}
            size="sm"
            onClick={() => setFilter('phase')}
          >
            阶段
          </Button>
          <Button
            variant={filter === 'death' ? 'gold' : 'night'}
            size="sm"
            onClick={() => setFilter('death')}
          >
            死亡
          </Button>
          <Button
            variant={filter === 'vote' ? 'gold' : 'night'}
            size="sm"
            onClick={() => setFilter('vote')}
          >
            投票
          </Button>
          <Button
            variant={filter === 'skill' ? 'gold' : 'night'}
            size="sm"
            onClick={() => setFilter('skill')}
          >
            技能
          </Button>
        </div>
        {onJoinGame != null && (
          <Button
            variant="gold"
            size="sm"
            onClick={onJoinGame}
            disabled={joinGameDisabled}
            className="ml-auto shrink-0"
          >
            上桌参与游戏
          </Button>
        )}
      </div>

      <ScrollArea className="h-[400px] border border-border/50 rounded-lg bg-card/50" ref={scrollRef}>
        <div className="p-4 space-y-2">
          {filteredRecords.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              暂无记录
            </p>
          ) : (
            filteredRecords.map((record, index) => {
              const show = shouldShowRecord(record);
              return (
                <div
                  key={record.id}
                  className={`p-3 rounded-lg border ${show ? getRecordColor(record.type) : 'bg-secondary/5 border-border/30 opacity-50'}`}
                  onClick={() => setSelectedRecord(show ? record : null)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getRecordIcon(record.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {getRecordBadge(record.type)}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(record.timestamp), 'HH:mm:ss')}
                          </span>
                        </div>
                        {showDetails && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                              第 {record.data.round || '-'} 轮
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-foreground">
                        {getRecordText(record)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold">记录详情</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedRecord(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">类型：</span>
                <Badge variant="outline">{selectedRecord.type}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">时间：</span>
                <span className="text-sm text-foreground">
                  {format(new Date(selectedRecord.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">内容：</span>
                <p className="text-sm text-foreground flex-1">
                  {getRecordText(selectedRecord)}
                </p>
              </div>
              {selectedRecord.data.round && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">轮次：</span>
                  <span className="text-sm text-foreground">
                    第 {selectedRecord.data.round} 轮
                  </span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setSelectedRecord(null)}>
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpectatorRecord;
