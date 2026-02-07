import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { gameConfigService } from './gameConfig';
import type { GameConfig } from './gameConfig';
import { gameService as gameRecordService } from './game';
import { WinConditionChecker } from './WinConditionChecker';
import { NightActionResolver } from './NightActionResolver';
import { aiGameIntegration } from './AIGameIntegration';
import type { GameState, Player, NightAction } from '@/types/gameState';

export type GamePhase = 'waiting' | 'night' | 'day' | 'voting' | 'finished';

export interface GameAction {
  id: string;
  gameRecordId: string;
  playerId: string;
  actionType: string;
  targetId?: string;
  round: number;
  phase: GamePhase;
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface GamePhaseState {
  gameRecordId: string;
  phase: GamePhase;
  round: number;
  phaseStartTime: string;
  phaseEndTime?: string;
  currentSpeaker?: string;
  votes?: Record<string, string>;
  nightActions?: GameAction[];
}

type SheriffStage = 'signup' | 'speech' | 'vote' | 'pk_speech' | 'pk_vote' | 'done';
type SheriffState = {
  stage: SheriffStage;
  signupSeats: number[]; // 上警座位号
  speechOrder: number[]; // 本轮发言顺序（座位号）
  speechIndex: number; // 当前发言索引
  currentSpeakerSeat: number | null;
  votes: Record<string, number | null>; // voterSeat -> targetSeat
  pkRound: number; // 0=初轮，1/2=PK 轮
  pkSeats: number[]; // 当前 PK 参与者 seat
};

const SHERIFF_SIGNUP_SECONDS = 20;
const SHERIFF_SPEECH_SECONDS = 60;
const SHERIFF_VOTE_SECONDS = 15;
const DAY_SPEECH_SECONDS = 120;
const DAY_SPEECH_SHERIFF_SECONDS = 150;

type DaySpeechState = {
  speechOrder: number[];
  speechIndex: number;
  currentSpeakerSeat: number | null;
  sheriffDirection?: 'left' | 'right';
  /** 白天发言全部结束后，警长归票阶段为 true */
  waitingForSheriffCall?: boolean;
};

/** 放逐投票平票 PK 状态：平票玩家轮流发言（30s/人）后再次投票，参与 PK 的玩家不能投票，最多 2 轮 */
export type VotingPkState = {
  pkRound: 1 | 2; // 第几轮 PK
  pkSeats: number[]; // 平票玩家座位号
  speechOrder: number[];
  speechIndex: number;
  currentSpeakerSeat: number | null;
  phase: 'pk_speech' | 'pk_vote';
};

const VOTING_PK_SPEECH_SECONDS = 30;
const VOTING_PK_VOTE_SECONDS = 30;

export const gameService = {
  async createGameRecord(roomId: string, boardId?: string): Promise<string | null> {
    try {
      const { data: gameRecord, error } = await supabase
        .from('game_records')
        .insert({
          room_id: roomId,
          board_id: boardId || null,
          started_at: new Date().toISOString(),
          current_round: 1,
          current_phase: null,
          night_step: 0,
          phase_ends_at: null,
        })
        .select()
        .single();

      if (error) throw error;
      return gameRecord?.id || null;
    } catch (error) {
      console.error('Create game record error:', error);
      return null;
    }
  },

  async endGameRecord(gameRecordId: string, winnerTeam: string, durationSeconds: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('game_records')
        .update({
          ended_at: new Date().toISOString(),
          winner_team: winnerTeam,
          duration_seconds: durationSeconds,
        })
        .eq('id', gameRecordId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('End game record error:', error);
      return false;
    }
  },

  async assignRoles(roomId: string, gameRecordId: string, boardId?: string): Promise<boolean> {
    try {
      let effectiveBoardId = boardId;
      if (!effectiveBoardId) {
        const { data: room } = await supabase.from('rooms').select('board_id').eq('id', roomId).single();
        effectiveBoardId = room?.board_id ?? undefined;
      }
      if (!effectiveBoardId) {
        const { data: firstBoard } = await supabase.from('boards').select('id').eq('is_delete', 0).limit(1).maybeSingle();
        effectiveBoardId = (firstBoard as { id?: string } | null)?.id;
      }
      if (!effectiveBoardId) {
        console.error('[gameService] No board available for room:', roomId);
        return false;
      }

      const config = await gameConfigService.getGameConfig(effectiveBoardId);
      const boardRoles = await gameConfigService.getBoardRoles(effectiveBoardId);

      if (!boardRoles || boardRoles.length === 0) {
        console.error('[gameService] No board roles found for board:', effectiveBoardId);
        return false;
      }

      const { data: roomPlayers } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId)
        .order('seat_number', { ascending: true, nullsFirst: false });

      if (!roomPlayers || roomPlayers.length === 0) return false;

      const roles = boardRoles.map(br => {
        const card =
          config.cards.find(c => String(c.id) === String(br.card_id)) ||
          config.cards.find(c => c.role_type === br.card_id);
        return {
          cardId: br.card_id,
          roleId: card?.role_type || (br.card_id && br.card_id !== 'undefined' ? String(br.card_id) : 'unknown'),
          roleName: card?.card_name || '未知角色',
          count: br.count || 1,
        };
      });

      const allRoles: string[] = [];
      roles.forEach(role => {
        for (let i = 0; i < role.count; i++) {
          allRoles.push(role.roleId);
        }
      });

      const shuffledRoles = [...allRoles].sort(() => Math.random() - 0.5);

      const updates = roomPlayers.map((player, index) => ({
        id: player.id,
        role: shuffledRoles[index] || null,
      }));

      await Promise.all(
        updates.map((update) =>
          supabase.from('room_players').update({ role: update.role }).eq('id', update.id)
        )
      );

      return true;
    } catch (error) {
      console.error('Assign roles error:', error);
      return false;
    }
  },

  /** 开始夜晚阶段，持久化 phase/round/night_step/phase_ends_at；若有夜晚子阶段则用第一步时长 */
  async startNightPhase(roomId: string, gameRecordId: string, round: number): Promise<{ success: boolean; durationSeconds?: number }> {
    try {
      const { data: room } = await supabase.from('rooms').select('board_id').eq('id', roomId).single();
      const boardId = room?.board_id ?? undefined;
      const nightSteps = await gameConfigService.getNightSteps('standard_flow', boardId ?? undefined);
      const durationSeconds =
        nightSteps.length > 0
          ? nightSteps[0].duration
          : await gameConfigService.getPhaseDuration('standard_flow', 'night', 60);
      const now = new Date();
      const phaseEndsAt = new Date(now.getTime() + durationSeconds * 1000).toISOString();
      const messageData: TablesInsert<'room_messages'> = {
        room_id: roomId,
        player_name: '系统',
        player_avatar: null,
        message: nightSteps.length > 0 ? `第 ${round} 夜 · ${nightSteps[0].step_name}行动` : `第 ${round} 夜开始，请闭眼`,
        message_type: 'system',
        game_record_id: gameRecordId,
        phase: 'night',
        round_number: round,
      };
      await supabase.from('room_messages').insert(messageData);
      await gameRecordService.updateGamePhase(
        gameRecordId,
        {
          current_phase: 'night',
          current_round: round,
          night_step: 0,
          phase_started_at: now.toISOString(),
          phase_ends_at: phaseEndsAt,
        },
        undefined
      );

      // 生成AI玩家的夜晚行为
      await aiGameIntegration.generateAINightActions(roomId, gameRecordId, round);

      return { success: true, durationSeconds };
    } catch (error) {
      console.error('Start night phase error:', error);
      return { success: false };
    }
  },

  /** 警长竞选阶段（仅第1天）：先竞选再宣布死讯，符合规则文档 4.1 */
  async startSheriffCampaignPhase(roomId: string, gameRecordId: string, round: number): Promise<{ success: boolean; durationSeconds?: number }> {
    try {
      const durationSeconds = SHERIFF_SIGNUP_SECONDS;
      const now = new Date();
      const phaseEndsAt = new Date(now.getTime() + durationSeconds * 1000).toISOString();
      const sheriffState: SheriffState = {
        stage: 'signup',
        signupSeats: [],
        speechOrder: [],
        speechIndex: 0,
        currentSpeakerSeat: null,
        votes: {},
        pkRound: 0,
        pkSeats: [],
      };
      await supabase.from('room_messages').insert({
        room_id: roomId,
        player_name: '系统',
        player_avatar: null,
        message: '第1天开始，请睁眼。现在进入警长竞选：上警报名 20 秒。',
        message_type: 'system',
        game_record_id: gameRecordId,
        phase: 'sheriff_campaign',
        round_number: round,
      });
      await supabase
        .from('game_records')
        .update({
          current_phase: 'sheriff_campaign',
          current_round: round,
          phase_started_at: now.toISOString(),
          phase_ends_at: phaseEndsAt,
          sheriff_state: sheriffState as unknown as Record<string, unknown>,
          sheriff_seat: null,
        })
        .eq('id', gameRecordId);
      return { success: true, durationSeconds };
    } catch (error) {
      console.error('Start sheriff campaign phase error:', error);
      return { success: false };
    }
  },

  /** 上警报名：仅 sheriff_campaign.signup 阶段可报名（座位号去重） */
  async registerSheriff(roomId: string, gameRecordId: string, userId: string): Promise<boolean> {
    try {
      const record = await gameRecordService.getCurrentGameRecord(roomId);
      if (!record || record.id !== gameRecordId) return false;
      if (record.current_phase !== 'sheriff_campaign') return false;
      const sheriffState = (record as unknown as { sheriff_state?: SheriffState }).sheriff_state;
      if (!sheriffState || sheriffState.stage !== 'signup') return false;

      const { data: rp } = await supabase
        .from('room_players')
        .select('seat_number, is_alive')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .maybeSingle();
      const seat = rp?.seat_number ?? null;
      if (!seat || rp?.is_alive === false) return false;

      const nextSeats = Array.from(new Set([...(sheriffState.signupSeats || []), seat])).sort((a, b) => a - b);
      const nextState: SheriffState = { ...sheriffState, signupSeats: nextSeats };

      const { data, error } = await supabase
        .from('game_records')
        .update({ sheriff_state: nextState as unknown as Record<string, unknown> })
        .eq('id', gameRecordId)
        .eq('current_phase', 'sheriff_campaign')
        .select('id')
        .maybeSingle();
      if (error) throw error;
      return data != null;
    } catch (error) {
      console.error('Register sheriff error:', error);
      return false;
    }
  },

  /** 警下投票：仅 sheriff_campaign.vote/pk_vote 阶段可投（按座位号记录，重复覆盖） */
  async submitSheriffVote(roomId: string, gameRecordId: string, userId: string, targetSeat: number | null): Promise<boolean> {
    try {
      const record = await gameRecordService.getCurrentGameRecord(roomId);
      if (!record || record.id !== gameRecordId) return false;
      if (record.current_phase !== 'sheriff_campaign') return false;
      const sheriffState = (record as unknown as { sheriff_state?: SheriffState }).sheriff_state;
      if (!sheriffState || (sheriffState.stage !== 'vote' && sheriffState.stage !== 'pk_vote')) return false;

      const { data: rp } = await supabase
        .from('room_players')
        .select('seat_number, is_alive')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .maybeSingle();
      const voterSeat = rp?.seat_number ?? null;
      if (!voterSeat || rp?.is_alive === false) return false;

      // 参与竞选的玩家不能参与投票选警长；PK 轮仅非 PK 玩家可投票
      if (sheriffState.stage === 'vote' && (sheriffState.signupSeats || []).includes(voterSeat)) return false;
      if (sheriffState.stage === 'pk_vote' && (sheriffState.pkSeats || []).includes(voterSeat)) return false;

      const nextVotes = { ...(sheriffState.votes || {}) } as Record<string, number | null>;
      nextVotes[String(voterSeat)] = targetSeat;
      const nextState: SheriffState = { ...sheriffState, votes: nextVotes };

      const { data, error } = await supabase
        .from('game_records')
        .update({ sheriff_state: nextState as unknown as Record<string, unknown> })
        .eq('id', gameRecordId)
        .eq('current_phase', 'sheriff_campaign')
        .select('id')
        .maybeSingle();
      if (error) throw error;
      return data != null;
    } catch (error) {
      console.error('Submit sheriff vote error:', error);
      return false;
    }
  },

