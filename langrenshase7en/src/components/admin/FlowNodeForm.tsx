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
import { toast } from 'sonner';

interface PhaseConfig {
  order: number;
  duration: number;
  actions: string[];
}

interface OperateRoles {
  type: 'ALL' | 'CURRENT_PLAYER' | 'SPECIFIC_ROLES';
  role_ids?: string[];
  player_id?: string;
}

interface NextNodeRules {
  type: 'FIXED' | 'BY_TRIGGER' | 'BY_STATE' | 'BY_OPERATE';
  next_node_id?: string;
  TIMEOUT?: string;
  DISCONNECT?: string;
  PLAYER_OPERATE?: string;
  default?: string;
  [key: string]: any;
}

interface FlowNodeFormProps {
  node?: any;
  mode: 'create' | 'edit';
  onSave: (node: any) => void;
  onCancel: () => void;
}

const FlowNodeForm = ({ node, mode, onSave, onCancel }: FlowNodeFormProps) => {
  const [formData, setFormData] = useState({
    node_name: node?.node_name || '',
    node_code: node?.node_code || '',
    node_type: node?.node_type || 'action',
    phase_config: node?.phase_config || { order: 1, duration: 30, actions: [] } as PhaseConfig,
    operate_roles: node?.operate_roles || { type: 'ALL' } as OperateRoles,
    next_node_rules: node?.next_node_rules || { type: 'FIXED' } as NextNodeRules,
    is_auto_advance: node?.is_auto_advance ?? 1,
    timeout_seconds: node?.timeout_seconds || 30,
    description: node?.description || '',
    is_system: node?.is_system ?? 0,
    is_active: node?.is_active ?? 1,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newAction, setNewAction] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.node_name.trim()) {
      newErrors.node_name = '节点名称不能为空';
    } else if (formData.node_name.length < 2) {
      newErrors.node_name = '节点名称至少2个字符';
    } else if (formData.node_name.length > 100) {
      newErrors.node_name = '节点名称不能超过100个字符';
    } else if (!formData.node_code.trim()) {
      newErrors.node_code = '节点代码不能为空';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.node_code)) {
      newErrors.node_code = '节点代码只能包含字母、数字和下划线';
    } else if (!formData.node_type.trim()) {
      newErrors.node_type = '节点类型不能为空';
    } else if (formData.timeout_seconds <= 0) {
      newErrors.timeout_seconds = '超时时长必须大于0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const nodeData = {
      ...formData,
      phase_config: JSON.stringify(formData.phase_config),
      operate_roles: JSON.stringify(formData.operate_roles),
      next_node_rules: JSON.stringify(formData.next_node_rules),
    };

    if (mode === 'create') {
      toast.success('创建成功', {
        description: '流程节点已成功创建',
      });
    } else {
      toast.success('更新成功', {
        description: '流程节点已成功更新',
      });
    }

    if (onSave) {
      onSave(nodeData);
    }
  };

  const addAction = () => {
    if (!newAction.trim()) return;
    if (formData.phase_config.actions.includes(newAction)) return;

    setFormData({
      ...formData,
      phase_config: {
        ...formData.phase_config,
        actions: [...formData.phase_config.actions, newAction],
      },
    });
    setNewAction('');
  };

  const removeAction = (action: string) => {
    setFormData({
      ...formData,
      phase_config: {
        ...formData.phase_config,
        actions: formData.phase_config.actions.filter(a => a !== action),
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{mode === 'create' ? '创建流程节点' : '编辑流程节点'}</span>
            {formData.is_system === 1 && (
              <Badge variant="secondary">系统内置</Badge>
            )}
          </CardTitle>
          <CardDescription>
            配置游戏流程节点的详细信息，包括节点名称、类型、阶段配置、操作权限和下一节点规则
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="node_name">节点名称 *</Label>
              <Input
                id="node_name"
                value={formData.node_name}
                onChange={(e) => setFormData({ ...formData, node_name: e.target.value })}
                placeholder="如：守卫睁眼"
                className={errors.node_name ? 'border-red-500' : ''}
              />
              {errors.node_name && (
                <p className="text-sm text-red-500">{errors.node_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="node_code">节点代码 *</Label>
              <Input
                id="node_code"
                value={formData.node_code}
                onChange={(e) => setFormData({ ...formData, node_code: e.target.value })}
                placeholder="如：guard_protect"
                disabled={mode === 'edit'}
                className={errors.node_code ? 'border-red-500' : ''}
              />
              {errors.node_code && (
                <p className="text-sm text-red-500">{errors.node_code}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="node_type">节点类型 *</Label>
              <Select
                value={formData.node_type}
                onValueChange={(value) => setFormData({ ...formData, node_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择节点类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="night_phase">夜晚阶段</SelectItem>
                  <SelectItem value="day_phase">白天阶段</SelectItem>
                  <SelectItem value="action">动作节点</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeout_seconds">超时时长（秒） *</Label>
              <Input
                id="timeout_seconds"
                type="number"
                value={formData.timeout_seconds}
                onChange={(e) => setFormData({ ...formData, timeout_seconds: parseInt(e.target.value) || 0 })}
                min={1}
                className={errors.timeout_seconds ? 'border-red-500' : ''}
              />
              {errors.timeout_seconds && (
                <p className="text-sm text-red-500">{errors.timeout_seconds}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <Label>阶段配置</Label>
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phase_order">执行顺序</Label>
                    <Input
                      id="phase_order"
                      type="number"
                      value={formData.phase_config.order}
                      onChange={(e) => setFormData({
                        ...formData,
                        phase_config: { ...formData.phase_config, order: parseInt(e.target.value) || 1 },
                      })}
                      min={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phase_duration">阶段时长（秒）</Label>
                    <Input
                      id="phase_duration"
                      type="number"
                      value={formData.phase_config.duration}
                      onChange={(e) => setFormData({
                        ...formData,
                        phase_config: { ...formData.phase_config, duration: parseInt(e.target.value) || 0 },
                      })}
                      min={0}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>允许的操作</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newAction}
                      onChange={(e) => setNewAction(e.target.value)}
                      placeholder="输入操作代码"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addAction();
                        }
                      }}
                    />
                    <Button onClick={addAction} size="icon" variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.phase_config.actions.map((action) => (
                      <Badge key={action} variant="secondary" className="flex items-center gap-1">
                        {action}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-4 w-4 p-0"
                          onClick={() => removeAction(action)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Label>操作权限配置</Label>
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="operate_type">操作类型</Label>
                  <Select
                    value={formData.operate_roles.type}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      operate_roles: { ...formData.operate_roles, type: value as any },
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">所有玩家</SelectItem>
                      <SelectItem value="CURRENT_PLAYER">当前玩家</SelectItem>
                      <SelectItem value="SPECIFIC_ROLES">指定角色</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.operate_roles.type === 'CURRENT_PLAYER' && (
                  <div className="space-y-2">
                    <Label htmlFor="player_id">玩家ID</Label>
                    <Input
                      id="player_id"
                      value={formData.operate_roles.player_id || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        operate_roles: { ...formData.operate_roles, player_id: e.target.value },
                      })}
                      placeholder="输入玩家ID"
                    />
                  </div>
                )}

                {formData.operate_roles.type === 'SPECIFIC_ROLES' && (
                  <div className="space-y-2">
                    <Label htmlFor="role_ids">角色ID列表</Label>
                    <Textarea
                      id="role_ids"
                      value={formData.operate_roles.role_ids?.join(',') || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        operate_roles: {
                          ...formData.operate_roles,
                          role_ids: e.target.value.split(',').map(id => id.trim()).filter(Boolean),
                        },
                      })}
                      placeholder="输入角色ID，用逗号分隔"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Label>下一节点规则</Label>
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="next_rule_type">规则类型</Label>
                  <Select
                    value={formData.next_node_rules.type}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      next_node_rules: { type: value as any },
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIXED">固定下一个节点</SelectItem>
                      <SelectItem value="BY_TRIGGER">按触发类型</SelectItem>
                      <SelectItem value="BY_STATE">按游戏状态</SelectItem>
                      <SelectItem value="BY_OPERATE">按玩家操作</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.next_node_rules.type === 'FIXED' && (
                  <div className="space-y-2">
                    <Label htmlFor="next_node_id">下一个节点ID</Label>
                    <Input
                      id="next_node_id"
                      value={formData.next_node_rules.next_node_id || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        next_node_rules: { ...formData.next_node_rules, next_node_id: e.target.value },
                      })}
                      placeholder="输入下一个节点的ID"
                    />
                  </div>
                )}

                {formData.next_node_rules.type === 'BY_TRIGGER' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="timeout_node">超时节点</Label>
                      <Input
                        id="timeout_node"
                        value={formData.next_node_rules.TIMEOUT || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          next_node_rules: { ...formData.next_node_rules, TIMEOUT: e.target.value },
                        })}
                        placeholder="超时时跳转的节点ID"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="disconnect_node">掉线节点</Label>
                      <Input
                        id="disconnect_node"
                        value={formData.next_node_rules.DISCONNECT || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          next_node_rules: { ...formData.next_node_rules, DISCONNECT: e.target.value },
                        })}
                        placeholder="掉线时跳转的节点ID"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="operate_node">操作节点</Label>
                      <Input
                        id="operate_node"
                        value={formData.next_node_rules.PLAYER_OPERATE || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          next_node_rules: { ...formData.next_node_rules, PLAYER_OPERATE: e.target.value },
                        })}
                        placeholder="玩家操作后跳转的节点ID"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="default_node">默认节点</Label>
                      <Input
                        id="default_node"
                        value={formData.next_node_rules.default || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          next_node_rules: { ...formData.next_node_rules, default: e.target.value },
                        })}
                        placeholder="默认跳转的节点ID"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="输入节点描述"
                rows={3}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="is_auto_advance">超时自动推进</Label>
                <Switch
                  id="is_auto_advance"
                  checked={formData.is_auto_advance === 1}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_auto_advance: checked ? 1 : 0 })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">启用</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active === 1}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked ? 1 : 0 })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              取消
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              保存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FlowNodeForm;
