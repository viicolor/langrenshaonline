import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { GripVertical, Plus, Trash2, Save, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Board {
  id: string;
  name: string;
  player_count: number;
  description?: string;
}

interface BoardFlowConfigProps {
  board: Board | null;
}

interface FlowNode {
  id: string;
  node_name: string;
  node_code: string;
  node_type: string;
  timeout_seconds: number;
}

interface BoardFlowMapping {
  id: string;
  board_id: string;
  flow_node_id: string;
  execution_order: number;
  is_active: number;
}

const BoardFlowConfig = ({ board }: BoardFlowConfigProps) => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([]);
  const [boardFlows, setBoardFlows] = useState<BoardFlowMapping[]>([]);
  const [availableNodes, setAvailableNodes] = useState<FlowNode[]>([]);
  const [showAddNode, setShowAddNode] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBoards = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // 模拟数据：由于API服务器未实现，使用模拟数据
      const mockBoards: Board[] = [
        { id: '1', name: '10人速推局', player_count: 10, description: '适合新手的快速狼人杀局' },
        { id: '2', name: '12人标准局', player_count: 12, description: '标准配置的狼人杀局' },
        { id: '3', name: '12人狼王守卫', player_count: 12, description: '包含狼王和守卫的进阶局' },
      ];
      setBoards(mockBoards);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      setError('无法加载板子列表');
      toast.error('加载失败', {
        description: '无法加载板子列表',
      });
    }
  };

  const loadFlowNodes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // 模拟数据：由于API服务器未实现，使用模拟数据
      const mockNodes: FlowNode[] = [
        { id: '1', node_name: '守卫睁眼', node_code: 'guard_wake', node_type: 'night_phase', timeout_seconds: 30 },
        { id: '2', node_name: '狼人刀人', node_code: 'werewolf_kill', node_type: 'night_phase', timeout_seconds: 60 },
        { id: '3', node_name: '预言家查验', node_code: 'seer_check', node_type: 'night_phase', timeout_seconds: 30 },
        { id: '4', node_name: '女巫用药', node_code: 'witch_heal', node_type: 'night_phase', timeout_seconds: 45 },
        { id: '5', node_name: '猎人确认', node_code: 'hunter_confirm', node_type: 'night_phase', timeout_seconds: 20 },
        { id: '6', node_name: '警长竞选', node_code: 'sheriff_campaign', node_type: 'day_phase', timeout_seconds: 120 },
        { id: '7', node_name: '发言阶段', node_code: 'day_speech', node_type: 'day_phase', timeout_seconds: 300 },
        { id: '8', node_name: '投票阶段', node_code: 'day_vote', node_type: 'day_phase', timeout_seconds: 60 },
      ];
      setFlowNodes(mockNodes);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      setError('无法加载流程节点列表');
      toast.error('加载失败', {
        description: '无法加载流程节点列表',
      });
    }
  };

  const loadBoardFlows = async (boardId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      // 模拟数据：由于API服务器未实现，使用模拟数据
      const mockFlows: BoardFlowMapping[] = [
        { id: '1', board_id: boardId, flow_node_id: '1', execution_order: 1, is_active: 1 },
        { id: '2', board_id: boardId, flow_node_id: '2', execution_order: 2, is_active: 1 },
        { id: '3', board_id: boardId, flow_node_id: '3', execution_order: 3, is_active: 1 },
        { id: '4', board_id: boardId, flow_node_id: '4', execution_order: 4, is_active: 1 },
        { id: '5', board_id: boardId, flow_node_id: '5', execution_order: 5, is_active: 1 },
        { id: '6', board_id: boardId, flow_node_id: '6', execution_order: 6, is_active: 1 },
        { id: '7', board_id: boardId, flow_node_id: '7', execution_order: 7, is_active: 1 },
        { id: '8', board_id: boardId, flow_node_id: '8', execution_order: 8, is_active: 1 },
      ];
      setBoardFlows(mockFlows);

      const usedNodeIds = mockFlows.map(f => f.flow_node_id);
      const available = flowNodes.filter(node => !usedNodeIds.includes(node.id));
      setAvailableNodes(available);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      setError('无法加载板子流程配置');
      toast.error('加载失败', {
        description: '无法加载板子流程配置',
      });
    }
  };

  useEffect(() => {
    loadBoards();
    loadFlowNodes();
  }, []);

  useEffect(() => {
    if (board) {
      setSelectedBoard(board);
      loadBoardFlows(board.id);
    }
  }, [board, flowNodes]);

  const handleSelectBoard = (board: Board) => {
    setSelectedBoard(board);
    loadBoardFlows(board.id);
  };

  const handleAddNode = async () => {
    if (!board || !selectedNodeId) {
      return;
    }

    try {
      const maxOrder = boardFlows.length > 0
        ? Math.max(...boardFlows.map(f => f.execution_order))
        : 0;

      const response = await fetch(`/api/boards/${board.id}/flows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          board_id: board.id,
          flow_node_id: selectedNodeId,
          execution_order: maxOrder + 1,
          is_active: 1,
        }),
      });

      if (response.ok) {
        toast.success('添加成功', {
          description: '流程节点已成功添加到板子',
        });
        await loadBoardFlows(board.id);
        setShowAddNode(false);
        setSelectedNodeId('');
      } else {
        throw new Error('添加失败');
      }
    } catch (error) {
      toast.error('添加失败', {
        description: '无法添加流程节点到板子',
      });
    }
  };

  const handleRemoveNode = async (mappingId: string) => {
    if (!confirm('确定要移除这个流程节点吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/boards/${board?.id}/flows/${mappingId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('移除成功', {
          description: '流程节点已成功从板子移除',
        });
        if (board) {
          await loadBoardFlows(board.id);
        }
      } else {
        throw new Error('移除失败');
      }
    } catch (error) {
      toast.error('移除失败', {
        description: '无法移除流程节点',
      });
    }
  };

  const handleToggleActive = async (mapping: BoardFlowMapping) => {
    try {
      const response = await fetch(`/api/boards/${board?.id}/flows/${mapping.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: mapping.is_active === 1 ? 0 : 1,
        }),
      });

      if (response.ok) {
        toast.success('更新成功', {
          description: `流程节点已${mapping.is_active === 1 ? '禁用' : '启用'}`,
        });
        if (board) {
          await loadBoardFlows(board.id);
        }
      } else {
        throw new Error('更新失败');
      }
    } catch (error) {
      toast.error('更新失败', {
        description: '无法更新流程节点状态',
      });
    }
  };

  const handleMoveUp = async (mapping: BoardFlowMapping) => {
    if (mapping.execution_order <= 1) return;

    try {
      const response = await fetch(`/api/boards/${board?.id}/flows/${mapping.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          execution_order: mapping.execution_order - 1,
        }),
      });

      if (response.ok) {
        if (board) {
          await loadBoardFlows(board.id);
        }
      } else {
        throw new Error('移动失败');
      }
    } catch (error) {
      toast.error('移动失败', {
        description: '无法移动流程节点',
      });
    }
  };

  const handleMoveDown = async (mapping: BoardFlowMapping) => {
    const maxOrder = boardFlows.length > 0 ? Math.max(...boardFlows.map(f => f.execution_order)) : 0;
    if (mapping.execution_order >= maxOrder) return;

    try {
      const response = await fetch(`/api/boards/${board?.id}/flows/${mapping.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          execution_order: mapping.execution_order + 1,
        }),
      });

      if (response.ok) {
        if (board) {
          await loadBoardFlows(board.id);
        }
      } else {
        throw new Error('移动失败');
      }
    } catch (error) {
      toast.error('移动失败', {
        description: '无法移动流程节点',
      });
    }
  };

  const getNodeById = (nodeId: string) => {
    return flowNodes.find(node => node.id === nodeId);
  };

  const getNodeTypeBadge = (type: string) => {
    switch (type) {
      case 'night_phase':
        return <Badge variant="secondary">夜晚阶段</Badge>;
      case 'day_phase':
        return <Badge variant="default">白天阶段</Badge>;
      case 'action':
        return <Badge variant="outline">动作节点</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-transparent"></div>
              <span>加载中...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">加载失败</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {!board && !isLoading && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="text-6xl font-bold text-muted-foreground">请先选择板子</div>
              <p className="text-sm text-muted-foreground">请从板子管理页面选择一个板子，然后配置其流程节点</p>
              <div className="flex gap-2">
                {boards.map((b) => (
                  <Button
                    key={b.id}
                    variant={selectedBoard?.id === b.id ? 'default' : 'outline'}
                    onClick={() => handleSelectBoard(b)}
                  >
                    {b.name} ({b.player_count}人)
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {board && (
        <Card>
          <CardHeader>
            <CardTitle>板子流程配置</CardTitle>
            <CardDescription>
              为不同的板子配置流程节点，支持拖拽排序和启用/禁用
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>当前板子</Label>
                <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                  <span className="font-medium">{board?.name || '未选择板子'}</span>
                  {board && (
                    <Badge variant="outline">{board.player_count}人</Badge>
                  )}
                </div>
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="node_select">添加流程节点</Label>
                  <Select
                    value={selectedNodeId}
                    onValueChange={setSelectedNodeId}
                    disabled={!board}
                  >
                    <SelectTrigger id="node_select">
                      <SelectValue placeholder="选择流程节点" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableNodes.map((node) => (
                        <SelectItem key={node.id} value={node.id}>
                          <div className="flex items-center gap-2">
                            {getNodeTypeBadge(node.node_type)}
                            <span>{node.node_name}</span>
                            <Badge variant="outline" className="ml-2">{node.node_code}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAddNode}
                  disabled={!board || !selectedNodeId}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  添加
                </Button>
              </div>
            </div>

            {board && (
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{board.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {board.description || '暂无描述'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadBoardFlows(board.id)}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    刷新
                  </Button>
                </div>

                {boardFlows.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">该板子尚未配置流程节点</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      从上方选择流程节点添加到板子
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {boardFlows
                      .sort((a, b) => a.execution_order - b.execution_order)
                      .map((mapping, index) => {
                        const node = getNodeById(mapping.flow_node_id);
                        if (!node) return null;

                        return (
                          <div
                            key={mapping.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border ${
                              mapping.is_active === 1 ? 'bg-card' : 'bg-muted/50'
                            }`}
                          >
                            <div className="cursor-grab text-muted-foreground">
                              <GripVertical className="w-5 h-5" />
                            </div>

                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{node.node_name}</span>
                                {getNodeTypeBadge(node.node_type)}
                                <Badge variant="outline" className="text-xs">
                                  {mapping.execution_order}
                                </Badge>
                                {mapping.is_active === 0 && (
                                  <Badge variant="destructive">已禁用</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>代码: {node.node_code}</span>
                                <span>时长: {node.timeout_seconds}秒</span>
                              </div>
                            </div>

                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleMoveUp(mapping)}
                                disabled={mapping.execution_order <= 1}
                              >
                                <ArrowUp className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleMoveDown(mapping)}
                                disabled={mapping.execution_order >= boardFlows.length}
                              >
                                <ArrowDown className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleToggleActive(mapping)}
                              >
                                {mapping.is_active === 1 ? (
                                  <Trash2 className="w-4 h-4" />
                                ) : (
                                  <Save className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRemoveNode(mapping.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BoardFlowConfig;