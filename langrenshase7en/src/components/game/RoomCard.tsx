import { Room } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Users, Crown, Clock, Play } from 'lucide-react';

interface RoomCardProps {
  room: Room;
  onJoin: () => void;
}

const RoomCard = ({ room, onJoin }: RoomCardProps) => {
  const isFull = room.playerCount >= room.maxPlayers;
  const isPlaying = room.status === 'playing';
  const progress = (room.playerCount / room.maxPlayers) * 100;

  return (
    <div className="group relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      {/* 状态指示器 */}
      <div className="absolute top-4 right-4">
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
          isPlaying 
            ? 'bg-wolf-red/20 text-wolf-red' 
            : isFull 
              ? 'bg-primary/20 text-primary'
              : 'bg-role-villager/20 text-role-villager'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${
            isPlaying ? 'bg-wolf-red animate-pulse' : isFull ? 'bg-primary' : 'bg-role-villager animate-pulse'
          }`} />
          {isPlaying ? '游戏中' : isFull ? '已满员' : '等待中'}
        </div>
      </div>

      {/* 房间名称 */}
      <h3 className="font-display text-lg font-semibold text-foreground mb-3 pr-20">
        {room.name}
      </h3>

      {/* 房主与板子 */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Crown className="w-4 h-4 text-primary" />
        <span>{room.host}</span>
      </div>
      {room.boardName && (
        <div className="text-xs text-muted-foreground mb-4">
          板子：{room.boardName}
        </div>
      )}
      {!room.boardName && <div className="mb-4" />}

      {/* 玩家进度 */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>玩家</span>
          </div>
          <span className="font-mono">
            <span className={room.playerCount >= 10 ? 'text-primary' : 'text-foreground'}>
              {room.playerCount}
            </span>
            <span className="text-muted-foreground">/{room.maxPlayers}</span>
          </span>
        </div>
        
        {/* 进度条 */}
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              isFull ? 'bg-gradient-to-r from-primary to-fire' : 'bg-role-villager'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 操作按钮 */}
      <Button
        variant={isPlaying ? 'night' : isFull ? 'gold' : 'outline'}
        size="sm"
        className="w-full"
        onClick={onJoin}
        disabled={isPlaying}
      >
        {isPlaying ? (
          <>
            <Clock className="w-4 h-4" />
            进行中
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            {isFull ? '观战' : '加入房间'}
          </>
        )}
      </Button>

      {/* 悬停光效 */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 rounded-xl border border-primary/20" />
      </div>
    </div>
  );
};

export default RoomCard;
