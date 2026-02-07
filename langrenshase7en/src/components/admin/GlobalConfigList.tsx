import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, Search, Filter } from 'lucide-react';
import { GlobalConfigWithAdmin, adminService } from '@/services/admin';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface GlobalConfigListProps {
  onCreateConfig: () => void;
  onEditConfig: (config: GlobalConfigWithAdmin) => void;
  onDeleteConfig: (configId: string) => void;
}

const ENV_TYPE_LABELS: Record<number, string> = {
  1: '测试服',
  2: '正式服',
  3: '全局',
};

const GlobalConfigList = ({ onCreateConfig, onEditConfig, onDeleteConfig }: GlobalConfigListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'rule' | 'setting' | 'parameter'>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterEnvType, setFilterEnvType] = useState<number | 'all'>('all');

  const queryClient = useQueryClient();

  const { data: configs, isLoading } = useQuery({
    queryKey: ['admin-global-configs'],
    queryFn: () => adminService.getGlobalConfigsWithAdmin(),
  });

  const filteredConfigs = configs?.filter(config => {
    const matchesSearch = config.config_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       config.config_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || config.config_type === filterType;
    const matchesActive = filterActive === 'all' ||
                       (filterActive === 'active' && config.is_active === 1) ||
                       (filterActive === 'inactive' && config.is_active === 0);
    const matchesEnv = filterEnvType === 'all' || (config.env_type ?? 3) === filterEnvType;
    return matchesSearch && matchesType && matchesActive && matchesEnv;
  }) || [];

  const deleteConfigMutation = useMutation({
    mutationFn: (configId: string) => adminService.deleteGlobalConfigWithAdmin(configId),
    onSuccess: () => {
      toast.success('删除成功', {
        description: '配置已成功删除',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-global-configs'] });
    },
    onError: (error) => {
      toast.error('删除失败', {
        description: error.message || '删除配置失败，请稍后重试',
      });
    },
  });

  const handleDelete = (configId: string) => {
    if (confirm('确定要删除这个配置吗？')) {
      deleteConfigMutation.mutate(configId);
    }
  };

  const getTypeBadge = (type: string) => {
    if (type === 'rule') {
      return <Badge variant="default">规则</Badge>;
    }
    if (type === 'setting') {
      return <Badge variant="secondary">设置</Badge>;
    }
    if (type === 'parameter') {
      return <Badge variant="outline">参数</Badge>;
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

  const getEnvTypeBadge = (envType?: number) => {
    const t = envType ?? 3;
    const label = ENV_TYPE_LABELS[t] ?? `环境${t}`;
    return <Badge variant="outline" className="text-xs">{label}</Badge>;
  };

  const getConfigValuePreview = (config: GlobalConfigWithAdmin) => {
    const value = config.config_value as any;
    
    if (config.config_code === 'vote_rule') {
      return `投票类型：${value.vote_type === 'majority' ? '多数决' : value.vote_type === 'simple' ? '简单多数' : 'PK'}，时长：${value.vote_duration}秒`;
    }
    if (config.config_code === 'speak_rule') {
      return `发言顺序：${value.speak_order === 'random' ? '随机' : value.speak_order === 'clockwise' ? '顺时针' : '逆时针'}，时长：${value.speak_duration}秒`;
    }
    if (config.config_code === 'death_rule') {
      return `死亡发言：${value.can_speak_after_death ? '允许' : '不允许'}，死亡投票：${value.can_vote_after_death ? '允许' : '不允许'}，身份揭示：${value.reveal_identity === 'immediate' ? '立即' : value.reveal_identity === 'end_of_game' ? '游戏结束' : '从不'}`;
    }
    if (config.config_code === 'game_setting') {
      return `夜晚时长：${value.night_duration}秒，白天时长：${value.day_duration}秒，最大人数：${value.max_players}，最小人数：${value.min_players}`;
    }
    
    return JSON.stringify(value, null, 2);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>全局配置列表</CardTitle>
            <Button onClick={onCreateConfig} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              创建配置
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索配置..."
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
                variant={filterType === 'rule' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('rule')}
              >
                规则
              </Button>
              <Button
                variant={filterType === 'setting' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('setting')}
              >
                设置
              </Button>
              <Button
                variant={filterType === 'parameter' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('parameter')}
              >
                参数
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
            <div className="flex gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground self-center">环境：</span>
              <Button
                variant={filterEnvType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterEnvType('all')}
              >
                全部
              </Button>
              {[1, 2, 3].map(t => (
                <Button
                  key={t}
                  variant={filterEnvType === t ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterEnvType(t)}
                >
                  {ENV_TYPE_LABELS[t]}
                </Button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-transparent"></div>
              <p className="mt-4 text-muted-foreground">加载中...</p>
            </div>
          ) : filteredConfigs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">暂无配置</p>
              <Button onClick={onCreateConfig} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                创建第一个配置
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredConfigs.map(config => (
                <Card key={config.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{config.config_name}</CardTitle>
                          {getDefaultBadge(config.is_default)}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {getTypeBadge(config.config_type)}
                          {getActiveBadge(config.is_active)}
                          {getEnvTypeBadge(config.env_type)}
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
                        <p className="text-sm text-muted-foreground">配置代码</p>
                        <p className="font-semibold">{config.config_code}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">配置值</p>
                        <p className="text-sm font-mono bg-muted/50 p-2 rounded">{getConfigValuePreview(config)}</p>
                      </div>
                      {config.description && (
                        <div>
                          <p className="text-sm text-muted-foreground">描述</p>
                          <p className="text-sm">{config.description}</p>
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

export default GlobalConfigList;
