import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Skull, Shield, Crosshair, FlaskConical, UserX } from 'lucide-react';
import { RoleType, ROLE_INFO } from '@/types/game';

export type TargetOption = { id: string; name: string; avatar: string; seatNumber?: number };

interface RoleSkillProps {
  role: RoleType;
  onUseSkill?: (targetId?: string, skillCode?: string) => void;
  availableTargets?: TargetOption[];
  canUseSkill: boolean;
  skillUsed?: boolean;
  nightActions?: Array<{ type: string; targetName?: string }>;
  /** 预言家本回合查验结果（仅自己可见），来自 game_actions.data.result */
  seerCheckResult?: 'good' | 'werewolf';
  /** 狼人：队友列表（不包含自己），用于显示“狼队友”标识 */
  werewolfTeammates?: Array<{ id: string; name: string; avatar?: string; seatNumber?: number }>;
  /** 狼人：各目标被几名狼人选择（targetId -> 人数） */
  werewolfKillCountByTargetId?: Record<string, number>;
  /** 女巫：今晚被狼人刀的玩家座位号（仅当解药未用时展示） */
  witchDeathTargetSeat?: number | null;
  /** 女巫：今晚被刀玩家 id，用于解药目标 */
  witchSaveTargetId?: string | null;
  /** 女巫：本局是否已用过解药/毒药（全场唯一） */
  witchUsedSave?: boolean;
  witchUsedPoison?: boolean;
  /** 技能提交中，用于即时反馈 */
  skillSubmitting?: boolean;
}

