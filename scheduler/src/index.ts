import { createClient, SupabaseClient } from '@supabase/supabase-js'

interface GameRecord {
  id: string
  room_id: string
  board_id: string | null
  current_phase: string
  current_round: number
  night_step: number | null
  phase_ends_at: string | null
  day_speech_state: unknown | null
  sheriff_seat: number | null
  sheriff_state: unknown | null
  voting_pk_state: unknown | null
}

interface NightStep {
  step_index: number
  step_name: string
  skill_codes: string[]
  duration: number
}

const SHERIFF_SPEECH_SECONDS = 60
const SHERIFF_VOTE_SECONDS = 30
const DAY_SPEECH_SECONDS = 120
const DAY_SPEECH_SHERIFF_SECONDS = 150
const VOTING_PK_SPEECH_SECONDS = 30
const VOTING_PK_VOTE_SECONDS = 30

class GameScheduler {
  private supabase: SupabaseClient

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('错误: 必须设置环境变量 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY')
      process.exit(1)
    }

    this.supabase = createClient(supabaseUrl, supabaseKey)
    console.log('已连接到 Supabase')
  }

  async run(): Promise<void> {
    const now = new Date()
    const nowIso = now.toISOString()
    console.log(`[${now.toISOString()}] 开始检查超时游戏...`)

    try {
      const { data: timeoutRecords, error } = await this.supabase
        .from('game_records')
        .select('id, room_id, current_phase, current_round, night_step, phase_ends_at, day_speech_state, sheriff_seat, sheriff_state, voting_pk_state')
        .eq('status', 'playing')
        .lt('phase_ends_at', nowIso)

      if (error) {
        console.error('查询超时记录失败:', error)
        return
      }

      if (!timeoutRecords || timeoutRecords.length === 0) {
        console.log('没有需要推进的超时游戏')
        return
      }

      console.log(`发现 ${timeoutRecords.length} 个超时游戏需要处理`)

      let advanced = 0
      let failed = 0

      for (const record of timeoutRecords) {
        try {
          const success = await this.advancePhase(record as GameRecord)
          if (success) {
            advanced++
          } else {
            failed++
          }
        } catch (err) {
          console.error(`[${record.room_id}] 处理失败:`, err)
          failed++
        }
      }

      console.log(`完成: ${advanced} 个已推进, ${failed} 个失败`)

    } catch (err) {
      console.error('运行调度器失败:', err)
    }
  }

  private async advancePhase(record: GameRecord): Promise<boolean> {
    const now = Date.now()
    const nowIso = new Date(now).toISOString()
    const roomId = record.room_id
    const gameRecordId = record.id
    const phase = record.current_phase
    const round = record.current_round ?? 1

    console.log(`[${roomId}] 处理阶段: ${phase}, 回合: ${round}`)

    switch (phase) {
      case 'night':
        return await this.advanceNightPhase(record, now, nowIso, roomId, gameRecordId, round)
      case 'day':
        return await this.advanceDayPhase(record, now, nowIso, roomId, gameRecordId, round)
      case 'sheriff_campaign':
        return await this.advanceSheriffCampaign(record, now, nowIso, roomId, gameRecordId, round)
      case 'voting':
        return await this.advanceVotingPhase(record, now, nowIso, roomId, gameRecordId, round)
      case 'sheriff_transfer':
        return await this.advanceSheriffTransfer(record, now, nowIso, roomId, gameRecordId, round)
      case 'hunter_shot':
        return await this.advanceHunterShot(record, now, nowIso, roomId, gameRecordId, round)
      default:
        console.log(`[${roomId}] 跳过未知阶段: ${phase}`)
        return true
    }
  }

  private async advanceNightPhase(
    record: GameRecord,
    now: number,
    nowIso: string,
    roomId: string,
    gameRecordId: string,
    round: number
  ): Promise<boolean> {
    const phaseEndsAtTime = record.phase_ends_at ? new Date(record.phase_ends_at).getTime() : 0
    if (now < phaseEndsAtTime) return false

    // 认领推进权
    const leaseEndsAt = new Date(now + 15000).toISOString()
    const { data: claimed } = await this.supabase
      .from('game_records')
      .update({ phase_ends_at: leaseEndsAt, phase_started_at: nowIso })
      .eq('id', gameRecordId)
      .eq('phase_ends_at', record.phase_ends_at)
      .select('id')
      .single()

    if (!claimed) {
      console.log(`[${roomId}] 推进认领失败`)
      return true
    }

    // 获取夜步骤配置
    const nightSteps = await this.getNightSteps(record.board_id || null)
    const currentStep = record.night_step ?? 0

    if (currentStep < nightSteps.length - 1) {
      // 推进到下一步
      const nextStep = currentStep + 1
      const stepConfig = nightSteps[nextStep]
      const durationSeconds = stepConfig.duration
      const phaseEndsAtNext = new Date(now + durationSeconds * 1000).toISOString()

      await this.supabase
        .from('game_records')
        .update({
          night_step: nextStep,
          phase_ends_at: phaseEndsAtNext
        })
        .eq('id', gameRecordId)

      await this.insertSystemMessage(roomId, gameRecordId, `第 ${round} 夜 · ${stepConfig.step_name}行动`, 'night', round)

      console.log(`[${roomId}] 夜步骤 ${currentStep} -> ${nextStep} (${stepConfig.step_name})`)
      return true
    }

    // 夜晚结束，进入白天或警长竞选
    const sheriffCampaignEnabled = round === 1 && await this.hasMinPlayers(roomId, 10)
    const nextPhase = sheriffCampaignEnabled ? 'sheriff_campaign' : 'day'
    const dayDuration = await this.getPhaseDuration('day', 120)
    const phaseEndsAtDay = new Date(now + dayDuration * 1000).toISOString()

    await this.supabase
      .from('game_records')
      .update({
        current_phase: nextPhase,
        night_step: 0,
        phase_ends_at: phaseEndsAtDay
      })
      .eq('id', gameRecordId)

    await this.insertSystemMessage(roomId, gameRecordId, `第 ${round} 夜结束，进入${nextPhase === 'sheriff_campaign' ? '警长竞选' : '白天'}阶段`, 'night', round)

    console.log(`[${roomId}] 夜晚结束 -> ${nextPhase}`)
    return true
  }

  private async advanceDayPhase(
    record: GameRecord,
    now: number,
    nowIso: string,
    roomId: string,
    gameRecordId: string,
    round: number
  ): Promise<boolean> {
    const phaseEndsAtTime = record.phase_ends_at ? new Date(record.phase_ends_at).getTime() : 0
    if (now < phaseEndsAtTime) return false

    const dayState = record.day_speech_state as { speechOrder?: number[]; speechIndex?: number; currentSpeakerSeat?: number; waitingForSheriffCall?: boolean } | null

    // 认领推进权
    const leaseEndsAt = new Date(now + 15000).toISOString()
    const { data: claimed } = await this.supabase
      .from('game_records')
      .update({ phase_ends_at: leaseEndsAt, phase_started_at: nowIso })
      .eq('id', gameRecordId)
      .eq('phase_ends_at', record.phase_ends_at)
      .select('id')
      .single()

    if (!claimed) return true

    // 检查是否在等待警长归票
    if (dayState?.waitingForSheriffCall) {
      await this.supabase
        .from('game_records')
        .update({
          day_speech_state: null,
          current_phase: 'voting',
          phase_ends_at: new Date(now + 60 * 1000).toISOString()
        })
        .eq('id', gameRecordId)

      await this.insertSystemMessage(roomId, gameRecordId, '警长未归票，直接进入投票阶段', 'day', round)
      console.log(`[${roomId}] 警长归票超时 -> 投票`)
      return true
    }

    if (!dayState?.speechOrder?.length) {
      // 直接进入投票
      const votingDuration = await this.getPhaseDuration('voting', 60)
      await this.supabase
        .from('game_records')
        .update({
          current_phase: 'voting',
          day_speech_state: null,
          phase_ends_at: new Date(now + votingDuration * 1000).toISOString()
        })
        .eq('id', gameRecordId)

      await this.insertSystemMessage(roomId, gameRecordId, '白天发言结束，进入投票阶段', 'day', round)
      console.log(`[${roomId}] 白天发言结束 -> 投票`)
      return true
    }

    // 推进到下一位发言者
    const nextIndex = (dayState.speechIndex ?? 0) + 1
    if (nextIndex < dayState.speechOrder.length) {
      const nextSeat = dayState.speechOrder[nextIndex]
      const durationSeconds = nextSeat === record.sheriff_seat ? DAY_SPEECH_SHERIFF_SECONDS : DAY_SPEECH_SECONDS

      await this.supabase
        .from('game_records')
        .update({
          day_speech_state: {
            ...dayState,
            speechIndex: nextIndex,
            currentSpeakerSeat: nextSeat
          },
          phase_ends_at: new Date(now + durationSeconds * 1000).toISOString()
        })
        .eq('id', gameRecordId)

      await this.insertSystemMessage(roomId, gameRecordId, `${nextSeat}号玩家开始发言（${durationSeconds}s）`, 'day', round)
      console.log(`[${roomId}] 白天发言 ${dayState.speechOrder[dayState.speechIndex ?? 0]} -> ${nextSeat}`)
      return true
    }

    // 发言全部结束
    if (record.sheriff_seat && dayState.speechOrder.includes(record.sheriff_seat)) {
      await this.supabase
        .from('game_records')
        .update({
          day_speech_state: {
            ...dayState,
            currentSpeakerSeat: null,
            waitingForSheriffCall: true
          },
          phase_ends_at: new Date(now + 60 * 1000).toISOString()
        })
        .eq('id', gameRecordId)

      await this.insertSystemMessage(roomId, gameRecordId, '发言结束，请警长归票', 'day', round)
      console.log(`[${roomId}] 发言结束 -> 等待警长归票`)
      return true
    }

    // 无警长，直接投票
    const votingDuration = await this.getPhaseDuration('voting', 60)
    await this.supabase
      .from('game_records')
      .update({
        current_phase: 'voting',
        day_speech_state: null,
        phase_ends_at: new Date(now + votingDuration * 1000).toISOString()
      })
      .eq('id', gameRecordId)

    await this.insertSystemMessage(roomId, gameRecordId, '发言结束，进入投票阶段', 'day', round)
    console.log(`[${roomId}] 发言结束 -> 投票`)
    return true
  }

  private async advanceSheriffCampaign(
    record: GameRecord,
    now: number,
    nowIso: string,
    roomId: string,
    gameRecordId: string,
    round: number
  ): Promise<boolean> {
    const phaseEndsAtTime = record.phase_ends_at ? new Date(record.phase_ends_at).getTime() : 0
    if (now < phaseEndsAtTime) return false

    const sheriffState = record.sheriff_state as {
      stage: string
      signupSeats?: number[]
      speechOrder?: number[]
      speechIndex?: number
      currentSpeakerSeat?: number
      votes?: Record<number, number>
      pkSeats?: number[]
      pkRound?: number
    } | null

    if (!sheriffState) return true

    // 认领推进权
    const { data: claimed } = await this.supabase
      .from('game_records')
      .update({ phase_ends_at: new Date(now + 15000).toISOString(), phase_started_at: nowIso })
      .eq('id', gameRecordId)
      .eq('phase_ends_at', record.phase_ends_at)
      .select('id')
      .single()

    if (!claimed) return true

    const aliveSeats = await this.getAliveSeats(roomId)

    if (sheriffState.stage === 'signup') {
      const seats = (sheriffState.signupSeats || []).filter(s => aliveSeats.includes(s))
      if (seats.length === 0 || seats.length === 1) {
        // 无人上警或仅一人，自动结束
        await this.endSheriffCampaign(roomId, gameRecordId, round, seats[0] || null, '无人上警/仅一人上警，自动结束')
        return true
      }

      const speechOrder = this.pickSpeechOrder(seats)
      await this.supabase
        .from('game_records')
        .update({
          sheriff_state: {
            ...sheriffState,
            stage: 'speech',
            speechOrder,
            speechIndex: 0,
            currentSpeakerSeat: speechOrder[0]
          },
          phase_ends_at: new Date(now + SHERIFF_SPEECH_SECONDS * 1000).toISOString()
        })
        .eq('id', gameRecordId)

      await this.insertSystemMessage(roomId, gameRecordId, `${speechOrder[0]}号玩家开始警上发言（${SHERIFF_SPEECH_SECONDS}s）`, 'sheriff_campaign', round)
      console.log(`[${roomId}] 警上发言开始 -> ${speechOrder[0]}`)
      return true
    }

    if (sheriffState.stage === 'speech' || sheriffState.stage === 'pk_speech') {
      const order = (sheriffState.speechOrder || []).filter(s => aliveSeats.includes(s))
      const nextIndex = (sheriffState.speechIndex ?? 0) + 1

      if (nextIndex < order.length) {
        const nextSeat = order[nextIndex]
        await this.supabase
          .from('game_records')
          .update({
            sheriff_state: {
              ...sheriffState,
              speechOrder: order,
              speechIndex: nextIndex,
              currentSpeakerSeat: nextSeat
            },
            phase_ends_at: new Date(now + SHERIFF_SPEECH_SECONDS * 1000).toISOString()
          })
          .eq('id', gameRecordId)

        await this.insertSystemMessage(roomId, gameRecordId, `${nextSeat}号玩家开始发言（${SHERIFF_SPEECH_SECONDS}s）`, 'sheriff_campaign', round)
        return true
      }

      // 发言结束，进入投票
      const voteStage = sheriffState.stage === 'pk_speech' ? 'pk_vote' : 'vote'
      await this.supabase
        .from('game_records')
        .update({
          sheriff_state: {
            ...sheriffState,
            stage: voteStage,
            currentSpeakerSeat: null,
            votes: {}
          },
          phase_ends_at: new Date(now + SHERIFF_VOTE_SECONDS * 1000).toISOString()
        })
        .eq('id', gameRecordId)

      await this.insertSystemMessage(roomId, gameRecordId, '警下投票开始', 'sheriff_campaign', round)
      console.log(`[${roomId}] 发言结束 -> 投票`)
      return true
    }

    if (sheriffState.stage === 'vote' || sheriffState.stage === 'pk_vote') {
      const candidates = sheriffState.stage === 'pk_vote'
        ? (sheriffState.pkSeats || []).filter(s => aliveSeats.includes(s))
        : (sheriffState.signupSeats || []).filter(s => aliveSeats.includes(s))

      const voteCounts: Record<number, number> = {}
      for (const v of Object.values(sheriffState.votes || {})) {
        if (v && candidates.includes(v)) {
          voteCounts[v] = (voteCounts[v] ?? 0) + 1
        }
      }

      const entries = Object.entries(voteCounts)
      if (entries.length === 0 || entries.every(([, c]) => c === 0)) {
        await this.endSheriffCampaign(roomId, gameRecordId, round, null, '警下无人投票')
        return true
      }

      const maxVotes = Math.max(...entries.map(([, c]) => c))
      const top = entries.filter(([, c]) => c === maxVotes).map(([s]) => Number(s))

      if (top.length === 1) {
        await this.endSheriffCampaign(roomId, gameRecordId, round, top[0], `${top[0]}号玩家当选警长`)
        return true
      }

      // 平票 PK
      const nextPkRound = (sheriffState.pkRound || 0) + 1
      if (nextPkRound > 2) {
        await this.endSheriffCampaign(roomId, gameRecordId, round, null, '多次平票，警徽流失')
        return true
      }

      const speechOrder = this.pickSpeechOrder(top)
      await this.supabase
        .from('game_records')
        .update({
          sheriff_state: {
            ...sheriffState,
            stage: 'pk_speech',
            pkRound: nextPkRound,
            pkSeats: top,
            speechOrder,
            speechIndex: 0,
            currentSpeakerSeat: speechOrder[0],
            votes: {}
          },
          phase_ends_at: new Date(now + SHERIFF_SPEECH_SECONDS * 1000).toISOString()
        })
        .eq('id', gameRecordId)

      await this.insertSystemMessage(roomId, gameRecordId, `第${nextPkRound}次PK发言`, 'sheriff_campaign', round)
      console.log(`[${roomId}] 平票 PK -> 第${nextPkRound}次`)
      return true
    }

    return true
  }

  private async advanceVotingPhase(
    record: GameRecord,
    now: number,
    nowIso: string,
    roomId: string,
    gameRecordId: string,
    round: number
  ): Promise<boolean> {
    const phaseEndsAtTime = record.phase_ends_at ? new Date(record.phase_ends_at).getTime() : 0
    if (now < phaseEndsAtTime) return false

    // 认领推进权
    const { data: claimed } = await this.supabase
      .from('game_records')
      .update({ phase_ends_at: new Date(now + 15000).toISOString(), phase_started_at: nowIso })
      .eq('id', gameRecordId)
      .eq('phase_ends_at', record.phase_ends_at)
      .select('id')
      .single()

    if (!claimed) return true

    // TODO: 实现完整的投票结算逻辑
    console.log(`[${roomId}] 投票阶段需要完整实现`)
    
    // 简化处理：直接进入下一夜
    await this.supabase
      .from('game_records')
      .update({
        current_phase: 'night',
        current_round: round + 1,
        voting_pk_state: null,
        phase_ends_at: new Date(now + 30 * 1000).toISOString()
      })
      .eq('id', gameRecordId)

    await this.insertSystemMessage(roomId, gameRecordId, `第 ${round} 天投票结束，进入第 ${round + 1} 夜`, 'voting', round)
    console.log(`[${roomId}] 投票结束 -> 第 ${round + 1} 夜`)
    return true
  }

  private async advanceSheriffTransfer(
    record: GameRecord,
    now: number,
    nowIso: string,
    roomId: string,
    gameRecordId: string,
    round: number
  ): Promise<boolean> {
    // 警长移交流程已结束，更新状态
    await this.supabase
      .from('game_records')
      .update({
        current_phase: 'night',
        current_round: round + 1,
        phase_ends_at: new Date(now + 30 * 1000).toISOString()
      })
      .eq('id', gameRecordId)

    await this.insertSystemMessage(roomId, gameRecordId, `第 ${round} 天结束，进入第 ${round + 1} 夜`, 'sheriff_transfer', round)
    console.log(`[${roomId}] 警长移交结束 -> 第 ${round + 1} 夜`)
    return true
  }

  private async advanceHunterShot(
    record: GameRecord,
    now: number,
    nowIso: string,
    roomId: string,
    gameRecordId: string,
    round: number
  ): Promise<boolean> {
    await this.supabase
      .from('game_records')
      .update({
        current_phase: 'night',
        current_round: round + 1,
        phase_ends_at: new Date(now + 30 * 1000).toISOString()
      })
      .eq('id', gameRecordId)

    await this.insertSystemMessage(roomId, gameRecordId, `猎人技能结算结束，进入第 ${round + 1} 夜`, 'hunter_shot', round)
    console.log(`[${roomId}] 猎人射击结束 -> 第 ${round + 1} 夜`)
    return true
  }

  private async getNightSteps(boardId: string | null): Promise<NightStep[]> {
    const defaultSteps: NightStep[] = [
      { step_index: 0, step_name: '守卫', skill_codes: ['guard_protect'], duration: 20 },
      { step_index: 1, step_name: '狼人', skill_codes: ['werewolf_kill'], duration: 30 },
      { step_index: 2, step_name: '预言家', skill_codes: ['seer_check'], duration: 15 },
      { step_index: 3, step_name: '女巫', skill_codes: ['witch_save', 'witch_poison'], duration: 25 },
      { step_index: 4, step_name: '猎人', skill_codes: ['hunter_shoot'], duration: 10 },
    ]

    if (!boardId) return defaultSteps

    try {
      const { data: config } = await this.supabase
        .from('processes')
        .select('phase_config')
        .eq('process_code', 'standard_flow')
        .maybeSingle()

      if (config?.phase_config?.night_steps) {
        return config.phase_config.night_steps.map((s: unknown, i: number) => ({
          step_index: i,
          step_name: (s as { step_name?: string }).step_name || `步骤${i + 1}`,
          skill_codes: (s as { skill_codes?: string[] }).skill_codes || [],
          duration: (s as { duration?: number }).duration || 20
        }))
      }
    } catch (err) {
      console.error('获取夜步骤配置失败:', err)
    }

    return defaultSteps
  }

  private async getPhaseDuration(phase: string, defaultSeconds: number): Promise<number> {
    try {
      const { data: config } = await this.supabase
        .from('processes')
        .select('phase_config')
        .eq('process_code', 'standard_flow')
        .maybeSingle()

      const phases = config?.phase_config?.phases
      if (phases) {
        const phaseConfig = phases.find((p: { name?: string }) => p.name === phase)
        if (phaseConfig?.duration) return phaseConfig.duration
      }
    } catch (err) {
      console.error('获取阶段时长失败:', err)
    }
    return defaultSeconds
  }

  private async hasMinPlayers(roomId: string, minPlayers: number): Promise<boolean> {
    const { data: room } = await this.supabase
      .from('rooms')
      .select('max_players')
      .eq('id', roomId)
      .single()

    return (room?.max_players ?? 12) >= minPlayers
  }

  private async getAliveSeats(roomId: string): Promise<number[]> {
    const { data: players } = await this.supabase
      .from('room_players')
      .select('seat_number')
      .eq('room_id', roomId)
      .eq('is_alive', true)

    return (players || []).map(p => p.seat_number as number).filter(s => s != null)
  }

  private async insertSystemMessage(roomId: string, gameRecordId: string, message: string, phase: string, round: number): Promise<void> {
    await this.supabase.from('room_messages').insert({
      room_id: roomId,
      player_name: '系统',
      message,
      message_type: 'system',
      game_record_id: gameRecordId,
      phase,
      round_number: round
    })
  }

  private pickSpeechOrder(seats: number[]): number[] {
    const sorted = [...seats].sort((a, b) => a - b)
    if (sorted.length === 0) return []
    const startIdx = Math.floor(Math.random() * sorted.length)
    return [...sorted.slice(startIdx), ...sorted.slice(0, startIdx)]
  }

  private async endSheriffCampaign(
    roomId: string,
    gameRecordId: string,
    round: number,
    sheriffSeat: number | null,
    note: string
  ): Promise<void> {
    const dayDuration = await this.getPhaseDuration('day', 120)
    const now = Date.now()

    await this.supabase
      .from('game_records')
      .update({
        current_phase: 'day',
        sheriff_seat: sheriffSeat,
        sheriff_state: { stage: 'done' },
        phase_ends_at: new Date(now + dayDuration * 1000).toISOString()
      })
      .eq('id', gameRecordId)

    await this.insertSystemMessage(roomId, gameRecordId, `${note}，现在宣布死讯，进入白天阶段`, 'sheriff_campaign', round)
    console.log(`[${roomId}] 警长竞选结束 -> ${sheriffSeat ? `${sheriffSeat}号警长` : '无警长'}`)
  }
}

// 主入口
const scheduler = new GameScheduler()
scheduler.run().then(() => {
  console.log('调度任务完成')
  process.exit(0)
}).catch(err => {
  console.error('调度任务失败:', err)
  process.exit(1)
})
