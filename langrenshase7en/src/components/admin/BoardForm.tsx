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
import { BoardWithAdmin, CreateBoardParams, adminService, CardWithAdmin } from '@/services/admin';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface BoardRole {
  card_id: number;
  count: number;
}

interface BoardFormProps {
  board?: BoardWithAdmin;
  mode: 'create' | 'edit';
  onSave: (board: BoardWithAdmin) => void;
  onCancel: () => void;
}

const BoardForm = ({ board, mode, onSave, onCancel }: BoardFormProps) => {
  const [formData, setFormData] = useState<CreateBoardParams>({
    board_name: board?.board_name || '',
    board_alias: board?.board_alias || '',
    player_num: board?.player_num || 12,
    difficulty: board?.difficulty || 1,
    status: board?.status || 2,
    recommend: board?.recommend || 0,
    desc: board?.desc || '',
    character_config: board?.character_config,
    global_config_ids: board?.global_config_ids,
    process_ids: board?.process_ids,
  });

  const [selectedRoles, setSelectedRoles] = useState<BoardRole[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const { data: cards } = useQuery({
    queryKey: ['admin-cards'],
    queryFn: () => adminService.getCardsWithAdmin(),
  });

  const createBoardMutation = useMutation({
    mutationFn: (params: CreateBoardParams) => adminService.createBoardWithAdmin(params, 'admin'),
    onSuccess: (data) => {
      toast.success('创建成功', {
        description: '板子已成功创建',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-boards'] });
      if (onSave && data) {
        onSave(data as BoardWithAdmin);
      }
    },
    onError: (error) => {
      toast.error('创建失败', {
        description: error.message || '创建板子失败，请稍后重试',
      });
    },
  });

  const updateBoardMutation = useMutation({
    mutationFn: (params: { boardId: number; updates: Partial<BoardWithAdmin> }) => adminService.updateBoardWithAdmin(params.boardId, params.updates, 'admin'),
    onSuccess: (data) => {
      toast.success('更新成功', {
        description: '板子已成功更新',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-boards'] });
      if (onSave && data) {
        onSave(data as BoardWithAdmin);
      }
    },
    onError: (error) => {
      toast.error('更新失败', {
        description: error.message || '更新板子失败，请稍后重试',
      });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.board_name.trim()) {
      newErrors.board_name = '板子名称不能为空';
    } else if (formData.board_name.length < 2) {
      newErrors.board_name = '板子名称至少2个字符';
    } else if (formData.board_name.length > 50) {
      newErrors.board_name = '板子名称不能超过50个字符';
    } else if (!formData.desc || formData.desc.trim().length === 0) {
      newErrors.desc = '板子描述不能为空';
    } else if (formData.desc && formData.desc.length > 200) {
      newErrors.desc = '板子描述不能超过200个字符';
    } else if (!formData.player_num || formData.player_num < 6 || formData.player_num > 20) {
      newErrors.player_num = '玩家数量必须在6-20之间';
    } else if (selectedRoles.length === 0) {
      newErrors.roles = '必须至少选择一个角色';
    } else if (selectedRoles.reduce((sum, r) => sum + r.count, 0) !== formData.player_num) {
      newErrors.roles = `角色总数（${selectedRoles.reduce((sum, r) => sum + r.count, 0)}）必须等于玩家数量（${formData.player_num}）`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const characterConfig = {
      roles: selectedRoles.map(role => ({
        card_id: role.card_id,
        count: role.count,
      })),
    };

    if (mode === 'create') {
      createBoardMutation.mutate({
        ...formData,
        character_config: characterConfig,
      });
    } else if (mode === 'edit' && board) {
      updateBoardMutation.mutate({
        boardId: board.id,
        updates: {
          ...formData,
          character_config: characterConfig,
        },
      });
    }
  };

  const handleCancel = () => {
    setFormData({
      board_name: board?.board_name || '',
      board_alias: board?.board_alias || '',
      player_num: board?.player_num || 12,
      difficulty: board?.difficulty || 1,
      status: board?.status || 2,
      recommend: board?.recommend || 0,
      desc: board?.desc || '',
      character_config: board?.character_config,
      global_config_ids: board?.global_config_ids,
      process_ids: board?.process_ids,
    });
    setSelectedRoles([]);
    setErrors({});
    onCancel();
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle>{mode === 'create' ? '创建板子' : '编辑板子'}</CardTitle>
        <CardDescription>
          {mode === 'create' ? '创建新的游戏板子配置' : '编辑现有的游戏板子配置'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="board_name">板子名称 *</Label>
              <Input
                id="board_name"
                placeholder="请输入板子名称"
                value={formData.board_name}
                onChange={e => setFormData({ ...formData, board_name: e.target.value })}
                className={errors.board_name ? 'border-destructive' : ''}
              />
              {errors.board_name && (
                <p className="text-sm text-destructive">{errors.board_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">板子描述</Label>
              <Textarea
                id="desc"
                placeholder="请输入板子描述"
                value={formData.desc}
                onChange={e => setFormData({ ...formData, desc: e.target.value })}
                rows={3}
                className={errors.desc ? 'border-destructive' : ''}
              />
              {errors.desc && (
                <p className="text-sm text-destructive">{errors.desc}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="player_num">玩家数量 *</Label>
              <Input
                id="player_num"
                type="number"
                min="6"
                max="20"
                placeholder="请输入玩家数量"
                value={formData.player_num}
                onChange={e => setFormData({ ...formData, player_num: parseInt(e.target.value) || 12 })}
                className={errors.player_num ? 'border-destructive' : ''}
              />
              {errors.player_num && (
                <p className="text-sm text-destructive">{errors.player_num}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">难度</Label>
              <Select
                value={formData.difficulty?.toString()}
                onValueChange={value => setFormData({ ...formData, difficulty: parseInt(value) || 1 })}
              >
                <SelectTrigger>
                  {formData.difficulty === 1 && <SelectValue>新手</SelectValue>}
                  {formData.difficulty === 2 && <SelectValue>进阶</SelectValue>}
                  {formData.difficulty === 3 && <SelectValue>娱乐</SelectValue>}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">新手</SelectItem>
                  <SelectItem value="2">进阶</SelectItem>
                  <SelectItem value="3">娱乐</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">状态</Label>
              <Select
                value={formData.status?.toString()}
                onValueChange={value => setFormData({ ...formData, status: parseInt(value) || 2 })}
              >
                <SelectTrigger>
                  {formData.status === 0 && <SelectValue>下线</SelectValue>}
                  {formData.status === 1 && <SelectValue>测试</SelectValue>}
                  {formData.status === 2 && <SelectValue>上线</SelectValue>}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">下线</SelectItem>
                  <SelectItem value="1">测试</SelectItem>
                  <SelectItem value="2">上线</SelectItem>
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
                <span className="text-sm text-muted-foreground">设置为推荐板子</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>角色配置</Label>
              <span className={`text-sm ${selectedRoles.reduce((s, r) => s + r.count, 0) === formData.player_num ? 'text-muted-foreground' : 'text-amber-600'}`}>
                角色总数：{selectedRoles.reduce((s, r) => s + r.count, 0)} / 玩家数量：{formData.player_num}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedRoles([])}
              >
                清空
              </Button>
            </div>
            {errors.roles && (
              <p className="text-sm text-destructive">{errors.roles}</p>
            )}
            <div className="border border-border/50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="card_select">选择卡牌</Label>
                  <Select
                    value=""
                    onValueChange={value => {
                      if (value) {
                        const card = cards?.find(c => c.id === value);
                        if (card) {
                          setSelectedRoles([...selectedRoles, { card_id: card.id, count: 1 }]);
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择卡牌" />
                    </SelectTrigger>
                    <SelectContent>
                      {cards?.map(card => (
                        <SelectItem key={card.id} value={card.id}>
                          <div className="flex items-center gap-2">
                            {card.skill_icon && <span className="text-lg">{card.skill_icon}</span>}
                            <span>{card.card_name}</span>
                            <Badge variant="outline" className="ml-2">
                              {card.camp === 'werewolf' ? '狼人' : card.camp === 'good' ? '好人' : '中立'}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role_count">数量</Label>
                  <Input
                    id="role_count"
                    type="number"
                    min="1"
                    max="10"
                    placeholder="1"
                    value={selectedRoles.find(r => r.card_id === '')?.count || 1}
                    onChange={e => {
                      const count = parseInt(e.target.value) || 1;
                      setSelectedRoles(selectedRoles.map(r => r.card_id === '' ? { ...r, count } : r));
                    }}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  const newRole = { card_id: '', count: 1 };
                  setSelectedRoles([...selectedRoles, newRole]);
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="border border-border/50 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">已选角色</h3>
                    <div className={`text-sm ${selectedRoles.reduce((s, r) => s + r.count, 0) === formData.player_num ? 'text-muted-foreground' : 'text-amber-600'}`}>
                      总人数：{selectedRoles.reduce((sum, r) => sum + r.count, 0)}（需等于玩家数量 {formData.player_num}）
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">狼人阵营</p>
                      <p className="text-xl font-bold text-red-500">
                        {selectedRoles.filter(r => {
                          const card = cards?.find(c => c.id === r.card_id);
                          return card?.camp === 'werewolf';
                        }).reduce((sum, r) => sum + r.count, 0)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">好人阵营</p>
                      <p className="text-xl font-bold text-green-500">
                        {selectedRoles.filter(r => {
                          const card = cards?.find(c => c.id === r.card_id);
                          return card?.camp === 'good';
                        }).reduce((sum, r) => sum + r.count, 0)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">中立阵营</p>
                      <p className="text-xl font-bold text-gray-500">
                        {selectedRoles.filter(r => {
                          const card = cards?.find(c => c.id === r.card_id);
                          return card?.camp === 'neutral';
                        }).reduce((sum, r) => sum + r.count, 0)}
                      </p>
                    </div>
                  </div>
                {selectedRoles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    尚未选择角色
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedRoles.map((role, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded">
                        <div className="flex items-center gap-3">
                          {role.card_id && (
                            <>
                              {cards?.find(c => c.id === role.card_id)?.skill_icon && (
                                <span className="text-xl">{cards?.find(c => c.id === role.card_id)?.skill_icon}</span>
                              )}
                              <span className="font-semibold">
                                {cards?.find(c => c.id === role.card_id)?.card_name}
                              </span>
                              <Badge variant="outline" className="ml-2">
                                {cards?.find(c => c.id === role.card_id)?.camp === 'werewolf' ? '狼人' : cards?.find(c => c.id === role.card_id)?.camp === 'good' ? '好人' : '中立'}
                              </Badge>
                            </>
                          )}
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="1"
                              max="10"
                              value={role.count}
                              onChange={e => {
                                const newRoles = [...selectedRoles];
                                newRoles[index].count = parseInt(e.target.value) || 1;
                                setSelectedRoles(newRoles);
                              }}
                              className="w-20"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                const newRoles = selectedRoles.filter((_, i) => i !== index);
                                setSelectedRoles(newRoles);
                              }}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
              disabled={createBoardMutation.isPending || updateBoardMutation.isPending}
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

export default BoardForm;
