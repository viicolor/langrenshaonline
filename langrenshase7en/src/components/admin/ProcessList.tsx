import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, Search, Filter } from 'lucide-react';
import { ProcessWithAdmin, adminService } from '@/services/admin';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ProcessListProps {
  onCreateProcess: () => void;
  onEditProcess: (process: ProcessWithAdmin) => void;
  onDeleteProcess: (processId: string) => void;
}

const ProcessList = ({ onCreateProcess, onEditProcess, onDeleteProcess }: ProcessListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'game_flow' | 'phase_config' | 'action_config'>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  const queryClient = useQueryClient();

  const { data: processes, isLoading } = useQuery({
    queryKey: ['admin-processes'],
    queryFn: () => adminService.getProcessesWithAdmin(),
  });

  const filteredProcesses = processes?.filter(process => {
    const matchesSearch = process.process_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       process.process_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || process.process_type === filterType;
    const matchesActive = filterActive === 'all' ||
                       (filterActive === 'active' && process.is_active === 1) ||
                       (filterActive === 'inactive' && process.is_active === 0);
    return matchesSearch && matchesType && matchesActive;
  }) || [];

  const deleteProcessMutation = useMutation({
    mutationFn: (processId: string) => adminService.deleteProcessWithAdmin(processId),
    onSuccess: () => {
      toast.success('删除成功', {
        description: '流程已成功删除',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-processes'] });
    },
    onError: (error) => {
      toast.error('删除失败', {
        description: error.message || '删除流程失败，请稍后重试',
      });
    },
  });

  const handleDelete = (processId: string) => {
    if (confirm('确定要删除这个流程吗？')) {
      deleteProcessMutation.mutate(processId);
    }
  };

  const getTypeBadge = (type: string) => {
    if (type === 'game_flow') {
      return <Badge variant="default">游戏流程</Badge>;
    }
    if (type === 'phase_config') {
      return <Badge variant="secondary">阶段配置</Badge>;
    }
    if (type === 'action_config') {
      return <Badge variant="outline">动作配置</Badge>;
    }
    return <Badge variant="outline">{type}</Badge>;
  };

  const getActiveBadge = (isActive?: number) => {
    if (isActive === 1) {
      return <Badge variant="default" className="bg-green-500">启用</Badge>;
    }
    return <Badge variant="secondary">禁用</Badge>;
  };

  const getDefaultBadge = (isDefault?: number) => {
    if (isDefault === 1) {
      return <Badge variant="default" className="bg-yellow-500">默认</Badge>;
    }
    return null;
  };

  const getPhaseConfigPreview = (process: ProcessWithAdmin) => {
    const phaseConfig = process.phase_config as any;
    
    if (!phaseConfig || !phaseConfig.phases) {
      return '无阶段配置';
    }

    const phases = phaseConfig.phases || [];
    return phases.map((phase: any, index: number) => {
      const phaseName = phase.name || `阶段${index + 1}`;
      const actions = phase.actions || [];
      return `${phaseName}（${phase.duration || 0}秒）：${actions.join('、') || '无动作'} → ${phase.next_phase || '结束'}`;
    }).join('\n');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>流程列表</CardTitle>
            <Button onClick={onCreateProcess} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              创建流程
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索流程..."
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
                variant={filterType === 'game_flow' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('game_flow')}
              >
                游戏流程
              </Button>
              <Button
                variant={filterType === 'phase_config' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('phase_config')}
              >
                阶段配置
              </Button>
              <Button
                variant={filterType === 'action_config' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('action_config')}
              >
                动作配置
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterActive === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterActive('all')}
              >
                全部
              </Button>
              <Button
                variant={filterActive === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterActive('active')}
              >
                启用
              </Button>
              <Button
                variant={filterActive === 'inactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterActive('inactive')}
              >
                禁用
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-transparent"></div>
              <p className="mt-4 text-muted-foreground">加载中...</p>
            </div>
          ) : filteredProcesses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">暂无流程</p>
              <Button onClick={onCreateProcess} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                创建第一个流程
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProcesses.map(process => (
                <Card key={process.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{process.process_name}</CardTitle>
                          {getDefaultBadge(process.is_default)}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {getTypeBadge(process.process_type)}
                          {getActiveBadge(process.is_active)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onEditProcess(process)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(process.id)}
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
                        <p className="text-sm text-muted-foreground">流程代码</p>
                        <p className="font-semibold">{process.process_code}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">阶段配置</p>
                        <p className="text-sm font-mono bg-muted/50 p-2 rounded whitespace-pre-wrap">{getPhaseConfigPreview(process)}</p>
                      </div>
                      {process.description && (
                        <div>
                          <p className="text-sm text-muted-foreground">描述</p>
                          <p className="text-sm">{process.description}</p>
                        </div>
                      )}
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

export default ProcessList;
