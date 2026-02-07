import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { X, Save } from 'lucide-react';
import { AIConfigWithAdmin, CreateAIConfigParams, adminService } from '@/services/admin';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AIConfigFormProps {
  config?: AIConfigWithAdmin;
  mode: 'create' | 'edit';
  onSave: (config: AIConfigWithAdmin) => void;
  onCancel: () => void;
}

const AIConfigForm = ({ config, mode, onSave, onCancel }: AIConfigFormProps) => {
  const [formData, setFormData] = useState<CreateAIConfigParams>({
    name: config?.name || '',
    provider: config?.provider || 'openai',
    api_key: config?.api_key || '',
    model: config?.model || '',
    endpoint: config?.endpoint || '',
    config: config?.config || null,
    is_active: config?.is_active ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const createConfigMutation = useMutation({
    mutationFn: (params: CreateAIConfigParams) => adminService.createAIConfigWithAdmin(params, 'admin'),
    onSuccess: (data) => {
      toast.success('创建成功', {
        description: 'AI 配置已成功创建',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-ai-configs'] });
      if (onSave && data) {
        onSave(data as AIConfigWithAdmin);
      }
    },
    onError: (error) => {
      toast.error('创建失败', {
        description: error.message || '创建 AI 配置失败，请稍后重试',
      });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: (params: { configId: string; updates: Partial<AIConfigWithAdmin> }) =>
      adminService.updateAIConfigWithAdmin(params.configId, params.updates),
    onSuccess: (data) => {
      toast.success('更新成功', {
        description: 'AI 配置已成功更新',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-ai-configs'] });
      if (onSave && data) {
        onSave(data as AIConfigWithAdmin);
      }
    },
    onError: (error) => {
      toast.error('更新失败', {
        description: error.message || '更新 AI 配置失败，请稍后重试',
      });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '配置名称不能为空';
    } else if (formData.name.length < 2) {
      newErrors.name = '配置名称至少 2 个字符';
    } else if (formData.name.length > 100) {
      newErrors.name = '配置名称不能超过 100 个字符';
    } else if (!formData.provider.trim()) {
      newErrors.provider = '请选择 AI 提供商';
    }

    if (formData.provider !== 'mcp' && !formData.api_key?.trim() && mode === 'create') {
      newErrors.api_key = 'OpenAI 和通义千问需要配置 API Key';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData: Partial<AIConfigWithAdmin> = {
      name: formData.name,
      provider: formData.provider,
      model: formData.model?.trim() || null,
      endpoint: formData.endpoint?.trim() || null,
      is_active: formData.is_active ?? true,
    };
    if (mode === 'create' || formData.api_key?.trim()) {
      submitData.api_key = formData.api_key?.trim() || null;
    }

    if (mode === 'create') {
      createConfigMutation.mutate(submitData as CreateAIConfigParams);
    } else if (mode === 'edit' && config) {
      updateConfigMutation.mutate({
        configId: config.id,
        updates: submitData,
      });
    }
  };

  const handleCancel = () => {
    setFormData({
      name: config?.name || '',
      provider: config?.provider || 'openai',
      api_key: config?.api_key || '',
      model: config?.model || '',
      endpoint: config?.endpoint || '',
      config: config?.config || null,
      is_active: config?.is_active ?? true,
    });
    setErrors({});
    onCancel();
  };

  const modelPlaceholders: Record<string, string> = {
    openai: 'gpt-4, gpt-4o, gpt-3.5-turbo 等',
    qwen: 'qwen-turbo, qwen-plus, qwen-max 等',
    mcp: 'MCP 协议端点，留空使用默认',
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle>{mode === 'create' ? '添加 AI 配置' : '编辑 AI 配置'}</CardTitle>
        <CardDescription>
          {mode === 'create' ? '添加新的 AI 接口配置（OpenAI、通义千问或 MCP）' : '编辑现有的 AI 接口配置'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">配置名称 *</Label>
              <Input
                id="name"
                placeholder="如：默认 OpenAI 配置"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">AI 提供商 *</Label>
              <Select
                value={formData.provider}
                onValueChange={value => setFormData({ ...formData, provider: value })}
              >
                <SelectTrigger className={errors.provider ? 'border-destructive' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                  <SelectItem value="qwen">通义千问</SelectItem>
                  <SelectItem value="mcp">MCP 协议</SelectItem>
                </SelectContent>
              </Select>
              {errors.provider && <p className="text-sm text-destructive">{errors.provider}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api_key">
              API Key
              {formData.provider !== 'mcp' && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id="api_key"
              type="password"
              placeholder={
                formData.provider === 'openai'
                  ? 'sk-...'
                  : formData.provider === 'qwen'
                    ? '通义千问 API Key'
                    : 'MCP 可不填'
              }
              value={formData.api_key || ''}
              onChange={e => setFormData({ ...formData, api_key: e.target.value })}
              className={errors.api_key ? 'border-destructive' : ''}
            />
            {errors.api_key && <p className="text-sm text-destructive">{errors.api_key}</p>}
            {mode === 'edit' && formData.api_key && (
              <p className="text-xs text-muted-foreground">留空表示不修改现有 API Key</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">模型</Label>
            <Input
              id="model"
              placeholder={modelPlaceholders[formData.provider] || '模型名称'}
              value={formData.model || ''}
              onChange={e => setFormData({ ...formData, model: e.target.value })}
            />
          </div>

          {formData.provider === 'mcp' && (
            <div className="space-y-2">
              <Label htmlFor="endpoint">端点 URL</Label>
              <Input
                id="endpoint"
                type="url"
                placeholder="https://..."
                value={formData.endpoint || ''}
                onChange={e => setFormData({ ...formData, endpoint: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active ?? true}
                onCheckedChange={checked => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">启用此配置</Label>
            </div>
            <p className="text-xs text-muted-foreground">禁用的配置将不会在创建房间时显示</p>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border/50">
            <Button type="button" variant="outline" onClick={handleCancel}>
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

export default AIConfigForm;
