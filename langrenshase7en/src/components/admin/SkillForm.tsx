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
import { SkillWithAdmin, CreateSkillParams, adminService } from '@/services/admin';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface SkillFormProps {
  skill?: SkillWithAdmin;
  mode: 'create' | 'edit';
  onSave: (skill: SkillWithAdmin) => void;
  onCancel: () => void;
}

const SkillForm = ({ skill, mode, onSave, onCancel }: SkillFormProps) => {
  const [formData, setFormData] = useState<CreateSkillParams>({
    skill_name: skill?.skill_name || '',
    skill_code: skill?.skill_code || '',
    skill_type: skill?.skill_type || 'active',
    trigger_phase: skill?.trigger_phase || '',
    trigger_conditions: skill?.trigger_conditions || null,
    effect_params: skill?.effect_params || null,
    effect_description: skill?.effect_description || '',
    cooldown: skill?.cooldown || 0,
    usage_limit: skill?.usage_limit || 0,
    is_active: skill?.is_active ?? 1,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const createSkillMutation = useMutation({
    mutationFn: (params: CreateSkillParams) => adminService.createSkillWithAdmin(params, 'admin'),
    onSuccess: (data) => {
      toast.success('创建成功', {
        description: '技能已成功创建',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-skills'] });
      if (onSave && data) {
        onSave(data as SkillWithAdmin);
      }
    },
    onError: (error) => {
      toast.error('创建失败', {
        description: error.message || '创建技能失败，请稍后重试',
      });
    },
  });

  const updateSkillMutation = useMutation({
    mutationFn: (skillId: string, updates: Partial<SkillWithAdmin>) => adminService.updateSkillWithAdmin(skillId, updates, 'admin'),
    onSuccess: (data) => {
      toast.success('更新成功', {
        description: '技能已成功更新',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-skills'] });
      if (onSave && data) {
        onSave(data as SkillWithAdmin);
      }
    },
    onError: (error) => {
      toast.error('更新失败', {
        description: error.message || '更新技能失败，请稍后重试',
      });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.skill_name.trim()) {
      newErrors.skill_name = '技能名称不能为空';
    } else if (formData.skill_name.length < 2) {
      newErrors.skill_name = '技能名称至少2个字符';
    } else if (formData.skill_name.length > 100) {
      newErrors.skill_name = '技能名称不能超过100个字符';
    } else if (!formData.skill_code.trim()) {
      newErrors.skill_code = '技能代码不能为空';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.skill_code)) {
      newErrors.skill_code = '技能代码只能包含字母、数字和下划线';
    } else if (!formData.skill_type.trim()) {
      newErrors.skill_type = '技能类型不能为空';
    } else if (!formData.effect_params) {
      newErrors.effect_params = '效果参数不能为空';
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
      createSkillMutation.mutate(formData);
    } else if (mode === 'edit' && skill) {
      updateSkillMutation.mutate({
        skillId: skill.id,
        updates: formData,
      });
    }
  };

  const handleCancel = () => {
    setFormData({
      skill_name: skill?.skill_name || '',
      skill_code: skill?.skill_code || '',
      skill_type: skill?.skill_type || 'active',
      trigger_phase: skill?.trigger_phase || '',
      trigger_conditions: skill?.trigger_conditions || null,
      effect_params: skill?.effect_params || null,
      effect_description: skill?.effect_description || '',
      cooldown: skill?.cooldown || 0,
      usage_limit: skill?.usage_limit || 0,
      is_active: skill?.is_active ?? 1,
    });
    setErrors({});
    onCancel();
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle>{mode === 'create' ? '创建技能' : '编辑技能'}</CardTitle>
        <CardDescription>
          {mode === 'create' ? '创建新的游戏技能' : '编辑现有的游戏技能'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="skill_name">技能名称 *</Label>
              <Input
                id="skill_name"
                placeholder="请输入技能名称"
                value={formData.skill_name}
                onChange={e => setFormData({ ...formData, skill_name: e.target.value })}
                className={errors.skill_name ? 'border-destructive' : ''}
              />
              {errors.skill_name && (
                <p className="text-sm text-destructive">{errors.skill_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="skill_code">技能代码 *</Label>
              <Input
                id="skill_code"
                placeholder="请输入技能代码（如：werewolf_kill）"
                value={formData.skill_code}
                onChange={e => setFormData({ ...formData, skill_code: e.target.value })}
                className={errors.skill_code ? 'border-destructive' : ''}
              />
              {errors.skill_code && (
                <p className="text-sm text-destructive">{errors.skill_code}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="skill_type">技能类型 *</Label>
              <Select
                value={formData.skill_type}
                onValueChange={value => setFormData({ ...formData, skill_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">主动</SelectItem>
                  <SelectItem value="passive">被动</SelectItem>
                  <SelectItem value="trigger">触发</SelectItem>
                </SelectContent>
              </Select>
              {errors.skill_type && (
                <p className="text-sm text-destructive">{errors.skill_type}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="trigger_phase">触发阶段</Label>
              <Select
                value={formData.trigger_phase}
                onValueChange={value => setFormData({ ...formData, trigger_phase: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">无</SelectItem>
                  <SelectItem value="night">夜晚</SelectItem>
                  <SelectItem value="day">白天</SelectItem>
                  <SelectItem value="death">死亡</SelectItem>
                  <SelectItem value="vote">投票</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="effect_params">效果参数 (JSON) *</Label>
            <Textarea
              id="effect_params"
              placeholder='请输入效果参数（JSON格式），例如：
{
  "target_type": "any_except_self",
  "max_targets": 1,
  "min_targets": 1,
  "can_target_dead": false,
  "effect": "kill",
  "kill_type": "normal",
  "duration": "instant"
}'
              value={typeof formData.effect_params === 'string' ? formData.effect_params : JSON.stringify(formData.effect_params, null, 2)}
              onChange={e => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setFormData({ ...formData, effect_params: parsed });
                } catch {
                  setFormData({ ...formData, effect_params: e.target.value });
                }
              }}
              rows={8}
              className={errors.effect_params ? 'border-destructive' : ''}
            />
            {errors.effect_params && (
              <p className="text-sm text-destructive">{errors.effect_params}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="effect_description">效果描述</Label>
            <Textarea
              id="effect_description"
              placeholder="请输入技能效果描述"
              value={formData.effect_description}
              onChange={e => setFormData({ ...formData, effect_description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cooldown">冷却回合数</Label>
              <Input
                id="cooldown"
                type="number"
                placeholder="0 = 无冷却"
                value={formData.cooldown}
                onChange={e => setFormData({ ...formData, cooldown: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="usage_limit">使用次数限制</Label>
              <Input
                id="usage_limit"
                type="number"
                placeholder="0 = 无限制"
                value={formData.usage_limit}
                onChange={e => setFormData({ ...formData, usage_limit: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="is_active">状态</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active === 1}
                  onCheckedChange={checked => setFormData({ ...formData, is_active: checked ? 1 : 0 })}
                />
                <span className="text-sm text-muted-foreground">启用技能</span>
              </div>
            </div>
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
              disabled={createSkillMutation.isPending || updateSkillMutation.isPending}
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

export default SkillForm;
