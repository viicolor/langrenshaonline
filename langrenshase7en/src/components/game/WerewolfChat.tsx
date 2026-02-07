import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
import { roomService, type RoomMessage } from '@/services/room';

interface WerewolfChatProps {
  roomId: string;
  gameRecordId: string;
  roundNumber: number;
  playerName: string;
  playerAvatar: string | null;
  playerId?: string;
}

type WerewolfMessage = RoomMessage & { player_name?: string; message_type?: string };

export default function WerewolfChat({
  roomId,
  gameRecordId,
  roundNumber,
  playerName,
  playerAvatar,
  playerId,
}: WerewolfChatProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['werewolfMessages', roomId, gameRecordId, roundNumber],
    queryFn: () => roomService.getWerewolfMessages(roomId, gameRecordId, roundNumber),
    enabled: !!roomId && !!gameRecordId && roundNumber >= 1,
  });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    const ok = await roomService.sendMessage(
      roomId,
      playerName,
      playerAvatar,
      text,
      'werewolf',
      playerId,
      gameRecordId,
      'night',
      roundNumber
    );
    if (ok) {
      setInput('');
      queryClient.invalidateQueries({ queryKey: ['werewolfMessages', roomId, gameRecordId, roundNumber] });
    }
  };

  const list = (messages as WerewolfMessage[]) || [];

  return (
    <div className="space-y-2 border border-wolf-red/30 rounded-lg p-2 bg-wolf-red/5">
      <p className="text-xs font-medium text-wolf-red/90 px-1">狼队夜聊（仅队友可见）</p>
      <ScrollArea className="h-24 rounded border border-border/50 bg-background/50 p-2">
        {list.length === 0 ? (
          <p className="text-xs text-muted-foreground">暂无消息，与队友沟通刀人目标</p>
        ) : (
          list.map((msg) => (
            <div key={msg.id} className="text-xs py-0.5">
              <span className="font-medium text-foreground/90">{(msg as WerewolfMessage).player_name ?? '狼队友'}:</span>{' '}
              <span className="text-foreground/80">{msg.message}</span>
            </div>
          ))
        )}
        <div ref={scrollRef} />
      </ScrollArea>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="输入消息..."
          className="flex-1 h-8 text-sm"
        />
        <Button type="button" size="sm" variant="default" onClick={handleSend} disabled={!input.trim()} className="h-8">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
