import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseKey)

interface GameRecord {
  id: string
  room_id: string
  current_phase: string
  current_round: number
  night_step: number | null
  phase_ends_at: string | null
}

async function advanceNightStep(record: GameRecord): Promise<boolean> {
  // 模拟 gameEngineService.advanceToNextPhase 的夜晚逻辑
  const now = new Date()
  const nowIso = now.toISOString()
  const phaseEndsAtTime = record.phase_ends_at ? new Date(record.phase_ends_at).getTime() : 0
  const nowTime = Date.now()

  // 检查是否可以认领推进
  const canClaim = phaseEndsAtTime === 0 || nowTime >= phaseEndsAtTime
  if (!canClaim) return false

  // 认领推进权（15秒租约）
  const leaseEndsAt = new Date(nowTime + 15000).toISOString()
  
  const { data: claimed } = await supabase
    .from('game_records')
    .update({
      phase_ends_at: leaseEndsAt,
      phase_started_at: nowIso
    })
    .eq('id', record.id)
    .eq('phase_ends_at', record.phase_ends_at)
    .select('id')
    .single()

  if (!claimed) {
    console.log(`[${record.room_id}] 推进认领失败，可能被其他客户端抢先`)
    return true // 认领失败也算成功，避免重复处理
  }

  // 获取夜步骤配置
  const { data: room } = await supabase
    .from('rooms')
    .select('board_id')
    .eq('id', record.room_id)
    .single()

  // 简化的夜步骤检查 - 实际应该调用 gameEngineService
  const { data: config } = await supabase
    .from('processes')
    .select('phase_config')
    .eq('process_code', 'standard_flow')
    .maybeSingle()

  const defaultSteps = [
    { step_name: '守卫', skill_codes: ['guard_protect'], duration: 20 },
    { step_name: '狼人', skill_codes: ['werewolf_kill'], duration: 30 },
    { step_name: '预言家', skill_codes: ['seer_check'], duration: 15 },
    { step_name: '女巫', skill_codes: ['witch_save', 'witch_poison'], duration: 25 },
    { step_name: '猎人', skill_codes: ['hunter_shoot'], duration: 10 },
  ]

  const nightSteps = config?.phase_config?.night_steps || defaultSteps
  const currentStep = record.night_step ?? 0

  if (currentStep < nightSteps.length - 1) {
    // 推进到下一步
    const nextStep = currentStep + 1
    const stepConfig = nightSteps[nextStep]
    const durationSeconds = stepConfig.duration || 30
    const phaseEndsAtNext = new Date(nowTime + durationSeconds * 1000).toISOString()

    await supabase
      .from('game_records')
      .update({
        night_step: nextStep,
        phase_ends_at: phaseEndsAtNext
      })
      .eq('id', record.id)

    await supabase.from('room_messages').insert({
      room_id: record.room_id,
      player_name: '系统',
      message: `第 ${record.current_round} 夜 · ${stepConfig.step_name}行动`,
      message_type: 'system',
      game_record_id: record.id,
      phase: 'night',
      round_number: record.current_round,
    })

    console.log(`[${record.room_id}] 夜步骤 ${currentStep} -> ${nextStep} (${stepConfig.step_name})`)
    return true
  } else {
    // 夜晚结束，推进到白天或警长竞选
    const { data: roomData } = await supabase
      .from('rooms')
      .select('max_players')
      .eq('id', record.room_id)
      .single()

    const maxPlayers = roomData?.max_players ?? 12
    const sheriffCampaignEnabled = record.current_round === 1 && maxPlayers >= 10
    const nextPhase = sheriffCampaignEnabled ? 'sheriff_campaign' : 'day'

    await supabase
      .from('game_records')
      .update({
        current_phase: nextPhase,
        night_step: 0,
        phase_ends_at: new Date(nowTime + 30 * 1000).toISOString()
      })
      .eq('id', record.id)

    await supabase.from('room_messages').insert({
      room_id: record.room_id,
      player_name: '系统',
      message: `第 ${record.current_round} 夜结束，进入${nextPhase === 'sheriff_campaign' ? '警长竞选' : '白天'}阶段`,
      message_type: 'system',
      game_record_id: record.id,
      phase: 'night',
      round_number: record.current_round,
    })

    console.log(`[${record.room_id}] 夜晚结束 -> ${nextPhase}`)
    return true
  }
}

