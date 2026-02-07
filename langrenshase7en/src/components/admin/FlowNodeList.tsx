import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import FlowNodeForm from './FlowNodeForm';
import { toast } from 'sonner';

interface FlowNode {
  id: string;
  node_name: string;
  node_code: string;
  node_type: string;
  phase_config: any;
  operate_roles: any;
  next_node_rules: any;
  is_auto_advance: number;
  timeout_seconds: number;
  description: string;
  is_system: number;
  is_active: number;
  create_time: string;
  update_time: string;
}

const FlowNodeList = () => {
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [filteredNodes, setFilteredNodes] = useState<FlowNode[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingNode, setEditingNode] = useState<FlowNode | null>(null);
  const [mode, setMode] = useState<'create' | 'edit'>('create');

  const loadNodes = async () => {
    try {
      const response = await fetch('/api/flow-nodes');
      const data = await response.json();
      setNodes(data.nodes || []);
      setFilteredNodes(data.nodes || []);
    } catch (error) {
      toast.error('加载失败', {
        description: '无法加载流程节点列表',
      });
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    filterNodes(value, typeFilter, activeFilter);
  };

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value);
    filterNodes(searchTerm, value, activeFilter);
  };

  const handleActiveFilter = (value: string) => {
    setActiveFilter(value);
    filterNodes(searchTerm, typeFilter, value);
  };

  const filterNodes = (search: string, type: string, active: string) => {
    let filtered = nodes;

    if (search) {
      filtered = filtered.filter(node =>
        node.node_name.toLowerCase().includes(search.toLowerCase()) ||
        node.node_code.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (type !== 'all') {
      filtered = filtered.filter(node => node.node_type === type);
    }

    if (active !== 'all') {
      filtered = filtered.filter(node => {
        if (active === 'active') return node.is_active === 1;
        if (active === 'inactive') return node.is_active === 0;
        return true;
      });
    }

    setFilteredNodes(filtered);
  };

  const handleCreate = () => {
    setEditingNode(null);
    setMode('create');
    setShowForm(true);
  };

  const handleEdit = (node: FlowNode) => {
    setEditingNode(node);
    setMode('edit');
    setShowForm(true);
  };

  const handleDelete = async (nodeId: string) => {
    if (!confirm('确定要删除这个流程节点吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/flow-nodes/${nodeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('删除成功', {
          description: '流程节点已成功删除',
        });
        await loadNodes();
      } else {
        throw new Error('删除失败');
      }
    } catch (error) {
      toast.error('删除失败', {
        description: '无法删除流程节点',
      });
    }
  };

  const handleToggleActive = async (node: FlowNode) => {
    try {
      const response = await fetch(`/api/flow-nodes/${node.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: node.is_active === 1 ? 0 : 1,
        }),
      });

      if (response.ok) {
        toast.success('更新成功', {
          description: `流程节点已${node.is_active === 1 ? '禁用' : '启用'}`,
        });
        await loadNodes();
      } else {
        throw new Error('更新失败');
      }
    } catch (error) {
      toast.error('更新失败', {
        description: '无法更新流程节点状态',
      });
    }
  };

  const handleSave = async (node: FlowNode) => {
    try {
      const url = mode === 'create'
        ? '/api/flow-nodes'
        : `/api/flow-nodes/${node.id}`;

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(node),
      });

      if (response.ok) {
        setShowForm(false);
        await loadNodes();
      } else {
        throw new Error('保存失败');
      }
    } catch (error) {
      toast.error('保存失败', {
        description: '无法保存流程节点',
      });
    }
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

  const getNextRuleTypeBadge = (type: string) => {
    switch (type) {
      case 'FIXED':
        return <Badge variant="secondary">固定</Badge>;
      case 'BY_TRIGGER':
        return <Badge variant="default">按触发</Badge>;
      case 'BY_STATE':
        return <Badge variant="outline">按状态</Badge>;
      case 'BY_OPERATE':
        return <Badge variant="secondary">按操作</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  useState(() => {
    loadNodes();
  });

  return (
    <div className="space-y-6">
      {showForm && (
        <FlowNodeForm
          node={editingNode}
          mode={mode}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>流程节点管理</CardTitle>
          <CardDescription>
            管理游戏流程节点，包括节点配置、操作权限和转换规则
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索节点名称或代码..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant={typeFilter === 'all' ? 'default' : 'outline'}
                onClick={() => handleTypeFilter('all')}
              >
                全部类型
              </Button>
              <Button
                variant={typeFilter === 'night_phase' ? 'default' : 'outline'}
                onClick={() => handleTypeFilter('night_phase')}
              >
                夜晚阶段
              </Button>
              <Button
                variant={typeFilter === 'day_phase' ? 'default' : 'outline'}
                onClick={() => handleTypeFilter('day_phase')}
              >
                白天阶段
              </Button>
              <Button
                variant={typeFilter === 'action' ? 'default' : 'outline'}
                onClick={() => handleTypeFilter('action')}
              >
                动作节点
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant={activeFilter === 'all' ? 'default' : 'outline'}
                onClick={() => handleActiveFilter('all')}
              >
                全部状态
              </Button>
              <Button
                variant={activeFilter === 'active' ? 'default' : 'outline'}
                onClick={() => handleActiveFilter('active')}
              >
                已启用
              </Button>
              <Button
                variant={activeFilter === 'inactive' ? 'default' : 'outline'}
                onClick={() => handleActiveFilter('inactive')}
              >
                已禁用
              </Button>
            </div>

            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              创建节点
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNodes.map((node) => (
              <Card key={node.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{node.node_name}</CardTitle>
                        {node.is_system === 1 && (
                          <Badge variant="secondary">系统内置</Badge>
                        )}
                        {node.is_active === 0 && (
                          <Badge variant="destructive">已禁用</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {getNodeTypeBadge(node.node_type)}
                        <Badge variant="outline">{node.node_code}</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">节点代码</p>
                    <p className="text-sm font-mono">{node.node_code}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">超时时长</p>
                    <p className="text-sm">{node.timeout_seconds} 秒</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">下一节点规则</p>
                    <div className="flex gap-2">
                      {getNextRuleTypeBadge(node.next_node_rules?.type)}
                      {node.is_auto_advance === 1 && (
                        <Badge variant="default">自动推进</Badge>
                      )}
                    </div>
                  </div>

                  {node.description && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">描述</p>
                      <p className="text-sm">{node.description}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(node)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleActive(node)}
                    >
                      {node.is_active === 1 ? (
                        <>
                          <PowerOff className="w-4 h-4 mr-1" />
                          禁用
                        </>
                      ) : (
                        <>
                          <Power className="w-4 h-4 mr-1" />
                          启用
                        </>
                      )}
                    </Button>
                    {node.is_system === 0 && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(node.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        删除
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredNodes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">没有找到匹配的流程节点</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FlowNodeList;