  /** 退水后仅剩一名警侯时调用：直接当选警长并进入白天 */
  async finishSheriffCampaignWithOneWinner(roomId: string, gameRecordId: string, sheriffSeat: number): Promise<boolean> {
    try {
      const record = await gameRecordService.getCurrentGameRecord(roomId);
      if (!record || record.id !== gameRecordId || record.current_phase !== 'sheriff_campaign') return false;
      const sheriffState = (record as unknown as { sheriff_state?: SheriffState }).sheriff_state;
      if (!sheriffState) return false;
      const round = (record.current_round ?? 1) as number;
      const deathResult = await this.announceStoredDeaths(roomId, gameRecordId, round);
      if (deathResult.gameEnded) return true;
      const { phaseEndsAt } = await this.initDaySpeechState(roomId, gameRecordId, round, { sheriffSeatOverride: sheriffSeat });
      await supabase.from('room_messages').insert({
        room_id: roomId,
        player_name: '系统',
        player_avatar: null,
        message: `${sheriffSeat}号玩家退水后仅剩一名警侯，自动当选警长。现在宣布死讯。`,
        message_type: 'system',
        game_record_id: gameRecordId,
        phase: 'sheriff_campaign',
        round_number: round,
      });
      const { error } = await supabase
        .from('game_records')
        .update({
          current_phase: 'day',
          phase_started_at: new Date().toISOString(),
          phase_ends_at: phaseEndsAt,
          sheriff_seat: sheriffSeat,
          sheriff_state: { ...sheriffState, stage: 'done' } as unknown as Record<string, unknown>,
        })
        .eq('id', gameRecordId);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Finish sheriff campaign with one winner error:', error);
      return false;
    }
  },

  /** 警长死后移交警徽：仅死亡警长可调用；targetSeat 为 null 表示销毁警徽（本局无警长），否则移交给该座位存活玩家 */
  async transferSheriffBadge(
    roomId: string,
    gameRecordId: string,
    userId: string,
    targetSeat: number | null
  ): Promise<boolean> {
    try {
      const record = await gameRecordService.getCurrentGameRecord(roomId);
      if (!record || record.id !== gameRecordId || record.current_phase !== 'sheriff_transfer') return false;
      const pending = (record as unknown as { pending_sheriff_transfer?: { deadSheriffSeat: number; fromPhase: string; round: number; eliminatedWasHunter?: boolean } }).pending_sheriff_transfer;
      if (!pending || pending.deadSheriffSeat == null) return false;
      const deadSheriffSeat = pending.deadSheriffSeat as number;
      const fromPhase = pending.fromPhase as 'night' | 'voting';
      const round = (pending.round ?? record.current_round ?? 1) as number;
      const eliminatedWasHunter = pending.eliminatedWasHunter === true;

      const { data: deadPlayer } = await supabase
        .from('room_players')
        .select('user_id')
        .eq('room_id', roomId)
        .eq('seat_number', deadSheriffSeat)
        .maybeSingle();
      if (!deadPlayer || deadPlayer.user_id !== userId) return false;

      if (targetSeat != null) {
        const { data: targetPlayer } = await supabase
          .from('room_players')
          .select('id, is_alive')
          .eq('room_id', roomId)
          .eq('seat_number', targetSeat)
          .maybeSingle();
        if (!targetPlayer || targetPlayer.is_alive === false) return false;
      }

      const newSheriffSeat = targetSeat;
      await supabase
        .from('game_records')
        .update({
          sheriff_seat: newSheriffSeat,
          pending_sheriff_transfer: null,
        })
        .eq('id', gameRecordId);

      const msg = newSheriffSeat == null
        ? '警徽已销毁，本局进入无警长状态。'
        : `警徽已移交给${newSheriffSeat}号玩家。`;
      await supabase.from('room_messages').insert({
        room_id: roomId,
        player_name: '系统',
        player_avatar: null,
        message: msg,
        message_type: 'system',
        game_record_id: gameRecordId,
        phase: 'sheriff_transfer',
        round_number: round,
      });

      if (fromPhase === 'night') {
        const deathResult = await this.announceStoredDeaths(roomId, gameRecordId, round);
        if (deathResult.gameEnded) return true;
        const afterDeaths = await gameRecordService.getCurrentGameRecord(roomId);
        if (afterDeaths?.current_phase === 'hunter_shot') return true;
        const { data: room } = await supabase.from('rooms').select('max_players').eq('id', roomId).maybeSingle();
        const maxPlayers = room?.max_players ?? 12;
        const sheriffCampaignEnabled = round === 1 && maxPlayers >= 10;
        if (sheriffCampaignEnabled) {
          await this.startSheriffCampaignPhase(roomId, gameRecordId, round);
        } else {
          await this.startDayPhase(roomId, gameRecordId, round);
        }
      } else if (fromPhase === 'voting') {
        if (eliminatedWasHunter) {
          const now = new Date();
          const phaseEndsAt = new Date(now.getTime() + 10 * 1000).toISOString();
          const { data: eliminatedRp } = await supabase
            .from('room_players')
            .select('id')
            .eq('room_id', roomId)
            .eq('seat_number', deadSheriffSeat)
            .maybeSingle();
          await gameRecordService.updateGamePhase(
            gameRecordId,
            { current_phase: 'hunter_shot', phase_started_at: now.toISOString(), phase_ends_at: phaseEndsAt },
            undefined
          );
          if (eliminatedRp?.id) {
            await supabase.from('game_actions').insert({
              game_record_id: gameRecordId,
              player_id: eliminatedRp.id,
              action_type: 'hunter_pending',
              target_id: null,
              round,
              data: {},
            });
          }
          await supabase.from('room_messages').insert({
            room_id: roomId,
            player_name: '系统',
            player_avatar: null,
            message: '猎人出局，请选择开枪目标（10 秒内）',
            message_type: 'system',
            game_record_id: gameRecordId,
            phase: 'hunter_shot',
            round_number: round,
          });
        } else {
          const winResult = await this.checkWinCondition(roomId);
          if (winResult.winner) {
            const rec = await gameRecordService.getCurrentGameRecord(roomId);
            if (rec?.id) {
              const startedAt = rec.started_at ? new Date(rec.started_at).getTime() : Date.now();
              const durationSeconds = Math.floor((Date.now() - startedAt) / 1000);
              await gameRecordService.endGameRecord(rec.id, winResult.winner, durationSeconds);
            }
            const { data: room } = await supabase.from('rooms').select('id').eq('id', roomId).single();
            if (room) {
              const { roomService: rs } = await import('./room');
              await rs.endGame(roomId, winResult.winner);
            }
            await supabase.from('room_messages').insert({
              room_id: roomId,
              player_name: '系统',
              player_avatar: null,
              message: `游戏结束，${winResult.winner === 'good' ? '好人' : '狼人'}阵营获胜。${winResult.reason}`,
              message_type: 'system',
              game_record_id: gameRecordId,
              phase: 'voting',
              round_number: round,
            });
          } else {
            await this.startNightPhase(roomId, gameRecordId, round + 1);
          }
        }
      }
      return true;
    } catch (error) {
      console.error('Transfer sheriff badge error:', error);
      return false;
    }
  },

  /** 计算白天发言顺序（发言顺序.md）：有警长则警长末位；无警长+有死者则死右；无警长+平安夜则单顺双逆 */
  async buildDaySpeechOrder(
    roomId: string,
    gameRecordId: string,
    round: number,
    options?: { sheriffSeatOverride?: number | null }
  ): Promise<{ speechOrder: number[]; sheriffDirection?: 'left' | 'right' }> {
    const { data: record } = await supabase
      .from('game_records')
      .select('sheriff_seat, last_night_death_seats')
      .eq('id', gameRecordId)
      .maybeSingle();
    const sheriffSeatFromRecord = options?.sheriffSeatOverride !== undefined
      ? options.sheriffSeatOverride
      : (record?.sheriff_seat as number | null) ?? null;
    const { data: room } = await supabase.from('rooms').select('max_players').eq('id', roomId).maybeSingle();
    const maxSeat = room?.max_players ?? 12;
    const { data: players } = await supabase
      .from('room_players')
      .select('seat_number, is_alive')
      .eq('room_id', roomId)
      .order('seat_number', { ascending: true });
    const aliveSeats = (players ?? [])
      .filter((p: { seat_number: number | null; is_alive: boolean | null }) => p.is_alive !== false && p.seat_number != null)
      .map((p: { seat_number: number | null }) => p.seat_number as number);
    if (aliveSeats.length === 0) return { speechOrder: [] };

    const deathSeats = (record?.last_night_death_seats as number[] | null) ?? [];

    if (sheriffSeatFromRecord != null && aliveSeats.includes(sheriffSeatFromRecord)) {
      const sheriffSeat = sheriffSeatFromRecord;
      const sheriffDirection: 'left' | 'right' = 'right';
      const order: number[] = [];
      for (let s = sheriffSeat + 1; s <= maxSeat; s++) if (aliveSeats.includes(s)) order.push(s);
      for (let s = 1; s < sheriffSeat; s++) if (aliveSeats.includes(s)) order.push(s);
      if (aliveSeats.includes(sheriffSeat)) order.push(sheriffSeat);
      return { speechOrder: order, sheriffDirection };
    }

    if (deathSeats.length > 0) {
      const minDeath = Math.min(...deathSeats);
      const startSeat = minDeath >= maxSeat ? 1 : minDeath + 1;
      const order: number[] = [];
      for (let i = 0; i < maxSeat; i++) {
        const s = ((startSeat - 1 + i) % maxSeat) + 1;
        if (aliveSeats.includes(s)) order.push(s);
      }
      return { speechOrder: order };
    }

    if (round % 2 === 1) return { speechOrder: [...aliveSeats].sort((a, b) => a - b) };
    return { speechOrder: [...aliveSeats].sort((a, b) => b - a) };
  },

  /** 初始化白天发言状态并写入 game_records，返回首轮结束时间与时长 */
  async initDaySpeechState(
    roomId: string,
    gameRecordId: string,
    round: number,
    options?: { sheriffSeatOverride?: number | null }
  ): Promise<{ phaseEndsAt: string; durationSeconds: number }> {
    const { speechOrder, sheriffDirection } = await this.buildDaySpeechOrder(roomId, gameRecordId, round, options);
    const record = await gameRecordService.getCurrentGameRecord(roomId);
    const sheriffSeatNum = options?.sheriffSeatOverride !== undefined ? options.sheriffSeatOverride : (record as unknown as { sheriff_seat?: number })?.sheriff_seat ?? null;
    const firstSeat = speechOrder[0] ?? null;
    const isSheriffTurn = firstSeat != null && firstSeat === sheriffSeatNum;
    const durationSeconds = speechOrder.length === 0 ? 0 : isSheriffTurn ? DAY_SPEECH_SHERIFF_SECONDS : DAY_SPEECH_SECONDS;
    const now = new Date();
    const phaseEndsAt = speechOrder.length === 0 ? now.toISOString() : new Date(now.getTime() + durationSeconds * 1000).toISOString();
    const dayState: DaySpeechState = {
      speechOrder,
      speechIndex: 0,
      currentSpeakerSeat: firstSeat,
      sheriffDirection,
    };
    await supabase
      .from('game_records')
      .update({
        day_speech_state: dayState as unknown as Record<string, unknown>,
        phase_ends_at: phaseEndsAt,
        last_night_death_seats: null,
      })
      .eq('id', gameRecordId);
    return { phaseEndsAt, durationSeconds: durationSeconds || 120 };
  },

  /** 开始白天阶段：宣布死讯已由调用方处理时仅发「第 X 天开始」并初始化轮流发言 */
  async startDayPhase(roomId: string, gameRecordId: string, round: number): Promise<{ success: boolean; durationSeconds?: number }> {
    try {
      const now = new Date();
      const messageData: TablesInsert<'room_messages'> = {
        room_id: roomId,
        player_name: '系统',
        player_avatar: null,
        message: `第 ${round} 天开始，请睁眼。现在进入放逐发言环节。`,
        message_type: 'system',
        game_record_id: gameRecordId,
        phase: 'day',
        round_number: round,
      };
      await supabase.from('room_messages').insert(messageData);
      const { durationSeconds } = await this.initDaySpeechState(roomId, gameRecordId, round);
      await gameRecordService.updateGamePhase(gameRecordId, {
        current_phase: 'day',
        current_round: round,
        phase_started_at: now.toISOString(),
      });

      // 生成AI玩家的白天发言
      await aiGameIntegration.generateAIDaySpeeches(roomId, gameRecordId, round);

      return { success: true, durationSeconds };
    } catch (error) {
      console.error('Start day phase error:', error);
      return { success: false };
    }
  },

  /** 开始投票阶段，持久化 phase/round/phase_ends_at */
  async startVotingPhase(roomId: string, gameRecordId: string, round: number): Promise<{ success: boolean; durationSeconds?: number }> {
    try {
      const config = await gameConfigService.getGameConfig();
      const voteRule = config.globalConfigs.find(c => c.config_code === 'vote_rule');
      const durationSeconds = await gameConfigService.getPhaseDuration('standard_flow', 'voting', 30);
      const now = new Date();
      const phaseEndsAt = new Date(now.getTime() + durationSeconds * 1000).toISOString();
      const messageData: TablesInsert<'room_messages'> = {
        room_id: roomId,
        player_name: '系统',
        player_avatar: null,
        message: voteRule?.config_value?.vote_type === 'majority' ? '投票阶段开始，多数决' : '投票阶段开始，请选择要投票的玩家',
        message_type: 'system',
        game_record_id: gameRecordId,
        phase: 'voting',
        round_number: round,
      };
      await supabase.from('room_messages').insert(messageData);
      await gameRecordService.updateGamePhase(gameRecordId, {
        current_phase: 'voting',
        current_round: round,
        phase_started_at: now.toISOString(),
        phase_ends_at: phaseEndsAt,
      });

      // 生成AI玩家的投票
      await aiGameIntegration.generateAIVotes(roomId, gameRecordId, round);

      return { success: true, durationSeconds };
    } catch (error) {
      console.error('Start voting phase error:', error);
      return { success: false };
    }
  },