async function advanceDaySpeech(record: GameRecord): Promise<boolean> {
  const now = new Date()
  const nowIso = now.toISOString()
  const phaseEndsAtTime = record.phase_ends_at ? new Date(record.phase_ends_at).getTime() : 0
  const nowTime = Date.now()

  if (nowTime < phaseEndsAtTime) return false

  const { data: claimed } = await supabase
    .from('game_records')
    .update({
      phase_ends_at: new Date(nowTime + 15000).toISOString(),
      phase_started_at: nowIso
    })
    .eq('id', record.id)
    .eq('phase_ends_at', record.phase_ends_at)
    .select('id')
    .single()

  if (!claimed) return true

  // 简化的白天发言推进逻辑
  const dayState = record.day_speech_state as { speechOrder?: number[]; speechIndex?: number } | null
  
  if (!dayState?.speechOrder?.length) {
    // 直接进入投票
    await supabase
      .from('game_records')
      .update({
        current_phase: 'voting',
        day_speech_state: null,
        phase_ends_at: new Date(nowTime + 30 * 1000).toISOString()
      })
      .eq('id', record.id)

    console.log(`[${record.room_id}] 白天发言结束 -> 投票`)
    return true
  }

  const nextIndex = (dayState.speechIndex ?? 0) + 1
  if (nextIndex < dayState.speechOrder.length) {
    // 下一位玩家发言
    const nextSeat = dayState.speechOrder[nextIndex]
    const sheriffSeat = record.sheriff_seat
    const durationSeconds = nextSeat === sheriffSeat ? 150 : 120

    await supabase
      .from('game_records')
      .update({
        day_speech_state: {
          ...dayState,
          speechIndex: nextIndex,
          currentSpeakerSeat: nextSeat
        },
        phase_ends_at: new Date(nowTime + durationSeconds * 1000).toISOString()
      })
      .eq('id', record.id)

    console.log(`[${record.room_id}] 白天发言 ${dayState.speechOrder[dayState.speechIndex ?? 0]} -> ${nextSeat}`)
    return true
  }

  // 发言结束，进入投票
  await supabase
    .from('game_records')
    .update({
      current_phase: 'voting',
      day_speech_state: null,
      phase_ends_at: new Date(nowTime + 60 * 1000).toISOString()
    })
    .eq('id', record.id)

  console.log(`[${record.room_id}] 白天发言全部结束 -> 投票`)
  return true
}

async function advanceSheriffCampaign(record: GameRecord): Promise<boolean> {
  // 警长竞选阶段推进逻辑
  // 这里省略完整实现，实际应该调用 gameEngineService
  console.log(`[${record.room_id}] 警长竞选阶段需要推进（暂未实现）`)
  return true
}

async function advanceVoting(record: GameRecord): Promise<boolean> {
  // 投票阶段推进逻辑
  console.log(`[${record.room_id}] 投票阶段需要推进（暂未实现）`)
  return true
}

Deno.serve(async (req) => {
  try {
    const now = new Date()
    const nowIso = now.toISOString()

    // 查找所有超时的游戏记录
    const { data: timeoutRecords, error } = await supabase
      .from('game_records')
      .select('id, room_id, current_phase, current_round, night_step, phase_ends_at, day_speech_state, sheriff_seat')
      .eq('status', 'playing')
      .lt('phase_ends_at', nowIso)

    if (error) {
      console.error('查询超时记录失败:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    if (!timeoutRecords || timeoutRecords.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: '没有需要推进的超时游戏',
        checked: 0,
        advanced: 0
      }), { status: 200 })
    }

    console.log(`发现 ${timeoutRecords.length} 个超时游戏需要处理`)

    let advanced = 0
    const errors: string[] = []

    for (const record of timeoutRecords) {
      try {
        let success = false

        switch (record.current_phase) {
          case 'night':
            success = await advanceNightStep(record as GameRecord)
            break
          case 'day':
            success = await advanceDaySpeech(record as GameRecord)
            break
          case 'sheriff_campaign':
            success = await advanceSheriffCampaign(record as GameRecord)
            break
          case 'voting':
            success = await advanceVoting(record as GameRecord)
            break
          default:
            console.log(`[${record.room_id}] 未知阶段: ${record.current_phase}`)
            success = true
        }

        if (success) advanced++
      } catch (err) {
        errors.push(`${record.room_id}: ${err}`)
        console.error(`[${record.room_id}] 处理失败:`, err)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      checked: timeoutRecords.length,
      advanced,
      errors: errors.length > 0 ? errors : undefined
    }), { status: 200 })

  } catch (err) {
    console.error('处理超时游戏失败:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
