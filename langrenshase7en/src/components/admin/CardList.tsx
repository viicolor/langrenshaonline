import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, Search, Filter } from 'lucide-react';
import { CardWithAdmin, adminService } from '@/services/admin';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface CardListProps {
  onCreateCard: () => void;
  onEditCard: (card: CardWithAdmin) => void;
  onDeleteCard: (cardId: string) => void;
}

const CardList = ({ onCreateCard, onEditCard, onDeleteCard }: CardListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'role' | 'skill'>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterCamp, setFilterCamp] = useState<'all' | 'werewolf' | 'good' | 'neutral'>('all');

  const queryClient = useQueryClient();

  const { data: cards, isLoading } = useQuery({
    queryKey: ['admin-cards'],
    queryFn: () => adminService.getCardsWithAdmin(),
  });

  const { data: skills } = useQuery({
    queryKey: ['admin-skills'],
    queryFn: () => adminService.getSkillsWithAdmin(),
  });

  const filteredCards = cards?.filter(card => {
    const matchesSearch = card.card_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (card.card_alias && card.card_alias.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' || card.card_type === filterType;
    const matchesActive = filterActive === 'all' ||
                       (filterActive === 'active' && card.is_active === 1) ||
                       (filterActive === 'inactive' && card.is_active === 0);
    const matchesCamp = filterCamp === 'all' || card.camp === filterCamp;
    return matchesSearch && matchesType && matchesActive && matchesCamp;
  }) || [];

  const deleteCardMutation = useMutation({
    mutationFn: (cardId: string) => adminService.deleteCardWithAdmin(cardId),
    onSuccess: () => {
      toast.success('删除成功', {
        description: '卡牌已成功删除',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-cards'] });
    },
    onError: (error) => {
      toast.error('删除失败', {
        description: error.message || '删除卡牌失败，请稍后重试',
      });
    },
  });

  const handleDelete = (cardId: string) => {
    if (confirm('确定要删除这个卡牌吗？')) {
      deleteCardMutation.mutate(cardId);
    }
  };

  const getCampBadge = (camp?: string) => {
    if (!camp) return null;
    if (camp === 'werewolf') {
      return <Badge variant="default" className="bg-red-500">狼人</Badge>;
    }
    if (camp === 'good') {
      return <Badge variant="default" className="bg-green-500">好人</Badge>;
    }
    if (camp === 'neutral') {
      return <Badge variant="default" className="bg-gray-500">中立</Badge>;
    }
    return <Badge variant="outline">{camp}</Badge>;
  };

  const getSkillName = (skillId?: string) => {
    if (!skillId) return '无技能';
    const skill = skills?.find(s => s.id === skillId);
    return skill?.skill_name || '未知技能';
  };

  const getTypeBadge = (type: string) => {
    if (type === 'role') {
      return <Badge variant="default">角色</Badge>;
    }
    if (type === 'skill') {
      return <Badge variant="secondary">技能</Badge>;
    }
    return <Badge variant="outline">{type}</Badge>;
  };

  const getActiveBadge = (isActive?: number) => {
    if (isActive === 1) {
      return <Badge variant="default" className="bg-green-500">启用</Badge>;
    }
    return <Badge variant="secondary">禁用</Badge>;
  };

  const getDifficultyBadge = (difficult?: number) => {
    if (!difficult) return null;
    if (difficult === 1) {
      return <Badge variant="default" className="bg-blue-500">简单</Badge>;
    }
    if (difficult === 2) {
      return <Badge variant="default" className="bg-yellow-500">中等</Badge>;
    }
    if (difficult === 3) {
      return <Badge variant="default" className="bg-red-500">困难</Badge>;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>卡牌列表</CardTitle>
            <Button onClick={onCreateCard} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              创建卡牌
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索卡牌..."
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
                variant={filterType === 'role' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('role')}
              >
                角色
              </Button>
              <Button
                variant={filterType === 'skill' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('skill')}
              >
                技能
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
            <div className="flex gap-2">
              <Button
                variant={filterCamp === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterCamp('all')}
              >
                全部
              </Button>
              <Button
                variant={filterCamp === 'werewolf' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterCamp('werewolf')}
              >
                狼人
              </Button>
              <Button
                variant={filterCamp === 'good' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterCamp('good')}
              >
                好人
              </Button>
              <Button
                variant={filterCamp === 'neutral' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterCamp('neutral')}
              >
                中立
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-transparent"></div>
              <p className="mt-4 text-muted-foreground">加载中...</p>
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">暂无卡牌</p>
              <Button onClick={onCreateCard} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                创建第一个卡牌
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCards.map(card => (
                <Card key={card.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {card.skill_icon && (
                            <span className="text-2xl">{card.skill_icon}</span>
                          )}
                          <CardTitle className="text-lg">{card.card_name}</CardTitle>
                          {card.card_alias && (
                            <Badge variant="outline" className="ml-2">
                              {card.card_alias}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {getCampBadge(card.camp)}
                          {getTypeBadge(card.card_type)}
                          {getActiveBadge(card.is_active)}
                          {getDifficultyBadge(card.difficult)}
                          {card.recommend === 1 && (
                            <Badge variant="default" className="bg-yellow-500">
                              推荐
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onEditCard(card)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(card.id)}
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
                        <p className="text-sm text-muted-foreground">阵营</p>
                        <p className="font-semibold">{getCampBadge(card.camp)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">角色类型</p>
                        <p className="font-semibold">{card.role_type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">关联技能</p>
                        <p className="font-semibold">{getSkillName(card.skill_id)}</p>
                      </div>
                      {card.skill_description && (
                        <div>
                          <p className="text-sm text-muted-foreground">技能描述</p>
                          <p className="text-sm">{card.skill_description}</p>
                        </div>
                      )}
                      {card.desc && (
                        <div>
                          <p className="text-sm text-muted-foreground">描述</p>
                          <p className="text-sm">{card.desc}</p>
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

export default CardList;