  /** 夜晚结束：结算夜间死亡、更新存活；可选延后发死讯（有警上竞选时在警上结束后再发） */
  async resolveNightDeathsAndAnnounce(
    roomId: string,
    gameRecordId: string,
    round: number,
    options?: { skipAnnounce?: boolean }
  ): Promise<void> {
    const skipAnnounce = options?.skipAnnounce === true;
    const { data: roomPlayers } = await supabase
      .from('room_players')
      .select('id, user_id, player_name, role, is_alive, seat_number')
      .eq('room_id', roomId)
      .order('seat_number', { ascending: true, nullsFirst: false });

    if (!roomPlayers || roomPlayers.length === 0) return;

    const actions = await gameRecordService.getActionsForRound(gameRecordId, round);
    const skillTypes = ['werewolf_kill', 'guard_protect', 'witch_save', 'witch_poison', 'seer_check'];
    const nightActionRows = actions.filter(a => skillTypes.includes(a.action_type));

    const toRoomPlayerId = (ref: string | null): string | null => {
      if (!ref) return null;
      const byId = roomPlayers.find(rp => String(rp.id) === ref);
      if (byId) return byId.id;
      const byUserId = roomPlayers.find(rp => String(rp.user_id) === ref);
      return byUserId ? byUserId.id : null;
    };

    const players: Player[] = roomPlayers.map(rp => ({
      id: rp.id,
      name: rp.player_name,
      avatar: '',
      seatNumber: rp.seat_number ?? 0,
      isAlive: rp.is_alive !== false,
      role: (rp.role as Player['role']) ?? null,
      isHost: false,
      isReady: false,
      isSpectator: false,
    }));

    // 狼人刀人结算：自爆狼目标优先 > 全选一致 > 少数服从多数 > 都未选则平安夜
    const werewolfKillRows = nightActionRows.filter(a => a.action_type === 'werewolf_kill');
    let effectiveWerewolfTargetId: string | null = null;
    if (werewolfKillRows.length > 0) {
      let selfExplodeTargetId: string | null = null;
      if (round > 1) {
        const prevActions = await gameRecordService.getActionsForRound(gameRecordId, round - 1);
        const selfExplode = prevActions.find(a => a.action_type === 'werewolf_self_explode');
        if (selfExplode?.target_id) {
          const tid = toRoomPlayerId(selfExplode.target_id);
          if (tid) selfExplodeTargetId = tid;
        }
      }
      if (selfExplodeTargetId) {
        effectiveWerewolfTargetId = selfExplodeTargetId;
      } else {
        const votesByTarget: Record<string, number> = {};
        for (const row of werewolfKillRows) {
          const tid = row.target_id ? toRoomPlayerId(row.target_id) : null;
          if (tid) votesByTarget[tid] = (votesByTarget[tid] ?? 0) + 1;
        }
        const entries = Object.entries(votesByTarget);
        if (entries.length > 0) {
          const maxCount = Math.max(...entries.map(([, c]) => c));
          const top = entries.filter(([, c]) => c === maxCount);
          effectiveWerewolfTargetId = top.length === 1 ? top[0][0] : (top[0]?.[0] ?? null);
        }
      }
    }

    const actionTypeMap: Record<string, NightAction['type']> = {
      werewolf_kill: 'wolf_kill',
      guard_protect: 'guard_protect',
      witch_save: 'witch_save',
      witch_poison: 'witch_poison',
      seer_check: 'seer_check',
    };

    const nonWolfRows = nightActionRows.filter(a => a.action_type !== 'werewolf_kill');
    const nightActions: NightAction[] = nonWolfRows
      .map(row => {
        const actorId = toRoomPlayerId(row.player_id);
        const targetId = row.target_id ? toRoomPlayerId(row.target_id) : undefined;
        const type = actionTypeMap[row.action_type];
        if (!type || !actorId) return null;
        return { type, actorId, targetId } as NightAction;
      })
      .filter((a): a is NightAction => a != null);

    if (effectiveWerewolfTargetId && werewolfKillRows.length > 0) {
      const firstWolfActorId = toRoomPlayerId(werewolfKillRows[0].player_id);
      if (firstWolfActorId) {
        nightActions.push({
          type: 'wolf_kill',
          actorId: firstWolfActorId,
          targetId: effectiveWerewolfTargetId,
        } as NightAction);
      }
    }

    const state: GameState = {
      gameId: gameRecordId,
      roomId,
      currentPhase: 'night',
      currentRound: round,
      phaseStartTime: Date.now(),
      players,
      votes: [],
      nightActions,
      gameActions: [],
    };

    const resolver = new NightActionResolver();
    const result = await resolver.resolveNightPhase(state);

    const deathNames = result.deaths.map(d => d.playerName);
    const deathSeats: number[] = [];
    const deathCauses: string[] = [];
    for (const d of result.deaths) {
      const seat = roomPlayers.find(rp => rp.id === d.playerId)?.seat_number;
      if (seat != null) {
        deathSeats.push(seat);
        deathCauses.push(d.cause === 'wolf_kill' ? 'wolf_kill' : d.cause === 'poison' ? 'poison' : 'none');
      }
    }

    await supabase
      .from('game_records')
      .update({
        last_night_death_names: deathNames as unknown as Record<string, unknown>,
        last_night_death_seats: deathSeats.length > 0 ? (deathSeats as unknown as Record<string, unknown>) : null,
        last_night_death_causes: deathCauses.length > 0 ? (deathCauses as unknown as Record<string, unknown>) : null,
      })
      .eq('id', gameRecordId);

    const { data: rec } = await supabase.from('game_records').select('sheriff_seat').eq('id', gameRecordId).maybeSingle();
    const sheriffSeat = (rec?.sheriff_seat as number | null) ?? null;
    if (sheriffSeat != null && deathSeats.includes(sheriffSeat)) {
      const sheriffTransferEndsAt = new Date(Date.now() + 300 * 1000).toISOString();
      await supabase
        .from('game_records')
        .update({
          current_phase: 'sheriff_transfer',
          phase_ends_at: sheriffTransferEndsAt,
          pending_sheriff_transfer: {
            deadSheriffSeat: sheriffSeat,
            fromPhase: 'night',
            round,
          } as unknown as Record<string, unknown>,
        })
        .eq('id', gameRecordId);
      await supabase.from('room_messages').insert({
        room_id: roomId,
        player_name: '系统',
        player_avatar: null,
        message: '警长出局，请选择移交警徽或销毁警徽。',
        message_type: 'system',
        game_record_id: gameRecordId,
        phase: 'night',
        round_number: round,
      });
      return;
    }

    if (skipAnnounce) return;

    await this.applyNightDeaths(roomId, gameRecordId);
    const messageText =
      deathNames.length > 0
        ? `昨夜死亡的玩家是：${deathNames.join('、')}`
        : '昨夜是平安夜';
    await supabase.from('room_messages').insert({
      room_id: roomId,
      player_name: '系统',
      player_avatar: null,
      message: messageText,
      message_type: 'system',
      game_record_id: gameRecordId,
      phase: 'day',
      round_number: round,
    });
    const { data: gr } = await supabase.from('game_records').select('last_night_death_seats, last_night_death_causes').eq('id', gameRecordId).maybeSingle();
    const seats = (gr?.last_night_death_seats as number[] | null) ?? [];
    const causes = (gr?.last_night_death_causes as string[] | null) ?? [];
    const hunterWolfKill = seats.find((seat, i) => {
      const rp = roomPlayers.find(p => p.seat_number === seat);
      return rp?.role === 'hunter' && (causes[i] === 'wolf_kill');
    });
    if (hunterWolfKill != null) {
      const hunterRp = roomPlayers.find(p => p.seat_number === hunterWolfKill);
      if (hunterRp?.id) {
        const now = new Date();
        const phaseEndsAt = new Date(now.getTime() + 10 * 1000).toISOString();
        await gameRecordService.updateGamePhase(
          gameRecordId,
          { current_phase: 'hunter_shot', phase_started_at: now.toISOString(), phase_ends_at: phaseEndsAt },
          undefined
        );
        await supabase.from('game_actions').insert({
          game_record_id: gameRecordId,
          player_id: hunterRp.id,
          action_type: 'hunter_pending',
          target_id: null,
          round,
          data: {},
        });
        await supabase.from('room_messages').insert({
          room_id: roomId,
          player_name: '系统',
          player_avatar: null,
          message: '猎人出局，请选择开枪目标（10 秒内）',
          message_type: 'system',
          game_record_id: gameRecordId,
          phase: 'hunter_shot',
          round_number: round,
        });
        await supabase.from('game_records').update({
          last_night_death_names: null,
          last_night_death_seats: null,
          last_night_death_causes: null,
        }).eq('id', gameRecordId);
        return;
      }
    }
    await supabase
      .from('game_records')
      .update({ last_night_death_names: null, last_night_death_seats: null, last_night_death_causes: null })
      .eq('id', gameRecordId);
  },

  /** 根据 game_records.last_night_death_seats 将对应座位玩家标记为死亡（仅在宣布死讯时调用） */
  async applyNightDeaths(roomId: string, gameRecordId: string): Promise<void> {
    const { data: rec } = await supabase
      .from('game_records')
      .select('last_night_death_seats')
      .eq('id', gameRecordId)
      .maybeSingle();
    const seats = (rec?.last_night_death_seats as number[] | null) ?? [];
    if (seats.length === 0) return;
    for (const seat of seats) {
      await supabase
        .from('room_players')
        .update({ is_alive: false })
        .eq('room_id', roomId)
        .eq('seat_number', seat);
    }
  },

  /** 警上竞选结束后宣布死讯：先应用昨夜死亡状态，再发消息（死亡状态在宣布死讯时才生效）。若昨夜有猎人狼刀死亡则进入猎人开枪；若屠边达成则结束对局并返回 gameEnded: true */
  async announceStoredDeaths(roomId: string, gameRecordId: string, round: number): Promise<{ gameEnded: boolean }> {
    await this.applyNightDeaths(roomId, gameRecordId);
    const { data: rec } = await supabase
      .from('game_records')
      .select('last_night_death_names, last_night_death_seats, last_night_death_causes')
      .eq('id', gameRecordId)
      .maybeSingle();
    const names = (rec?.last_night_death_names as string[] | null) ?? [];
    const seats = (rec?.last_night_death_seats as number[] | null) ?? [];
    const causes = (rec?.last_night_death_causes as string[] | null) ?? [];
    const { data: roomPlayers } = await supabase
      .from('room_players')
      .select('id, seat_number, role')
      .eq('room_id', roomId);
    const messageText =
      names.length > 0 ? `昨夜死亡的玩家是：${names.join('、')}` : '昨夜是平安夜';
    await supabase.from('room_messages').insert({
      room_id: roomId,
      player_name: '系统',
      player_avatar: null,
      message: messageText,
      message_type: 'system',
      game_record_id: gameRecordId,
      phase: 'day',
      round_number: round,
    });
    const hunterWolfKillSeat = seats.find((seat, i) => {
      const rp = roomPlayers?.find(p => p.seat_number === seat);
      return rp?.role === 'hunter' && (causes[i] === 'wolf_kill');
    });
    if (hunterWolfKillSeat != null && roomPlayers?.length) {
      const hunterRp = roomPlayers.find(p => p.seat_number === hunterWolfKillSeat);
      if (hunterRp?.id) {
        const now = new Date();
        const phaseEndsAt = new Date(now.getTime() + 10 * 1000).toISOString();
        await gameRecordService.updateGamePhase(
          gameRecordId,
          { current_phase: 'hunter_shot', phase_started_at: now.toISOString(), phase_ends_at: phaseEndsAt },
          undefined
        );
        await supabase.from('game_actions').insert({
          game_record_id: gameRecordId,
          player_id: hunterRp.id,
          action_type: 'hunter_pending',
          target_id: null,
          round,
          data: {},
        });
        await supabase.from('room_messages').insert({
          room_id: roomId,
          player_name: '系统',
          player_avatar: null,
          message: '猎人出局，请选择开枪目标（10 秒内）',
          message_type: 'system',
          game_record_id: gameRecordId,
          phase: 'hunter_shot',
          round_number: round,
        });
        await supabase.from('game_records').update({
          last_night_death_names: null,
          last_night_death_seats: null,
          last_night_death_causes: null,
        }).eq('id', gameRecordId);
        return { gameEnded: false };
      }
    }
    await supabase
      .from('game_records')
      .update({ last_night_death_names: null, last_night_death_seats: null, last_night_death_causes: null })
      .eq('id', gameRecordId);

    const winResult = await this.checkWinCondition(roomId);
    if (winResult.winner) {
      const record = await gameRecordService.getCurrentGameRecord(roomId);
      if (record?.id) {
        const startedAt = record.started_at ? new Date(record.started_at).getTime() : Date.now();
        const durationSeconds = Math.floor((Date.now() - startedAt) / 1000);
        await gameRecordService.endGameRecord(record.id, winResult.winner, durationSeconds);
      }
      const { data: room } = await supabase.from('rooms').select('id').eq('id', roomId).single();
      if (room) {
        const { roomService: rs } = await import('./room');
        await rs.endGame(roomId, winResult.winner);
      }
      await supabase.from('room_messages').insert({
        room_id: roomId,
        player_name: '系统',
        player_avatar: null,
        message: `游戏结束，${winResult.winner === 'good' ? '好人' : '狼人'}阵营获胜。${winResult.reason}`,
        message_type: 'system',
        game_record_id: gameRecordId,
        phase: 'day',
        round_number: round,
      });
      return { gameEnded: true };
    }
    return { gameEnded: false };
  },

