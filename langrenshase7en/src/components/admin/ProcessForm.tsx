import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X, Save, Plus, Minus } from 'lucide-react';
import { ProcessWithAdmin, CreateProcessParams, adminService } from '@/services/admin';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Phase {
  name: string;
  order: number;
  duration?: number;
  actions?: string[];
  next_phase?: string;
}

interface ProcessFormProps {
  process?: ProcessWithAdmin;
  mode: 'create' | 'edit';
  onSave: (process: ProcessWithAdmin) => void;
  onCancel: () => void;
}

const ProcessForm = ({ process, mode, onSave, onCancel }: ProcessFormProps) => {
  const [formData, setFormData] = useState<CreateProcessParams>({
    process_name: process?.process_name || '',
    process_code: process?.process_code || '',
    process_type: process?.process_type || 'game_flow',
    phase_config: process?.phase_config || { phases: [] },
    description: process?.description || '',
    is_default: process?.is_default ?? 0,
    is_active: process?.is_active ?? 1,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const createProcessMutation = useMutation({
    mutationFn: (params: CreateProcessParams) => adminService.createProcessWithAdmin(params, 'admin'),
    onSuccess: (data) => {
      toast.success('创建成功', {
        description: '流程已成功创建',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-processes'] });
      if (onSave && data) {
        onSave(data as ProcessWithAdmin);
      }
    },
    onError: (error) => {
      toast.error('创建失败', {
        description: error.message || '创建流程失败，请稍后重试',
      });
    },
  });

  const updateProcessMutation = useMutation({
    mutationFn: (processId: string, updates: Partial<ProcessWithAdmin>) => adminService.updateProcessWithAdmin(processId, updates, 'admin'),
    onSuccess: (data) => {
      toast.success('更新成功', {
        description: '流程已成功更新',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-processes'] });
      if (onSave && data) {
        onSave(data as ProcessWithAdmin);
      }
    },
    onError: (error) => {
      toast.error('更新失败', {
        description: error.message || '更新流程失败，请稍后重试',
      });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.process_name.trim()) {
      newErrors.process_name = '流程名称不能为空';
    } else if (formData.process_name.length < 2) {
      newErrors.process_name = '流程名称至少2个字符';
    } else if (formData.process_name.length > 100) {
      newErrors.process_name = '流程名称不能超过100个字符';
    } else if (!formData.process_code.trim()) {
      newErrors.process_code = '流程代码不能为空';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.process_code)) {
      newErrors.process_code = '流程代码只能包含字母、数字和下划线';
    } else if (!formData.process_type.trim()) {
      newErrors.process_type = '流程类型不能为空';
    } else if (!formData.phase_config || !formData.phase_config.phases || formData.phase_config.phases.length === 0) {
      newErrors.phase_config = '必须至少配置一个阶段';
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
      createProcessMutation.mutate(formData);
    } else if (mode === 'edit' && process) {
      updateProcessMutation.mutate({
        processId: process.id,
        updates: formData,
      });
    }
  };

  const handleCancel = () => {
    setFormData({
      process_name: process?.process_name || '',
      process_code: process?.process_code || '',
      process_type: process?.process_type || 'game_flow',
      phase_config: process?.phase_config || { phases: [] },
      description: process?.description || '',
      is_default: process?.is_default ?? 0,
      is_active: process?.is_active ?? 1,
    });
    setErrors({});
    onCancel();
  };

  const handleAddPhase = () => {
    const phaseConfig = formData.phase_config as any;
    const newPhase: Phase = {
      name: '',
      order: (phaseConfig.phases?.length || 0) + 1,
      duration: 0,
      actions: [],
      next_phase: '',
    };
    setFormData({
      ...formData,
      phase_config: {
        ...phaseConfig,
        phases: [...(phaseConfig.phases || []), newPhase],
      },
    });
  };

  const handleRemovePhase = (index: number) => {
    const phaseConfig = formData.phase_config as any;
    setFormData({
      ...formData,
      phase_config: {
        ...phaseConfig,
        phases: (phaseConfig.phases || []).filter((_: any, i: number) => i !== index),
      },
    });
  };

  const handlePhaseChange = (index: number, field: keyof Phase, value: any) => {
    const phaseConfig = formData.phase_config as any;
    const newPhases = [...(phaseConfig.phases || [])];
    newPhases[index] = {
      ...newPhases[index],
      [field]: value,
    };
    setFormData({
      ...formData,
      phase_config: {
        ...phaseConfig,
        phases: newPhases,
      },
    });
  };

  const handleAddAction = (phaseIndex: number) => {
    const phaseConfig = formData.phase_config as any;
    const newPhases = [...(phaseConfig.phases || [])];
    newPhases[phaseIndex] = {
      ...newPhases[phaseIndex],
      actions: [...(newPhases[phaseIndex].actions || []), ''],
    };
    setFormData({
      ...formData,
      phase_config: {
        ...phaseConfig,
        phases: newPhases,
      },
    });
  };

  const handleRemoveAction = (phaseIndex: number, actionIndex: number) => {
    const phaseConfig = formData.phase_config as any;
    const newPhases = [...(phaseConfig.phases || [])];
    const phase = newPhases[phaseIndex];
    newPhases[phaseIndex] = {
      ...phase,
      actions: (phase.actions || []).filter((_: any, i: number) => i !== actionIndex),
    };
    setFormData({
      ...formData,
      phase_config: {
        ...phaseConfig,
        phases: newPhases,
      },
    });
  };

  const handleActionChange = (phaseIndex: number, actionIndex: number, value: string) => {
    const phaseConfig = formData.phase_config as any;
    const newPhases = [...(phaseConfig.phases || [])];
    const phase = newPhases[phaseIndex];
    const newActions = [...(phase.actions || [])];
    newActions[actionIndex] = value;
    newPhases[phaseIndex] = {
      ...phase,
      actions: newActions,
    };
    setFormData({
      ...formData,
      phase_config: {
        ...phaseConfig,
        phases: newPhases,
      },
    });
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle>{mode === 'create' ? '创建流程' : '编辑流程'}</CardTitle>
        <CardDescription>
          {mode === 'create' ? '创建新的游戏流程' : '编辑现有的游戏流程'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="process_name">流程名称 *</Label>
              <Input
                id="process_name"
                placeholder="请输入流程名称"
                value={formData.process_name}
                onChange={e => setFormData({ ...formData, process_name: e.target.value })}
                className={errors.process_name ? 'border-destructive' : ''}
              />
              {errors.process_name && (
                <p className="text-sm text-destructive">{errors.process_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="process_code">流程代码 *</Label>
              <Input
                id="process_code"
                placeholder="请输入流程代码（如：standard_flow）"
                value={formData.process_code}
                onChange={e => setFormData({ ...formData, process_code: e.target.value })}
                className={errors.process_code ? 'border-destructive' : ''}
              />
              {errors.process_code && (
                <p className="text-sm text-destructive">{errors.process_code}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="process_type">流程类型 *</Label>
              <Select
                value={formData.process_type}
                onValueChange={value => setFormData({ ...formData, process_type: value })}
              >
                <SelectTrigger>
                  {formData.process_type === 'game_flow' && <SelectValue>游戏流程</SelectValue>}
                  {formData.process_type === 'phase_config' && <SelectValue>阶段配置</SelectValue>}
                  {formData.process_type === 'action_config' && <SelectValue>动作配置</SelectValue>}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="game_flow">游戏流程</SelectItem>
                  <SelectItem value="phase_config">阶段配置</SelectItem>
                  <SelectItem value="action_config">动作配置</SelectItem>
                </SelectContent>
              </Select>
              {errors.process_type && (
                <p className="text-sm text-destructive">{errors.process_type}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="is_default">默认流程</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_default"
                  checked={formData.is_default === 1}
                  onCheckedChange={checked => setFormData({ ...formData, is_default: checked ? 1 : 0 })}
                />
                <span className="text-sm text-muted-foreground">设置为默认流程</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>阶段配置 *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddPhase}
              >
                <Plus className="w-4 h-4 mr-2" />
                添加阶段
              </Button>
            </div>
            <div className="border border-border/50 rounded-lg p-4 space-y-4">
              {(formData.phase_config as any).phases?.map((phase: Phase, phaseIndex: number) => (
                <div key={phaseIndex} className="border border-border/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>阶段名称</Label>
                          <Input
                            placeholder="如：night, day"
                            value={phase.name}
                            onChange={e => handlePhaseChange(phaseIndex, 'name', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>顺序</Label>
                          <Input
                            type="number"
                            min="1"
                            value={phase.order}
                            onChange={e => handlePhaseChange(phaseIndex, 'order', parseInt(e.target.value) || 1)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>时长（秒）</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0 = 无限制"
                            value={phase.duration || ''}
                            onChange={e => handlePhaseChange(phaseIndex, 'duration', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label>下一阶段</Label>
                          <Input
                            placeholder="如：day, night"
                            value={phase.next_phase || ''}
                            onChange={e => handlePhaseChange(phaseIndex, 'next_phase', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemovePhase(phaseIndex)}
                      className="text-destructive"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>动作列表</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddAction(phaseIndex)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        添加动作
                      </Button>
                    </div>
                    {phase.actions?.map((action: string, actionIndex: number) => (
                      <div key={actionIndex} className="flex items-center gap-2">
                        <Input
                          placeholder="如：werewolf_kill, seer_check"
                          value={action}
                          onChange={e => handleActionChange(phaseIndex, actionIndex, e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleRemoveAction(phaseIndex, actionIndex)}
                          className="text-destructive"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {errors.phase_config && (
              <p className="text-sm text-destructive">{errors.phase_config}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              placeholder="请输入流程描述"
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
                <span className="text-sm text-muted-foreground">启用流程</span>
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
              disabled={createProcessMutation.isPending || updateProcessMutation.isPending}
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

export default ProcessForm;
