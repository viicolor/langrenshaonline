import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, Search, Filter, Settings } from 'lucide-react';
import { BoardWithAdmin, adminService } from '@/services/admin';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface BoardListProps {
  onCreateBoard: () => void;
  onEditBoard: (board: BoardWithAdmin) => void;
  onDeleteBoard: (boardId: string) => void;
  onConfigureFlow: (board: BoardWithAdmin) => void;
}

const BoardList = ({ onCreateBoard, onEditBoard, onDeleteBoard, onConfigureFlow }: BoardListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const queryClient = useQueryClient();

  const { data: boards, isLoading } = useQuery({
    queryKey: ['admin-boards'],
    queryFn: () => adminService.getBoardsWithAdmin(),
  });

  const filteredBoards = boards?.filter(board => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return board.status === 1 || (board.status === undefined || board.status === null);
    if (filterStatus === 'inactive') return board.status === 0;
    return false;
  }) || [];

  const deleteBoardMutation = useMutation({
    mutationFn: (boardId: string) => adminService.deleteBoardWithAdmin(boardId),
    onSuccess: () => {
      toast.success('删除成功', {
        description: '板子已成功删除',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-boards'] });
    },
    onError: (error) => {
      toast.error('删除失败', {
        description: error.message || '删除板子失败，请稍后重试',
      });
    },
  });

  const handleDelete = (boardId: string) => {
    if (confirm('确定要删除这个板子吗？')) {
      deleteBoardMutation.mutate(boardId);
    }
  };

  const getStatusBadge = (status: number) => {
    if (status === 1) {
      return <Badge variant="default">上线</Badge>;
    }
    if (status === 0) {
      return <Badge variant="secondary">下线</Badge>;
    }
    return <Badge variant="outline">测试</Badge>;
  };

  const getDifficultyBadge = (difficult?: number) => {
    if (!difficult) return null;
    if (difficult === 1) {
      return <Badge variant="default" className="bg-green-500">新手</Badge>;
    }
    if (difficult === 2) {
      return <Badge variant="default" className="bg-yellow-500">进阶</Badge>;
    }
    if (difficult === 3) {
      return <Badge variant="default" className="bg-red-500">娱乐</Badge>;
    }
    return null;
  };

  const getBoardDescription = (board: BoardWithAdmin) => {
    const rolesCount: Record<string, number> = {};
    board.roles?.forEach(role => {
      rolesCount[role.role_type] = role.count;
    });

    const descriptions: string[] = [];
    if (rolesCount.werewolf) descriptions.push(`${rolesCount.werewolf}狼`);
    if (rolesCount.villager) descriptions.push(`${rolesCount.villager}民`);
    if (rolesCount.seer) descriptions.push(`${rolesCount.seer}预言家`);
    if (rolesCount.witch) descriptions.push(`${rolesCount.witch}女巫`);
    if (rolesCount.hunter) descriptions.push(`${rolesCount.hunter}猎人`);
    if (rolesCount.guard) descriptions.push(`${rolesCount.guard}守卫`);
    if (rolesCount.idiot) descriptions.push(`${rolesCount.idiot}白痴`);

    return descriptions.join('、');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>板子列表</CardTitle>
            <Button onClick={onCreateBoard} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              创建板子
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索板子..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
              >
                全部
              </Button>
              <Button
                variant={filterStatus === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('active')}
              >
                上线
              </Button>
              <Button
                variant={filterStatus === 'inactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('inactive')}
              >
                下线
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-transparent"></div>
              <p className="mt-4 text-muted-foreground">加载中...</p>
            </div>
          ) : filteredBoards.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">暂无板子</p>
              <Button onClick={onCreateBoard} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                创建第一个板子
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBoards.map(board => (
                <Card key={board.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{board.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          {getStatusBadge(board.status || 0)}
                          {getDifficultyBadge(board.difficult)}
                          {board.recommend === 1 && (
                            <Badge variant="default" className="bg-yellow-500 ml-2">
                              推荐
                            </Badge>
                          )}
                        </div>
                      </div>
                      {board.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {board.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onEditBoard(board)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onConfigureFlow(board)}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(board.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">玩家数量</p>
                          <p className="text-2xl font-bold">{board.player_num || board.player_count}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">板子类型</p>
                          <p className="text-2xl font-bold">{board.board_alias || board.name}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">难度</p>
                        <p className="text-2xl font-bold">
                          {board.difficult === 1 && '新手'}
                          {board.difficult === 2 && '进阶'}
                          {board.difficult === 3 && '娱乐'}
                          {!board.difficult && '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">角色配置</p>
                        <p className="text-sm font-semibold">{getBoardDescription(board)}</p>
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

export default BoardList;
