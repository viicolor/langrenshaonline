import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Room } from '@/types/game';
import { Plus, Users, LogOut, RefreshCw, Moon } from 'lucide-react';
import RoomCard from '@/components/game/RoomCard';
import { authService } from '@/services/auth';
import { roomService } from '@/services/room';
import { boardService } from '@/services/board';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PLAYER_COUNT_OPTIONS = [9, 10, 12, 15] as const;

const Lobby = () => {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [playerCount, setPlayerCount] = useState<number>(12);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const currentUser = authService.getCurrentUser();

  const { data: rooms = [], refetch: refetchRooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomService.getRooms(),
  });

  const { data: roomPlayerCounts = {} } = useQuery({
    queryKey: ['roomPlayerCounts', rooms.map(r => r.id).sort().join(',')],
    queryFn: () => roomService.getRoomPlayerCounts(rooms.map(r => r.id)),
    enabled: rooms.length > 0,
  });

  const { data: roomHostNames = {} } = useQuery({
    queryKey: ['roomHostNames', rooms.map(r => r.id).sort().join(',')],
    queryFn: () => roomService.getRoomHostNames(rooms.map(r => r.id)),
    enabled: rooms.length > 0,
  });

  useEffect(() => {
    const unsubscribe = roomService.subscribeToRooms(() => {
      refetchRooms();
    });
    return unsubscribe;
  }, [refetchRooms]);

  const { data: boards = [] } = useQuery({
    queryKey: ['boards'],
    queryFn: () => boardService.getBoards(),
  });

  useEffect(() => {
    if (!showCreateDialog || boards.length === 0) return;
    const recommended = boardService.getRecommendedBoardByPlayerCount(boards, playerCount);
    setSelectedBoardId(recommended?.id ?? boards[0].id);
  }, [showCreateDialog, playerCount, boards]);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/');
    }
  }, [navigate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchRooms();
    setIsRefreshing(false);
    toast.success('房间列表已刷新');
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      toast.error('请输入房间名称');
      return;
    }

    if (!currentUser) {
      toast.error('请先登录');
      return;
    }

    const newRoom = await roomService.createRoom(
      {
        name: roomName,
        boardId: selectedBoardId || undefined,
        maxPlayers: playerCount,
        aiPlayerCount: 0,
      },
      currentUser.id
    );

    if (newRoom) {
      toast.success('房间创建成功');
      setShowCreateDialog(false);
      setRoomName('');
      navigate(`/room/${newRoom.id}`);
    } else {
      toast.error('创建房间失败');
    }
  };

  const handleJoinRoom = (roomId: string) => {
    navigate(`/room/${roomId}`);
  };

  const handleLogout = () => {
    authService.logout();
    toast.success('已退出登录');
    navigate('/');
  };

  const selectedBoard = boards.find(b => b.id === selectedBoardId);

  return (
    <div className="min-h-screen bg-night">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Moon className="w-6 h-6 text-primary" />
            <h1 className="font-display text-xl font-bold text-gradient-gold">游戏大厅</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="hidden sm:inline">{currentUser?.username || '玩家'}</span>
            </div>
            <Button
              variant="night"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <Button
            variant="gold"
            size="lg"
            onClick={() => setShowCreateDialog(true)}
            className="w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" />
            创建房间
          </Button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span className="text-sm">
              当前 <span className="text-primary font-bold">{rooms.length}</span> 个房间
            </span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="text-sm text-muted-foreground">
            <span className="text-role-villager">{rooms.filter(r => r.status === 'waiting').length}</span> 等待中 · 
            <span className="text-wolf-red ml-1">{rooms.filter(r => r.status === 'playing').length}</span> 游戏中
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room, index) => {
            const board = boards.find(b => b.id === room.board_id);
            const boardName = board ? ((board as { name?: string; board_name?: string }).name ?? (board as { board_name?: string }).board_name) : undefined;
            return (
              <div
                key={room.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <RoomCard
                  room={{
                    id: room.id,
                    name: room.name,
                    playerCount: roomPlayerCounts[room.id] ?? 0,
                    maxPlayers: room.max_players,
                    status: room.status as 'waiting' | 'playing' | 'finished',
                    host: roomHostNames[room.id] ?? '房主',
                    createdAt: new Date(room.created_at),
                    boardName: boardName ?? undefined,
                  }}
                  onJoin={() => handleJoinRoom(room.id)}
                />
              </div>
            );
          })}
        </div>

        {rooms.length === 0 && (
          <div className="text-center py-20">
            <Moon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">暂无房间，快来创建第一个吧</p>
          </div>
        )}
      </main>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>创建房间</DialogTitle>
            <DialogDescription>
              配置房间参数，创建一个新的游戏房间
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="room-name">房间名称</Label>
              <Input
                id="room-name"
                placeholder="请输入房间名称"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="player-count">游戏人数</Label>
              <Select
                value={String(playerCount)}
                onValueChange={(v) => setPlayerCount(Number(v))}
              >
                <SelectTrigger id="player-count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAYER_COUNT_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} 人
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                将推荐对应人数的板子
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="board-select">板子配置</Label>
              <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
                <SelectTrigger id="board-select">
                  <SelectValue placeholder="选择板子配置" />
                </SelectTrigger>
                <SelectContent>
                  {boards.map((board) => (
                    <SelectItem key={board.id} value={board.id}>
                      {board.name} ({board.player_count}人) - {boardService.getBoardDescription(board)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button variant="gold" onClick={handleCreateRoom}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Lobby;