  /** 放逐平票 PK：平票玩家轮流发言（30s/人），发言顺序按座位号从小到大 */
  async startVotingPkPhase(
    roomId: string,
    gameRecordId: string,
    round: number,
    pkSeats: number[],
    pkRound: 1 | 2
  ): Promise<void> {
    const speechOrder = [...pkSeats].sort((a, b) => a - b);
    const firstSeat = speechOrder[0] ?? null;
    const now = new Date();
    const phaseEndsAt = new Date(now.getTime() + VOTING_PK_SPEECH_SECONDS * 1000).toISOString();
    const state: VotingPkState = {
      pkRound,
      pkSeats,
      speechOrder,
      speechIndex: 0,
      currentSpeakerSeat: firstSeat,
      phase: 'pk_speech',
    };
    await supabase.from('room_messages').insert({
      room_id: roomId,
      player_name: '系统',
      player_avatar: null,
      message: `平票，进入第${pkRound}轮PK发言阶段，${pkSeats.join('、')}号玩家轮流发言（${VOTING_PK_SPEECH_SECONDS}秒/人）。`,
      message_type: 'system',
      game_record_id: gameRecordId,
      phase: 'voting',
      round_number: round,
    });
    await supabase
      .from('game_records')
      .update({
        voting_pk_state: state as unknown as Record<string, unknown>,
        phase_started_at: now.toISOString(),
        phase_ends_at: phaseEndsAt,
      })
      .eq('id', gameRecordId);
  },

  /** PK 轮投票结算：只统计非 PK 玩家的票、只统计投给 PK 候选人的票；一人得票最高则放逐，再平票则下一轮 PK 或平安日 */
  async resolvePkVoteAndEliminate(
    roomId: string,
    gameRecordId: string,
    round: number,
    pkState: VotingPkState
  ): Promise<{ gameEnded: boolean }> {
    const { data: roomPlayers } = await supabase
      .from('room_players')
      .select('id, user_id, player_name, is_alive, role, seat_number')
      .eq('room_id', roomId);
    if (!roomPlayers || roomPlayers.length === 0) return { gameEnded: false };

    const actions = await gameRecordService.getActionsForRound(gameRecordId, round);
    const pkVoteRows = actions.filter(
      a => a.action_type === 'vote' && (a.data?.pk_round as number) === pkState.pkRound
    );
    const votesByTarget: Record<string, number> = {};
    for (const row of pkVoteRows) {
      const voterSeat = roomPlayers.find(rp => rp.id === row.player_id)?.seat_number ?? null;
      if (voterSeat != null && pkState.pkSeats.includes(voterSeat)) continue; // PK 玩家不能投票
      const targetId = row.target_id ?? null;
      if (!targetId) continue;
      const targetSeat = roomPlayers.find(rp => rp.id === targetId)?.seat_number ?? null;
      if (targetSeat == null || !pkState.pkSeats.includes(targetSeat)) continue; // 只统计投给 PK 候选人的票
      votesByTarget[targetId] = (votesByTarget[targetId] ?? 0) + 1;
    }
    const entries = Object.entries(votesByTarget);
    if (entries.length === 0) {
      await supabase.from('room_messages').insert({
        room_id: roomId,
        player_name: '系统',
        player_avatar: null,
        message: `第${pkState.pkRound}轮PK无人投票，视为平安日。`,
        message_type: 'system',
        game_record_id: gameRecordId,
        phase: 'voting',
        round_number: round,
      });
      await supabase.from('game_records').update({ voting_pk_state: null }).eq('id', gameRecordId);
      const result = await this.startNightPhase(roomId, gameRecordId, round + 1);
      return { gameEnded: false };
    }
    const maxVotes = Math.max(...entries.map(([, c]) => c));
    const topTargets = entries.filter(([, c]) => c === maxVotes);
    const eliminatedRoomPlayerId = topTargets.length === 1 ? topTargets[0][0] : null;
    const isTie = topTargets.length > 1;

    const voteCountByPlayerName: Record<string, number> = {};
    for (const [rpId, count] of entries) {
      const name = roomPlayers.find(rp => rp.id === rpId)?.player_name ?? rpId;
      voteCountByPlayerName[name] = count;
    }
    await this.announceVoteResult(
      roomId,
      gameRecordId,
      round,
      voteCountByPlayerName,
      eliminatedRoomPlayerId
        ? roomPlayers.find(rp => rp.id === eliminatedRoomPlayerId)?.player_name
        : undefined
    );

    if (eliminatedRoomPlayerId) {
      const eliminatedPlayer = roomPlayers.find(rp => rp.id === eliminatedRoomPlayerId);
      await this.markPlayerDeadByRoomPlayerId(
        roomId,
        eliminatedRoomPlayerId,
        `${eliminatedPlayer?.player_name ?? '一名玩家'} 被投票出局（PK）`
      );
      await supabase.from('game_records').update({ voting_pk_state: null }).eq('id', gameRecordId);
      if (eliminatedPlayer?.role === 'hunter') {
        const now = new Date();
        const phaseEndsAt = new Date(now.getTime() + 10 * 1000).toISOString();
        await gameRecordService.updateGamePhase(
          gameRecordId,
          { current_phase: 'hunter_shot', phase_started_at: now.toISOString(), phase_ends_at: phaseEndsAt },
          undefined
        );
        await supabase.from('game_actions').insert({
          game_record_id: gameRecordId,
          player_id: eliminatedRoomPlayerId,
          action_type: 'hunter_pending',
          target_id: null,
          round,
          data: {},
        });
        await supabase.from('room_messages').insert({
          room_id: roomId,
          player_name: '系统',
          player_avatar: null,
          message: '猎人出局，请选择开枪目标（10 秒内）',
          message_type: 'system',
          game_record_id: gameRecordId,
          phase: 'hunter_shot',
          round_number: round,
        });
        return { gameEnded: false };
      }
      const winResult = await this.checkWinCondition(roomId);
      if (winResult.winner) {
        const record = await gameRecordService.getCurrentGameRecord(roomId);
        if (record?.id) {
          const startedAt = record.started_at ? new Date(record.started_at).getTime() : Date.now();
          await gameRecordService.endGameRecord(record.id, winResult.winner, Math.floor((Date.now() - startedAt) / 1000));
        }
        const { data: room } = await supabase.from('rooms').select('id').eq('id', roomId).single();
        if (room) {
          const { roomService: rs } = await import('./room');
          await rs.endGame(roomId, winResult.winner);
        }
        await supabase.from('room_messages').insert({
          room_id: roomId,
          player_name: '系统',
          player_avatar: null,
          message: `游戏结束，${winResult.winner === 'good' ? '好人' : '狼人'}阵营获胜。${winResult.reason}`,
          message_type: 'system',
          game_record_id: gameRecordId,
          phase: 'voting',
          round_number: round,
        });
        return { gameEnded: true };
      }
      const result = await this.startNightPhase(roomId, gameRecordId, round + 1);
      return { gameEnded: false };
    }

    if (isTie && pkState.pkRound < 2) {
      await this.startVotingPkPhase(roomId, gameRecordId, round, pkState.pkSeats, 2);
      return { gameEnded: false };
    }

    await supabase.from('room_messages').insert({
      room_id: roomId,
      player_name: '系统',
      player_avatar: null,
      message: '两轮PK均平票，平安日，无人出局，直接进入下一夜。',
      message_type: 'system',
      game_record_id: gameRecordId,
      phase: 'voting',
      round_number: round,
    });
    await supabase.from('game_records').update({ voting_pk_state: null }).eq('id', gameRecordId);
    await this.startNightPhase(roomId, gameRecordId, round + 1);
    return { gameEnded: false };
  },

  /** 投票结束：统计票数、出局一人或进 PK；若游戏结束则结束对局并返回 gameEnded: true */
  async resolveVoteAndEliminate(
    roomId: string,
    gameRecordId: string,
    round: number
  ): Promise<{ gameEnded: boolean }> {
    const { data: roomPlayers } = await supabase
      .from('room_players')
      .select('id, user_id, player_name, is_alive, role, seat_number')
      .eq('room_id', roomId);

    if (!roomPlayers || roomPlayers.length === 0) return { gameEnded: false };

    const actions = await gameRecordService.getActionsForRound(gameRecordId, round);
    const voteRows = actions.filter(a => a.action_type === 'vote' && (a.data?.pk_round == null));

    const toRoomPlayerId = (ref: string | null): string | null => {
      if (!ref) return null;
      const byId = roomPlayers.find(rp => String(rp.id) === ref);
      if (byId) return byId.id;
      const byUserId = roomPlayers.find(rp => String(rp.user_id) === ref);
      return byUserId ? byUserId.id : null;
    };

    const { data: gr } = await supabase.from('game_records').select('sheriff_seat').eq('id', gameRecordId).maybeSingle();
    const sheriffSeatVote = (gr?.sheriff_seat as number | null) ?? null;

    const votesByTarget: Record<string, number> = {};
    for (const row of voteRows) {
      const targetId = row.target_id ? toRoomPlayerId(row.target_id) : null;
      if (!targetId) continue;
      const voterRp = roomPlayers.find(rp => String(rp.id) === row.player_id);
      const voterSeat = voterRp?.seat_number ?? null;
      const weight = sheriffSeatVote != null && voterSeat === sheriffSeatVote ? 1.5 : 1;
      votesByTarget[targetId] = (votesByTarget[targetId] ?? 0) + weight;
    }

    const entries = Object.entries(votesByTarget);
    if (entries.length === 0) {
      await this.announceVoteResult(roomId, gameRecordId, round, {}, undefined);
      return { gameEnded: false };
    }

    const maxVotes = Math.max(...entries.map(([, c]) => c));
    const topTargets = entries.filter(([, c]) => c === maxVotes);
    const eliminatedRoomPlayerId =
      topTargets.length === 1 ? topTargets[0][0] : null;
    const isTie = topTargets.length > 1;

    const voteCountByPlayerName: Record<string, number> = {};
    for (const [rpId, count] of entries) {
      const name = roomPlayers.find(rp => rp.id === rpId)?.player_name ?? rpId;
      voteCountByPlayerName[name] = count;
    }

    await this.announceVoteResult(
      roomId,
      gameRecordId,
      round,
      voteCountByPlayerName,
      eliminatedRoomPlayerId
        ? roomPlayers.find(rp => rp.id === eliminatedRoomPlayerId)?.player_name
        : undefined
    );

    if (isTie) {
      const pkSeats = topTargets
        .map(([rpId]) => roomPlayers.find(rp => rp.id === rpId)?.seat_number)
        .filter((n): n is number => n != null);
      if (pkSeats.length > 0) {
        await this.startVotingPkPhase(roomId, gameRecordId, round, pkSeats, 1);
      }
      return { gameEnded: false };
    }

    if (eliminatedRoomPlayerId) {
      const eliminatedPlayer = roomPlayers.find(rp => rp.id === eliminatedRoomPlayerId);
      await this.markPlayerDeadByRoomPlayerId(
        roomId,
        eliminatedRoomPlayerId,
        `${eliminatedPlayer?.player_name ?? '一名玩家'} 被投票出局`
      );
      const { data: gr } = await supabase.from('game_records').select('sheriff_seat').eq('id', gameRecordId).maybeSingle();
      const sheriffSeat = (gr?.sheriff_seat as number | null) ?? null;
      const eliminatedSeat = eliminatedPlayer?.seat_number ?? null;
      if (sheriffSeat != null && eliminatedSeat === sheriffSeat) {
        const sheriffTransferEndsAt = new Date(Date.now() + 300 * 1000).toISOString();
        await supabase
          .from('game_records')
          .update({
            current_phase: 'sheriff_transfer',
            phase_ends_at: sheriffTransferEndsAt,
            pending_sheriff_transfer: {
              deadSheriffSeat: sheriffSeat,
              fromPhase: 'voting',
              round,
              eliminatedWasHunter: eliminatedPlayer?.role === 'hunter',
            } as unknown as Record<string, unknown>,
          })
          .eq('id', gameRecordId);
        await supabase.from('room_messages').insert({
          room_id: roomId,
          player_name: '系统',
          player_avatar: null,
          message: '警长出局，请选择移交警徽或销毁警徽。',
          message_type: 'system',
          game_record_id: gameRecordId,
          phase: 'voting',
          round_number: round,
        });
        return { gameEnded: false };
      }
      if (eliminatedPlayer?.role === 'hunter') {
        const now = new Date();
        const phaseEndsAt = new Date(now.getTime() + 10 * 1000).toISOString();
        await gameRecordService.updateGamePhase(
          gameRecordId,
          { current_phase: 'hunter_shot', phase_started_at: now.toISOString(), phase_ends_at: phaseEndsAt },
          undefined
        );
        await supabase.from('game_actions').insert({
          game_record_id: gameRecordId,
          player_id: eliminatedRoomPlayerId,
          action_type: 'hunter_pending',
          target_id: null,
          round,
          data: {},
        });
        await supabase.from('room_messages').insert({
          room_id: roomId,
          player_name: '系统',
          player_avatar: null,
          message: '猎人出局，请选择开枪目标（10 秒内）',
          message_type: 'system',
          game_record_id: gameRecordId,
          phase: 'hunter_shot',
          round_number: round,
        });
        return { gameEnded: false };
      }
    }

    const winResult = await this.checkWinCondition(roomId);
    if (winResult.winner) {
      const record = await gameRecordService.getCurrentGameRecord(roomId);
      if (record?.id) {
        const startedAt = record.started_at ? new Date(record.started_at).getTime() : Date.now();
        const durationSeconds = Math.floor((Date.now() - startedAt) / 1000);
        await gameRecordService.endGameRecord(record.id, winResult.winner, durationSeconds);
      }
      const { data: room } = await supabase.from('rooms').select('id').eq('id', roomId).single();
      if (room) {
        const { roomService: rs } = await import('./room');
        await rs.endGame(roomId, winResult.winner);
      }
      await supabase.from('room_messages').insert({
        room_id: roomId,
        player_name: '系统',
        player_avatar: null,
        message: `游戏结束，${winResult.winner === 'good' ? '好人' : '狼人'}阵营获胜。${winResult.reason}`,
        message_type: 'system',
        game_record_id: gameRecordId,
        phase: 'voting',
        round_number: round,
      });
      return { gameEnded: true };
    }

    return { gameEnded: false };
  },

