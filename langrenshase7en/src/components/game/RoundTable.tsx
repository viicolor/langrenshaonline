import { Player, GameState } from '@/types/game';
import { Crown, Skull, HelpCircle, Check, Shield } from 'lucide-react';

export interface RoundTableProps {
  players: Player[];
  currentPlayerId?: string;
  gamePhase: GameState['phase'];
  onSeatClick?: (player: Player | null, seatNumber: number) => void;
  selectedSeat?: number;
  canInteract?: boolean;
  /** 座位总数，默认 12；与房间 max_players 一致时只显示对应数量座位 */
  maxSeats?: number;
  /** 警长座位号（1-based），有则在该座位头像上显示警徽 ICON */
  sheriffSeat?: number | null;
}

const RoundTable = ({
  players,
  currentPlayerId,
  gamePhase,
  onSeatClick,
  selectedSeat,
  canInteract = true,
  maxSeats = 12,
  sheriffSeat = null,
}: RoundTableProps) => {
  const total = Math.max(6, Math.min(20, maxSeats));
  const getSeatPosition = (index: number, seatTotal: number = total) => {
    const angle = (index * 360 / seatTotal) - 90;
    const radius = 42;
    const x = 50 + radius * Math.cos(angle * Math.PI / 180);
    const y = 50 + radius * Math.sin(angle * Math.PI / 180);
    return { x, y, angle };
  };

  const handleSeatClick = (index: number) => {
    if (!canInteract) return;
    const player = players.find(p => p.seatNumber === index + 1);
    onSeatClick?.(player || null, index + 1);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto aspect-square">
      <div className="absolute inset-[15%] rounded-full bg-gradient-to-br from-secondary/80 to-secondary/40 border-4 border-border/50 shadow-2xl shadow-black/30">
        <div className="absolute inset-0 rounded-full opacity-30">
          <div className="absolute inset-4 rounded-full border border-primary/20" />
          <div className="absolute inset-8 rounded-full border border-primary/10" />
          <div className="absolute inset-12 rounded-full border border-primary/5" />
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-night/50 border border-border/50 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-display text-primary font-bold">{players.filter(p => p.seatNumber >= 1 && p.seatNumber <= total).length}</div>
              <div className="text-[10px] text-muted-foreground">/ {total}</div>
            </div>
          </div>
        </div>
      </div>

      {[...Array(total)].map((_, index) => {
        const position = getSeatPosition(index);
        const player = players.find(p => p.seatNumber === index + 1);
        const isCurrentPlayer = player?.id === currentPlayerId;
        const isEmpty = !player;
        const isAlive = player?.isAlive !== false;
        const isSelected = selectedSeat === index + 1;
        const isSheriff = sheriffSeat != null && index + 1 === sheriffSeat;

        return (
          <div
            key={index}
            role="button"
            tabIndex={canInteract ? 0 : -1}
            className={`absolute z-20 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 select-none ${canInteract ? 'cursor-pointer hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary' : 'cursor-default'
              }`}
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
            }}
            onClick={() => handleSeatClick(index)}
            onKeyDown={e => canInteract && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), handleSeatClick(index))}
          >
            <div className={`relative transition-all duration-300 ${isEmpty ? 'opacity-60' : isCurrentPlayer ? 'scale-110' : ''
              } ${isSelected ? 'scale-110' : ''}`}>
              <div className="absolute -top-2 -right-2 min-w-[26px] h-7 px-1.5 rounded-md bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center font-mono z-10 shadow-md">
                {index + 1}
              </div>

              <div className={`relative w-14 h-14 md:w-16 md:h-16 rounded-full border-2 transition-all duration-300 ${isEmpty
                  ? 'border-dashed border-muted-foreground/40 bg-muted/30 hover:border-primary/50'
                  : isCurrentPlayer
                    ? 'border-primary glow-gold bg-card'
                    : isSelected
                      ? 'border-primary bg-card glow-gold'
                      : player?.isReady
                        ? 'border-role-villager bg-card'
                        : 'border-border bg-card'
                } ${!isAlive && gamePhase !== 'waiting' ? 'grayscale opacity-50' : ''}`}>
                {player ? (
                  <>
                    <img
                      src={player.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(player.name)}`}
                      alt={player.name}
                      className="w-full h-full rounded-full object-cover"
                    />

                    {!isAlive && gamePhase !== 'waiting' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full">
                        <Skull className="w-6 h-6 text-wolf-red" />
                      </div>
                    )}

                    {player.isHost && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-primary rounded-full p-0.5">
                        <Crown className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                    {isSheriff && (
                      <div className="absolute -top-2 right-0 bg-amber-500 rounded-full p-1 shadow-md border-2 border-amber-600 ring-2 ring-background" title="警长">
                        <Shield className="w-4 h-4 text-amber-950" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-0.5">
                    <HelpCircle className="w-6 h-6 text-muted-foreground/40" />
                    {canInteract && (
                      <span className="text-[9px] text-muted-foreground">点击入座</span>
                    )}
                  </div>
                )}
              </div>

              {player && (
                <div className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 min-w-0 ${gamePhase === 'waiting' && player.isReady ? '-bottom-[2.5rem]' : '-bottom-[22px]'}`}>
                  <div className={`whitespace-nowrap text-xs font-medium max-w-[80px] truncate text-center ${isCurrentPlayer ? 'text-primary' : 'text-muted-foreground'
                    }`} title={player.name}>
                    {isCurrentPlayer ? '我' : player.name}
                  </div>
                  {gamePhase === 'waiting' && player.isReady && (
                    <div className="flex flex-row items-center gap-1 whitespace-nowrap px-2 py-0.5 rounded-md bg-primary text-primary-foreground shadow-sm">
                      <Check className="w-3 h-3 shrink-0" strokeWidth={3} />
                      <span className="text-[10px] font-medium">已准备</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div className="absolute inset-0 rounded-full border border-primary/10 animate-pulse-slow" />
    </div>
  );
};

export default RoundTable;
