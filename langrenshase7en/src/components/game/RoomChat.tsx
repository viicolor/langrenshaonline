import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageCircle, X, Mic, MicOff, Volume2, VolumeX, AlertCircle, CheckCircle, Skull, Crown, ChevronDown, ChevronRight, SkipForward } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface Message {
  id: string;
  room_id: string;
  player_name: string;
  player_avatar: string | null;
  message: string;
  message_type: string;
  created_at: string;
  phase?: string | null;
  round_number?: number | null;
}


interface RoomChatProps {
  roomId: string;
  playerName: string;
  playerAvatar: string;
  /** 当前游戏阶段 */
  gamePhase?: 'waiting' | 'night' | 'day' | 'voting' | 'hunter_shot' | 'sheriff_campaign' | 'sheriff_transfer';
  /** 当前发言者座位号（警上竞选/白天发言阶段），仅此座位可发送 */
  currentSpeakerSeat?: number | null;
  /** 当前用户座位号 */
  userSeat?: number | null;
  /** 当前对局 id（用于标记发言消息） */
  gameRecordId?: string;
  /** 当前回合 */
  roundNumber?: number;
  /** 当前用户 id */
  userId?: string;
  /** 嵌入为右侧常驻栏时为 true，不显示浮动按钮、始终展开 */
  embedded?: boolean;
  /** 当前用户身份，用于过滤夜间技能详情：好人阵营不显示 skill_good/skill_werewolf 具体动作，仅看环节提示 */
  currentUserRole?: string | null;
  /** 阶段剩余秒数（警上发言时显示） */
  phaseSecondsLeft?: number;
  /** 当前发言者点击「结束」时调用，结束本回合并进入下一名发言者 */
  onEndTurn?: () => void | Promise<void>;
  /** 当前玩家是否存活；死亡玩家禁言，不能发言 */
  isAlive?: boolean;
}

const getMessageIcon = (messageType: string) => {
  switch (messageType) {
    case 'system':
      return <AlertCircle className="w-4 h-4 text-primary" />;
    case 'vote':
      return <CheckCircle className="w-4 h-4 text-accent" />;
    case 'death':
      return <Skull className="w-4 h-4 text-wolf-red" />;
    case 'role':
      return <Crown className="w-4 h-4 text-primary" />;
    default:
      return null;
  }
};

const getMessageStyle = (messageType: string) => {
  switch (messageType) {
    case 'system':
      return 'bg-secondary/50 border-secondary';
    case 'vote':
      return 'bg-accent/10 border-accent';
    case 'death':
      return 'bg-wolf-red/10 border-wolf-red/30';
    case 'role':
      return 'bg-primary/10 border-primary/30';
    default:
      return 'bg-background/50';
  }
};

