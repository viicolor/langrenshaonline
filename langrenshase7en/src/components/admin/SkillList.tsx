import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, Search, Filter } from 'lucide-react';
import { SkillWithAdmin, adminService } from '@/services/admin';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface SkillListProps {
  onCreateSkill: () => void;
  onEditSkill: (skill: SkillWithAdmin) => void;
  onDeleteSkill: (skillId: string) => void;
}

const SkillList = ({ onCreateSkill, onEditSkill, onDeleteSkill }: SkillListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'passive' | 'trigger'>('all');
  const [filterPhase, setFilterPhase] = useState<'all' | 'night' | 'day' | 'death' | 'vote'>('all');

  const queryClient = useQueryClient();

  const { data: skills, isLoading } = useQuery({
    queryKey: ['admin-skills'],
    queryFn: () => adminService.getSkillsWithAdmin(),
  });

  const filteredSkills = skills?.filter(skill => {
    const matchesSearch = skill.skill_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       skill.skill_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || skill.skill_type === filterType;
    const matchesPhase = filterPhase === 'all' || skill.trigger_phase === filterPhase;
    return matchesSearch && matchesType && matchesPhase;
  }) || [];

  const deleteSkillMutation = useMutation({
    mutationFn: (skillId: string) => adminService.deleteSkillWithAdmin(skillId),
    onSuccess: () => {
      toast.success('删除成功', {
        description: '技能已成功删除',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-skills'] });
    },
    onError: (error) => {
      toast.error('删除失败', {
        description: error.message || '删除技能失败，请稍后重试',
      });
    },
  });

  const handleDelete = (skillId: string) => {
    if (confirm('确定要删除这个技能吗？')) {
      deleteSkillMutation.mutate(skillId);
    }
  };

  const getTypeBadge = (type: string) => {
    if (type === 'active') {
      return <Badge variant="default">主动</Badge>;
    }
    if (type === 'passive') {
      return <Badge variant="secondary">被动</Badge>;
    }
    if (type === 'trigger') {
      return <Badge variant="outline">触发</Badge>;
    }
    return <Badge variant="outline">{type}</Badge>;
  };

  const getPhaseBadge = (phase?: string) => {
    if (!phase) return null;
    if (phase === 'night') {
      return <Badge variant="default" className="bg-purple-500">夜晚</Badge>;
    }
    if (phase === 'day') {
      return <Badge variant="default" className="bg-yellow-500">白天</Badge>;
    }
    if (phase === 'death') {
      return <Badge variant="default" className="bg-red-500">死亡</Badge>;
    }
    if (phase === 'vote') {
      return <Badge variant="default" className="bg-blue-500">投票</Badge>;
    }
    return <Badge variant="outline">{phase}</Badge>;
  };

  const getEffectDescription = (skill: SkillWithAdmin) => {
    const effectParams = skill.effect_params as any;
    
    if (skill.skill_code === 'werewolf_kill') {
      return `目标：${effectParams?.target_type === 'any_except_self' ? '任意玩家（除自己）' : '除自己外任意玩家'}`;
    }
    if (skill.skill_code === 'seer_check') {
      return `查验：显示${effectParams?.reveal_to === 'self' ? '自己' : '所有人'}的阵营`;
    }
    if (skill.skill_code === 'witch_save') {
      return `救活：${effectParams?.save_type === 'prevent_death' ? '防止死亡' : '复活'}一名玩家`;
    }
    if (skill.skill_code === 'witch_poison') {
      return `毒杀：使用毒药毒死一名玩家`;
    }
    if (skill.skill_code === 'guard_protect') {
      return `保护：${effectParams?.can_protect_same ? '可以连续守护同一人' : '不能连续守护同一人'}`;
    }
    if (skill.skill_code === 'hunter_shoot') {
      return `开枪：死亡时可以带走一名玩家`;
    }
    
    return skill.effect_description || '无特殊效果';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>技能列表</CardTitle>
            <Button onClick={onCreateSkill} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              创建技能
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索技能..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
              >
                全部
              </Button>
              <Button
                variant={filterType === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('active')}
              >
                主动
              </Button>
              <Button
                variant={filterType === 'passive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('passive')}
              >
                被动
              </Button>
              <Button
                variant={filterType === 'trigger' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('trigger')}
              >
                触发
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterPhase === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterPhase('all')}
              >
                全部
              </Button>
              <Button
                variant={filterPhase === 'night' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterPhase('night')}
              >
                夜晚
              </Button>
              <Button
                variant={filterPhase === 'day' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterPhase('day')}
              >
                白天
              </Button>
              <Button
                variant={filterPhase === 'death' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterPhase('death')}
              >
                死亡
              </Button>
              <Button
                variant={filterPhase === 'vote' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterPhase('vote')}
              >
                投票
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-transparent"></div>
              <p className="mt-4 text-muted-foreground">加载中...</p>
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">暂无技能</p>
              <Button onClick={onCreateSkill} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                创建第一个技能
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSkills.map(skill => (
                <Card key={skill.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{skill.skill_name}</CardTitle>
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          {getTypeBadge(skill.skill_type)}
                          {getPhaseBadge(skill.trigger_phase)}
                          {skill.usage_limit && skill.usage_limit > 0 && (
                            <Badge variant="outline" className="ml-2">
                              限{skill.usage_limit}次
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onEditSkill(skill)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(skill.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">技能代码</p>
                        <p className="font-semibold">{skill.skill_code}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">技能类型</p>
                        <p className="font-semibold">{getTypeBadge(skill.skill_type)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">触发阶段</p>
                        <p className="font-semibold">{getPhaseBadge(skill.trigger_phase)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">效果描述</p>
                        <p className="text-sm">{getEffectDescription(skill)}</p>
                      </div>
                      {skill.effect_description && (
                        <div>
                          <p className="text-sm text-muted-foreground">详细描述</p>
                          <p className="text-sm">{skill.effect_description}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground">冷却</p>
                        <p className="font-semibold">{skill.cooldown || 0} 回合</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">使用限制</p>
                        <p className="font-semibold">{skill.usage_limit || 0} 次</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SkillList;
