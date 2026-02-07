import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, LayoutDashboardHeader, LayoutDashboardMain, LayoutDashboardContent } from '@/components/ui/layout/LayoutDashboardComponents';
import { Database, Shield, FileText, BarChart3, Bot, Sliders, ScrollText, GitBranch, Layout } from 'lucide-react';
import { adminService, BoardWithAdmin, CardWithAdmin, SkillWithAdmin, GlobalConfigWithAdmin, ProcessWithAdmin, AIConfigWithAdmin } from '@/services/admin';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import BoardList from '@/components/admin/BoardList';
import BoardForm from '@/components/admin/BoardForm';
import CardList from '@/components/admin/CardList';
import CardForm from '@/components/admin/CardForm';
import SkillList from '@/components/admin/SkillList';
import SkillForm from '@/components/admin/SkillForm';
import GlobalConfigList from '@/components/admin/GlobalConfigList';
import GlobalConfigForm from '@/components/admin/GlobalConfigForm';
import ProcessList from '@/components/admin/ProcessList';
import ProcessForm from '@/components/admin/ProcessForm';
import AIConfigList from '@/components/admin/AIConfigList';
import AIConfigForm from '@/components/admin/AIConfigForm';
import ConfigLogList from '@/components/admin/ConfigLogList';
import FlowNodeList from '@/components/admin/FlowNodeList';
import FlowNodeForm from '@/components/admin/FlowNodeForm';
import BoardFlowConfig from '@/components/admin/BoardFlowConfig';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'boards' | 'cards' | 'skills' | 'configs' | 'processes' | 'ai' | 'logs' | 'flow-nodes' | 'board-flows'>('overview');
  const [showBoardForm, setShowBoardForm] = useState(false);
  const [editingBoard, setEditingBoard] = useState<BoardWithAdmin | null>(null);
  const [showCardForm, setShowCardForm] = useState(false);
  const [editingCard, setEditingCard] = useState<CardWithAdmin | null>(null);
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [editingSkill, setEditingSkill] = useState<SkillWithAdmin | null>(null);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<GlobalConfigWithAdmin | null>(null);
  const [showProcessForm, setShowProcessForm] = useState(false);
  const [editingProcess, setEditingProcess] = useState<ProcessWithAdmin | null>(null);
  const [showAIConfigForm, setShowAIConfigForm] = useState(false);
  const [editingAIConfig, setEditingAIConfig] = useState<AIConfigWithAdmin | null>(null);
  const [showFlowNodeForm, setShowFlowNodeForm] = useState(false);
  const [editingFlowNode, setEditingFlowNode] = useState<any>(null);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [showBoardFlowConfig, setShowBoardFlowConfig] = useState(false);
  const [selectedBoardForFlow, setSelectedBoardForFlow] = useState<any>(null);

  const queryClient = useQueryClient();

  const { data: boards, isLoading: boardsLoading } = useQuery({
    queryKey: ['admin-boards'],
    queryFn: () => adminService.getBoardsWithAdmin(),
  });

  const { data: cards, isLoading: cardsLoading } = useQuery({
    queryKey: ['admin-cards'],
    queryFn: () => adminService.getCardsWithAdmin(),
  });

  const { data: configs } = useQuery({
    queryKey: ['admin-global-configs'],
    queryFn: () => adminService.getGlobalConfigsWithAdmin(),
  });

  const { data: processes } = useQuery({
    queryKey: ['admin-processes'],
    queryFn: () => adminService.getProcessesWithAdmin(),
  });

  const { data: aiConfigs } = useQuery({
    queryKey: ['admin-ai-configs'],
    queryFn: () => adminService.getAIConfigsWithAdmin(),
  });

  const activeBoards = boards?.filter(b => b.is_delete === 0) || [];
  const activeCards = cards?.filter(c => c.is_delete === 0) || [];
  const activeConfigs = configs?.filter(c => c.is_delete === 0) || [];
  const activeProcesses = processes?.filter(p => p.is_delete === 0) || [];

  const stats = [
    {
      title: '板子总数',
      value: activeBoards.length,
      icon: <Database className="w-5 h-5 text-primary" />,
      trend: 'neutral' as const,
    },
    {
      title: '角色卡牌',
      value: activeCards.length,
      icon: <FileText className="w-5 h-5 text-primary" />,
      trend: 'neutral' as const,
    },
    {
      title: '全局配置',
      value: activeConfigs.length,
      icon: <Sliders className="w-5 h-5 text-primary" />,
      trend: 'neutral' as const,
    },
    {
      title: '流程配置',
      value: activeProcesses.length,
      icon: <Sliders className="w-5 h-5 text-primary" />,
      trend: 'neutral' as const,
    },
    {
      title: 'AI配置',
      value: aiConfigs?.length ?? 0,
      icon: <Bot className="w-5 h-5 text-primary" />,
      trend: 'neutral' as const,
    },
  ];

  const handleNavigateToGame = () => {
    navigate('/');
  };

  const handleCreateBoard = () => {
    setEditingBoard(null);
    setShowBoardForm(true);
  };

  const handleEditBoard = (board: BoardWithAdmin) => {
    setEditingBoard(board);
    setShowBoardForm(true);
  };

  const handleSaveBoard = (board: BoardWithAdmin) => {
    setShowBoardForm(false);
    setEditingBoard(null);
  };

  const handleCancelBoard = () => {
    setShowBoardForm(false);
    setEditingBoard(null);
  };

  const handleConfigureBoardFlow = (board: BoardWithAdmin) => {
    setSelectedBoardForFlow(board);
    setActiveTab('board-flows');
  };

  const handleCreateCard = () => {
    setEditingCard(null);
    setShowCardForm(true);
  };

  const handleEditCard = (card: CardWithAdmin) => {
    setEditingCard(card);
    setShowCardForm(true);
  };

  const handleSaveCard = (card: CardWithAdmin) => {
    setShowCardForm(false);
    setEditingCard(null);
  };

  const handleCancelCard = () => {
    setShowCardForm(false);
    setEditingCard(null);
  };

  const handleCreateSkill = () => {
    setEditingSkill(null);
    setShowSkillForm(true);
  };

  const handleEditSkill = (skill: SkillWithAdmin) => {
    setEditingSkill(skill);
    setShowSkillForm(true);
  };

  const handleSaveSkill = (skill: SkillWithAdmin) => {
    setShowSkillForm(false);
    setEditingSkill(null);
  };

  const handleCancelSkill = () => {
    setShowSkillForm(false);
    setEditingSkill(null);
  };

  const handleCreateConfig = () => {
    setEditingConfig(null);
    setShowConfigForm(true);
  };

  const handleEditConfig = (config: GlobalConfigWithAdmin) => {
    setEditingConfig(config);
    setShowConfigForm(true);
  };

  const handleSaveConfig = (config: GlobalConfigWithAdmin) => {
    setShowConfigForm(false);
    setEditingConfig(null);
  };

  const handleCancelConfig = () => {
    setShowConfigForm(false);
    setEditingConfig(null);
  };

  const handleCreateProcess = () => {
    setEditingProcess(null);
    setShowProcessForm(true);
  };

  const handleEditProcess = (process: ProcessWithAdmin) => {
    setEditingProcess(process);
    setShowProcessForm(true);
  };

  const handleSaveProcess = (process: ProcessWithAdmin) => {
    setShowProcessForm(false);
    setEditingProcess(null);
  };

  const handleCancelProcess = () => {
    setShowProcessForm(false);
    setEditingProcess(null);
  };

  const handleCreateAIConfig = () => {
    setEditingAIConfig(null);
    setShowAIConfigForm(true);
  };

  const handleEditAIConfig = (config: AIConfigWithAdmin) => {
    setEditingAIConfig(config);
    setShowAIConfigForm(true);
  };

  const handleSaveAIConfig = () => {
    setShowAIConfigForm(false);
    setEditingAIConfig(null);
    queryClient.invalidateQueries({ queryKey: ['admin-ai-configs'] });
  };

  const handleCancelAIConfig = () => {
    setShowAIConfigForm(false);
    setEditingAIConfig(null);
  };

  const handleCreateFlowNode = () => {
    setEditingFlowNode(null);
    setMode('create');
    setShowFlowNodeForm(true);
  };

  const handleEditFlowNode = (node: any) => {
    setEditingFlowNode(node);
    setMode('edit');
    setShowFlowNodeForm(true);
  };

  const handleSaveFlowNode = async (node: any) => {
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
        setShowFlowNodeForm(false);
        setEditingFlowNode(null);
      } else {
        throw new Error('保存失败');
      }
    } catch (error) {
      toast.error('保存失败', {
        description: '无法保存流程节点',
      });
    }
  };

  const handleCancelFlowNode = () => {
    setShowFlowNodeForm(false);
    setEditingFlowNode(null);
  };

  const handleSelectBoardForFlow = (board: any) => {
    setSelectedBoardForFlow(board);
    setShowBoardFlowConfig(true);
  };

  const handleCancelBoardFlowConfig = () => {
    setShowBoardFlowConfig(false);
    setSelectedBoardForFlow(null);
  };

  return (
    <LayoutDashboard>
      <LayoutDashboardHeader className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="font-display text-2xl font-bold text-left">后台管理</h1>
            <p className="text-muted-foreground text-sm text-left">狼人杀游戏管理系统</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleNavigateToGame}>
            返回游戏
          </Button>
        </div>
      </LayoutDashboardHeader>

      <LayoutDashboardMain className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {stat.icon}
                    <div>
                      <p className="text-xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.title}</p>
                    </div>
                  </div>
                  {stat.trend === 'up' && (
                    <div className="text-green-500 text-xs">↑</div>
                  )}
                  {stat.trend === 'down' && (
                    <div className="text-red-500 text-xs">↓</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-left">快速导航</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              <Button variant={activeTab === 'boards' ? 'default' : 'outline'} size="sm" className="h-16 flex items-center justify-start p-3" onClick={() => setActiveTab('boards')}>
                <Database className="w-5 h-5 mr-2 text-primary" />
                <div>
                  <div className="font-semibold text-sm">板子管理</div>
                  <div className="text-xs text-muted-foreground">配置游戏板子</div>
                </div>
              </Button>
              <Button variant={activeTab === 'cards' ? 'default' : 'outline'} size="sm" className="h-16 flex items-center justify-start p-3" onClick={() => setActiveTab('cards')}>
                <FileText className="w-5 h-5 mr-2 text-primary" />
                <div>
                  <div className="font-semibold text-sm">牌库管理</div>
                  <div className="text-xs text-muted-foreground">管理角色卡牌</div>
                </div>
              </Button>
              <Button variant={activeTab === 'skills' ? 'default' : 'outline'} size="sm" className="h-16 flex items-center justify-start p-3" onClick={() => setActiveTab('skills')}>
                <BarChart3 className="w-5 h-5 mr-2 text-primary" />
                <div>
                  <div className="font-semibold text-sm">技能管理</div>
                  <div className="text-xs text-muted-foreground">配置游戏技能</div>
                </div>
              </Button>
              <Button variant={activeTab === 'configs' ? 'default' : 'outline'} size="sm" className="h-16 flex items-center justify-start p-3" onClick={() => setActiveTab('configs')}>
                <Sliders className="w-5 h-5 mr-2 text-primary" />
                <div>
                  <div className="font-semibold text-sm">全局配置</div>
                  <div className="text-xs text-muted-foreground">配置游戏规则</div>
                </div>
              </Button>
              <Button variant={activeTab === 'processes' ? 'default' : 'outline'} size="sm" className="h-16 flex items-center justify-start p-3" onClick={() => setActiveTab('processes')}>
                <Sliders className="w-5 h-5 mr-2 text-primary" />
                <div>
                  <div className="font-semibold text-sm">流程配置</div>
                  <div className="text-xs text-muted-foreground">配置游戏流程</div>
                </div>
              </Button>
              <Button variant={activeTab === 'flow-nodes' ? 'default' : 'outline'} size="sm" className="h-16 flex items-center justify-start p-3" onClick={() => setActiveTab('flow-nodes')}>
                <GitBranch className="w-5 h-5 mr-2 text-primary" />
                <div>
                  <div className="font-semibold text-sm">流程节点</div>
                  <div className="text-xs text-muted-foreground">管理流程节点</div>
                </div>
              </Button>
              <Button variant={activeTab === 'board-flows' ? 'default' : 'outline'} size="sm" className="h-16 flex items-center justify-start p-3" onClick={() => setActiveTab('board-flows')}>
                <Layout className="w-5 h-5 mr-2 text-primary" />
                <div>
                  <div className="font-semibold text-sm">板子流程</div>
                  <div className="text-xs text-muted-foreground">配置板子流程</div>
                </div>
              </Button>
              <Button variant={activeTab === 'ai' ? 'default' : 'outline'} size="sm" className="h-16 flex items-center justify-start p-3" onClick={() => setActiveTab('ai')}>
                <Bot className="w-5 h-5 mr-2 text-primary" />
                <div>
                  <div className="font-semibold text-sm">AI玩家管理</div>
                  <div className="text-xs text-muted-foreground">配置AI玩家</div>
                </div>
              </Button>
              <Button variant={activeTab === 'logs' ? 'default' : 'outline'} size="sm" className="h-16 flex items-center justify-start p-3" onClick={() => setActiveTab('logs')}>
                <ScrollText className="w-5 h-5 mr-2 text-primary" />
                <div>
                  <div className="font-semibold text-sm">配置日志</div>
                  <div className="text-xs text-muted-foreground">查看配置变更记录</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </LayoutDashboardMain>

      <LayoutDashboardContent>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>系统概览</CardTitle>
                <CardDescription>当前系统状态和数据统计</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">活跃板子</p>
                    <p className="text-2xl font-bold">{activeBoards.length}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">角色卡牌</p>
                    <p className="text-2xl font-bold">{activeCards.length}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">全局配置</p>
                    <p className="text-2xl font-bold">{activeConfigs.length}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">流程配置</p>
                    <p className="text-2xl font-bold">{activeProcesses.length}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">AI配置</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">系统状态</p>
                    <p className="text-2xl font-bold text-green-500">正常运行</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'boards' && !showBoardForm && (
          <BoardList
            onCreateBoard={handleCreateBoard}
            onEditBoard={handleEditBoard}
            onDeleteBoard={(boardId) => adminService.deleteBoardWithAdmin(boardId)}
            onConfigureFlow={handleConfigureBoardFlow}
          />
        )}

        {activeTab === 'boards' && showBoardForm && (
          <BoardForm
            board={editingBoard}
            mode={editingBoard ? 'edit' : 'create'}
            onSave={handleSaveBoard}
            onCancel={handleCancelBoard}
          />
        )}

        {activeTab === 'cards' && !showCardForm && (
          <CardList
            onCreateCard={handleCreateCard}
            onEditCard={handleEditCard}
            onDeleteCard={(cardId) => adminService.deleteCardWithAdmin(cardId)}
          />
        )}

        {activeTab === 'cards' && showCardForm && (
          <CardForm
            card={editingCard}
            mode={editingCard ? 'edit' : 'create'}
            onSave={handleSaveCard}
            onCancel={handleCancelCard}
          />
        )}

        {activeTab === 'skills' && !showSkillForm && (
          <SkillList
            onCreateSkill={handleCreateSkill}
            onEditSkill={handleEditSkill}
            onDeleteSkill={(skillId) => adminService.deleteSkillWithAdmin(skillId)}
          />
        )}

        {activeTab === 'skills' && showSkillForm && (
          <SkillForm
            skill={editingSkill}
            mode={editingSkill ? 'edit' : 'create'}
            onSave={handleSaveSkill}
            onCancel={handleCancelSkill}
          />
        )}

        {activeTab === 'configs' && !showConfigForm && (
          <GlobalConfigList
            onCreateConfig={handleCreateConfig}
            onEditConfig={handleEditConfig}
            onDeleteConfig={(configId) => adminService.deleteGlobalConfigWithAdmin(configId)}
          />
        )}

        {activeTab === 'configs' && showConfigForm && (
          <GlobalConfigForm
            config={editingConfig}
            mode={editingConfig ? 'edit' : 'create'}
            onSave={handleSaveConfig}
            onCancel={handleCancelConfig}
          />
        )}

        {activeTab === 'processes' && !showProcessForm && (
          <ProcessList
            onCreateProcess={handleCreateProcess}
            onEditProcess={handleEditProcess}
            onDeleteProcess={(processId) => adminService.deleteProcessWithAdmin(processId)}
          />
        )}

        {activeTab === 'processes' && showProcessForm && (
          <ProcessForm
            process={editingProcess}
            mode={editingProcess ? 'edit' : 'create'}
            onSave={handleSaveProcess}
            onCancel={handleCancelProcess}
          />
        )}

        {activeTab === 'flow-nodes' && !showFlowNodeForm && (
          <FlowNodeList
            onCreateNode={handleCreateFlowNode}
            onEditNode={handleEditFlowNode}
            onDeleteNode={(nodeId) => {
              fetch(`/api/flow-nodes/${nodeId}`, {
                method: 'DELETE',
              });
            }}
          />
        )}
        {activeTab === 'flow-nodes' && showFlowNodeForm && (
          <FlowNodeForm
            node={editingFlowNode}
            mode={editingFlowNode ? 'edit' : 'create'}
            onSave={handleSaveFlowNode}
            onCancel={handleCancelFlowNode}
          />
        )}
        {activeTab === 'board-flows' && !showBoardFlowConfig && (
          <BoardFlowConfig board={selectedBoardForFlow} />
        )}
        {activeTab === 'ai' && !showAIConfigForm && (
          <AIConfigList
            onCreateConfig={handleCreateAIConfig}
            onEditConfig={handleEditAIConfig}
            onDeleteConfig={(configId) => adminService.deleteAIConfigWithAdmin(configId)}
          />
        )}
        {activeTab === 'ai' && showAIConfigForm && (
          <AIConfigForm
            config={editingAIConfig ?? undefined}
            mode={editingAIConfig ? 'edit' : 'create'}
            onSave={handleSaveAIConfig}
            onCancel={handleCancelAIConfig}
          />
        )}
        {activeTab === 'logs' && <ConfigLogList />}
      </LayoutDashboardContent>
    </LayoutDashboard>
  );
};

export default AdminDashboard;