const RoleSkill = ({
  role,
  onUseSkill,
  availableTargets = [],
  canUseSkill,
  skillUsed = false,
  nightActions = [],
  seerCheckResult,
  werewolfTeammates = [],
  werewolfKillCountByTargetId = {},
  witchDeathTargetSeat,
  witchSaveTargetId,
  witchUsedSave = false,
  witchUsedPoison = false,
  skillSubmitting = false,
}: RoleSkillProps) => {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  const seatLabel = (t: TargetOption) => (t.seatNumber != null ? `${t.seatNumber}号玩家` : t.name);

  const handleUseSkill = (overrideTargetId?: string, overrideSkillCode?: string) => {
    if (!canUseSkill || skillUsed || skillSubmitting) return;
    const targetId = overrideTargetId ?? selectedTarget ?? undefined;
    onUseSkill?.(targetId, overrideSkillCode);
  };

  const getSkillDescription = () => {
    switch (role) {
      case 'werewolf':
        return '每晚可以袭击一名玩家';
      case 'seer':
        return '每晚可以查验一名玩家的身份';
      case 'witch':
        return '拥有一瓶解药和一瓶毒药，每晚只能使用其中一瓶';
      case 'hunter':
        return '死亡时可以开枪带走一名玩家';
      case 'guard':
        return '每晚可以守护一名玩家免受狼人袭击';
      case 'idiot':
        return '被投票出局时可以翻牌免死，但失去投票权';
      default:
        return '';
    }
  };

  const getNightActionText = () => {
    if (nightActions.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">昨晚的行动</h4>
        {nightActions.map((action, index) => {
          let icon = null;
          let text = '';

          switch (action.type) {
            case 'seer_check':
              icon = <Eye className="w-4 h-4 text-primary" />;
              text = `查验了 ${action.targetName}`;
              break;
            case 'witch_save':
              icon = <FlaskConical className="w-4 h-4 text-role-villager" />;
              text = `使用解药救了 ${action.targetName}`;
              break;
            case 'witch_poison':
              icon = <Skull className="w-4 h-4 text-wolf-red" />;
              text = `使用毒药毒了 ${action.targetName}`;
              break;
            case 'guard_protect':
              icon = <Shield className="w-4 h-4 text-primary" />;
              text = `守护了 ${action.targetName}`;
              break;
            case 'wolf_kill':
              icon = <Crosshair className="w-4 h-4 text-wolf-red" />;
              text = `袭击了 ${action.targetName}`;
              break;
            case 'hunter_shoot':
              icon = <UserX className="w-4 h-4 text-accent" />;
              text = `开枪带走了 ${action.targetName}`;
              break;
          }

          return (
            <div key={index} className="flex items-center gap-2 text-sm">
              {icon}
              <span className="text-foreground/80">{text}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Badge variant={ROLE_INFO[role].variant} className="text-sm">
          {ROLE_INFO[role].name}
        </Badge>
        <p className="text-sm text-muted-foreground flex-1">
          {getSkillDescription()}
        </p>
      </div>

      {nightActions.length > 0 && getNightActionText()}

      {role === 'seer' && canUseSkill && !skillUsed && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">选择要查验的玩家</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availableTargets.map((target) => (
              <Button
                key={target.id}
                variant={selectedTarget === target.id ? 'gold' : 'night'}
                onClick={() => setSelectedTarget(target.id)}
                disabled={!canUseSkill || skillUsed || skillSubmitting}
                className="h-auto py-3 flex-col gap-2"
              >
                <img
                  src={target.avatar}
                  alt={seatLabel(target)}
                  className="w-10 h-10 rounded-full"
                />
                <span className="text-sm">{seatLabel(target)}</span>
              </Button>
            ))}
          </div>
          <Button
            variant="gold"
            onClick={() => handleUseSkill()}
            disabled={!selectedTarget || !canUseSkill || skillUsed || skillSubmitting}
            className="w-full"
          >
            {skillSubmitting ? '提交中...' : '查验'}
          </Button>
        </div>
      )}

      {role === 'witch' && canUseSkill && !skillUsed && (
        <div className="space-y-3">
          {witchDeathTargetSeat != null && !witchUsedSave && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-400">今晚被狼人刀的玩家是：{witchDeathTargetSeat}号玩家</p>
              <p className="text-xs text-muted-foreground mt-1">可使用解药救该玩家，或使用毒药毒一名玩家（每种药全场仅一次）</p>
            </div>
          )}
          {witchUsedSave && !witchUsedPoison && (
            <p className="text-sm text-muted-foreground">解药已使用，可选择使用毒药毒一名玩家（毒药全场仅一次）</p>
          )}
          {!witchUsedSave && witchUsedPoison && (
            <p className="text-sm text-muted-foreground">毒药已使用，可选择使用解药救今晚被刀的玩家（解药全场仅一次）</p>
          )}
          {witchUsedSave && witchUsedPoison && (
            <p className="text-sm text-muted-foreground">解药与毒药均已使用，本环节无操作。</p>
          )}
          <div className="flex flex-col gap-2">
            {!witchUsedSave && witchSaveTargetId != null && witchSaveTargetId !== '' && (
              <Button
                variant="gold"
                onClick={() => handleUseSkill(witchSaveTargetId, 'witch_save')}
                disabled={!canUseSkill || skillUsed || skillSubmitting}
                className="w-full"
              >
                <FlaskConical className="w-4 h-4 mr-2" />
                {skillSubmitting ? '提交中...' : `使用解药救${witchDeathTargetSeat != null ? witchDeathTargetSeat + '号' : ''}玩家`}
              </Button>
            )}
            {!witchUsedPoison && (
              <>
                <p className="text-sm text-muted-foreground">选择要对谁使用毒药</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableTargets.map((target) => (
                    <Button
                      key={target.id}
                      variant={selectedTarget === target.id ? 'blood' : 'night'}
                      onClick={() => setSelectedTarget(target.id)}
                      disabled={!canUseSkill || skillUsed || skillSubmitting}
                      className="h-auto py-3 flex-col gap-2"
                    >
                      <img src={target.avatar} alt={seatLabel(target)} className="w-10 h-10 rounded-full" />
                      <span className="text-sm">{seatLabel(target)}</span>
                    </Button>
                  ))}
                </div>
                <Button
                  variant="blood"
                  onClick={() => handleUseSkill(undefined, 'witch_poison')}
                  disabled={!selectedTarget || !canUseSkill || skillUsed || skillSubmitting}
                  className="w-full"
                >
                  <Skull className="w-4 h-4 mr-2" />
                  {skillSubmitting ? '提交中...' : '使用毒药'}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {role === 'guard' && canUseSkill && !skillUsed && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">选择要守护的玩家</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availableTargets.map((target) => (
              <Button
                key={target.id}
                variant={selectedTarget === target.id ? 'gold' : 'night'}
                onClick={() => setSelectedTarget(target.id)}
                disabled={!canUseSkill || skillUsed || skillSubmitting}
                className="h-auto py-3 flex-col gap-2"
              >
                <img src={target.avatar} alt={seatLabel(target)} className="w-10 h-10 rounded-full" />
                <span className="text-sm">{seatLabel(target)}</span>
              </Button>
            ))}
          </div>
          <Button
            variant="gold"
            onClick={() => handleUseSkill()}
            disabled={!selectedTarget || !canUseSkill || skillUsed || skillSubmitting}
            className="w-full"
          >
            {skillSubmitting ? '提交中...' : '守护'}
          </Button>
        </div>
      )}

      {role === 'werewolf' && canUseSkill && !skillUsed && (
        <div className="space-y-3">
          {werewolfTeammates.length > 0 && (
            <div className="rounded-lg border border-wolf-red/40 bg-wolf-red/10 p-2">
              <p className="text-xs font-medium text-wolf-red mb-2">狼队友（共 {werewolfTeammates.length + 1} 狼）</p>
              <div className="flex flex-wrap gap-2">
                {werewolfTeammates.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-wolf-red/20 border border-wolf-red/30"
                  >
                    {t.avatar && <img src={t.avatar} alt="" className="w-6 h-6 rounded-full" />}
                    <span className="text-sm font-medium text-foreground">{t.seatNumber != null ? `${t.seatNumber}号玩家` : t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-sm text-muted-foreground">选择要袭击的玩家（与队友统一后生效）</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availableTargets.map((target) => {
              const count = werewolfKillCountByTargetId[target.id] ?? 0;
              return (
                <Button
                  key={target.id}
                  variant={selectedTarget === target.id ? 'gold' : 'night'}
                  onClick={() => setSelectedTarget(target.id)}
                  disabled={!canUseSkill || skillUsed || skillSubmitting}
                  className="h-auto py-3 flex-col gap-2"
                >
                  <img src={target.avatar} alt={seatLabel(target)} className="w-10 h-10 rounded-full" />
                  <span className="text-sm">{seatLabel(target)}</span>
                  {count > 0 && (
                    <span className="text-xs text-wolf-red font-medium">{count} 名狼人选择</span>
                  )}
                </Button>
              );
            })}
          </div>
          <Button
            variant="gold"
            onClick={() => handleUseSkill()}
            disabled={!selectedTarget || !canUseSkill || skillUsed || skillSubmitting}
            className="w-full"
          >
            {skillSubmitting ? '提交中...' : '袭击'}
          </Button>
        </div>
      )}

      {role === 'hunter' && canUseSkill && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">选择要开枪带走的玩家</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availableTargets.map((target) => (
              <Button
                key={target.id}
                variant={selectedTarget === target.id ? 'gold' : 'night'}
                onClick={() => setSelectedTarget(target.id)}
                disabled={!canUseSkill || skillSubmitting}
                className="h-auto py-3 flex-col gap-2"
              >
                <img src={target.avatar} alt={seatLabel(target)} className="w-10 h-10 rounded-full" />
                <span className="text-sm">{seatLabel(target)}</span>
              </Button>
            ))}
          </div>
          <Button
            variant="gold"
            onClick={() => handleUseSkill()}
            disabled={!selectedTarget || !canUseSkill || skillSubmitting}
            className="w-full"
          >
            {skillSubmitting ? '提交中...' : '开枪'}
          </Button>
        </div>
      )}

      {skillUsed && role === 'seer' && seerCheckResult && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center">
          <Eye className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">
            查验结果：{seerCheckResult === 'werewolf' ? '狼人' : '好人'}
          </p>
        </div>
      )}

      {skillUsed && !(role === 'seer' && seerCheckResult) && (
        <div className="bg-secondary/50 border border-border rounded-lg p-4 text-center">
          <Shield className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">技能已使用</p>
        </div>
      )}

      {!canUseSkill && role !== 'villager' && role !== 'werewolf' && (
        <div className="bg-secondary/50 border border-border rounded-lg p-4 text-center">
          <Shield className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">现在不能使用技能</p>
        </div>
      )}
    </div>
  );
};

export default RoleSkill;
