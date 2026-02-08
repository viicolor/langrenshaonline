import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Player, RoleType, ROLE_INFO } from '@/types/game';
import { ArrowLeft, Crown, Moon, Users, Volume2, VolumeX, Eye, Check, X, Play, FileText, BarChart3, Zap, Shield, ShieldOff } from 'lucide-react';
import RoundTable from '@/components/game/RoundTable';
import RoleCard from '@/components/game/RoleCard';
import RoleSkill from '@/components/game/RoleSkill';
import RoomChat from '@/components/game/RoomChat';
import VotingSystem, { type Vote } from '@/components/game/VotingSystem';
import DeathAnnouncementCard from '@/components/game/DeathAnnouncementCard';
import HunterShotSheet from '@/components/game/HunterShotSheet';
import VictoryOverlay from '@/components/game/VictoryOverlay';
import IdentityOverlay from '@/components/game/IdentityOverlay';
import WerewolfChat from '@/components/game/WerewolfChat';
import SheriffCampaignPanel from '@/components/game/SheriffCampaignPanel';
import { sheriffService, type SheriffState } from '@/services/sheriff';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import PerspectiveSelector, { Perspective } from '@/components/game/PerspectiveSelector';
import SpectatorRecord, { SpectatorRecord as SpectatorRecordType } from '@/components/game/SpectatorRecord';
import GameStats from '@/components/game/GameStats';
import GameFlowPanel from '@/components/game/GameFlowPanel';
import { authService } from '@/services/auth';
import { roomService, type RoomPlayer } from '@/services/room';
import { boardService } from '@/services/board';
import { gameService } from '@/services/game';
import { gameService as gameEngineService, type VotingPkState } from '@/services/gameEngine';
import { gameConfigService } from '@/services/gameConfig';
import { toast } from 'sonner';

const GameRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedSeat, setSelectedSeat] = useState<number | undefined>(undefined);
  const [showPerspectiveSelector, setShowPerspectiveSelector] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [perspective, setPerspective] = useState<Perspective | null>(null);
  const [joinMode, setJoinMode] = useState<'play' | 'spectate' | null>(null);
  const [showRoleCard, setShowRoleCard] = useState(false);
  const [myRole, setMyRole] = useState<RoleType | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showAddAIPlayerDialog, setShowAddAIPlayerDialog] = useState(false);
  const [aiPlayerCountToAdd, setAiPlayerCountToAdd] = useState(1);
  const [showSpectatorPanel, setShowSpectatorPanel] = useState(false);
  const [showIdentityOverlay, setShowIdentityOverlay] = useState(false);
  const [sheriffCallTargetSeat, setSheriffCallTargetSeat] = useState<number | null>(null);
  const lastIdentityGameRef = useRef<string | null>(null);

  const currentUser = authService.getCurrentUser();
  const { data: room } = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => roomService.getRoomById(roomId || ''),
    enabled: !!roomId,
  });
  const { data: gameRecord } = useQuery({
    queryKey: ['gameRecord', roomId],
    queryFn: () => gameService.getCurrentGameRecord(roomId || ''),
    enabled: !!roomId && room?.status === 'playing',
    refetchInterval: room?.status === 'playing' ? 2000 : false,
  });

  const { data: lastEndedGameRecord } = useQuery({
    queryKey: ['lastEndedGameRecord', roomId],
    queryFn: () => gameService.getLastEndedGameRecord(roomId || ''),
    enabled: !!roomId && room?.status === 'finished',
  });

  const { data: gameConfig } = useQuery({
    queryKey: ['gameConfig', room?.board_id],
    queryFn: () => gameConfigService.getGameConfig(room?.board_id ?? undefined),
    enabled: !!room?.board_id && room?.status === 'playing',
  });
  const configCards = gameConfig?.cards ?? [];

  const { data: allRoomMessages = [] } = useQuery({
    queryKey: ['allRoomMessages', roomId, gameRecord?.id],
    queryFn: () => roomService.getRoomMessages(roomId || '', 300),
    enabled: !!roomId && room?.status === 'playing' && isSpectator,
    refetchInterval: isSpectator ? 3000 : false,
  });

  const spectatorRecords: SpectatorRecordType[] = allRoomMessages
    .filter((m) => m.game_record_id === gameRecord?.id)
    .map((m) => {
      const msg = m as { message_type?: string; message?: string; phase?: string; round_number?: number; created_at?: string;[key: string]: unknown };
      const msgType = msg.message_type ?? 'text';
      let recType: SpectatorRecordType['type'] = 'phase_change';
      if (msgType === 'system' && String(msg.message || '').includes('死亡')) recType = 'player_death';
      else if (msgType.startsWith('skill_')) recType = 'skill_used';
      else if (msgType === 'vote') recType = 'vote_cast';
      else if (msgType === 'speech') recType = 'phase_change';
      return {
        id: (m as { id?: string }).id ?? '',
        gameId: gameRecord?.id ?? '',
        roomId: roomId ?? '',
        type: recType,
        data: {
          message: msg.message ?? '',
          phase: msg.phase ?? '',
          round: msg.round_number ?? 0,
          actorCamp: msgType === 'skill_werewolf' ? 'werewolf' : msgType === 'skill_good' ? 'good' : undefined,
        },
        timestamp: msg.created_at ? new Date(msg.created_at).getTime() : Date.now(),
      } as SpectatorRecordType;
    });
  const [showGameStats, setShowGameStats] = useState(false);
  /** 对局阶段与倒计时（来自流程配置），仅在前端展示，后续可改为从服务端同步 */
  const [gamePhase, setGamePhase] = useState<'night' | 'day' | 'voting' | 'hunter_shot' | 'sheriff_campaign' | 'sheriff_transfer' | 'waiting'>('waiting');
  const [hunterShotTargetId, setHunterShotTargetId] = useState<string | null>(null);
  const [nightSkillSheetOpen, setNightSkillSheetOpen] = useState(true);
  const [gameRound, setGameRound] = useState(1);
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(0);
  /** 全体准备后房主看到的自动开始倒计时（5→0 秒） */
  const [autoStartCountdown, setAutoStartCountdown] = useState<number | null>(null);

  const { data: board } = useQuery({
    queryKey: ['board', room?.board_id],
    queryFn: () => boardService.getBoardById(room?.board_id || ''),
    enabled: !!room?.board_id,
  });

  const { data: roomPlayers = [], refetch: refetchPlayers } = useQuery({
    queryKey: ['roomPlayers', roomId],
    queryFn: () => roomService.getRoomPlayers(roomId || ''),
    enabled: !!roomId,
  });

  const { data: roundActions = [] } = useQuery({
    queryKey: ['roundActions', gameRecord?.id, gameRound],
    queryFn: () => gameService.getActionsForRound(gameRecord!.id, gameRound),
    enabled:
      !!gameRecord?.id &&
      room?.status === 'playing' &&
      (gamePhase === 'night' || gamePhase === 'voting' || gamePhase === 'hunter_shot'),
  });
  const nightActions = gamePhase === 'night' ? roundActions : [];

  const { data: nightSteps = [] } = useQuery({
    queryKey: ['nightSteps', room?.board_id],
    queryFn: () => gameConfigService.getNightSteps('standard_flow', room?.board_id ?? undefined),
    enabled: !!room?.board_id && room?.status === 'playing',
  });
  const nightStepIndex = gameRecord?.night_step ?? 0;
  const currentNightStep = nightSteps[nightStepIndex];

  const { data: roomMessages = [] } = useQuery({
    queryKey: ['roomMessages', roomId, gameRecord?.id, gameRound, gamePhase],
    queryFn: () => roomService.getRoomMessages(roomId || '', 150),
    enabled: !!roomId && !!gameRecord?.id && gamePhase === 'day',
  });
  const deathAnnouncementMsg = roomMessages.find(
    (m) =>
      m.game_record_id === gameRecord?.id &&
      m.round_number === gameRound &&
      m.message_type === 'system' &&
      (String(m.message || '').includes('昨夜') || String(m.message || '').includes('平安夜'))
  );
  const lastNightDeathNames: string[] =
    !deathAnnouncementMsg || String(deathAnnouncementMsg.message || '').includes('平安夜')
      ? []
      : String(deathAnnouncementMsg.message || '')
        .replace(/^昨夜死亡的玩家是[：:]\s*/, '')
        .split(/[、,，]/)
        .map((s) => s.trim())
        .filter(Boolean);
  const lastNightDeathDisplay: string[] = lastNightDeathNames.map((name) => {
    const rp = roomPlayers.find((p) => p.player_name === name);
    return rp?.seat_number != null ? `${rp.seat_number}号玩家` : name;
  });

  const joinRoomMutation = useMutation({
    mutationFn: () => roomService.joinRoom({
      roomId: roomId || '',
      userId: currentUser?.id || '',
      username: currentUser?.username || '玩家',
      avatarUrl: currentUser?.avatar_url || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roomPlayers', roomId] });
      toast.success('成功加入房间');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const leaveRoomMutation = useMutation({
    mutationFn: () => roomService.leaveRoom(roomId || '', currentUser?.id || ''),
    onSuccess: () => {
      navigate('/lobby');
      toast.success('已离开房间');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleReadyMutation = useMutation({
    mutationFn: (isReady: boolean) => roomService.toggleReady(roomId || '', currentUser?.id || '', isReady),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roomPlayers', roomId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const assignSeatMutation = useMutation({
    mutationFn: (seatNumber: number) => roomService.assignSeat(roomId || '', currentUser?.id || '', seatNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roomPlayers', roomId] });
      setIsSpectator(false);
      toast.success('入座成功');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const takeSeatMutation = useMutation({
    mutationFn: (seatNumber: number) =>
      roomService.takeSeat({
        roomId: roomId || '',
        userId: currentUser?.id || '',
        username: currentUser?.username || '玩家',
        avatarUrl: currentUser?.avatar_url ?? null,
        seatNumber,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roomPlayers', roomId] });
      setIsSpectator(false);
      toast.success('入座成功，已参与游戏');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const leaveSeatMutation = useMutation({
    mutationFn: () => roomService.leaveSeat(roomId || '', currentUser?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roomPlayers', roomId] });
      setIsSpectator(true);
      setJoinMode('spectate');
      setShowPerspectiveSelector(true);
      toast.success('已进入观战模式');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const startGameMutation = useMutation({
    mutationFn: async () => {
      if (!roomId || !room) throw new Error('房间信息缺失');
      if (!roomPlayers || roomPlayers.length < minPlayers) {
        throw new Error(`玩家数量不足，至少需要 ${minPlayers} 人`);
      }

      const gameRecordId = await gameService.createGameRecord(roomId, room.board_id);
      if (!gameRecordId) throw new Error('创建游戏记录失败');

      const success = await gameEngineService.assignRoles(roomId, gameRecordId, room.board_id ?? undefined);
      if (!success) throw new Error('分配角色失败');

      const nightResult = await gameEngineService.startNightPhase(roomId, gameRecordId, 1);
      if (!nightResult.success) throw new Error('开始夜晚失败');

      const updatedRoom = await roomService.startGame(roomId);
      if (!updatedRoom) throw new Error('更新房间状态失败');

      return { durationSeconds: nightResult.durationSeconds ?? 60 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
      queryClient.invalidateQueries({ queryKey: ['gameRecord', roomId] });
      queryClient.invalidateQueries({ queryKey: ['roomPlayers', roomId] });
      queryClient.invalidateQueries({ queryKey: ['gameConfig', room?.board_id] });
      toast.success('游戏开始！');
      if (data?.durationSeconds != null) {
        setGamePhase('night');
        setGameRound(1);
        setPhaseSecondsLeft(data.durationSeconds);
      }
    },
    onError: (error: Error) => {
      autoStartTriggeredRef.current = false;
      toast.error(error.message);
    },
  });

  const autoStartTriggeredRef = useRef(false);

  const addAIPlayersMutation = useMutation({
    mutationFn: async ({ roomId, count }: { roomId: string; count: number }) => {
      return await roomService.addAIPlayers(roomId, count);
    },
    onSuccess: () => {
      toast.success('添加AI玩家成功');
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
      queryClient.invalidateQueries({ queryKey: ['roomPlayers', roomId] });
    },
    onError: (error) => {
      toast.error('添加AI玩家失败', {
        description: error.message || '请稍后重试',
      });
    },
  });

  const submitSkillMutation = useMutation({
    mutationFn: async ({
      roomId,
      gameRecordId,
      playerId,
      skillCode,
      targetId,
      round,
    }: {
      roomId: string;
      gameRecordId: string;
      playerId: string;
      skillCode: string;
      targetId: string | undefined;
      round: number;
    }) => {
      return await gameEngineService.executeSkill(roomId, gameRecordId, playerId, skillCode, targetId, round);
    },
    onSuccess: (ok) => {
      if (ok) {
        queryClient.invalidateQueries({ queryKey: ['roundActions', gameRecord?.id, gameRound] });
        queryClient.invalidateQueries({ queryKey: ['witchDrugUsage', gameRecord?.id] });
        queryClient.invalidateQueries({ queryKey: ['gameRecord', roomId] });
        toast.success('技能已提交');
      } else {
        toast.error('技能提交失败');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || '技能提交失败');
    },
  });

  const submitVoteMutation = useMutation({
    mutationFn: async ({
      roomId,
      gameRecordId,
      voterId,
      targetId,
      round,
      voteOptions,
    }: {
      roomId: string;
      gameRecordId: string;
      voterId: string;
      targetId: string | null;
      round: number;
      voteOptions?: { pkRound: number; pkSeats: number[] };
    }) => {
      return await gameEngineService.recordVote(roomId, gameRecordId, voterId, targetId, round, voteOptions);
    },
    onSuccess: (ok) => {
      if (ok) {
        queryClient.invalidateQueries({ queryKey: ['roundActions', gameRecord?.id, gameRound] });
        toast.success('投票已提交');
      } else {
        toast.error('投票提交失败');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || '投票提交失败');
    },
  });

  const recordHunterShotMutation = useMutation({
    mutationFn: async ({
      roomId,
      gameRecordId,
      hunterRoomPlayerId,
      targetRoomPlayerId,
      round,
    }: {
      roomId: string;
      gameRecordId: string;
      hunterRoomPlayerId: string;
      targetRoomPlayerId: string | null;
      round: number;
    }) => {
      return await gameEngineService.recordHunterShot(
        roomId,
        gameRecordId,
        hunterRoomPlayerId,
        targetRoomPlayerId,
        round
      );
    },
    onSuccess: (result) => {
      if (result?.success) {
        setHunterShotTargetId(null);
        queryClient.invalidateQueries({ queryKey: ['gameRecord', roomId] });
        queryClient.invalidateQueries({ queryKey: ['roomPlayers', roomId] });
        queryClient.invalidateQueries({ queryKey: ['roundActions', gameRecord?.id, gameRound] });
        toast.success('开枪已提交');
      } else {
        toast.error('开枪提交失败或已超时');
      }
    },
    onError: () => {
      toast.error('开枪提交失败');
    },
  });

  const selfExplodeMutation = useMutation({
    mutationFn: async () => {
      if (!roomId || !gameRecord?.id || !currentUser?.id) throw new Error('缺少参数');
      return await gameEngineService.selfExplodeDuringDay(roomId, gameRecord.id, currentUser.id, gameRound);
    },
    onSuccess: (result) => {
      if (result?.success) {
        queryClient.invalidateQueries({ queryKey: ['gameRecord', roomId] });
        queryClient.invalidateQueries({ queryKey: ['roomPlayers', roomId] });
        toast.success('自爆已提交，立即入夜');
      } else {
        toast.error('自爆失败或当前不可自爆');
      }
    },
    onError: () => {
      toast.error('自爆提交失败');
    },
  });

  const transferSheriffBadgeMutation = useMutation({
    mutationFn: async ({ targetSeat }: { targetSeat: number | null }) => {
      if (!roomId || !gameRecord?.id || !currentUser?.id) throw new Error('缺少参数');
      return await gameEngineService.transferSheriffBadge(roomId, gameRecord.id, currentUser.id, targetSeat);
    },
    onSuccess: (ok) => {
      if (ok) {
        queryClient.invalidateQueries({ queryKey: ['gameRecord', roomId] });
        queryClient.invalidateQueries({ queryKey: ['roomPlayers', roomId] });
        toast.success('已提交');
      } else {
        toast.error('移交警徽失败');
      }
    },
    onError: () => toast.error('移交警徽失败'),
  });

  const sheriffCallVoteMutation = useMutation({
    mutationFn: async (targetSeat: number) => {
      if (!roomId || !gameRecord?.id || !currentUser?.id) throw new Error('缺少参数');
      return await gameEngineService.sheriffCallVote(roomId, gameRecord.id, currentUser.id, targetSeat);
    },
    onSuccess: (result) => {
      if (result?.success) {
        queryClient.invalidateQueries({ queryKey: ['gameRecord', roomId] });
        queryClient.invalidateQueries({ queryKey: ['roomPlayers', roomId] });
        toast.success('归票已提交，进入投票环节');
      } else {
        toast.error('归票失败或当前不可归票');
      }
    },
    onError: () => toast.error('归票提交失败'),
  });

  const restartGameForTestMutation = useMutation({
    mutationFn: () => roomService.restartGameForTest(roomId || ''),
    onSuccess: (updatedRoom) => {
      if (updatedRoom) {
        queryClient.invalidateQueries({ queryKey: ['room', roomId] });
        queryClient.invalidateQueries({ queryKey: ['gameRecord', roomId] });
        queryClient.invalidateQueries({ queryKey: ['roomPlayers', roomId] });
        toast.success('已结束本局，房间回到等待；全员已置为准备，将自动开始新局');
      } else {
        toast.error('重新开始失败');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || '重新开始失败');
    },
  });

  const resetRoomToWaitingMutation = useMutation({
    mutationFn: () => roomService.resetRoomToWaiting(roomId || ''),
    onSuccess: (updatedRoom) => {
      if (updatedRoom) {
        queryClient.invalidateQueries({ queryKey: ['room', roomId] });
        queryClient.invalidateQueries({ queryKey: ['roomPlayers', roomId] });
        queryClient.invalidateQueries({ queryKey: ['lastEndedGameRecord', roomId] });
        toast.success('房间已重置，请准备后开始下一局');
      } else {
        toast.error('重置房间失败');
      }
    },
    onError: () => toast.error('重置房间失败'),
  });

  const currentPlayer = roomPlayers.find(p => p.user_id === currentUser?.id);
  const seatedCount = roomPlayers.filter(p => p.seat_number != null && p.seat_number >= 1).length;
  const seatsFull = seatedCount >= (room?.max_players || 12);
  const isFull = seatsFull;
  const minPlayers = board?.player_count ?? 6;
  const seatedPlayers = roomPlayers.filter(p => p.seat_number != null && p.seat_number >= 1);
  const allSeatedReady = seatedPlayers.length > 0 && seatedPlayers.every(p => p.is_ready);
  const allHaveSeat = seatedCount >= minPlayers && allSeatedReady;
  const canStartGame = currentPlayer?.is_host && seatedCount >= minPlayers && allSeatedReady && room?.status === 'waiting';
  const isSpectatorFromFull = !!currentPlayer && (currentPlayer.seat_number == null) && seatsFull;

  const deathAnnouncedForRound = gamePhase !== 'sheriff_campaign' || gameRound !== 1;
  const players: Player[] = roomPlayers.map(rp => ({
    id: rp.user_id || rp.id,
    name: rp.seat_number != null ? `${rp.seat_number}号玩家` : rp.player_name,
    avatar: rp.player_avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${rp.player_name}`,
    seatNumber: rp.seat_number != null ? rp.seat_number : 0,
    isReady: rp.is_ready,
    isHost: rp.is_host,
    role: rp.role as RoleType | undefined,
    isAlive: deathAnnouncedForRound ? (rp.is_alive !== false) : true,
    isSpectator: false,
  }));
  
  // 过滤掉座位号为0的玩家，只显示有有效座位号的玩家
  const filteredSeatedPlayers = players.filter(p => p.seatNumber > 0);

  const emptySeats = (room?.max_players || 12) - seatedCount;
  const maxAIPlayersToAdd = Math.max(0, emptySeats);

  const currentRole = (currentPlayer?.role as RoleType) || null;
  const myCard = currentRole && configCards.length > 0
    ? configCards.find((c: { role_type?: string }) => c.role_type === currentRole)
    : undefined;
  const roleNameForOverlay =
    (currentRole && ROLE_INFO[currentRole]?.name) ||
    (myCard as { card_name?: string } | undefined)?.card_name ||
    currentRole ||
    '未知身份';
  const cardIllustration =
    (myCard as { character_config?: { illustration?: string } } | undefined)?.character_config?.illustration ||
      (myCard as { card_name?: string } | undefined)?.card_name
      ? `/card/${(myCard as { card_name: string }).card_name}.png`
      : null;

  const roleToSkillCodes: Record<string, string[]> = {
    seer: ['seer_check'],
    guard: ['guard_protect'],
    werewolf: ['werewolf_kill'],
    witch: ['witch_save', 'witch_poison'],
  };
  const canUseSkillInCurrentStep =
    !!currentRole &&
    !!currentNightStep &&
    (roleToSkillCodes[currentRole] ?? []).some((code) => currentNightStep.skill_codes.includes(code));
  const roleToSkillCode: Record<string, string> = {
    seer: 'seer_check',
    guard: 'guard_protect',
    werewolf: 'werewolf_kill',
  };
  const nightSkillUsed =
    currentRole &&
    nightActions.some(
      (a) =>
        a.player_id === currentUser?.id &&
        (a.action_type === roleToSkillCode[currentRole] ||
          (currentRole === 'witch' && (a.action_type === 'witch_save' || a.action_type === 'witch_poison')))
    );
  const seerCheckResult = currentRole === 'seer'
    ? (nightActions.find((a) => a.player_id === currentUser?.id && a.action_type === 'seer_check')?.data?.result as
      | 'good'
      | 'werewolf'
      | undefined)
    : undefined;
  const nightAvailableTargets =
    room?.status === 'playing' && (gamePhase === 'night' || gamePhase === 'waiting')
      ? roomPlayers
        .filter(
          (rp) =>
            rp.is_alive !== false &&
            (currentRole !== 'werewolf' ? true : rp.role !== 'werewolf') &&
            (rp.user_id || rp.id) !== currentUser?.id
        )
        .map((rp) => ({
          id: String(rp.user_id || rp.id),
          name: rp.player_name,
          avatar: rp.player_avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${rp.player_name}`,
          seatNumber: rp.seat_number ?? undefined,
        }))
      : [];

  const voteActions = gamePhase === 'voting' ? roundActions.filter((a) => a.action_type === 'vote') : [];
  const getPlayerName = (id: string) => roomPlayers.find((p) => String(p.user_id || p.id) === id)?.player_name ?? '未知';
  const getPlayerSeat = (id: string) => roomPlayers.find((p) => String(p.user_id || p.id) === id)?.seat_number ?? null;
  const getPlayerSeatLabel = (id: string) => {
    const seat = getPlayerSeat(id);
    return seat != null ? `${seat}号玩家` : getPlayerName(id);
  };
  const isWerewolfStep = currentNightStep?.skill_codes?.includes('werewolf_kill') ?? false;
  const werewolfTeammates =
    currentRole === 'werewolf' && isWerewolfStep
      ? roomPlayers
        .filter(
          (rp) =>
            rp.role === 'werewolf' &&
            rp.is_alive !== false &&
            String(rp.user_id || rp.id) !== currentUser?.id
        )
        .map((rp) => ({
          id: String(rp.user_id || rp.id),
          name: rp.player_name,
          avatar: rp.player_avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${rp.player_name}`,
          seatNumber: rp.seat_number ?? undefined,
        }))
      : [];
  const werewolfKillCountByTargetId: Record<string, number> = {};
  if (currentRole === 'werewolf' && isWerewolfStep) {
    for (const a of roundActions) {
      if (a.action_type === 'werewolf_kill' && a.target_id) {
        const key = a.target_id;
        werewolfKillCountByTargetId[key] = (werewolfKillCountByTargetId[key] ?? 0) + 1;
      }
    }
  }
  const isWitchStep = (currentNightStep?.skill_codes?.includes('witch_save') ?? false) || (currentNightStep?.skill_codes?.includes('witch_poison') ?? false);
  let witchDeathTargetSeat: number | null = null;
  let witchSaveTargetId: string | null = null;
  if (currentRole === 'witch' && isWitchStep) {
    const wolfKills = roundActions.filter((a) => a.action_type === 'werewolf_kill' && a.target_id);
    const countByTarget: Record<string, number> = {};
    for (const a of wolfKills) {
      const key = a.target_id!;
      countByTarget[key] = (countByTarget[key] ?? 0) + 1;
    }
    const entries = Object.entries(countByTarget);
    if (entries.length > 0) {
      const maxCount = Math.max(...entries.map(([, c]) => c));
      const top = entries.filter(([, c]) => c === maxCount);
      const targetId = top.length === 1 ? top[0][0] : top[0]?.[0];
      if (targetId) {
        witchSaveTargetId = targetId;
        const rp = roomPlayers.find((p) => String(p.user_id || p.id) === targetId);
        witchDeathTargetSeat = rp?.seat_number ?? null;
      }
    }
  }
  const { data: witchDrugUsage } = useQuery({
    queryKey: ['witchDrugUsage', gameRecord?.id],
    queryFn: () => gameService.getWitchDrugUsage(gameRecord!.id),
    enabled: !!gameRecord?.id && currentRole === 'witch' && isWitchStep,
  });
  const witchUsedSave = witchDrugUsage?.usedSave ?? false;
  const witchUsedPoison = witchDrugUsage?.usedPoison ?? false;
  const votesForDisplay: Vote[] = voteActions
    .filter((a) => a.target_id)
    .map((a) => ({
      voterId: a.player_id,
      voterName: getPlayerSeatLabel(a.player_id),
      targetId: a.target_id!,
      targetName: getPlayerSeatLabel(a.target_id!),
    }));
  const votingPkForVote = (gameRecord as unknown as { voting_pk_state?: VotingPkState })?.voting_pk_state;
  const hasVotedVoting = voteActions.some((a) => {
    const rp = roomPlayers.find((p) => String(p.id) === a.player_id);
    if (rp?.user_id !== currentUser?.id) return false;
    if (votingPkForVote?.phase === 'pk_vote' && (a.data?.pk_round as number) !== votingPkForVote.pkRound) return false;
    return true;
  });

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  /** 从服务端对局记录同步阶段与倒计时（多端一致）。仅在阶段/回合/夜步变化时覆盖倒计时，避免频繁覆盖导致倒计时无法归零、流程卡住。 */
  const phaseKeyRef = useRef<string>('');
  const advanceTriggeredForRef = useRef<string>('');
  const phaseKeyJustSyncedRef = useRef(false);
  const phaseEndsAtRef = useRef<string | null>(null);
  useEffect(() => {
    if (room?.status !== 'playing' || !gameRecord) return;
    phaseEndsAtRef.current = gameRecord.phase_ends_at ?? null;
    const phase = (gameRecord.current_phase ||
      'night') as 'night' | 'day' | 'voting' | 'hunter_shot' | 'sheriff_campaign' | 'sheriff_transfer' | 'waiting';
    setGamePhase(phase);
    setGameRound(gameRecord.current_round ?? 1);
    const nightStep = gameRecord.night_step ?? 0;
    const sheriffStage = (gameRecord as unknown as { sheriff_state?: SheriffState })?.sheriff_state?.stage;
    const sheriffSpeaker = (gameRecord as unknown as { sheriff_state?: SheriffState })?.sheriff_state?.currentSpeakerSeat;
    const dayStateForKey = (gameRecord as unknown as { day_speech_state?: { currentSpeakerSeat?: number; waitingForSheriffCall?: boolean } })?.day_speech_state;
    const daySpeaker = dayStateForKey?.currentSpeakerSeat ?? null;
    const waitingForSheriffCall = dayStateForKey?.waitingForSheriffCall === true;
    const votingPk = (gameRecord as unknown as { voting_pk_state?: VotingPkState })?.voting_pk_state;
    const phaseKey =
      phase === 'sheriff_campaign' && sheriffStage
        ? `${phase}-${gameRecord.current_round ?? 1}-${nightStep}-${sheriffStage}-${sheriffSpeaker ?? ''}`
        : phase === 'day' && waitingForSheriffCall
          ? `${phase}-${gameRecord.current_round ?? 1}-${nightStep}-sheriffCall`
          : phase === 'day' && daySpeaker != null
            ? `${phase}-${gameRecord.current_round ?? 1}-${nightStep}-day-${daySpeaker}`
            : phase === 'voting' && votingPk
              ? `${phase}-${gameRecord.current_round ?? 1}-${nightStep}-pk-${votingPk.phase}-${votingPk.currentSpeakerSeat ?? ''}`
              : `${phase}-${gameRecord.current_round ?? 1}-${nightStep}`;
    if (phaseKeyRef.current !== phaseKey) {
      const isNewStep = phaseKeyRef.current !== '';
      phaseKeyRef.current = phaseKey;
      advanceTriggeredForRef.current = '';
      phaseKeyJustSyncedRef.current = isNewStep;
      if (gameRecord.phase_ends_at) {
        // 哨兵值表示已到点待推进，视为 0 以触发推进（避免警上/投票卡住）
        const isSentinel = gameRecord.phase_ends_at === '9999-01-01T00:00:00.000Z';
        const left = isSentinel ? 0 : Math.max(0, Math.floor((new Date(gameRecord.phase_ends_at).getTime() - Date.now()) / 1000));
        setPhaseSecondsLeft(left);
      } else {
        // 服务端未设置结束时间时允许倒计时归零后推进（避免卡在某一夜步）
        setPhaseSecondsLeft(0);
      }
    }
  }, [room?.status, gameRecord?.id, gameRecord?.current_phase, gameRecord?.current_round, gameRecord?.night_step, gameRecord?.phase_ends_at, (gameRecord as unknown as { sheriff_state?: SheriffState })?.sheriff_state?.stage, (gameRecord as unknown as { sheriff_state?: SheriffState })?.sheriff_state?.currentSpeakerSeat, (gameRecord as unknown as { day_speech_state?: { currentSpeakerSeat?: number; waitingForSheriffCall?: boolean } })?.day_speech_state, (gameRecord as unknown as { voting_pk_state?: VotingPkState })?.voting_pk_state]);

  /** 房间非对局中时重置阶段与倒计时 */
  useEffect(() => {
    if (room?.status !== 'playing') {
      setGamePhase('waiting');
      setPhaseSecondsLeft(0);
      phaseEndsAtRef.current = null;
    }
  }, [room?.status]);

  /** 对局中阶段倒计时：每秒根据服务端 phase_ends_at 重算剩余秒数，多端显示一致（不依赖本地递减） */
  useEffect(() => {
    if (room?.status !== 'playing') return;
    const tick = () => {
      const endsAt = phaseEndsAtRef.current;
      if (!endsAt || endsAt === '9999-01-01T00:00:00.000Z') {
        setPhaseSecondsLeft(0);
        return;
      }
      const left = Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
      setPhaseSecondsLeft(left);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [room?.status]);

  /** 订阅 game_records 变更以同步阶段/倒计时 */
  useEffect(() => {
    if (!roomId || room?.status !== 'playing' || !gameRecord?.id) return;
    const unsubscribe = gameService.subscribeToGameRecord(gameRecord.id, () => {
      queryClient.invalidateQueries({ queryKey: ['gameRecord', roomId] });
    });
    return () => unsubscribe();
  }, [roomId, room?.status, gameRecord?.id, queryClient]);

  /** 进入移交警徽阶段时拉取最新对局一次，确保 pending_sheriff_transfer 与阶段一致 */
  const lastSheriffTransferRef = useRef<string | null>(null);
  useEffect(() => {
    if (room?.status !== 'playing' || gamePhase !== 'sheriff_transfer' || !roomId) return;
    const key = `${roomId}-${gameRecord?.current_round ?? 0}`;
    if (lastSheriffTransferRef.current === key) return;
    lastSheriffTransferRef.current = key;
    queryClient.invalidateQueries({ queryKey: ['gameRecord', roomId] });
    queryClient.invalidateQueries({ queryKey: ['roomPlayers', roomId] });
  }, [room?.status, gamePhase, roomId, gameRecord?.current_round, queryClient]);

  /** 游戏开始且身份已下发时，展示一次身份插画遮罩。使用对局 started_at + 10s 作为结束时间，多端一致，不依赖本地倒计时，避免有人未在当前界面导致流程卡住的误解；晚于该时间进入的玩家不再展示遮罩。 */
  const identityOverlayEndsAt = gameRecord?.started_at
    ? new Date(gameRecord.started_at).getTime() + 10_000
    : undefined;
  useEffect(() => {
    if (room?.status !== 'playing' || !gameRecord?.id || isSpectator) return;
    if (!currentRole || currentRole === 'unknown') return;
    if (lastIdentityGameRef.current === gameRecord.id) return;
    if (identityOverlayEndsAt != null && Date.now() >= identityOverlayEndsAt) {
      lastIdentityGameRef.current = gameRecord.id;
      return;
    }
    lastIdentityGameRef.current = gameRecord.id;
    setShowIdentityOverlay(true);
  }, [room?.status, gameRecord?.id, gameRecord?.started_at, currentRole, isSpectator, identityOverlayEndsAt]);

  /** 离开猎人开枪阶段时清空选择 */
  useEffect(() => {
    if (gamePhase !== 'hunter_shot') setHunterShotTargetId(null);
  }, [gamePhase]);

  /** 离开警长归票阶段时清空归票选择 */
  useEffect(() => {
    const waiting = (gameRecord as unknown as { day_speech_state?: { waitingForSheriffCall?: boolean } })?.day_speech_state?.waitingForSheriffCall;
    if (!waiting) setSheriffCallTargetSeat(null);
  }, [gameRecord?.id, (gameRecord as unknown as { day_speech_state?: { waitingForSheriffCall?: boolean } })?.day_speech_state?.waitingForSheriffCall]);

  /** 进入新的夜晚技能步骤时重新打开技能弹窗 */
  useEffect(() => {
    const inNightSkillStep =
      room?.status === 'playing' &&
      (gamePhase === 'night' || gamePhase === 'waiting') &&
      currentPlayer &&
      currentRole &&
      canUseSkillInCurrentStep &&
      (currentRole === 'seer' || !nightSkillUsed) &&
      ['seer', 'guard', 'werewolf', 'witch'].includes(currentRole) &&
      !isSpectator;
    if (inNightSkillStep) setNightSkillSheetOpen(true);
  }, [room?.status, gamePhase, gameRecord?.night_step, gameRecord?.current_round, currentPlayer?.id, currentRole, canUseSkillInCurrentStep, nightSkillUsed, isSpectator]);

  /** 倒计时结束时推进到下一阶段。仅当「当前步骤」与设置倒计时时的步骤一致、本步骤尚未触发、且非「刚同步到新步骤」时推进，避免 refetch 后误触发。移交警徽阶段不自动推进。 */
  useEffect(() => {
    if (room?.status !== 'playing' || phaseSecondsLeft !== 0 || !gameRecord?.id) return;
    if ((gameRecord.current_phase || '') === 'sheriff_transfer') return;
    if (phaseKeyJustSyncedRef.current) {
      phaseKeyJustSyncedRef.current = false;
      return;
    }
    const phase = gameRecord.current_phase || 'night';
    const round = gameRecord.current_round ?? 1;
    const nightStep = gameRecord.night_step ?? 0;
    const sheriffStage = (gameRecord as unknown as { sheriff_state?: SheriffState })?.sheriff_state?.stage;
    const sheriffSpeaker = (gameRecord as unknown as { sheriff_state?: SheriffState })?.sheriff_state?.currentSpeakerSeat;
    const dayStateAdv = (gameRecord as unknown as { day_speech_state?: { currentSpeakerSeat?: number; waitingForSheriffCall?: boolean } })?.day_speech_state;
    const daySpeaker = dayStateAdv?.currentSpeakerSeat ?? null;
    const waitingForSheriffCallAdv = dayStateAdv?.waitingForSheriffCall === true;
    const votingPkKey = (gameRecord as unknown as { voting_pk_state?: VotingPkState })?.voting_pk_state;
    const key =
      phase === 'sheriff_campaign' && sheriffStage
        ? `${phase}-${round}-${nightStep}-${sheriffStage}-${sheriffSpeaker ?? ''}`
        : phase === 'day' && waitingForSheriffCallAdv
          ? `${phase}-${round}-${nightStep}-sheriffCall`
          : phase === 'day' && daySpeaker != null
            ? `${phase}-${round}-${nightStep}-day-${daySpeaker}`
            : phase === 'voting' && votingPkKey
              ? `${phase}-${round}-${nightStep}-pk-${votingPkKey.phase}-${votingPkKey.currentSpeakerSeat ?? ''}`
              : `${phase}-${round}-${nightStep}`;
    if (key !== phaseKeyRef.current || advanceTriggeredForRef.current === key) return;
    advanceTriggeredForRef.current = key;
    gameEngineService.advanceToNextPhase(roomId || '', gameRecord.id).then((result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['gameRecord', roomId] });
        queryClient.invalidateQueries({ queryKey: ['roomPlayers', roomId] });
      } else {
        advanceTriggeredForRef.current = '';
      }
    }, [room?.status, phaseSecondsLeft, gameRecord?.id, gameRecord?.current_phase, gameRecord?.current_round, gameRecord?.night_step, (gameRecord as unknown as { sheriff_state?: SheriffState })?.sheriff_state?.stage, (gameRecord as unknown as { sheriff_state?: SheriffState })?.sheriff_state?.currentSpeakerSeat, (gameRecord as unknown as { day_speech_state?: { currentSpeakerSeat?: number; waitingForSheriffCall?: boolean } })?.day_speech_state, (gameRecord as unknown as { voting_pk_state?: VotingPkState })?.voting_pk_state, roomId, queryClient]);

    /** [流程复苏器] 监控倒计时卡死补偿。如果倒计时归零超过 5 秒但流程仍未自动推进，则由该客户端发起一次冗余推进尝试。 */
    const lastStuckCheckRef = useRef<number>(0);
    useEffect(() => {
      if (room?.status !== 'playing' || phaseSecondsLeft > 0 || !gameRecord?.id) {
        lastStuckCheckRef.current = 0;
        return;
      }

      // 只有当倒计时确实归零，且保持在零状态一段时间后才触发
      if (lastStuckCheckRef.current === 0) {
        lastStuckCheckRef.current = Date.now();
        return;
      }

      const stuckDuration = Date.now() - lastStuckCheckRef.current;
      if (stuckDuration > 5000) {
        // 卡死超过 5 秒
        const phase = gameRecord.current_phase || 'night';
        const round = gameRecord.current_round ?? 1;
        const key = `${phase}-${round}-${gameRecord.night_step ?? 0}-stuck-recovery`;

        if (advanceTriggeredForRef.current !== key) {
          console.log(`[FlowRecovery] 流程似乎在 ${phase} 阶段卡死，正在尝试强制推进...`);
          advanceTriggeredForRef.current = key;
          gameEngineService.advanceToNextPhase(roomId || '', gameRecord.id).then((result) => {
            if (result.success) {
              queryClient.invalidateQueries({ queryKey: ['gameRecord', roomId] });
            } else {
              // 失败了则重置，允许后续再次尝试或由其他客户端尝试
              advanceTriggeredForRef.current = '';
            }
          });
        }
      }
    }, [room?.status, phaseSecondsLeft, gameRecord?.id, roomId, queryClient]);

    useEffect(() => {
      if (!roomId) return;

      const unsubscribe = roomService.subscribeToRoomPlayers(roomId, (payload) => {
        queryClient.invalidateQueries({ queryKey: ['roomPlayers', roomId] });
      });

      return () => unsubscribe();
    }, [roomId, queryClient]);
  }, [roomId, queryClient]);

  /** 全体上桌玩家准备后，房主自动开始游戏（5 秒倒计时，仅触发一次，避免重复调用） */
  const autoStartRef = useRef<NodeJS.Timeout | null>(null);
  const autoStartIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    console.log('[自动开始游戏] 检查条件:', {
      roomStatus: room?.status,
      isHost: currentPlayer?.is_host,
      seatedCount,
      minPlayers,
      allSeatedReady,
      seatedPlayers: seatedPlayers.map(p => ({ name: p.player_name, seat: p.seat_number, isReady: p.is_ready })),
      isPending: startGameMutation.isPending,
      triggered: autoStartTriggeredRef.current,
    });
    
    if (room?.status === 'playing' || room?.status === 'finished') {
      autoStartTriggeredRef.current = false;
      setAutoStartCountdown(null);
      return;
    }
    
    if (!room?.status) {
      setAutoStartCountdown(null);
      return;
    }
    
    if (
      !currentPlayer?.is_host ||
      seatedCount < minPlayers ||
      !allSeatedReady ||
      startGameMutation.isPending ||
      autoStartTriggeredRef.current
    ) {
      setAutoStartCountdown(null);
      return;
    }
    console.log('[自动开始游戏] 条件满足，开始倒计时');
    autoStartTriggeredRef.current = true;
    setAutoStartCountdown(5);
    autoStartIntervalRef.current = setInterval(() => {
      setAutoStartCountdown((prev) => {
        if (prev == null || prev <= 1) {
          if (autoStartIntervalRef.current) clearInterval(autoStartIntervalRef.current);
          autoStartIntervalRef.current = null;
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    autoStartRef.current = setTimeout(() => {
      if (autoStartIntervalRef.current) {
        clearInterval(autoStartIntervalRef.current);
        autoStartIntervalRef.current = null;
      }
      setAutoStartCountdown(null);
      startGameMutation.mutate();
    }, 5000);
    return () => {
      if (autoStartRef.current) {
        clearTimeout(autoStartRef.current);
        autoStartRef.current = null;
      }
      if (autoStartIntervalRef.current) {
        clearInterval(autoStartIntervalRef.current);
        autoStartIntervalRef.current = null;
      }
      setAutoStartCountdown(null);
    };
  }, [room?.status, currentPlayer?.is_host, seatedCount, minPlayers, allSeatedReady, startGameMutation.isPending]);

  const handleJoinAsPlayer = () => {
    if (room != null && room.status !== 'waiting') {
      toast.error('游戏已开始，无法加入');
      return;
    }
    if (!currentUser) {
      toast.error('请先登录');
      return;
    }
    const maxP = room?.max_players || 12;
    const usedSeats = roomPlayers.filter(p => p.seat_number != null && p.seat_number >= 1).map(p => p.seat_number as number);
    const available = Array.from({ length: maxP }, (_, i) => i + 1).filter(s => !usedSeats.includes(s));
    const seat = available.length ? available[Math.floor(Math.random() * available.length)] : 1;
    takeSeatMutation.mutate(seat);
    setJoinMode('play');
  };

  const handleLeaveSeatToSpectate = () => {
    leaveSeatMutation.mutate();
  };

  const handleSpectatorJoinGame = () => {
    if (room != null && room.status !== 'waiting') return;
    if (!currentUser) return;
    const maxP = room?.max_players || 12;
    const usedSeats = roomPlayers.filter(p => p.seat_number != null && p.seat_number >= 1).map(p => p.seat_number as number);
    const available = Array.from({ length: maxP }, (_, i) => i + 1).filter(s => !usedSeats.includes(s));
    const seat = available.length ? available[Math.floor(Math.random() * available.length)] : 1;
    takeSeatMutation.mutate(seat);
  };

  const handleAddAIPlayers = () => {
    if (!roomId) {
      toast.error('房间ID不存在');
      return;
    }

    if (aiPlayerCountToAdd > maxAIPlayersToAdd) {
      toast.error(`最多只能添加 ${maxAIPlayersToAdd} 个AI玩家（当前空座 ${emptySeats} 个）`);
      return;
    }

    addAIPlayersMutation.mutate({
      roomId,
      count: aiPlayerCountToAdd,
    });

    setShowAddAIPlayerDialog(false);
    setAiPlayerCountToAdd(1);
    toast.success(`成功添加 ${aiPlayerCountToAdd} 个AI玩家`);
  };

  const handleJoinAsSpectator = () => {
    if (!currentUser) return;
    if (!currentPlayer) {
      joinRoomMutation.mutate(undefined, {
        onSuccess: () => {
          setJoinMode('spectate');
          setIsSpectator(true);
          setShowPerspectiveSelector(true);
          queryClient.invalidateQueries({ queryKey: ['roomPlayers', roomId] });
        },
      });
    } else {
      setJoinMode('spectate');
      setIsSpectator(true);
      setShowPerspectiveSelector(true);
    }
  };

  const handleLeaveRoom = () => {
    leaveRoomMutation.mutate();
  };

  const handleToggleReady = () => {
    if (!currentPlayer) return;
    toggleReadyMutation.mutate(!currentPlayer.is_ready);
  };

  const handleStartGame = () => {
    startGameMutation.mutate();
  };

  const handlePerspectiveSelect = (selectedPerspective: Perspective) => {
    setPerspective(selectedPerspective);
    setIsSpectator(true);
    toast.success(`已选择${selectedPerspective.type === 'god_view' ? '上帝视角' : selectedPerspective.type === 'follow_player' ? '跟随玩家视角' : '跟随身份视角'}`);
  };

  const handleSeatClick = (player: Player | null, seatNumber: number) => {
    if (room != null && room.status !== 'waiting') return;
    if (player && player.id !== currentUser?.id) {
      toast.info(`${player.name} 在这个座位`);
      return;
    }
    if (player && player.id === currentUser?.id) {
      toast.info('你已经在座位上了');
      return;
    }
    if (!currentUser) {
      toast.error('请先登录');
      return;
    }
    setSelectedSeat(seatNumber);
    if (currentPlayer) {
      assignSeatMutation.mutate(seatNumber);
    } else {
      takeSeatMutation.mutate(seatNumber);
    }
  };

  return (
    <div className="h-screen max-h-screen bg-night relative overflow-hidden flex">
      {room?.status === 'finished' && (
        <VictoryOverlay
          winnerTeam={lastEndedGameRecord?.winner_team ?? null}
          countdownSeconds={10}
          onCountdownEnd={() => resetRoomToWaitingMutation.mutate()}
        />
      )}
      {room?.status === 'playing' && showIdentityOverlay && currentRole && (
        <IdentityOverlay
          roleName={roleNameForOverlay}
          imageUrl={cardIllustration}
          countdownSeconds={10}
          endsAtTimestamp={identityOverlayEndsAt}
          onCountdownEnd={() => setShowIdentityOverlay(false)}
        />
      )}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 right-10 w-40 h-40 rounded-full bg-moon/10 blur-3xl" />
        <div className="absolute bottom-20 left-10 w-60 h-60 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden relative z-10">
        <header className="flex-shrink-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handleLeaveRoom}>
              <ArrowLeft className="w-4 h-4" />
              离开房间
            </Button>

            <div className="flex items-center gap-2">
              <Moon className="w-5 h-5 text-primary" />
              <span className="font-display text-sm">{room?.name || '房间'}</span>
              {isSpectator && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  观战模式
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isSpectator && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSpectatorPanel(!showSpectatorPanel)}
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowGameStats(!showGameStats)}
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)}>
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </header>

        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <div className="flex-shrink-0 container mx-auto px-4 pt-2 pb-2 max-h-[38vh] overflow-y-auto overflow-x-hidden">
            {room?.status === 'playing' && (
              <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-card/80 px-4 py-3 shadow-sm">
                {!isSpectator && currentRole && currentRole !== 'unknown' && (
                  <div className="flex items-center gap-2 rounded-lg bg-primary/15 px-3 py-1.5">
                    <span className="text-xs font-medium text-muted-foreground">本局身份为</span>
                    <span className="font-display text-base font-bold text-primary" style={{ color: ROLE_INFO[currentRole]?.color ?? 'var(--primary)' }}>
                      {ROLE_INFO[currentRole]?.name ?? currentRole}
                    </span>
                  </div>
                )}
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">当前流程</span>
                  <span className="font-medium text-foreground">
                    {(gamePhase === 'night' || (room?.status === 'playing' && gamePhase === 'waiting')) && (
                      currentNightStep ? `第${gameRound}夜 · ${currentNightStep.step_name}` : `第${gameRound}夜 · 夜晚`
                    )}
                    {gamePhase === 'sheriff_campaign' && `第${gameRound}天 · 警上竞选`}
                    {gamePhase === 'day' && `第${gameRound}天 · 死讯/发言`}
                    {gamePhase === 'voting' && `第${gameRound}天 · 投票`}
                    {gamePhase === 'hunter_shot' && '猎人开枪'}
                    {gamePhase === 'sheriff_transfer' && '移交警徽'}
                  </span>
                  {phaseSecondsLeft > 0 && (
                    <span className="tabular-nums text-sm text-muted-foreground">
                      剩余 {Math.floor(phaseSecondsLeft / 60)}:{(phaseSecondsLeft % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                </div>
              </div>
            )}

            {room?.status === 'playing' && gameRecord?.id && currentUser?.id && (
              <div className="mb-3">
                <GameFlowPanel
                  gameId={gameRecord.id}
                  playerId={currentUser.id}
                  playerRole={currentRole || undefined}
                  enabled={true}
                />
              </div>
            )}

            <div className="flex items-center justify-between bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className={seatedCount >= (room?.max_players || 12) ? 'text-primary font-bold' : 'text-foreground'}>
                      {seatedCount}
                    </span>
                    <span className="text-muted-foreground">/{room?.max_players || 12}</span>
                    <span className="text-muted-foreground text-xs ml-1">上桌</span>
                  </span>
                </div>

                <div className="h-4 w-px bg-border" />

                <div className={`text-sm font-medium ${room?.status === 'waiting' ? 'text-role-villager' :
                  room?.status === 'playing' ? 'text-wolf-red' : 'text-foreground'
                  }`}>
                  {room?.status === 'waiting' && '等待中'}
                  {room?.status === 'playing' && (
                    <span className="flex items-center gap-2">
                      <span>游戏中</span>
                      <span className="text-foreground font-normal">
                        第{gameRound}
                        {(gamePhase === 'night' || (room?.status === 'playing' && gamePhase === 'waiting')) && (currentNightStep ? `夜 · ${currentNightStep.step_name}` : '夜')}
                        {gamePhase === 'day' && (
                          <span className="inline-flex items-center gap-1">
                            <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">
                              死讯
                            </span>
                            <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">
                              发言
                            </span>
                            <span className="rounded-md px-1.5 py-0.5 text-xs text-muted-foreground">投票</span>
                          </span>
                        )}
                        {gamePhase === 'voting' && (
                          <span className="inline-flex items-center gap-1">
                            <span className="rounded-md px-1.5 py-0.5 text-xs text-muted-foreground">死讯</span>
                            <span className="rounded-md px-1.5 py-0.5 text-xs text-muted-foreground">发言</span>
                            <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">
                              投票
                            </span>
                          </span>
                        )}
                        {gamePhase === 'hunter_shot' && '猎人开枪'}
                        {gamePhase === 'sheriff_transfer' && '移交警徽'}
                      </span>
                      {phaseSecondsLeft > 0 && (
                        <span className="tabular-nums text-muted-foreground">
                          {Math.floor(phaseSecondsLeft / 60)}:{(phaseSecondsLeft % 60).toString().padStart(2, '0')}
                        </span>
                      )}
                    </span>
                  )}
                  {room?.status === 'finished' && '已结束'}
                </div>
              </div>

              {currentPlayer?.is_host && room?.status === 'waiting' && !isSpectator && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs text-primary">
                    <Crown className="w-3 h-3" />
                    房主
                  </div>
                  {maxAIPlayersToAdd > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddAIPlayerDialog(true)}
                      className="text-xs"
                    >
                      <Users className="w-3 h-3 mr-1" />
                      添加AI玩家
                    </Button>
                  )}
                </div>
              )}
              {currentPlayer?.is_host && room?.status === 'playing' && !isSpectator && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => restartGameForTestMutation.mutate()}
                  disabled={restartGameForTestMutation.isPending || seatedCount < (room?.max_players ?? 12)}
                  className="text-xs border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                  title="测试用：结束本局并回到等待，全员准备后自动开始新局"
                >
                  <Play className="w-3 h-3 mr-1" />
                  重新开始一局（测试）
                </Button>
              )}
            </div>

            {room?.status === 'playing' && gamePhase === 'sheriff_campaign' && (() => {
              const sheriffState = (gameRecord as unknown as { sheriff_state?: SheriffState })?.sheriff_state;
              if (!sheriffState) return null;
              const currentSeat = currentPlayer?.seat_number ?? null;
              const hasRegistered = currentSeat != null && (sheriffState.signupSeats || []).includes(currentSeat);
              const hasVoted = currentSeat != null && Object.keys(sheriffState.votes || {}).includes(String(currentSeat));
              const canRegister = sheriffState.stage === 'signup' && currentSeat != null && currentPlayer?.is_alive !== false && !isSpectator;
              const canWithdraw = (sheriffState.stage === 'speech' || sheriffState.stage === 'pk_speech') && hasRegistered && !isSpectator;
              const canVote =
                (sheriffState.stage === 'vote' || sheriffState.stage === 'pk_vote') &&
                currentSeat != null &&
                currentPlayer?.is_alive !== false &&
                !isSpectator &&
                (sheriffState.stage === 'vote' ? !(sheriffState.signupSeats || []).includes(currentSeat) : !(sheriffState.pkSeats || []).includes(currentSeat));

              return (
                <div className="container mx-auto px-4 py-4">
                  <SheriffCampaignPanel
                    sheriffState={sheriffState}
                    currentUserSeat={currentSeat}
                    timeRemaining={phaseSecondsLeft}
                    onRegister={() => {
                      if (roomId && gameRecord?.id && currentUser?.id) {
                        sheriffService.registerSheriff(roomId, gameRecord.id, currentUser.id).then((ok) => {
                          if (ok) {
                            queryClient.invalidateQueries({ queryKey: ['gameRecord', roomId] });
                            toast.success('已报名上警');
                          } else {
                            toast.error('报名失败');
                          }
                        });
                      }
                    }}
                    onWithdraw={() => {
                      if (roomId && gameRecord?.id && currentUser?.id) {
                        sheriffService.withdrawSheriff(roomId, gameRecord.id, currentUser.id).then((ok) => {
                          if (ok) {
                            queryClient.invalidateQueries({ queryKey: ['gameRecord', roomId] });
                            toast.success('已退水');
                          } else {
                            toast.error('退水失败');
                          }
                        });
                      }
                    }}
                    onVote={(targetSeat) => {
                      if (roomId && gameRecord?.id && currentUser?.id) {
                        sheriffService.submitSheriffVote(roomId, gameRecord.id, currentUser.id, targetSeat).then((ok) => {
                          if (ok) {
                            queryClient.invalidateQueries({ queryKey: ['gameRecord', roomId] });
                            toast.success('投票已提交');
                          } else {
                            toast.error('投票失败');
                          }
                        });
                      }
                    }}
                    onSkipVote={() => {
                      if (roomId && gameRecord?.id && currentUser?.id) {
                        sheriffService.submitSheriffVote(roomId, gameRecord.id, currentUser.id, null).then((ok) => {
                          if (ok) {
                            queryClient.invalidateQueries({ queryKey: ['gameRecord', roomId] });
                            toast.success('已弃票');
                          } else {
                            toast.error('弃票失败');
                          }
                        });
                      }
                    }}
                    hasRegistered={hasRegistered}
                    hasVoted={hasVoted}
                    canRegister={canRegister}
                    canWithdraw={canWithdraw}
                    canVote={canVote}
                    currentSpeakerSeat={sheriffState.currentSpeakerSeat}
                  />
                </div>
              );
            })()}

            {room?.status === 'playing' && gamePhase === 'day' && (
              <div className="container mx-auto px-4 py-2 space-y-2">
                <DeathAnnouncementCard
                  deathNames={lastNightDeathDisplay}
                  round={gameRound}
                  className="animate-in fade-in-up duration-300"
                />
                {(() => {
                  const dayState = (gameRecord as unknown as { day_speech_state?: { currentSpeakerSeat?: number; waitingForSheriffCall?: boolean } })?.day_speech_state;
                  const currentSpeakerSeat = dayState?.currentSpeakerSeat ?? null;
                  const waitingForSheriffCall = dayState?.waitingForSheriffCall === true;
                  const sheriffSeat = (gameRecord as { sheriff_seat?: number | null })?.sheriff_seat ?? null;
                  const isSheriff = currentPlayer?.seat_number != null && sheriffSeat === currentPlayer.seat_number;
                  const isMyTurn = currentPlayer?.seat_number != null && currentSpeakerSeat === currentPlayer.seat_number;
                  const canSelfExplode = isMyTurn && currentRole === 'werewolf' && !isSpectator;
                  const alivePlayers = (roomPlayers ?? []).filter((p) => p.is_alive !== false && p.seat_number != null);

                  if (waitingForSheriffCall && isSheriff && !isSpectator) {
                    return (
                      <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 space-y-3">
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">请警长归票：选择一名存活玩家作为归票对象</p>
                        <div className="flex flex-wrap gap-2">
                          {alivePlayers.map((p) => (
                            <Button
                              key={p.seat_number}
                              variant={sheriffCallTargetSeat === p.seat_number ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setSheriffCallTargetSeat(p.seat_number!)}
                              className="gap-1"
                            >
                              <Shield className="w-3.5 h-3.5" />
                              {p.seat_number}号 {p.player_name}
                            </Button>
                          ))}
                        </div>
                        {sheriffCallTargetSeat != null && (
                          <Button
                            size="sm"
                            onClick={() => sheriffCallVoteMutation.mutate(sheriffCallTargetSeat)}
                            disabled={sheriffCallVoteMutation.isPending}
                            className="gap-1.5"
                          >
                            归票 {sheriffCallTargetSeat} 号玩家
                          </Button>
                        )}
                      </div>
                    );
                  }
                  if (waitingForSheriffCall && !isSheriff) {
                    return (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-card/50 px-4 py-2">
                        <span className="text-sm text-muted-foreground">等待警长归票…</span>
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-card/50 px-4 py-2">
                      <span className="text-sm text-muted-foreground">
                        {currentSpeakerSeat != null
                          ? `当前 ${currentSpeakerSeat} 号玩家发言${isMyTurn ? '（你）' : '，请在聊天框等待'}`
                          : '发言顺序已结束'}
                      </span>
                      {canSelfExplode && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => selfExplodeMutation.mutate()}
                          disabled={selfExplodeMutation.isPending}
                          className="gap-1.5"
                        >
                          <Zap className="w-4 h-4" />
                          自爆
                        </Button>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

          </div>

          <div className="flex-1 min-h-0 flex items-center justify-center container mx-auto px-4 pb-28 pt-4 relative z-10">
            <RoundTable
        players={filteredSeatedPlayers}
        currentPlayerId={currentPlayer?.user_id || currentPlayer?.id}
        gamePhase={room?.status === 'playing' ? gamePhase : 'waiting'}
        onSeatClick={handleSeatClick}
        selectedSeat={selectedSeat}
        canInteract={(room == null || room?.status === 'waiting' || room?.status == null) && !isSpectatorFromFull}
        maxSeats={room?.max_players ?? 12}
        sheriffSeat={(gameRecord as { sheriff_seat?: number | null })?.sheriff_seat ?? null}
      />
          </div>

        </div>

        {room?.status === 'waiting' && !currentPlayer && (
          <div className="fixed bottom-0 left-0 right-0 w-full bg-gradient-to-t from-background to-transparent pt-20 pb-8 pointer-events-none z-30">
            <div className="container mx-auto px-4 flex justify-start pointer-events-auto">
              <div className="text-left">
                <p className="text-muted-foreground text-sm mb-4">
                  选择加入方式
                </p>
                <div className="flex gap-4">
                  <Button
                    variant="gold"
                    size="lg"
                    onClick={handleJoinAsPlayer}
                  >
                    上桌参与游戏
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleJoinAsSpectator}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    观战模式
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {room?.status === 'waiting' && currentPlayer && currentPlayer.seat_number != null && currentPlayer.seat_number >= 1 && !isSpectator && (
          <div className="fixed bottom-0 left-0 right-0 w-full bg-gradient-to-t from-background to-transparent pt-20 pb-8 pointer-events-none z-30">
            <div className="container mx-auto px-4 pointer-events-auto flex flex-wrap items-center gap-3">
              <Button
                variant={currentPlayer.is_ready ? 'outline' : 'gold'}
                size="lg"
                onClick={handleToggleReady}
                disabled={toggleReadyMutation.isPending}
              >
                {currentPlayer.is_ready ? (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    取消准备
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    准备
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleLeaveSeatToSpectate}
                disabled={leaveSeatMutation.isPending}
              >
                <Eye className="w-4 h-4 mr-2" />
                观战模式
              </Button>
              {canStartGame && (
                <Button
                  variant="gold"
                  size="lg"
                  onClick={handleStartGame}
                  disabled={startGameMutation.isPending}
                >
                  <Play className="w-4 h-4 mr-2" />
                  开始游戏
                </Button>
              )}
              <p className="text-sm text-muted-foreground w-full">
                {!allHaveSeat && '请所有人先入座（点击空座位）'}
                {allHaveSeat && !allSeatedReady && (isFull ? '等待所有人准备' : `还需要 ${(room?.max_players || 12) - seatedCount} 名玩家上桌`)}
                {allHaveSeat && allSeatedReady && seatedCount < minPlayers && `至少需要 ${minPlayers} 人才能开始`}
                {allHaveSeat && allSeatedReady && seatedCount >= minPlayers && autoStartCountdown == null && '可以开始游戏'}
                {allHaveSeat && allSeatedReady && seatedCount >= minPlayers && autoStartCountdown != null && (
                  <span className="text-primary font-medium">{autoStartCountdown} 秒后自动开始游戏</span>
                )}
              </p>
            </div>
          </div>
        )}

        {room?.status === 'waiting' && currentPlayer && (currentPlayer.seat_number == null || currentPlayer.seat_number < 1) && !isSpectator && (
          <div className="fixed bottom-0 left-0 right-0 w-full bg-gradient-to-t from-background to-transparent pt-20 pb-8 pointer-events-none z-30">
            <div className="container mx-auto px-4 flex justify-start pointer-events-auto">
              <div className="text-left">
                {isSpectatorFromFull && (
                  <p className="text-sm text-amber-600 mb-2">座位已满，可等待空座后点击空座入座。</p>
                )}
                <div className="flex gap-4">
                  <Button variant="gold" size="lg" onClick={handleJoinAsPlayer}>
                    上桌参与游戏
                  </Button>
                  <Button variant="outline" size="lg" onClick={handleJoinAsSpectator}>
                    <Eye className="w-4 h-4 mr-2" />
                    观战模式
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {room?.status === 'playing' &&
          (gamePhase === 'night' || gamePhase === 'waiting') &&
          currentPlayer &&
          currentPlayer.is_alive !== false &&
          currentRole &&
          canUseSkillInCurrentStep &&
          (currentRole === 'seer' || !nightSkillUsed) &&
          (['seer', 'guard', 'werewolf', 'witch'].includes(currentRole)) &&
          !isSpectator && (
            <Sheet
              open={nightSkillSheetOpen}
              onOpenChange={(open) => {
                setNightSkillSheetOpen(open);
                if (!open && roomId && gameRecord?.id) {
                  gameEngineService.advanceToNextPhase(roomId, gameRecord.id).then((result) => {
                    if (result.success) {
                      queryClient.invalidateQueries({ queryKey: ['gameRecord', roomId] });
                      queryClient.invalidateQueries({ queryKey: ['roomPlayers', roomId] });
                      toast.info('已跳过本环节，进入下一阶段');
                    }
                  });
                }
              }}
            >
              <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Moon className="w-5 h-5" />
                    第{gameRound}夜 · {currentNightStep?.step_name ?? '使用技能'}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground">关闭弹窗视为跳过使用技能，将直接进入下一环节</p>
                </SheetHeader>
                <div className="py-4 space-y-4">
                  {currentRole === 'werewolf' && isWerewolfStep && roomId && gameRecord?.id && (
                    <WerewolfChat
                      roomId={roomId}
                      gameRecordId={gameRecord.id}
                      roundNumber={gameRound}
                      playerName={currentPlayer?.player_name ?? ''}
                      playerAvatar={currentPlayer?.player_avatar ?? null}
                      playerId={currentUser?.id}
                    />
                  )}
                  <RoleSkill
                    role={currentRole}
                    canUseSkill={true}
                    skillUsed={!!nightSkillUsed}
                    availableTargets={nightAvailableTargets}
                    seerCheckResult={seerCheckResult}
                    werewolfTeammates={werewolfTeammates}
                    werewolfKillCountByTargetId={currentRole === 'werewolf' ? werewolfKillCountByTargetId : undefined}
                    witchDeathTargetSeat={witchDeathTargetSeat}
                    witchSaveTargetId={witchSaveTargetId}
                    witchUsedSave={witchUsedSave}
                    witchUsedPoison={witchUsedPoison}
                    skillSubmitting={submitSkillMutation.isPending}
                    onUseSkill={(targetId, skillCodeOverride) => {
                      if (!roomId || !gameRecord?.id || !currentUser?.id) return;
                      const skillCode = skillCodeOverride ?? roleToSkillCode[currentRole];
                      if (!skillCode) return;
                      submitSkillMutation.mutate({
                        roomId,
                        gameRecordId: gameRecord.id,
                        playerId: currentUser.id,
                        skillCode,
                        targetId,
                        round: gameRound,
                      });
                    }}
                  />
                </div>
              </SheetContent>
            </Sheet>
          )}

        {room?.status === 'playing' &&
          gamePhase === 'voting' &&
          currentPlayer &&
          currentPlayer.is_alive !== false &&
          !isSpectator && (() => {
            const votingPk = votingPkForVote;
            const isPkVote = votingPk?.phase === 'pk_vote';
            const isPkPlayer = isPkVote && currentPlayer?.seat_number != null && votingPk.pkSeats.includes(currentPlayer.seat_number);
            const voteTargetPlayers = isPkVote && votingPk?.pkSeats?.length
              ? roomPlayers
                .filter((rp) => rp.seat_number != null && votingPk.pkSeats.includes(rp.seat_number))
                .map((rp) => ({
                  id: String(rp.id),
                  name: rp.player_name,
                  avatar: rp.player_avatar ?? `https://api.dicebear.com/7.x/adventurer/svg?seed=${rp.player_name}`,
                  isAlive: rp.is_alive !== false,
                }))
              : players;
            const voteOptions = isPkVote ? { pkRound: votingPk.pkRound, pkSeats: votingPk.pkSeats } : undefined;
            return (
              <Sheet open={true}>
                <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      {votingPk?.phase === 'pk_speech'
                        ? `第${gameRound}轮 · 第${votingPk.pkRound}轮PK发言（${votingPk.currentSpeakerSeat ?? '?'}号发言）`
                        : isPkVote
                          ? `第${gameRound}轮 · 第${votingPk.pkRound}轮PK投票`
                          : `第${gameRound}轮 · 投票`}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="py-4">
                    {votingPk?.phase === 'pk_speech' && (
                      <p className="text-center text-muted-foreground mb-4">PK发言阶段，发言结束后进入PK投票。</p>
                    )}
                    {isPkPlayer && isPkVote && (
                      <p className="text-center text-muted-foreground mb-4">你是PK玩家，本轮不能投票。</p>
                    )}
                    <VotingSystem
                      players={voteTargetPlayers}
                      currentUserId={currentUser?.id}
                      votes={votesForDisplay}
                      timeRemaining={phaseSecondsLeft}
                      onVote={(targetId) => {
                        if (!roomId || !gameRecord?.id || !currentUser?.id) return;
                        submitVoteMutation.mutate({
                          roomId,
                          gameRecordId: gameRecord.id,
                          voterId: currentUser.id,
                          targetId,
                          round: gameRound,
                          voteOptions,
                        });
                      }}
                      onSkip={() => {
                        if (!roomId || !gameRecord?.id || !currentUser?.id) return;
                        submitVoteMutation.mutate({
                          roomId,
                          gameRecordId: gameRecord.id,
                          voterId: currentUser.id,
                          targetId: null,
                          round: gameRound,
                          voteOptions,
                        });
                      }}
                      isVotingOpen={phaseSecondsLeft > 0 && isPkVote && !isPkPlayer}
                      hasVoted={hasVotedVoting}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            );
          })()}

        {room?.status === 'playing' &&
          gamePhase === 'hunter_shot' &&
          (() => {
            const hunterPending = roundActions.find((a) => a.action_type === 'hunter_pending');
            const hunterRoomPlayerId = hunterPending?.player_id ?? null;
            const isHunter =
              !!hunterRoomPlayerId &&
              roomPlayers.some(
                (rp) => String(rp.id) === hunterRoomPlayerId && rp.user_id === currentUser?.id
              );
            const hunterTargets =
              hunterRoomPlayerId != null
                ? roomPlayers
                  .filter(
                    (rp) =>
                      rp.is_alive !== false &&
                      String(rp.id) !== hunterRoomPlayerId
                  )
                  .map((rp) => ({
                    id: String(rp.id),
                    name: rp.player_name,
                    avatar: rp.player_avatar ?? undefined,
                  }))
                : [];
            return (
              isHunter &&
              !!gameRecord?.id &&
              !!roomId && (
                <HunterShotSheet
                  open={true}
                  targets={hunterTargets}
                  timeRemaining={phaseSecondsLeft}
                  selectedTargetId={hunterShotTargetId}
                  onSelectTarget={setHunterShotTargetId}
                  onConfirm={() => {
                    recordHunterShotMutation.mutate({
                      roomId,
                      gameRecordId: gameRecord.id,
                      hunterRoomPlayerId: hunterRoomPlayerId!,
                      targetRoomPlayerId: hunterShotTargetId,
                      round: gameRound,
                    });
                  }}
                  onSkip={() => {
                    recordHunterShotMutation.mutate({
                      roomId,
                      gameRecordId: gameRecord.id,
                      hunterRoomPlayerId: hunterRoomPlayerId!,
                      targetRoomPlayerId: null,
                      round: gameRound,
                    });
                  }}
                />
              )
            );
          })()}

        {room?.status === 'playing' &&
          gamePhase === 'sheriff_transfer' &&
          (() => {
            const pending = (gameRecord as { pending_sheriff_transfer?: { deadSheriffSeat: number } })?.pending_sheriff_transfer;
            const deadSheriffSeat = pending?.deadSheriffSeat ?? null;
            const isDeadSheriff = currentPlayer?.seat_number != null && deadSheriffSeat === currentPlayer.seat_number;
            const alivePlayers = (roomPlayers ?? []).filter((rp) => rp.is_alive !== false && (rp.seat_number ?? 0) !== deadSheriffSeat);
            return (
              isDeadSheriff &&
              !!roomId &&
              !!gameRecord?.id && (
                <Sheet open={true}>
                  <SheetContent side="bottom" className="rounded-t-2xl">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-amber-500" />
                        移交警徽
                      </SheetTitle>
                      <DialogDescription>你已出局，请选择将警徽移交给场上任意存活玩家，或销毁警徽（本局进入无警长状态）。</DialogDescription>
                    </SheetHeader>
                    <div className="py-4 space-y-3">
                      <p className="text-sm text-muted-foreground">移交给：</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {alivePlayers.map((rp) => (
                          <Button
                            key={rp.id}
                            variant="outline"
                            className="flex flex-col gap-1 h-auto py-3"
                            disabled={transferSheriffBadgeMutation.isPending}
                            onClick={() =>
                              transferSheriffBadgeMutation.mutate({
                                targetSeat: rp.seat_number ?? 0,
                              })
                            }
                          >
                            <Shield className="w-5 h-5 text-amber-500" />
                            <span className="text-sm font-medium">{rp.seat_number}号</span>
                            <span className="text-xs text-muted-foreground truncate max-w-full">{rp.player_name}</span>
                          </Button>
                        ))}
                      </div>
                      <div className="pt-2 border-t">
                        <Button
                          variant="destructive"
                          className="w-full gap-2"
                          disabled={transferSheriffBadgeMutation.isPending}
                          onClick={() => transferSheriffBadgeMutation.mutate({ targetSeat: null })}
                        >
                          <ShieldOff className="w-4 h-4" />
                          销毁警徽（本局无警长）
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              )
            );
          })()}

        {showRoleCard && (myRole ?? currentRole) && !isSpectator && (
          <RoleCard role={myRole ?? currentRole!} onClose={() => setShowRoleCard(false)} />
        )}

        {isSpectator && (
          <>
            <SpectatorRecord
              gameId={roomId || ''}
              roomId={roomId || ''}
              records={spectatorRecords}
              perspective={perspective}
              followTargetId={perspective?.type === 'follow_player' ? perspective.targetId : undefined}
              followRole={perspective?.type === 'follow_role' ? perspective.role : undefined}
              isSpectator={true}
              onJoinGame={room?.status === 'waiting' ? handleSpectatorJoinGame : undefined}
              joinGameDisabled={takeSeatMutation.isPending || seatsFull}
            />

            {showGameStats && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <GameStats
                  totalRounds={0}
                  totalVotes={0}
                  totalDeaths={0}
                  wolfKills={0}
                  witchSaves={0}
                  witchPoisons={0}
                  guardProtects={0}
                  seerChecks={0}
                  duration={0}
                  winner={undefined}
                  winnerReason={undefined}
                />
              </div>
            )}
          </>
        )}

        <PerspectiveSelector
          isOpen={showPerspectiveSelector}
          onClose={() => setShowPerspectiveSelector(false)}
          onSelect={handlePerspectiveSelect}
          players={players}
        />
        <Dialog open={showAddAIPlayerDialog} onOpenChange={setShowAddAIPlayerDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加AI玩家</DialogTitle>
              <DialogDescription>
                选择要添加的AI玩家数量（当前空座 {maxAIPlayersToAdd} 个）
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="ai-player-count">AI玩家数量</Label>
                <Input
                  id="ai-player-count"
                  type="number"
                  min={1}
                  max={maxAIPlayersToAdd}
                  value={aiPlayerCountToAdd}
                  onChange={e => setAiPlayerCountToAdd(parseInt(e.target.value) || 1)}
                  className="w-full"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAddAIPlayerDialog(false)}
                >
                  取消
                </Button>
                <Button
                  onClick={handleAddAIPlayers}
                >
                  确认添加
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <aside className="w-[min(32rem,100vw)] max-w-[480px] flex-shrink-0 border-l border-border/50 bg-card/50 backdrop-blur-sm flex flex-col min-h-0 h-full relative z-10 overflow-hidden">
        <RoomChat
          roomId={roomId || ''}
          playerName={currentPlayer?.player_name || currentUser?.username || '玩家'}
          playerAvatar={currentPlayer?.player_avatar || currentUser?.avatar_url || ''}
          gamePhase={room?.status === 'playing' ? gamePhase : 'waiting'}
          currentSpeakerSeat={
            gamePhase === 'sheriff_campaign'
              ? ((gameRecord as unknown as { sheriff_state?: SheriffState })?.sheriff_state?.currentSpeakerSeat ?? null)
              : gamePhase === 'day'
                ? ((gameRecord as unknown as { day_speech_state?: { currentSpeakerSeat?: number } })?.day_speech_state?.currentSpeakerSeat ?? null)
                : null
          }
          userSeat={currentPlayer?.seat_number ?? null}
          gameRecordId={gameRecord?.id}
          roundNumber={gameRound}
          userId={currentUser?.id}
          embedded
          currentUserRole={currentRole ?? null}
          phaseSecondsLeft={phaseSecondsLeft}
          isAlive={currentPlayer?.is_alive !== false}
          onEndTurn={
            room?.status === 'playing' && gameRecord?.id && currentUser?.id
              ? async () => {
                const result = await gameEngineService.endCurrentSpeakerTurn(
                  roomId || '',
                  gameRecord.id,
                  currentUser.id
                );
                if (result?.success) {
                  queryClient.invalidateQueries({ queryKey: ['gameRecord', roomId] });
                  queryClient.invalidateQueries({ queryKey: ['roomPlayers', roomId] });
                }
              }
              : undefined
          }
        />
      </aside>
    </div>
  );
};

export default GameRoom;