  /** 推进到下一阶段（夜→按步→日→投票→下一夜），由倒计时结束或手动触发；多端同时调用时仅一端生效（幂等） */
  async advanceToNextPhase(roomId: string, gameRecordId: string): Promise<{ success: boolean; nextPhase?: string; durationSeconds?: number }> {
    try {
      const record = await gameRecordService.getCurrentGameRecord(roomId);
      if (!record || record.id !== gameRecordId) return { success: false };
      const phase = (record.current_phase || 'night') as string;
      const round = record.current_round ?? 1;
      const now = Date.now();
      const phaseEndsAt = record.phase_ends_at ? new Date(record.phase_ends_at).getTime() : 0;
      const phaseEndsAtSentinel = record.phase_ends_at === '9999-01-01T00:00:00.000Z';
      const nowTime = Date.now();
      const phaseEndsAtTime = record.phase_ends_at ? new Date(record.phase_ends_at).getTime() : 0;

      // 允许认领条件：
      // 1. 之前没有设置过结束时间 (0)
      // 2. 之前是哨兵锁 (兼容旧逻辑)
      // 3. 已经超过了预设的结束时间（常规倒计时结束）
      // 4. [优化] 之前的认领租约（15s锁）已过期，允许其他客户端接管
      const canClaim = phaseEndsAtTime === 0 || phaseEndsAtSentinel || nowTime >= phaseEndsAtTime;

      if (!canClaim) {
        // [特殊逻辑] 夜晚阶段针对具体步长的特殊延时判断（保持原有逻辑）
        if (phase === 'night') {
          const nightStep = record.night_step ?? 0;
          const nightSteps = await gameConfigService.getNightSteps('standard_flow', record.board_id ?? undefined);
          const stepDuration = (nightSteps[nightStep]?.duration ?? 60) * 1000;
          const started = record.phase_started_at ? new Date(record.phase_started_at).getTime() : 0;
          if (started + stepDuration > nowTime) return { success: false };
        } else {
          return { success: false };
        }
      }

      // 认领推进权：设置一个 15 秒的限时租约锁。
      // 这样做既能防止短时间内的并发请求导致的流程跳跃，
      // 又能在主推客户端意外离线时，允许其他客户端在 15s 后接替。
      const leaseDuration = 15; // 15秒租约
      const leaseEndsAt = new Date(nowTime + leaseDuration * 1000).toISOString();
      const claimResult = await supabase
        .from('game_records')
        .update({
          phase_ends_at: leaseEndsAt,
          phase_started_at: new Date().toISOString() // 更新最近尝试时间
        })
        .eq('id', gameRecordId)
        .eq('phase_ends_at', record.phase_ends_at) // 乐观锁：确保这期间没有被别人认领过
        .select('id')
        .maybeSingle();

      if (!claimResult.data) {
        // 认领失败，说明已经有其他客户端抢先一步拿到 15s 租约了
        return { success: true };
      }

      /** 移交警徽阶段：通常需手动，但若倒计时结束（租约已过期），则执行自动兜底（流失警徽） */
      if (phase === 'sheriff_transfer') {
        const canSheriffAutoAdvance = nowTime >= phaseEndsAtTime && !phaseEndsAtSentinel;
        if (!canSheriffAutoAdvance) return { success: false };

        // 自动兜底：清理挂起的移交并宣布警徽流失
        console.log(`[SheriffRecovery] 警徽移交阶段超时，正在自动清理...`);
        await supabase.from('room_players').update({ pending_sheriff_transfer: false }).eq('room_id', roomId);
        await supabase.from('room_messages').insert({
          room_id: roomId,
          player_name: '系统',
          message: '警长未能在规定时间内移交警徽，警徽流失。',
          message_type: 'system',
          game_record_id: gameRecordId,
          phase: 'sheriff_transfer',
          round_number: round
        });

        // 继续向下执行正常的入夜逻辑（或根据当前存活情况结算）
        // 这里我们借用 resolveVoteAndEliminate 之后的逻辑来推进
        const result = await this.startNightPhase(roomId, gameRecordId, round + 1);
        return { success: result.success, nextPhase: 'night', durationSeconds: result.durationSeconds };
      }

      if (phase === 'hunter_shot') {
        const claimed = await gameRecordService.updateGamePhase(
          gameRecordId,
          { current_phase: 'night', current_round: round + 1 },
          'hunter_shot'
        );
        if (!claimed) return { success: true };
        const result = await this.startNightPhase(roomId, gameRecordId, round + 1);
        return { success: result.success, nextPhase: 'night', durationSeconds: result.durationSeconds };
      }

      if (phase === 'night') {
        const nightStep = record.night_step ?? 0;
        const nightSteps = await gameConfigService.getNightSteps('standard_flow', record.board_id ?? undefined);
        if (nightSteps.length > 0 && nightStep < nightSteps.length - 1) {
          const nextStep = nightStep + 1;
          const durationSeconds = nightSteps[nextStep].duration;
          const now = new Date();
          const phaseEndsAtNext = new Date(now.getTime() + durationSeconds * 1000).toISOString();

          // 强制等待 Supabase 复制完成，避免 updateGamePhase 乐观锁失败
          await new Promise(resolve => setTimeout(resolve, 50));

          const claimed = await gameRecordService.updateGamePhase(
            gameRecordId,
            {
              night_step: nextStep,
              phase_started_at: now.toISOString(),
              phase_ends_at: phaseEndsAtNext,
            },
            'night',
            nightStep
          );
          if (claimed) {
            await supabase.from('room_messages').insert({
              room_id: roomId,
              player_name: '系统',
              player_avatar: null,
              message: `第 ${round} 夜 · ${nightSteps[nextStep].step_name}行动`,
              message_type: 'system',
              game_record_id: gameRecordId,
              phase: 'night',
              round_number: round,
            });
          }
          return { success: true, nextPhase: 'night', durationSeconds };
        }
        const { data: room } = await supabase
          .from('rooms')
          .select('max_players')
          .eq('id', roomId)
          .maybeSingle();
        const maxPlayers = room?.max_players ?? 12;
        const sheriffCampaignEnabled = round === 1 && maxPlayers >= 10;

        const claimedToDay = await gameRecordService.updateGamePhase(
          gameRecordId,
          {
            current_phase: round === 1 && sheriffCampaignEnabled ? 'sheriff_campaign' : 'day',
            night_step: 0,
          },
          'night'
        );
        if (!claimedToDay) return { success: true };
        if (sheriffCampaignEnabled) {
          await this.resolveNightDeathsAndAnnounce(roomId, gameRecordId, round, { skipAnnounce: true });
          const afterNight = await gameRecordService.getCurrentGameRecord(roomId);
          if (afterNight?.current_phase === 'sheriff_transfer') {
            return { success: true, nextPhase: 'sheriff_transfer' };
          }
          const sheriffResult = await this.startSheriffCampaignPhase(roomId, gameRecordId, round);
          return { success: sheriffResult.success, nextPhase: 'sheriff_campaign', durationSeconds: sheriffResult.durationSeconds };
        }
        await this.resolveNightDeathsAndAnnounce(roomId, gameRecordId, round, { skipAnnounce: false });
        const afterNight = await gameRecordService.getCurrentGameRecord(roomId);
        if (afterNight?.current_phase === 'sheriff_transfer') {
          return { success: true, nextPhase: 'sheriff_transfer' };
        }
        if (afterNight?.current_phase === 'hunter_shot') {
          return { success: true, nextPhase: 'hunter_shot' };
        }
        const winResult = await this.checkWinCondition(roomId);
        if (winResult.winner) {
          const record = await gameRecordService.getCurrentGameRecord(roomId);
          if (record?.id) {
            const startedAt = record.started_at ? new Date(record.started_at).getTime() : Date.now();
            const durationSeconds = Math.floor((Date.now() - startedAt) / 1000);
            await gameRecordService.endGameRecord(record.id, winResult.winner, durationSeconds);
          }
          const { data: room } = await supabase.from('rooms').select('id').eq('id', roomId).single();
          if (room) {
            const { roomService: rs } = await import('./room');
            await rs.endGame(roomId, winResult.winner);
          }
          await supabase.from('room_messages').insert({
            room_id: roomId,
            player_name: '系统',
            player_avatar: null,
            message: `游戏结束，${winResult.winner === 'good' ? '好人' : '狼人'}阵营获胜。${winResult.reason}`,
            message_type: 'system',
            game_record_id: gameRecordId,
            phase: 'night',
            round_number: round,
          });
          return { success: true, nextPhase: 'day' };
        }
        const result = await this.startDayPhase(roomId, gameRecordId, round);
        return { success: result.success, nextPhase: 'day', durationSeconds: result.durationSeconds };
      }

      if (phase === 'sheriff_campaign') {
        const sheriffState = (record as unknown as { sheriff_state?: SheriffState }).sheriff_state;
        if (!sheriffState) return { success: false };
        const now = new Date();
        const nowIso = now.toISOString();
        const sheriffRecovery = phaseEndsAtSentinel;
        if (!sheriffRecovery) {
          const claim = await supabase
            .from('game_records')
            .update({
              phase_started_at: nowIso,
              phase_ends_at: '9999-01-01T00:00:00.000Z',
            })
            .eq('id', gameRecordId)
            .eq('current_phase', 'sheriff_campaign')
            .or(`phase_ends_at.lte.${nowIso},phase_ends_at.is.null`)
            .select('id')
            .maybeSingle();
          if (!claim.data) return { success: true };
        }

        const aliveSeats = (await supabase
          .from('room_players')
          .select('seat_number, is_alive')
          .eq('room_id', roomId))
          .data?.filter((p: { seat_number: number | null; is_alive: boolean | null }) => p.is_alive !== false && p.seat_number != null)
          .map((p: { seat_number: number | null }) => p.seat_number as number) ?? [];

        const pickSpeechOrder = (seats: number[]) => {
          const sorted = [...seats].sort((a, b) => a - b);
          if (sorted.length === 0) return [];
          const startIdx = Math.floor(Math.random() * sorted.length);
          return [...sorted.slice(startIdx), ...sorted.slice(0, startIdx)];
        };

        const advanceToDay = async (
          sheriffSeatVal: number | null,
          note: string,
          isRecovery?: boolean
        ): Promise<{ success: boolean; nextPhase?: string; durationSeconds?: number; noRow?: boolean }> => {
          const deathResult = await this.announceStoredDeaths(roomId, gameRecordId, round);
          if (deathResult.gameEnded) return { success: true, nextPhase: 'day' };
          const { phaseEndsAt, durationSeconds } = await this.initDaySpeechState(roomId, gameRecordId, round, {
            sheriffSeatOverride: sheriffSeatVal,
          });
          await supabase.from('room_messages').insert({
            room_id: roomId,
            player_name: '系统',
            player_avatar: null,
            message: note,
            message_type: 'system',
            game_record_id: gameRecordId,
            phase: 'sheriff_campaign',
            round_number: round,
          });
          let dayQ = supabase.from('game_records').update({
            current_phase: 'day',
            phase_started_at: new Date().toISOString(),
            phase_ends_at: phaseEndsAt,
            sheriff_seat: sheriffSeatVal,
            sheriff_state: { ...sheriffState, stage: 'done' } as unknown as Record<string, unknown>,
          }).eq('id', gameRecordId);
          if (isRecovery) dayQ = dayQ.eq('phase_ends_at', '9999-01-01T00:00:00.000Z');
          const dayRes = await dayQ.select('id').maybeSingle();
          if (isRecovery && !dayRes?.id) return { success: true, nextPhase: 'day', noRow: true };
          return { success: true, nextPhase: 'day', durationSeconds };
        };

        // stage machine
        if (sheriffState.stage === 'signup') {
          const seats = (sheriffState.signupSeats || []).filter((s) => aliveSeats.includes(s));
          if (seats.length === 0) {
            const r = await advanceToDay(null, '无人上警，本局无警长。现在宣布死讯。', sheriffRecovery);
            if (r.noRow) return { success: true };
            return r;
          }
          if (seats.length === 1) {
            const r = await advanceToDay(seats[0], '仅一名玩家上警，自动当选警长。现在宣布死讯。', sheriffRecovery);
            if (r.noRow) return { success: true };
            return r;
          }
          const speechOrder = pickSpeechOrder(seats);
          const nextState: SheriffState = {
            ...sheriffState,
            stage: 'speech',
            speechOrder,
            speechIndex: 0,
            currentSpeakerSeat: speechOrder[0] ?? null,
            votes: {},
            pkSeats: [],
          };
          const phaseEndsAt = new Date(Date.now() + SHERIFF_SPEECH_SECONDS * 1000).toISOString();
          await supabase.from('room_messages').insert({
            room_id: roomId,
            player_name: '系统',
            player_avatar: null,
            message: `${speechOrder[0]}号玩家开始警上发言（${SHERIFF_SPEECH_SECONDS}s）`,
            message_type: 'system',
            game_record_id: gameRecordId,
            phase: 'sheriff_campaign',
            round_number: round,
          });
          let signupQ = supabase.from('game_records').update({ sheriff_state: nextState as unknown as Record<string, unknown>, phase_ends_at: phaseEndsAt }).eq('id', gameRecordId);
          if (sheriffRecovery) signupQ = signupQ.eq('phase_ends_at', '9999-01-01T00:00:00.000Z');
          const signupRes = await signupQ.select('id').maybeSingle();
          if (sheriffRecovery && !signupRes?.id) return { success: true };
          return { success: true, nextPhase: 'sheriff_campaign', durationSeconds: SHERIFF_SPEECH_SECONDS };
        }

        if (sheriffState.stage === 'speech' || sheriffState.stage === 'pk_speech') {
          const order = (sheriffState.speechOrder || []).filter((s) => aliveSeats.includes(s));
          const nextIndex = (sheriffState.speechIndex || 0) + 1;
          if (nextIndex < order.length) {
            const nextSeat = order[nextIndex];
            const nextState: SheriffState = { ...sheriffState, speechOrder: order, speechIndex: nextIndex, currentSpeakerSeat: nextSeat };
            const phaseEndsAt = new Date(Date.now() + SHERIFF_SPEECH_SECONDS * 1000).toISOString();
            await supabase.from('room_messages').insert({
              room_id: roomId,
              player_name: '系统',
              player_avatar: null,
              message: `${nextSeat}号玩家开始发言（${SHERIFF_SPEECH_SECONDS}s）`,
              message_type: 'system',
              game_record_id: gameRecordId,
              phase: 'sheriff_campaign',
              round_number: round,
            });
            let speechQ = supabase.from('game_records').update({ sheriff_state: nextState as unknown as Record<string, unknown>, phase_ends_at: phaseEndsAt }).eq('id', gameRecordId);
            if (sheriffRecovery) speechQ = speechQ.eq('phase_ends_at', '9999-01-01T00:00:00.000Z');
            const speechRes = await speechQ.select('id').maybeSingle();
            if (sheriffRecovery && !speechRes?.id) return { success: true };
            return { success: true, nextPhase: 'sheriff_campaign', durationSeconds: SHERIFF_SPEECH_SECONDS };
          }
          // speeches done -> vote / pk_vote
          const voteStage: SheriffStage = sheriffState.stage === 'pk_speech' ? 'pk_vote' : 'vote';
          const nextState: SheriffState = { ...sheriffState, stage: voteStage, speechOrder: order, currentSpeakerSeat: null, votes: {} };
          const phaseEndsAt = new Date(Date.now() + SHERIFF_VOTE_SECONDS * 1000).toISOString();
          await supabase.from('room_messages').insert({
            room_id: roomId,
            player_name: '系统',
            player_avatar: null,
            message: `警下投票开始（${SHERIFF_VOTE_SECONDS}s）`,
            message_type: 'system',
            game_record_id: gameRecordId,
            phase: 'sheriff_campaign',
            round_number: round,
          });
          let voteStartQ = supabase.from('game_records').update({ sheriff_state: nextState as unknown as Record<string, unknown>, phase_ends_at: phaseEndsAt }).eq('id', gameRecordId);
          if (sheriffRecovery) voteStartQ = voteStartQ.eq('phase_ends_at', '9999-01-01T00:00:00.000Z');
          const voteStartRes = await voteStartQ.select('id').maybeSingle();
          if (sheriffRecovery && !voteStartRes?.id) return { success: true };
          return { success: true, nextPhase: 'sheriff_campaign', durationSeconds: SHERIFF_VOTE_SECONDS };
        }

        if (sheriffState.stage === 'vote' || sheriffState.stage === 'pk_vote') {
          const candidates =
            sheriffState.stage === 'pk_vote'
              ? (sheriffState.pkSeats || []).filter((s) => aliveSeats.includes(s))
              : (sheriffState.signupSeats || []).filter((s) => aliveSeats.includes(s));
          const voteCounts: Record<number, number> = {};
          for (const v of Object.values(sheriffState.votes || {})) {
            if (v == null) continue;
            if (!candidates.includes(v)) continue;
            voteCounts[v] = (voteCounts[v] ?? 0) + 1;
          }
          const entries = Object.entries(voteCounts).map(([k, c]) => [Number(k), c] as const);
          if (entries.length === 0) {
            const r = await advanceToDay(null, '警下无人投票，本局无警长。现在宣布死讯。', sheriffRecovery);
            if (r.noRow) return { success: true };
            return r;
          }
          const maxVotes = Math.max(...entries.map(([, c]) => c));
          const top = entries.filter(([, c]) => c === maxVotes).map(([s]) => s);
          if (top.length === 1) {
            const r = await advanceToDay(top[0], `警长竞选结束，${top[0]}号玩家当选警长。现在宣布死讯。`, sheriffRecovery);
            if (r.noRow) return { success: true };
            return r;
          }
          // tie -> PK (最多 2 次)
          const nextPkRound = (sheriffState.pkRound || 0) + 1;
          if (nextPkRound > 2) {
            const r = await advanceToDay(null, '警长竞选多次平票，警徽流失，本局无警长。现在宣布死讯。', sheriffRecovery);
            if (r.noRow) return { success: true };
            return r;
          }
          const pkSeats = top;
          const speechOrder = pickSpeechOrder(pkSeats);
          const nextState: SheriffState = {
            ...sheriffState,
            stage: 'pk_speech',
            pkRound: nextPkRound,
            pkSeats,
            speechOrder,
            speechIndex: 0,
            currentSpeakerSeat: speechOrder[0] ?? null,
            votes: {},
          };
          const phaseEndsAt = new Date(Date.now() + SHERIFF_SPEECH_SECONDS * 1000).toISOString();
          await supabase.from('room_messages').insert({
            room_id: roomId,
            player_name: '系统',
            player_avatar: null,
            message: `警长竞选平票，进入第${nextPkRound}次PK发言（${pkSeats.join('、')}号）`,
            message_type: 'system',
            game_record_id: gameRecordId,
            phase: 'sheriff_campaign',
            round_number: round,
          });
          let pkQ = supabase.from('game_records').update({ sheriff_state: nextState as unknown as Record<string, unknown>, phase_ends_at: phaseEndsAt }).eq('id', gameRecordId);
          if (sheriffRecovery) pkQ = pkQ.eq('phase_ends_at', '9999-01-01T00:00:00.000Z');
          const pkRes = await pkQ.select('id').maybeSingle();
          if (sheriffRecovery && !pkRes?.id) return { success: true };
          return { success: true, nextPhase: 'sheriff_campaign', durationSeconds: SHERIFF_SPEECH_SECONDS };
        }

        return { success: false };
      }

      if (phase === 'day') {
        const dayState = (record as unknown as { day_speech_state?: DaySpeechState }).day_speech_state;
        if (!dayState?.speechOrder?.length) {
          const result = await this.startVotingPhase(roomId, gameRecordId, round);
          return { success: result.success, nextPhase: 'voting', durationSeconds: result.durationSeconds };
        }
        if (dayState.waitingForSheriffCall) {
          const now = new Date();
          const nowIso = now.toISOString();
          const phaseEndsAtTime = record.phase_ends_at ? new Date(record.phase_ends_at).getTime() : 0;
          if (phaseEndsAtTime > Date.now() && !phaseEndsAtSentinel) return { success: false };
          const dayRecovery = phaseEndsAtSentinel;
          if (!dayRecovery) {
            const claim = await supabase
              .from('game_records')
              .update({ phase_started_at: nowIso, phase_ends_at: '9999-01-01T00:00:00.000Z' })
              .eq('id', gameRecordId)
              .eq('current_phase', 'day')
              .or(`phase_ends_at.lte.${nowIso},phase_ends_at.is.null`)
              .select('id')
              .maybeSingle();
            if (!claim.data) return { success: true };
          }
          let clearQ = supabase.from('game_records').update({ day_speech_state: null }).eq('id', gameRecordId);
          if (dayRecovery) clearQ = clearQ.eq('phase_ends_at', '9999-01-01T00:00:00.000Z');
          const clearRes = await clearQ.select('id').maybeSingle();
          if (dayRecovery && !clearRes?.id) return { success: true };
          const result = await this.startVotingPhase(roomId, gameRecordId, round);
          return { success: result.success, nextPhase: 'voting', durationSeconds: result.durationSeconds };
        }
        const now = new Date();
        const nowIso = now.toISOString();
        const phaseEndsAtTime = record.phase_ends_at ? new Date(record.phase_ends_at).getTime() : 0;
        if (phaseEndsAtTime > Date.now() && !phaseEndsAtSentinel) return { success: false };

        const dayRecovery = phaseEndsAtSentinel;
        if (!dayRecovery) {
          const claim = await supabase
            .from('game_records')
            .update({ phase_started_at: nowIso, phase_ends_at: '9999-01-01T00:00:00.000Z' })
            .eq('id', gameRecordId)
            .eq('current_phase', 'day')
            .or(`phase_ends_at.lte.${nowIso},phase_ends_at.is.null`)
            .select('id')
            .maybeSingle();
          if (!claim.data) return { success: true };
        }

        const aliveSeatsDay =
          (await supabase
            .from('room_players')
            .select('seat_number, is_alive')
            .eq('room_id', roomId))
            .data?.filter((p: { seat_number: number | null; is_alive: boolean | null }) => p.is_alive !== false && p.seat_number != null)
            .map((p: { seat_number: number | null }) => p.seat_number as number) ?? [];
        const order = (dayState.speechOrder || []).filter((s: number) => aliveSeatsDay.includes(s));
        const nextIndex = (dayState.speechIndex ?? 0) + 1;
        const sheriffSeatDay = (record as unknown as { sheriff_seat?: number })?.sheriff_seat ?? null;
        const sheriffAlive = sheriffSeatDay != null && aliveSeatsDay.includes(sheriffSeatDay);
        if (nextIndex < order.length) {
          const nextSeat = order[nextIndex];
          const sheriffSeat = (record as unknown as { sheriff_seat?: number })?.sheriff_seat ?? null;
          const durationSeconds = nextSeat === sheriffSeat ? DAY_SPEECH_SHERIFF_SECONDS : DAY_SPEECH_SECONDS;
          const phaseEndsAtNext = new Date(Date.now() + durationSeconds * 1000).toISOString();
          const nextState: DaySpeechState = {
            ...dayState,
            speechOrder: order,
            speechIndex: nextIndex,
            currentSpeakerSeat: nextSeat,
          };
          await supabase.from('room_messages').insert({
            room_id: roomId,
            player_name: '系统',
            player_avatar: null,
            message: `${nextSeat}号玩家开始发言（${durationSeconds}s）`,
            message_type: 'system',
            game_record_id: gameRecordId,
            phase: 'day',
            round_number: round,
          });
          let dayUpd = supabase.from('game_records').update({
            day_speech_state: nextState as unknown as Record<string, unknown>,
            phase_ends_at: phaseEndsAtNext,
          }).eq('id', gameRecordId);
          if (dayRecovery) dayUpd = dayUpd.eq('phase_ends_at', '9999-01-01T00:00:00.000Z');
          const dayUpdRes = await dayUpd.select('id').maybeSingle();
          if (dayRecovery && !dayUpdRes?.id) return { success: true };
          return { success: true, nextPhase: 'day', durationSeconds };
        }
        // 发言全部结束：有警长且警长存活则进入警长归票阶段，否则直接进入投票
        if (sheriffAlive) {
          const sheriffCallState: DaySpeechState = {
            ...dayState,
            speechOrder: order,
            speechIndex: nextIndex,
            currentSpeakerSeat: null,
            waitingForSheriffCall: true,
          };
          const phaseEndsAtSheriff = new Date(Date.now() + 60 * 1000).toISOString();
          let sheriffCallQ = supabase.from('game_records').update({
            day_speech_state: sheriffCallState as unknown as Record<string, unknown>,
            phase_ends_at: phaseEndsAtSheriff,
          }).eq('id', gameRecordId);
          if (dayRecovery) sheriffCallQ = sheriffCallQ.eq('phase_ends_at', '9999-01-01T00:00:00.000Z');
          const sheriffCallRes = await sheriffCallQ.select('id').maybeSingle();
          if (dayRecovery && !sheriffCallRes?.id) return { success: true };
          await supabase.from('room_messages').insert({
            room_id: roomId,
            player_name: '系统',
            player_avatar: null,
            message: '发言结束，请警长归票（选择一名玩家作为归票对象，或倒计时结束后自动进入投票）。',
            message_type: 'system',
            game_record_id: gameRecordId,
            phase: 'day',
            round_number: round,
          });
          return { success: true, nextPhase: 'day', durationSeconds: 60 };
        }
        let dayClearQ = supabase.from('game_records').update({ day_speech_state: null }).eq('id', gameRecordId);
        if (dayRecovery) dayClearQ = dayClearQ.eq('phase_ends_at', '9999-01-01T00:00:00.000Z');
        const dayClearRes = await dayClearQ.select('id').maybeSingle();
        if (dayRecovery && !dayClearRes?.id) return { success: true };
        const result = await this.startVotingPhase(roomId, gameRecordId, round);
        return { success: result.success, nextPhase: 'voting', durationSeconds: result.durationSeconds };
      }

      if (phase === 'voting') {
        const now = new Date();
        const nowIso = now.toISOString();
        const phaseEndsAtTime = record.phase_ends_at ? new Date(record.phase_ends_at).getTime() : 0;
        if (phaseEndsAtTime > Date.now() && !phaseEndsAtSentinel) return { success: false };

        const voteRecovery = phaseEndsAtSentinel;
        if (!voteRecovery) {
          const claim = await supabase
            .from('game_records')
            .update({ phase_started_at: nowIso, phase_ends_at: '9999-01-01T00:00:00.000Z' })
            .eq('id', gameRecordId)
            .eq('current_phase', 'voting')
            .or(`phase_ends_at.lte.${nowIso},phase_ends_at.is.null`)
            .select('id')
            .maybeSingle();
          if (!claim.data) return { success: true };
        }

        const votingPk = record.voting_pk_state as VotingPkState | null | undefined;
        if (votingPk?.phase === 'pk_speech') {
          const order = (votingPk.speechOrder || []).filter(s => votingPk.pkSeats.includes(s));
          const nextIndex = (votingPk.speechIndex ?? 0) + 1;
          if (nextIndex < order.length) {
            const nextSeat = order[nextIndex];
            const nextState: VotingPkState = {
              ...votingPk,
              speechOrder: order,
              speechIndex: nextIndex,
              currentSpeakerSeat: nextSeat,
              phase: 'pk_speech',
            };
            const phaseEndsAt = new Date(Date.now() + VOTING_PK_SPEECH_SECONDS * 1000).toISOString();
            await supabase.from('room_messages').insert({
              room_id: roomId,
              player_name: '系统',
              player_avatar: null,
              message: `${nextSeat}号玩家开始PK发言（${VOTING_PK_SPEECH_SECONDS}s）`,
              message_type: 'system',
              game_record_id: gameRecordId,
              phase: 'voting',
              round_number: round,
            });
            let pkSpeechQ = supabase.from('game_records').update({
              voting_pk_state: nextState as unknown as Record<string, unknown>,
              phase_started_at: nowIso,
              phase_ends_at: phaseEndsAt,
            }).eq('id', gameRecordId);
            if (voteRecovery) pkSpeechQ = pkSpeechQ.eq('phase_ends_at', '9999-01-01T00:00:00.000Z');
            const pkSpeechRes = await pkSpeechQ.select('id').maybeSingle();
            if (voteRecovery && !pkSpeechRes?.id) return { success: true };
            return { success: true, nextPhase: 'voting', durationSeconds: VOTING_PK_SPEECH_SECONDS };
          }
          const pkVoteEndsAt = new Date(Date.now() + VOTING_PK_VOTE_SECONDS * 1000).toISOString();
          const nextState: VotingPkState = {
            ...votingPk,
            speechOrder: order,
            speechIndex: nextIndex,
            currentSpeakerSeat: null,
            phase: 'pk_vote',
          };
          await supabase.from('room_messages').insert({
            room_id: roomId,
            player_name: '系统',
            player_avatar: null,
            message: `第${votingPk.pkRound}轮PK发言结束，请非PK玩家投票（${VOTING_PK_VOTE_SECONDS}s）`,
            message_type: 'system',
            game_record_id: gameRecordId,
            phase: 'voting',
            round_number: round,
          });
          let pkVoteQ = supabase.from('game_records').update({
            voting_pk_state: nextState as unknown as Record<string, unknown>,
            phase_started_at: nowIso,
            phase_ends_at: pkVoteEndsAt,
          }).eq('id', gameRecordId);
          if (voteRecovery) pkVoteQ = pkVoteQ.eq('phase_ends_at', '9999-01-01T00:00:00.000Z');
          const pkVoteRes = await pkVoteQ.select('id').maybeSingle();
          if (voteRecovery && !pkVoteRes?.id) return { success: true };
          return { success: true, nextPhase: 'voting', durationSeconds: VOTING_PK_VOTE_SECONDS };
        }

        if (votingPk?.phase === 'pk_vote') {
          const pkResult = await this.resolvePkVoteAndEliminate(roomId, gameRecordId, round, votingPk);
          if (pkResult.gameEnded) return { success: true };
          const recordAfter = await gameRecordService.getCurrentGameRecord(roomId);
          if (recordAfter?.current_phase === 'hunter_shot') return { success: true };
          return { success: true };
        }

        const voteResult = await this.resolveVoteAndEliminate(roomId, gameRecordId, round);
        if (voteResult.gameEnded) return { success: true };
        const recordAfter = await gameRecordService.getCurrentGameRecord(roomId);
        if (recordAfter?.current_phase === 'hunter_shot') return { success: true };
        if ((recordAfter as { voting_pk_state?: VotingPkState })?.voting_pk_state) return { success: true };
        const result = await this.startNightPhase(roomId, gameRecordId, round + 1);
        return { success: result.success, nextPhase: 'night', durationSeconds: result.durationSeconds };
      }

      const nextPhase = await gameConfigService.getNextPhase('standard_flow', phase);
      const claimed = await gameRecordService.updateGamePhase(
        gameRecordId,
        { current_phase: nextPhase, current_round: nextPhase === 'night' ? round + 1 : round },
        phase
      );
      if (!claimed) return { success: true }; // 已被其他客户端推进
      if (nextPhase === 'day') {
        const result = await this.startDayPhase(roomId, gameRecordId, round);
        return { success: result.success, nextPhase: 'day', durationSeconds: result.durationSeconds };
      }
      if (nextPhase === 'voting') {
        const result = await this.startVotingPhase(roomId, gameRecordId, round);
        return { success: result.success, nextPhase: 'voting', durationSeconds: result.durationSeconds };
      }
      if (nextPhase === 'night') {
        const voteResult = await this.resolveVoteAndEliminate(roomId, gameRecordId, round);
        if (voteResult.gameEnded) return { success: true };
        const recordAfter = await gameRecordService.getCurrentGameRecord(roomId);
        if (recordAfter?.current_phase === 'hunter_shot') return { success: true };
        const result = await this.startNightPhase(roomId, gameRecordId, round + 1);
        return { success: result.success, nextPhase: 'night', durationSeconds: result.durationSeconds };
      }
      return { success: false };
    } catch (error) {
      console.error('Advance to next phase error:', error);
      return { success: false };
    }
  },

