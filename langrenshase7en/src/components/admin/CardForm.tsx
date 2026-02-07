import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X, Save } from 'lucide-react';
import { CardWithAdmin, CreateCardParams, adminService, SkillWithAdmin } from '@/services/admin';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface CardFormProps {
  card?: CardWithAdmin;
  mode: 'create' | 'edit';
  onSave: (card: CardWithAdmin) => void;
  onCancel: () => void;
}

const CardForm = ({ card, mode, onSave, onCancel }: CardFormProps) => {
  const [formData, setFormData] = useState<CreateCardParams>({
    card_name: card?.card_name || '',
    card_alias: card?.card_alias || '',
    card_type: card?.card_type || 'role',
    camp: card?.camp || 'good',
    role_type: card?.role_type || '',
    skill_id: card?.skill_id || '',
    skill_description: card?.skill_description || '',
    skill_icon: card?.skill_icon || '',
    is_active: card?.is_active ?? 1,
    difficult: card?.difficult || 1,
    recommend: card?.recommend ? 1 : 0,
    desc: card?.desc || '',
    character_config: card?.character_config ?? {},
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const { data: skills } = useQuery({
    queryKey: ['admin-skills'],
    queryFn: () => adminService.getSkillsWithAdmin(),
  });

  const createCardMutation = useMutation({
    mutationFn: (params: CreateCardParams) => adminService.createCardWithAdmin(params, 'admin'),
    onSuccess: (data) => {
      toast.success('创建成功', {
        description: '卡牌已成功创建',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-cards'] });
      if (onSave && data) {
        onSave(data as CardWithAdmin);
      }
    },
    onError: (error) => {
      toast.error('创建失败', {
        description: error.message || '创建卡牌失败，请稍后重试',
      });
    },
  });

  const updateCardMutation = useMutation({
    mutationFn: (cardId: string, updates: Partial<CardWithAdmin>) => adminService.updateCardWithAdmin(cardId, updates, 'admin'),
    onSuccess: (data) => {
      toast.success('更新成功', {
        description: '卡牌已成功更新',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-cards'] });
      if (onSave && data) {
        onSave(data as CardWithAdmin);
      }
    },
    onError: (error) => {
      toast.error('更新失败', {
        description: error.message || '更新卡牌失败，请稍后重试',
      });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.card_name.trim()) {
      newErrors.card_name = '卡牌名称不能为空';
    } else if (formData.card_name.length < 2) {
      newErrors.card_name = '卡牌名称至少2个字符';
    } else if (formData.card_name.length > 100) {
      newErrors.card_name = '卡牌名称不能超过100个字符';
    } else if (!formData.card_type.trim()) {
      newErrors.card_type = '卡牌类型不能为空';
    } else if (!formData.camp.trim()) {
      newErrors.camp = '阵营不能为空';
    } else if (!formData.role_type.trim()) {
      newErrors.role_type = '角色类型不能为空';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (mode === 'create') {
      createCardMutation.mutate(formData);
    } else if (mode === 'edit' && card) {
      updateCardMutation.mutate({
        cardId: card.id,
        updates: formData,
      });
    }
  };

  const handleCancel = () => {
    setFormData({
      card_name: card?.card_name || '',
      card_alias: card?.card_alias || '',
      card_type: card?.card_type || 'role',
      camp: card?.camp || 'good',
      role_type: card?.role_type || '',
      skill_id: card?.skill_id || '',
      skill_description: card?.skill_description || '',
      skill_icon: card?.skill_icon || '',
      is_active: card?.is_active ?? 1,
      difficult: card?.difficult || 1,
      recommend: card?.recommend ? 1 : 0,
      desc: card?.desc || '',
      character_config: card?.character_config ?? {},
    });
    setErrors({});
    onCancel();
  };

  const illustration = (formData.character_config as { illustration?: string } | undefined)?.illustration ?? '';

  const commonIcons = ['🐺', '👨', '🔮', '🧪', '🏹', '🛡️', '👑', '💀', '⚔️', '🎭', '🌙', '☀️'];

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle>{mode === 'create' ? '创建卡牌' : '编辑卡牌'}</CardTitle>
        <CardDescription>
          {mode === 'create' ? '创建新的游戏卡牌' : '编辑现有的游戏卡牌'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="card_name">卡牌名称 *</Label>
              <Input
                id="card_name"
                placeholder="请输入卡牌名称"
                value={formData.card_name}
                onChange={e => setFormData({ ...formData, card_name: e.target.value })}
                className={errors.card_name ? 'border-destructive' : ''}
              />
              {errors.card_name && (
                <p className="text-sm text-destructive">{errors.card_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="card_alias">卡牌别名</Label>
              <Input
                id="card_alias"
                placeholder="请输入卡牌别名"
                value={formData.card_alias}
                onChange={e => setFormData({ ...formData, card_alias: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="card_type">卡牌类型 *</Label>
              <Select
                value={formData.card_type}
                onValueChange={value => setFormData({ ...formData, card_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="role">角色</SelectItem>
                  <SelectItem value="skill">技能</SelectItem>
                </SelectContent>
              </Select>
              {errors.card_type && (
                <p className="text-sm text-destructive">{errors.card_type}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role_type">角色类型 *</Label>
              <Input
                id="role_type"
                placeholder="请输入角色类型（如：werewolf, villager, seer）"
                value={formData.role_type}
                onChange={e => setFormData({ ...formData, role_type: e.target.value })}
                className={errors.role_type ? 'border-destructive' : ''}
              />
              {errors.role_type && (
                <p className="text-sm text-destructive">{errors.role_type}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="camp">阵营 *</Label>
              <Select
                value={formData.camp}
                onValueChange={value => setFormData({ ...formData, camp: value })}
              >
                <SelectTrigger>
                  {formData.camp === 'werewolf' && <SelectValue>狼人阵营</SelectValue>}
                  {formData.camp === 'good' && <SelectValue>好人阵营</SelectValue>}
                  {formData.camp === 'neutral' && <SelectValue>中立阵营</SelectValue>}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="werewolf">狼人阵营</SelectItem>
                  <SelectItem value="good">好人阵营</SelectItem>
                  <SelectItem value="neutral">中立阵营</SelectItem>
                </SelectContent>
              </Select>
              {errors.camp && (
                <p className="text-sm text-destructive">{errors.camp}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="skill_id">关联技能</Label>
              <Select
                value={formData.skill_id}
                onValueChange={value => setFormData({ ...formData, skill_id: value })}
              >
                <SelectTrigger>
                  {formData.skill_id ? (
                    <SelectValue>
                      {skills?.find(s => s.id === formData.skill_id)?.skill_name || '选择技能'}
                    </SelectValue>
                  ) : (
                    <SelectValue>选择技能</SelectValue>
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">无技能</SelectItem>
                  {skills?.map(skill => (
                    <SelectItem key={skill.id} value={skill.id}>
                      {skill.skill_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="skill_description">技能描述</Label>
            <Textarea
              id="skill_description"
              placeholder="请输入技能描述"
              value={formData.skill_description}
              onChange={e => setFormData({ ...formData, skill_description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skill_icon">技能图标</Label>
            <div className="flex gap-2 flex-wrap">
              {commonIcons.map(icon => (
                <Button
                  key={icon}
                  type="button"
                  variant={formData.skill_icon === icon ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData({ ...formData, skill_icon: icon })}
                >
                  {icon}
                </Button>
              ))}
            </div>
            <Input
              id="skill_icon"
              placeholder="或输入自定义图标"
              value={formData.skill_icon}
              onChange={e => setFormData({ ...formData, skill_icon: e.target.value })}
              className="mt-2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="illustration">身份牌插画</Label>
            <Input
              id="illustration"
              placeholder="例如：/card/狼人.png 或 https://.../wolf.png"
              value={illustration}
              onChange={e =>
                setFormData({
                  ...formData,
                  character_config: {
                    ...(formData.character_config as object || {}),
                    illustration: e.target.value,
                  },
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              游戏开局发身份时展示的卡牌插画。建议与本地 card 目录文件名对应，如 /card/狼人.png、/card/预言家.png；也可填完整图片 URL。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="difficult">难度</Label>
              <Select
                value={formData.difficult?.toString()}
                onValueChange={value => setFormData({ ...formData, difficult: parseInt(value) || 1 })}
              >
                <SelectTrigger>
                  {formData.difficult === 1 && <SelectValue>简单</SelectValue>}
                  {formData.difficult === 2 && <SelectValue>中等</SelectValue>}
                  {formData.difficult === 3 && <SelectValue>困难</SelectValue>}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">简单</SelectItem>
                  <SelectItem value="2">中等</SelectItem>
                  <SelectItem value="3">困难</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="is_active">状态</Label>
              <Select
                value={formData.is_active?.toString()}
                onValueChange={value => setFormData({ ...formData, is_active: parseInt(value) || 1 })}
              >
                <SelectTrigger>
                  {formData.is_active === 0 && <SelectValue>禁用</SelectValue>}
                  {formData.is_active === 1 && <SelectValue>启用</SelectValue>}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">禁用</SelectItem>
                  <SelectItem value="1">启用</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recommend">推荐</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="recommend"
                  checked={formData.recommend === 1}
                  onCheckedChange={checked => setFormData({ ...formData, recommend: checked ? 1 : 0 })}
                />
                <span className="text-sm text-muted-foreground">设置为推荐卡牌</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">描述</Label>
            <Textarea
              id="desc"
              placeholder="请输入卡牌描述"
              value={formData.desc}
              onChange={e => setFormData({ ...formData, desc: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
            >
              <X className="w-4 h-4 mr-2" />
              取消
            </Button>
            <Button
              type="submit"
              disabled={createCardMutation.isPending || updateCardMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {mode === 'create' ? '创建' : '保存'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CardForm;
