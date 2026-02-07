import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Eye, User, Shield, Crown } from 'lucide-react';
import { RoleType } from '@/types/game';
import { ROLE_INFO } from '@/types/game';

export type PerspectiveType = 'follow_player' | 'follow_role' | 'god_view';

export interface Perspective {
  type: PerspectiveType;
  targetId?: string;
  targetRole?: RoleType;
}

interface PerspectiveSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (perspective: Perspective) => void;
  players: Array<{ id: string; name: string; role?: RoleType }>;
}

const PerspectiveSelector = ({ isOpen, onClose, onSelect, players }: PerspectiveSelectorProps) => {
  const [selectedType, setSelectedType] = useState<PerspectiveType>('god_view');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<RoleType>('villager');

  const handleSelect = () => {
    const perspective: Perspective = {
      type: selectedType,
    };

    if (selectedType === 'follow_player' && selectedTargetId) {
      perspective.targetId = selectedTargetId;
    } else if (selectedType === 'follow_role') {
      perspective.targetRole = selectedRole;
    }

    onSelect(perspective);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            选择观战视角
          </DialogTitle>
          <DialogDescription>
            选择一种观战模式，一旦选择后将无法切换
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-4 border border-border/50 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
              <input
                type="radio"
                name="perspective"
                value="god_view"
                checked={selectedType === 'god_view'}
                onChange={(e) => setSelectedType(e.target.value as PerspectiveType)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-medium mb-1">
                  <Crown className="w-4 h-4 text-primary" />
                  上帝视角
                </div>
                <p className="text-sm text-muted-foreground">
                  查看所有玩家的发言、投票和技能使用信息，了解完整的游戏进程
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border border-border/50 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
              <input
                type="radio"
                name="perspective"
                value="follow_player"
                checked={selectedType === 'follow_player'}
                onChange={(e) => setSelectedType(e.target.value as PerspectiveType)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-medium mb-1">
                  <User className="w-4 h-4 text-primary" />
                  跟随玩家视角
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  只能看到指定玩家的发言和系统消息，体验该玩家的游戏过程
                </p>
                {selectedType === 'follow_player' && (
                  <select
                    value={selectedTargetId}
                    onChange={(e) => setSelectedTargetId(e.target.value)}
                    className="w-full mt-2 px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">选择要跟随的玩家</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name} {player.role ? `(${ROLE_INFO[player.role].name})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border border-border/50 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
              <input
                type="radio"
                name="perspective"
                value="follow_role"
                checked={selectedType === 'follow_role'}
                onChange={(e) => setSelectedType(e.target.value as PerspectiveType)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-medium mb-1">
                  <Shield className="w-4 h-4 text-primary" />
                  跟随身份视角
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  只能看到该身份玩家的发言和系统消息，了解该阵营的策略
                </p>
                {selectedType === 'follow_role' && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {Object.entries(ROLE_INFO).filter(([key]) => key !== 'unknown').map(([key, info]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedRole(key as RoleType)}
                        className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                          selectedRole === key
                            ? 'border-primary bg-primary/20 text-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {info.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="gold"
            onClick={handleSelect}
            disabled={
              (selectedType === 'follow_player' && !selectedTargetId) ||
              (selectedType === 'follow_role' && !selectedRole)
            }
          >
            确认选择
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PerspectiveSelector;