  /** 白天发言阶段狼人自爆：记录行动、标记死亡、立即入夜（跳过投票） */
  async selfExplodeDuringDay(
    roomId: string,
    gameRecordId: string,
    userId: string,
    round: number
  ): Promise<{ success: boolean; nextPhase?: string; durationSeconds?: number }> {
    try {
      const record = await gameRecordService.getCurrentGameRecord(roomId);
      if (!record || record.id !== gameRecordId || (record.current_phase || '') !== 'day') return { success: false };
      const dayState = (record as unknown as { day_speech_state?: DaySpeechState }).day_speech_state;
      if (!dayState?.currentSpeakerSeat) return { success: false };

      const { data: rp } = await supabase
        .from('room_players')
        .select('id, seat_number, role, player_name')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .maybeSingle();
      if (!rp || rp.role !== 'werewolf') return { success: false };
      if (rp.seat_number !== dayState.currentSpeakerSeat) return { success: false };

      const actions = await gameRecordService.getActionsForRound(gameRecordId, round);
      if (actions.some(a => a.action_type === 'werewolf_self_explode')) return { success: false };

      await supabase.from('game_actions').insert({
        game_record_id: gameRecordId,
        player_id: rp.id,
        action_type: 'werewolf_self_explode',
        target_id: null,
        round,
        data: {},
      });
      await supabase
        .from('room_players')
        .update({ is_alive: false })
        .eq('room_id', roomId)
        .eq('user_id', userId);
      await supabase.from('room_messages').insert({
        room_id: roomId,
        player_name: '系统',
        player_avatar: null,
        message: `${rp.seat_number}号玩家自爆，立即入夜。`,
        message_type: 'system',
        game_record_id: gameRecordId,
        phase: 'day',
        round_number: round,
      });
      await supabase
        .from('game_records')
        .update({
          current_phase: 'night',
          current_round: round + 1,
          day_speech_state: null,
          phase_started_at: new Date().toISOString(),
          phase_ends_at: null,
        })
        .eq('id', gameRecordId);
      const result = await this.startNightPhase(roomId, gameRecordId, round + 1);
      return { success: true, nextPhase: 'night', durationSeconds: result.durationSeconds };
    } catch (error) {
      console.error('Self explode during day error:', error);
      return { success: false };
    }
  },