const RoomChat = ({
  roomId,
  playerName,
  playerAvatar,
  gamePhase,
  currentSpeakerSeat,
  userSeat,
  gameRecordId,
  roundNumber,
  userId,
  embedded = false,
  currentUserRole,
  phaseSecondsLeft = 0,
  onEndTurn,
  isAlive = true,
}: RoomChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isOpen, setIsOpen] = useState(embedded);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  /* Logic removed during rollback
  const isSpeechPhase = gamePhase === 'sheriff_campaign' || gamePhase === 'day';
  const isSheriffSpeech = gamePhase === 'sheriff_campaign' && currentSpeakerSeat != null;
  */
  const canSendMessage = isAlive;

  /** 好人阵营不显示夜间技能具体动作（skill_good、skill_werewolf），只保留系统环节提示（如「预言家行动」） */
  const visibleMessages = (() => {
    if (!currentUserRole || currentUserRole === 'werewolf') return messages;
    return messages.filter(
      (m) => m.message_type !== 'skill_good' && m.message_type !== 'skill_werewolf'
    );
  })();

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('room_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (data && !error) {
        setMessages(data as unknown as Message[]);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          const raw = payload.new as Record<string, unknown>;
          if (!raw?.id) return;
          const newMsg: Message = {
            id: String(raw.id),
            room_id: String(raw.room_id ?? ''),
            player_name: String(raw.player_name ?? ''),
            player_avatar: raw.player_avatar != null ? String(raw.player_avatar) : null,
            message: String(raw.message ?? ''),
            message_type: String(raw.message_type ?? 'text'),
            created_at: String(raw.created_at ?? new Date().toISOString()),
            phase: raw.phase != null ? String(raw.phase) : null,
            round_number: raw.round_number != null ? Number(raw.round_number) : null,
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (!embedded && !isOpen) setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, isOpen, embedded]);

  /** 游戏进行中短间隔拉取消息，确保其他玩家即时看到发言（配合 realtime 订阅）。合并服务端与本地状态，避免覆盖刚发送的乐观更新。 */
  const isGamePlaying = !!roomId;
  useEffect(() => {
    if (!roomId || !isGamePlaying) return;
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('room_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (data && !error)
        setMessages((prev) => {
          const byId = new Map<string, Message>((data as unknown as Message[]).map((m) => [m.id, m]));
          prev.forEach((m) => {
            if (!byId.has(m.id)) byId.set(m.id, m);
          });
          return Array.from(byId.values()).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });
    };
    fetchMessages(); // 进入游戏立即拉一次
    const interval = setInterval(fetchMessages, 800); // 每 0.8 秒拉取，其他玩家尽快看到新发言
    return () => clearInterval(interval);
  }, [roomId, isGamePlaying]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleMessages]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    if (!canSendMessage) return;

    const messageType = 'text';
    const payload: Record<string, unknown> = {
      room_id: roomId,
      message: newMessage.trim(),
      user_id: userId || null,
      player_name: playerName,
      player_avatar: playerAvatar,
      message_type: messageType,
      game_record_id: gameRecordId || null,
      phase: null,
      round_number: roundNumber ?? null,
    };

    const { data: inserted, error } = await supabase
      .from('room_messages')
      .insert(payload as { room_id: string; message: string;[key: string]: unknown })
      .select()
      .single();

    if (!error && inserted) {
      setNewMessage('');
      setMessages((prev) => [...prev, inserted as unknown as Message]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSendMessage) sendMessage();
    }
  };

  const toggleVoice = async () => {
    if (isSpeaking) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setIsSpeaking(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        audioContextRef.current = new AudioContext();
        setIsSpeaking(true);

        await supabase.from('room_messages').insert({
          room_id: roomId,
          player_name: playerName,
          player_avatar: playerAvatar,
          message: `${playerName} 开始语音`,
          message_type: 'system'
        });
      } catch (error) {
        console.error('无法获取麦克风权限:', error);
      }
    }
  };

  /** 将消息按「每夜」分组，夜晚消息折叠为一块，其余单条展示 */
  const messageSegments = (() => {
    const segments: ({ type: 'night'; round: number; messages: Message[] } | { type: 'single'; message: Message })[] = [];
    let i = 0;
    while (i < visibleMessages.length) {
      const msg = visibleMessages[i];
      const phase = msg.phase ?? '';
      const round = msg.round_number ?? 0;
      if (phase === 'night' && round > 0) {
        const nightBatch: Message[] = [];
        while (i < visibleMessages.length) {
          const m = visibleMessages[i];
          if ((m.phase ?? '') === 'night' && (m.round_number ?? 0) === round) {
            nightBatch.push(m);
            i++;
          } else break;
        }
        segments.push({ type: 'night', round, messages: nightBatch });
      } else {
        segments.push({ type: 'single', message: msg });
        i++;
      }
    }
    return segments;
  })();

  const sendPlaceholder = (() => {
    if (!isAlive) return '你已出局，无法发言';
    return '输入消息...';
  })();

  const getPhaseBadge = (phase: string | null) => {
    if (!phase) return null;

    const phaseMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'waiting': { label: '等待', variant: 'secondary' },
      'night': { label: '夜晚', variant: 'destructive' },
      'day': { label: '白天', variant: 'default' },
      'voting': { label: '投票', variant: 'outline' },
    };

    const config = phaseMap[phase];
    if (!config) return null;

    return (
      <Badge variant={config.variant} className="ml-2">
        {config.label}
      </Badge>
    );
  };

  const panel = (
    <div className={`flex flex-col overflow-hidden bg-card border-0 border-border shadow-lg ${embedded ? 'h-full min-h-0 rounded-none' : 'fixed bottom-0 right-0 w-full sm:w-96 h-[70vh] sm:h-[500px] sm:bottom-6 sm:right-6 rounded-t-2xl sm:rounded-2xl shadow-2xl z-50 animate-scale-in border rounded-xl'}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <span className="font-display font-medium">房间聊天</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="w-8 h-8"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          {!embedded && (
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="w-8 h-8">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4"
        ref={scrollRef}
      >
        <div className="space-y-3">
          {visibleMessages.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">
              暂无消息，开始聊天吧！
            </p>
          )}
          {messageSegments.map((seg, segIdx) => {
            if (seg.type === 'night') {
              return (
                <Collapsible key={`night-${seg.round}-${segIdx}`} defaultOpen={false}>
                  <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-left text-sm hover:bg-secondary/50">
                    <ChevronRight className="h-4 w-4 shrink-0 transition-transform [[data-state=open]_&]:rotate-90" />
                    <span className="font-medium text-muted-foreground">第 {seg.round} 夜</span>
                    <span className="text-xs text-muted-foreground">（{seg.messages.length} 条）</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 space-y-2 pl-1 border-l-2 border-border/30">
                      {seg.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-2 ${msg.message_type === 'system' ? 'justify-center' : ''}`}
                        >
                          {msg.message_type === 'system' ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
                              {getMessageIcon(msg.message_type)}
                              <span>{msg.message}</span>
                              {getPhaseBadge(msg.phase)}
                            </div>
                          ) : (
                            <>
                              <img
                                src={msg.player_avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${msg.player_name}`}
                                alt={msg.player_name}
                                className="w-8 h-8 rounded-full flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className={`p-3 rounded-lg ${getMessageStyle(msg.message_type)} border`}>
                                  <div className="flex items-baseline gap-2 mb-1">
                                    <span className="text-sm font-medium text-foreground">{msg.player_name}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {format(new Date(msg.created_at), 'HH:mm')}
                                    </span>
                                    {getPhaseBadge(msg.phase)}
                                  </div>
                                  <p className="text-sm text-foreground/80 break-words whitespace-pre-wrap">
                                    {msg.message}
                                  </p>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            }
            const msg = seg.message;
            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.message_type === 'system' ? 'justify-center' : ''}`}
              >
                {msg.message_type === 'system' ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
                    {getMessageIcon(msg.message_type)}
                    <span>{msg.message}</span>
                    {getPhaseBadge(msg.phase)}
                  </div>
                ) : (
                  <>
                    <img
                      src={msg.player_avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${msg.player_name}`}
                      alt={msg.player_name}
                      className="w-8 h-8 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`p-3 rounded-lg ${getMessageStyle(msg.message_type)} border`}>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">{msg.player_name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(msg.created_at), 'HH:mm')}
                          </span>
                          {getPhaseBadge(msg.phase)}
                        </div>
                        <p className="text-sm text-foreground/80 break-words whitespace-pre-wrap">
                          {msg.message}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-3 border-t border-border bg-background/50 flex-shrink-0">
        <div className="flex gap-2">
          <Button
            variant={isSpeaking ? 'blood' : 'night'}
            size="icon"
            onClick={toggleVoice}
            className="flex-shrink-0"
          >
            {isSpeaking ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={sendPlaceholder}
            disabled={!isAlive}
            className="flex-1 bg-secondary/50 border-border/50"
          />
          <Button
            variant="gold"
            size="icon"
            onClick={sendMessage}
            disabled={!newMessage.trim() || !isAlive}
            className="flex-shrink-0"
            title="发送"
          >
            <Send className="w-4 h-4" />
          </Button>
          {/* 结束发言按钮：仅当前发言者在发言阶段可见 */}
          {onEndTurn &&
            (gamePhase === 'sheriff_campaign' || gamePhase === 'day') &&
            currentSpeakerSeat != null &&
            userSeat != null &&
            currentSpeakerSeat === userSeat && (
              <Button
                variant="outline"
                size="icon"
                onClick={onEndTurn}
                className="flex-shrink-0 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                title="结束发言"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            )}
        </div>
        {isSpeaking && (
          <p className="text-xs text-accent text-center mt-2 animate-pulse">🎤 正在语音中...</p>
        )}
      </div>
    </div>
  );

  if (embedded) return panel;
  return (
    <>
      <Button
        variant="gold"
        size="icon"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-40"
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>
      {isOpen && panel}
    </>
  );
};

export default RoomChat;
