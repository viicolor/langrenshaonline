import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, Search, Key } from 'lucide-react';
import { AIConfigWithAdmin, adminService } from '@/services/admin';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AIConfigListProps {
  onCreateConfig: () => void;
  onEditConfig: (config: AIConfigWithAdmin) => void;
  onDeleteConfig: (configId: string) => void;
}

const AIConfigList = ({ onCreateConfig, onEditConfig, onDeleteConfig }: AIConfigListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProvider, setFilterProvider] = useState<'all' | 'openai' | 'qwen' | 'mcp'>('all');

  const queryClient = useQueryClient();

  const { data: configs, isLoading } = useQuery({
    queryKey: ['admin-ai-configs'],
    queryFn: () => adminService.getAIConfigsWithAdmin(),
  });

  const filteredConfigs = configs?.filter(config => {
    const matchesSearch = config.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (config.model || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider = filterProvider === 'all' || config.provider === filterProvider;
    return matchesSearch && matchesProvider;
  }) || [];

  const deleteConfigMutation = useMutation({
    mutationFn: (configId: string) => adminService.deleteAIConfigWithAdmin(configId),
    onSuccess: () => {
      toast.success('删除成功', {
        description: 'AI 配置已成功删除',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-ai-configs'] });
    },
    onError: (error) => {
      toast.error('删除失败', {
        description: error.message || '删除 AI 配置失败，请稍后重试',
      });
    },
  });

  const handleDelete = (configId: string) => {
    if (confirm('确定要删除这个 AI 配置吗？删除后使用该配置的 AI 玩家将无法正常工作。')) {
      deleteConfigMutation.mutate(configId);
    }
  };

  const getProviderBadge = (provider: string) => {
    switch (provider) {
      case 'openai':
        return <Badge variant="default" className="bg-green-600">OpenAI</Badge>;
      case 'qwen':
        return <Badge variant="default" className="bg-blue-600">通义千问</Badge>;
      case 'mcp':
        return <Badge variant="default" className="bg-purple-600">MCP</Badge>;
      default:
        return <Badge variant="outline">{provider}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>AI 配置列表</CardTitle>
            <Button onClick={onCreateConfig} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              添加配置
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索配置名称或模型..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterProvider === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterProvider('all')}
              >
                全部
              </Button>
              <Button
                variant={filterProvider === 'openai' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterProvider('openai')}
              >
                OpenAI
              </Button>
              <Button
                variant={filterProvider === 'qwen' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterProvider('qwen')}
              >
                通义千问
              </Button>
              <Button
                variant={filterProvider === 'mcp' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterProvider('mcp')}
              >
                MCP
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-transparent"></div>
              <p className="mt-4 text-muted-foreground">加载中...</p>
            </div>
          ) : filteredConfigs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">暂无 AI 配置</p>
              <p className="text-sm text-muted-foreground mt-2">添加 OpenAI、通义千问或 MCP 接口配置以启用 AI 玩家</p>
              <Button onClick={onCreateConfig} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                添加第一个配置
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredConfigs.map(config => (
                <Card key={config.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {config.name}
                          {config.api_key && (
                            <Key className="w-4 h-4 text-muted-foreground" title="已配置 API Key" />
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          {getProviderBadge(config.provider)}
                          {config.is_active ? (
                            <Badge variant="default" className="bg-green-500">启用</Badge>
                          ) : (
                            <Badge variant="secondary">禁用</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onEditConfig(config)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(config.id)}
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
                        <p className="text-sm text-muted-foreground">模型</p>
                        <p className="font-semibold">{config.model || '-'}</p>
                      </div>
                      {config.endpoint && (
                        <div>
                          <p className="text-sm text-muted-foreground">端点</p>
                          <p className="text-sm font-mono truncate" title={config.endpoint}>
                            {config.endpoint}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground">API Key</p>
                        <p className="text-sm">
                          {config.api_key ? '••••••••••••' + String(config.api_key).slice(-4) : '未配置'}
                        </p>
                      </div>
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

export default AIConfigList;