  /** 当前发言者提前结束发言，自动进入下一名发言者（警上发言/白天发言） */
  async endCurrentSpeakerTurn(
    roomId: string,
    gameRecordId: string,
    userId: string
  ): Promise<{ success: boolean; nextPhase?: string; durationSeconds?: number }> {
    try {
      const record = await gameRecordService.getCurrentGameRecord(roomId);
      if (!record || record.id !== gameRecordId) return { success: false };
      const phase = (record.current_phase || '') as string;
      const round = record.current_round ?? 1;

      const { data: rp } = await supabase
        .from('room_players')
        .select('seat_number')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .maybeSingle();
      const userSeat = rp?.seat_number ?? null;
      if (userSeat == null) return { success: false };

      if (phase === 'sheriff_campaign') {
        const sheriffState = (record as unknown as { sheriff_state?: SheriffState }).sheriff_state;
        if (!sheriffState || sheriffState.currentSpeakerSeat !== userSeat) return { success: false };
        if (sheriffState.stage !== 'speech' && sheriffState.stage !== 'pk_speech') return { success: false };
      } else if (phase === 'day') {
        const dayState = (record as unknown as { day_speech_state?: DaySpeechState }).day_speech_state;
        if (!dayState || dayState.currentSpeakerSeat !== userSeat) return { success: false };
      } else {
        return { success: false };
      }

      const nowIso = new Date().toISOString();
      const { data: updated } = await supabase
        .from('game_records')
        .update({ phase_ends_at: nowIso })
        .eq('id', gameRecordId)
        .select('id')
        .maybeSingle();
      if (!updated) return { success: false };

      // 强制等待 Supabase 复制完成，避免后续 advanceToNextPhase 读取到旧数据
      await new Promise(resolve => setTimeout(resolve, 50));

      return await this.advanceToNextPhase(roomId, gameRecordId);
    } catch (error) {
      console.error('End current speaker turn error:', error);
      return { success: false };
    }
  },

