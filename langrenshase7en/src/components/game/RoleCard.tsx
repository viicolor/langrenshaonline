import { RoleType, ROLE_INFO } from '@/types/game';
import { Button } from '@/components/ui/button';
import { X, Eye, Skull, Heart, Shield, Target, Brain, Users } from 'lucide-react';

interface RoleCardProps {
  role: RoleType;
  onClose: () => void;
}

const roleIcons: Record<RoleType, React.ReactNode> = {
  werewolf: <Skull className="w-12 h-12" />,
  villager: <Users className="w-12 h-12" />,
  seer: <Eye className="w-12 h-12" />,
  witch: <Heart className="w-12 h-12" />,
  hunter: <Target className="w-12 h-12" />,
  guard: <Shield className="w-12 h-12" />,
  idiot: <Brain className="w-12 h-12" />,
  unknown: <Users className="w-12 h-12" />,
};

const roleDescriptions: Record<RoleType, string> = {
  werewolf: '每晚可与同伴一起杀害一名玩家。隐藏身份，消灭所有好人阵营获胜。',
  villager: '没有特殊技能，但可以通过投票和推理帮助找出狼人。',
  seer: '每晚可以查验一名玩家的身份，是好人阵营的核心角色。',
  witch: '拥有一瓶毒药和一瓶解药，整局游戏各可使用一次。',
  hunter: '被狼人杀死或被投票出局时，可以开枪带走一名玩家。',
  guard: '每晚可以守护一名玩家，被守护的玩家当晚免疫狼人袭击。',
  idiot: '被投票出局后可以翻牌亮明身份，之后失去投票权但不会死亡。',
  unknown: '身份未知',
};

const RoleCard = ({ role, onClose }: RoleCardProps) => {
  const roleInfo = ROLE_INFO[role];
  const isWolf = roleInfo.team === 'wolf';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-background/95 backdrop-blur-md"
        onClick={onClose}
      />

      {/* 卡片 */}
      <div className={`relative w-full max-w-sm animate-scale-in`}>
        {/* 光效背景 */}
        <div 
          className="absolute -inset-4 rounded-3xl blur-2xl opacity-40"
          style={{ backgroundColor: roleInfo.color }}
        />

        {/* 卡片主体 */}
        <div className="relative bg-card border border-border/50 rounded-2xl overflow-hidden shadow-2xl">
          {/* 关闭按钮 */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>

          {/* 顶部装饰 */}
          <div 
            className="h-32 flex items-center justify-center relative"
            style={{ backgroundColor: `${roleInfo.color}20` }}
          >
            <div 
              className="absolute inset-0 opacity-10"
              style={{ 
                backgroundImage: `radial-gradient(circle at 50% 100%, ${roleInfo.color}, transparent 70%)` 
              }}
            />
            <div style={{ color: roleInfo.color }}>
              {roleIcons[role]}
            </div>
          </div>

          {/* 内容区域 */}
          <div className="p-6 text-center">
            {/* 角色名称 */}
            <div className="mb-2">
              <span 
                className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                  isWolf 
                    ? 'bg-wolf-red/20 text-wolf-red' 
                    : roleInfo.team === 'god' 
                      ? 'bg-role-seer/20 text-role-seer'
                      : 'bg-role-villager/20 text-role-villager'
                }`}
              >
                {isWolf ? '狼人阵营' : roleInfo.team === 'god' ? '神职阵营' : '平民阵营'}
              </span>
            </div>

            <h2 
              className="font-display text-3xl font-bold mb-4"
              style={{ color: roleInfo.color }}
            >
              {roleInfo.name}
            </h2>

            {/* 角色描述 */}
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              {roleDescriptions[role]}
            </p>

            {/* 确认按钮 */}
            <Button
              variant={isWolf ? 'blood' : 'gold'}
              size="lg"
              className="w-full"
              onClick={onClose}
            >
              我知道了
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleCard;
