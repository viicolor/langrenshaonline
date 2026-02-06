const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ioquklhxeisulnagkauo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvcXVrbGh4ZWlzdWxuYWdrYXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY2OTg5NjY4NSwiZXhwIjoyMDg1NDcyNjg1fQ.avoO6BPgy_OODj-iYTuZeA8tpYrurCpSBYrynWVHu7w'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log('测试 Supabase 连接...\n')

  try {
    // 1. 查找 TEST001 房间
    console.log('1. 查找 TEST001 房间...')
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .ilike('name', 'TEST001')
      .maybeSingle()

    if (roomError) {
      console.error('   查找房间失败:', roomError)
      return
    }

    if (!room) {
      console.log('   未找到 TEST001 房间')
      return
    }

    console.log(`   找到房间: ${room.name} (ID: ${room.id})`)
    console.log(`   状态: ${room.status}`)
    console.log(`   Board ID: ${room.board_id}`)

    // 2. 查找游戏记录
    console.log('\n2. 查找游戏记录...')
    const { data: gameRecord, error: gameError } = await supabase
      .from('game_records')
      .select('*')
      .eq('room_id', room.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (gameError) {
      console.error('   查找游戏记录失败:', gameError)
      return
    }

    if (!gameRecord) {
      console.log('   没有游戏记录')
      return
    }

    console.log(`   游戏记录 ID: ${gameRecord.id}`)
    console.log(`   当前阶段: ${gameRecord.current_phase}`)
    console.log(`   当前回合: ${gameRecord.current_round}`)
    console.log(`   夜步骤: ${gameRecord.night_step}`)
    console.log(`   阶段结束时间: ${gameRecord.phase_ends_at}`)
    console.log(`   阶段开始时间: ${gameRecord.phase_started_at}`)

    // 检查是否超时
    const now = new Date()
    const phaseEndsAt = gameRecord.phase_ends_at ? new Date(gameRecord.phase_ends_at) : null
    const timeRemaining = phaseEndsAt ? Math.floor((phaseEndsAt - now) / 1000) : null

    console.log(`   当前时间: ${now.toISOString()}`)
    console.log(`   剩余时间: ${timeRemaining !== null ? timeRemaining + ' 秒' : '未知'}`)

    // 3. 查找夜步骤配置
    console.log('\n3. 检查夜步骤配置...')
    const { data: process } = await supabase
      .from('processes')
      .select('*')
      .eq('process_code', 'standard_flow')
      .maybeSingle()

    if (process) {
      console.log(`   找到流程配置: ${process.process_name}`)
      console.log(`   夜步骤: ${JSON.stringify(process.phase_config?.night_steps || '使用默认配置')}`)
    } else {
      console.log('   未找到流程配置，使用默认夜步骤')
    }

    // 4. 检查 actions
    console.log('\n4. 检查回合行动...')
    const { data: actions, error: actionsError } = await supabase
      .from('game_actions')
      .select('*')
      .eq('game_record_id', gameRecord.id)
      .eq('round', gameRecord.current_round || 1)

    if (actionsError) {
      console.error('   查询行动失败:', actionsError)
    } else {
      console.log(`   本回合行动数: ${actions?.length || 0}`)
      if (actions && actions.length > 0) {
        console.log('   行动详情:')
        for (const action of actions) {
          console.log(`     - ${action.action_type}: ${action.target_id || '无目标'}`)
        }
      }
    }

    // 5. 检查消息
    console.log('\n5. 检查最近消息...')
    const { data: messages, error: msgError } = await supabase
      .from('room_messages')
      .select('*')
      .eq('room_id', room.id)
      .eq('game_record_id', gameRecord.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (msgError) {
      console.error('   查询消息失败:', msgError)
    } else if (messages && messages.length > 0) {
      console.log('   最近消息:')
      for (const msg of messages.reverse()) {
        console.log(`     [${msg.phase}] ${msg.message}`)
      }
    }

    // 6. 建议操作
    console.log('\n========== 诊断结果 ==========')
    if (gameRecord.current_phase === 'night' && timeRemaining !== null && timeRemaining > 0) {
      console.log('游戏正常运行中，阶段未超时')
      console.log(`等待 ${timeRemaining} 秒后应该会自动推进`)
    } else if (gameRecord.current_phase === 'night' && timeRemaining !== null && timeRemaining <= 0) {
      console.log('⚠️  阶段已超时，但推进可能失败')
      console.log('建议: 手动更新时间戳触发流程复苏')
    } else {
      console.log(`当前阶段: ${gameRecord.current_phase}`)
      console.log('请刷新前端页面查看最新状态')
    }

  } catch (error) {
    console.error('测试失败:', error)
  }
}

testConnection()
