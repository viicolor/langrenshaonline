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
import { GlobalConfigWithAdmin, CreateGlobalConfigParams, adminService } from '@/services/admin';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface GlobalConfigFormProps {
  config?: GlobalConfigWithAdmin;
  mode: 'create' | 'edit';
  onSave: (config: GlobalConfigWithAdmin) => void;
  onCancel: () => void;
}

const GlobalConfigForm = ({ config, mode, onSave, onCancel }: GlobalConfigFormProps) => {
  const [formData, setFormData] = useState<CreateGlobalConfigParams>({
    config_name: config?.config_name || '',
    config_code: config?.config_code || '',
    config_type: config?.config_type || 'rule',
    config_value: config?.config_value || null,
    description: config?.description || '',
    is_default: config?.is_default ?? 0,
    is_active: config?.is_active ?? 1,
    env_type: config?.env_type ?? 3,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const createConfigMutation = useMutation({
    mutationFn: (params: CreateGlobalConfigParams) => adminService.createGlobalConfigWithAdmin(params, 'admin'),
    onSuccess: (data) => {
      toast.success('创建成功', {
        description: '配置已成功创建',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-global-configs'] });
      if (onSave && data) {
        onSave(data as GlobalConfigWithAdmin);
      }
    },
    onError: (error) => {
      toast.error('创建失败', {
        description: error.message || '创建配置失败，请稍后重试',
      });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: (configId: string, updates: Partial<GlobalConfigWithAdmin>) => adminService.updateGlobalConfigWithAdmin(configId, updates, 'admin'),
    onSuccess: (data) => {
      toast.success('更新成功', {
        description: '配置已成功更新',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-global-configs'] });
      if (onSave && data) {
        onSave(data as GlobalConfigWithAdmin);
      }
    },
    onError: (error) => {
      toast.error('更新失败', {
        description: error.message || '更新配置失败，请稍后重试',
      });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.config_name.trim()) {
      newErrors.config_name = '配置名称不能为空';
    } else if (formData.config_name.length < 2) {
      newErrors.config_name = '配置名称至少2个字符';
    } else if (formData.config_name.length > 100) {
      newErrors.config_name = '配置名称不能超过100个字符';
    } else if (!formData.config_code.trim()) {
      newErrors.config_code = '配置代码不能为空';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.config_code)) {
      newErrors.config_code = '配置代码只能包含字母、数字和下划线';
    } else if (!formData.config_type.trim()) {
      newErrors.config_type = '配置类型不能为空';
    } else if (!formData.config_value) {
      newErrors.config_value = '配置值不能为空';
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
      createConfigMutation.mutate(formData);
    } else if (mode === 'edit' && config) {
      updateConfigMutation.mutate({
        configId: config.id,
        updates: formData,
      });
    }
  };

  const handleCancel = () => {
    setFormData({
      config_name: config?.config_name || '',
      config_code: config?.config_code || '',
      config_type: config?.config_type || 'rule',
      config_value: config?.config_value || null,
      description: config?.description || '',
      is_default: config?.is_default ?? 0,
      is_active: config?.is_active ?? 1,
      env_type: config?.env_type ?? 3,
    });
    setErrors({});
    onCancel();
  };

  const getConfigValuePlaceholder = () => {
    if (formData.config_code === 'vote_rule') {
      return `{
  "vote_type": "majority",
  "vote_duration": 60,
  "allow_abstain": true,
  "min_votes": 3
}`;
    }
    if (formData.config_code === 'speak_rule') {
      return `{
  "speak_order": "random",
  "speak_duration": 30,
  "max_speak_times": 2
}`;
    }
    if (formData.config_code === 'death_rule') {
      return `{
  "can_speak_after_death": true,
  "can_vote_after_death": false,
  "reveal_identity": "immediate"
}`;
    }
    if (formData.config_code === 'game_setting') {
      return `{
  "night_duration": 60,
  "day_duration": 120,
  "max_players": 20,
  "min_players": 6
}`;
    }
    return '{}';
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle>{mode === 'create' ? '创建配置' : '编辑配置'}</CardTitle>
        <CardDescription>
          {mode === 'create' ? '创建新的全局配置' : '编辑现有的全局配置'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="config_name">配置名称 *</Label>
              <Input
                id="config_name"
                placeholder="请输入配置名称"
                value={formData.config_name}
                onChange={e => setFormData({ ...formData, config_name: e.target.value })}
                className={errors.config_name ? 'border-destructive' : ''}
              />
              {errors.config_name && (
                <p className="text-sm text-destructive">{errors.config_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="config_code">配置代码 *</Label>
              <Input
                id="config_code"
                placeholder="请输入配置代码（如：vote_rule）"
                value={formData.config_code}
                onChange={e => setFormData({ ...formData, config_code: e.target.value })}
                className={errors.config_code ? 'border-destructive' : ''}
              />
              {errors.config_code && (
                <p className="text-sm text-destructive">{errors.config_code}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="config_type">配置类型 *</Label>
              <Select
                value={formData.config_type}
                onValueChange={value => setFormData({ ...formData, config_type: value })}
              >
                <SelectTrigger>
                  {formData.config_type === 'rule' && <SelectValue>规则</SelectValue>}
                  {formData.config_type === 'setting' && <SelectValue>设置</SelectValue>}
                  {formData.config_type === 'parameter' && <SelectValue>参数</SelectValue>}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rule">规则</SelectItem>
                  <SelectItem value="setting">设置</SelectItem>
                  <SelectItem value="parameter">参数</SelectItem>
                </SelectContent>
              </Select>
              {errors.config_type && (
                <p className="text-sm text-destructive">{errors.config_type}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="is_default">默认配置</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_default"
                  checked={formData.is_default === 1}
                  onCheckedChange={checked => setFormData({ ...formData, is_default: checked ? 1 : 0 })}
                />
                <span className="text-sm text-muted-foreground">设置为默认配置</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="env_type">环境类型</Label>
              <Select
                value={String(formData.env_type ?? 3)}
                onValueChange={value => setFormData({ ...formData, env_type: parseInt(value, 10) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">测试服</SelectItem>
                  <SelectItem value="2">正式服</SelectItem>
                  <SelectItem value="3">全局</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">服务端按当前环境加载对应配置，无匹配时使用全局</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="config_value">配置值 (JSON) *</Label>
            <Textarea
              id="config_value"
              placeholder={getConfigValuePlaceholder()}
              value={typeof formData.config_value === 'string' ? formData.config_value : JSON.stringify(formData.config_value, null, 2)}
              onChange={e => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setFormData({ ...formData, config_value: parsed });
                } catch {
                  setFormData({ ...formData, config_value: e.target.value });
                }
              }}
              rows={10}
              className={errors.config_value ? 'border-destructive' : ''}
            />
            {errors.config_value && (
              <p className="text-sm text-destructive">{errors.config_value}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              placeholder="请输入配置描述"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="is_active">状态</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active === 1}
                  onCheckedChange={checked => setFormData({ ...formData, is_active: checked ? 1 : 0 })}
                />
                <span className="text-sm text-muted-foreground">启用配置</span>
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
              disabled={createConfigMutation.isPending || updateConfigMutation.isPending}
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

export default GlobalConfigForm;