  /** 警长归票：白天发言结束后仅警长可调用，选择一名存活玩家作为归票对象，然后进入投票阶段；系统会广播「警长归票X号玩家」 */
  async sheriffCallVote(
    roomId: string,
    gameRecordId: string,
    userId: string,
    targetSeat: number
  ): Promise<{ success: boolean; nextPhase?: string; durationSeconds?: number }> {
    try {
      const record = await gameRecordService.getCurrentGameRecord(roomId);
      if (!record || record.id !== gameRecordId || (record.current_phase || '') !== 'day') return { success: false };
      const dayState = (record as unknown as { day_speech_state?: DaySpeechState }).day_speech_state;
      if (!dayState?.waitingForSheriffCall) return { success: false };
      const sheriffSeat = (record as unknown as { sheriff_seat?: number })?.sheriff_seat ?? null;
      if (sheriffSeat == null) return { success: false };

      const { data: rp } = await supabase
        .from('room_players')
        .select('seat_number')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .maybeSingle();
      if (rp?.seat_number !== sheriffSeat) return { success: false };

      const { data: targetRp } = await supabase
        .from('room_players')
        .select('player_name, is_alive')
        .eq('room_id', roomId)
        .eq('seat_number', targetSeat)
        .maybeSingle();
      if (!targetRp || targetRp.is_alive === false) return { success: false };

      await supabase.from('room_messages').insert({
        room_id: roomId,
        player_name: '系统',
        player_avatar: null,
        message: `警长归票${targetSeat}号玩家（${targetRp.player_name ?? ''}）。`,
        message_type: 'system',
        game_record_id: gameRecordId,
        phase: 'day',
        round_number: record.current_round ?? 1,
      });
      await supabase.from('game_records').update({ day_speech_state: null }).eq('id', gameRecordId);
      const round = record.current_round ?? 1;
      const result = await this.startVotingPhase(roomId, gameRecordId, round);
      return { success: true, nextPhase: 'voting', durationSeconds: result.durationSeconds };
    } catch (error) {
      console.error('Sheriff call vote error:', error);
      return { success: false };
    }
  },

  async killPlayer(roomId: string, userId: string, reason: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('room_players')
        .update({ is_alive: false })
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) throw error;

      const { data: player } = await supabase
        .from('room_players')
        .select('player_name')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single();

      if (player) {
        const messageData: TablesInsert<'room_messages'> = {
          room_id: roomId,
          player_name: '系统',
          player_avatar: null,
          message: `${player.player_name} ${reason}`,
          message_type: 'system',
        };

        await supabase.from('room_messages').insert(messageData);
      }

      return true;
    } catch (error) {
      console.error('Kill player error:', error);
      return false;
    }
  },

  /** 按 room_players.id 标记玩家死亡（用于夜晚/投票结算） */
  async markPlayerDeadByRoomPlayerId(
    roomId: string,
    roomPlayerId: string,
    message: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('room_players')
        .update({ is_alive: false })
        .eq('room_id', roomId)
        .eq('id', roomPlayerId);

      if (error) throw error;

      const messageData: TablesInsert<'room_messages'> = {
        room_id: roomId,
        player_name: '系统',
        player_avatar: null,
        message,
        message_type: 'system',
      };
      await supabase.from('room_messages').insert(messageData);
      return true;
    } catch (error) {
      console.error('Mark player dead error:', error);
      return false;
    }
  },

  async recordVote(
    roomId: string,
    gameRecordId: string,
    voterUserId: string,
    targetId: string | null,
    round: number,
    options?: { pkRound?: number; pkSeats?: number[] }
  ): Promise<boolean> {
    try {
      const { data: rp } = await supabase
        .from('room_players')
        .select('id, seat_number')
        .eq('room_id', roomId)
        .eq('user_id', voterUserId)
        .maybeSingle();
      if (!rp?.id) return false;
      if (options?.pkSeats?.length && rp.seat_number != null && options.pkSeats.includes(rp.seat_number))
        return false; // PK 玩家不能投票
      const voteData = options?.pkRound != null ? { pk_round: options.pkRound } : {};
      await supabase.from('game_actions').insert({
        game_record_id: gameRecordId,
        player_id: rp.id,
        action_type: 'vote',
        target_id: targetId,
        round,
        data: voteData as Record<string, unknown>,
      });
      return true;
    } catch (error) {
      console.error('Record vote error:', error);
      return false;
    }
  },

  /** 猎人开枪：记录目标（或放弃），若选中有则标记目标死亡，并推进到下一夜 */
  async recordHunterShot(
    roomId: string,
    gameRecordId: string,
    hunterRoomPlayerId: string,
    targetRoomPlayerId: string | null,
    round: number
  ): Promise<{ success: boolean }> {
    try {
      const record = await gameRecordService.getCurrentGameRecord(roomId);
      if (!record || record.id !== gameRecordId || (record.current_phase || '') !== 'hunter_shot') {
        return { success: false };
      }
      const actions = await gameRecordService.getActionsForRound(gameRecordId, round);
      const alreadyShot = actions.some(a => a.action_type === 'hunter_shot');
      if (alreadyShot) return { success: false };

      await supabase.from('game_actions').insert({
        game_record_id: gameRecordId,
        player_id: hunterRoomPlayerId,
        action_type: 'hunter_shot',
        target_id: targetRoomPlayerId,
        round,
        data: {},
      });

      if (targetRoomPlayerId) {
        const { data: roomPlayers } = await supabase
          .from('room_players')
          .select('id, player_name, seat_number')
          .eq('room_id', roomId);
        const targetRp = roomPlayers?.find(rp => rp.id === targetRoomPlayerId);
        const hunterRp = roomPlayers?.find(rp => rp.id === hunterRoomPlayerId);
        const name = targetRp?.player_name ?? '一名玩家';
        await this.markPlayerDeadByRoomPlayerId(roomId, targetRoomPlayerId, `${name} 被猎人开枪带走`);
        const hunterSeat = hunterRp?.seat_number ?? 0;
        const targetSeat = targetRp?.seat_number ?? 0;
        await supabase.from('room_messages').insert({
          room_id: roomId,
          player_name: '系统',
          player_avatar: null,
          message: `${hunterSeat}号玩家为猎人，开枪带走${targetSeat}号玩家。`,
          message_type: 'system',
          game_record_id: gameRecordId,
          phase: 'hunter_shot',
          round_number: round,
        });
      }

      const claimed = await gameRecordService.updateGamePhase(
        gameRecordId,
        { current_phase: 'night', current_round: round + 1 },
        'hunter_shot'
      );
      if (!claimed) return { success: true };
      const result = await this.startNightPhase(roomId, gameRecordId, round + 1);
      return { success: result.success };
    } catch (error) {
      console.error('Record hunter shot error:', error);
      return { success: false };
    }
  },

  async announceVoteResult(
    roomId: string,
    gameRecordId: string,
    round: number,
    votes: Record<string, number>,
    eliminatedPlayer?: string
  ): Promise<boolean> {
    try {
      let message = '投票结果：\n';
      Object.entries(votes).forEach(([playerName, count]) => {
        message += `${playerName}: ${count}票\n`;
      });

      if (eliminatedPlayer) {
        message += `\n${eliminatedPlayer} 被投票出局`;
      } else {
        message += '\n无人出局，平票';
      }

      const messageData: TablesInsert<'room_messages'> = {
        room_id: roomId,
        player_name: '系统',
        player_avatar: null,
        message,
        message_type: 'system',
        game_record_id: gameRecordId,
        phase: 'voting',
        round_number: round,
      };

      await supabase.from('room_messages').insert(messageData);
      return true;
    } catch (error) {
      console.error('Announce vote result error:', error);
      return false;
    }
  },

  async checkWinCondition(roomId: string): Promise<{ winner: string | null; reason: string }> {
    try {
      const { data: room } = await supabase
        .from('rooms')
        .select('board_id')
        .eq('id', roomId)
        .single();
      const boardId = room?.board_id ?? undefined;

      const config = await gameConfigService.getGameConfig(boardId);
      const roleToCamp = gameConfigService.buildRoleToCampMap(config.cards);

      const { data: roomPlayers } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId);

      if (!roomPlayers || roomPlayers.length === 0) {
        return { winner: null, reason: '没有玩家' };
      }

      const players = roomPlayers.map((p: { id: string; player_name: string; player_avatar: string | null; seat_number: number | null; is_alive: boolean; role: string | null; is_host: boolean; is_ready: boolean }) => ({
        id: p.id,
        name: p.player_name,
        avatar: p.player_avatar || '',
        seatNumber: p.seat_number ?? 0,
        isAlive: p.is_alive,
        role: p.role as import('@/types/gameState').RoleType | null,
        isHost: p.is_host,
        isReady: p.is_ready,
        isSpectator: false,
      }));

      const state: import('@/types/gameState').GameState = {
        gameId: '',
        roomId,
        currentPhase: 'day',
        currentRound: 1,
        phaseStartTime: Date.now(),
        players,
        votes: [],
        nightActions: [],
        gameActions: [],
      };

      const result = new WinConditionChecker().checkWinCondition(state, Object.keys(roleToCamp).length > 0 ? roleToCamp : undefined);
      return {
        winner: result.winner,
        reason: result.reason,
      };
    } catch (error) {
      console.error('Check win condition error:', error);
      return { winner: null, reason: '检查失败' };
    }
  },

  async executeSkill(
    roomId: string,
    gameRecordId: string,
    playerId: string,
    skillCode: string,
    targetId: string | undefined,
    round: number
  ): Promise<boolean> {
    try {
      const config = await gameConfigService.getGameConfig();
      const skill = config.skills.find(s => s.skill_code === skillCode);

      if (!skill) {
        console.error('[gameService] Skill not found:', skillCode);
        return false;
      }

      let actionData: Record<string, unknown> = { ...(skill.effect_params as Record<string, unknown>) };
      if (skillCode === 'seer_check' && targetId) {
        const { data: targetRow } = await supabase
          .from('room_players')
          .select('role')
          .eq('room_id', roomId)
          .eq('user_id', targetId)
          .maybeSingle();
        const targetRole = (targetRow?.role as string) || 'unknown';
        actionData.result = targetRole === 'werewolf' ? 'werewolf' : 'good';
      }

      const insertPayload: TablesInsert<'game_actions'> = {
        game_record_id: gameRecordId,
        player_id: playerId,
        action_type: skillCode,
        target_id: targetId || null,
        round,
        data: actionData,
      };

      await supabase.from('game_actions').insert(insertPayload);

      // 观战记录：记录技能使用（带座位号与阵营标签）
      const { data: rp } = await supabase
        .from('room_players')
        .select('seat_number, role')
        .eq('room_id', roomId)
        .eq('user_id', playerId)
        .maybeSingle();
      const seat = rp?.seat_number ?? null;
      const role = rp?.role ?? null;
      const camp = role === 'werewolf' ? 'werewolf' : 'good';
      const skillNameMap: Record<string, string> = {
        seer_check: '查验',
        guard_protect: '守护',
        werewolf_kill: '刀人',
        witch_save: '使用解药',
        witch_poison: '使用毒药',
      };
      const skillName = skillNameMap[skillCode] ?? skillCode;
      const targetSeat = targetId
        ? (await supabase.from('room_players').select('seat_number').eq('room_id', roomId).eq('user_id', targetId).maybeSingle()).data?.seat_number ?? null
        : null;
      const logMsg = seat != null
        ? `${seat}号玩家${skillName}${targetSeat != null ? `${targetSeat}号` : ''}`
        : `玩家${skillName}`;
      await supabase.from('room_messages').insert({
        room_id: roomId,
        player_name: '系统',
        player_avatar: null,
        message: logMsg,
        message_type: `skill_${camp}`,
        game_record_id: gameRecordId,
        phase: 'night',
        round_number: round,
      });

      return true;
    } catch (error) {
      console.error('Execute skill error:', error);
      return false;
    }
  },
};
