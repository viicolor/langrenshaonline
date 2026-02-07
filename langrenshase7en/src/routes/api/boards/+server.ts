import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';

export const GET: RequestHandler = async () => {
  try {
    const { data: boards, error } = await supabase
      .from('boards')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get boards error:', error);
      return json({ success: false, message: '获取板子列表失败' }, { status: 500 });
    }

    return json({ success: true, boards });
  } catch (error) {
    console.error('Get boards error:', error);
    return json({ success: false, message: '获取板子列表失败' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, description, player_count, character_config, is_default } = body;

    if (!name || !player_count) {
      return json({ success: false, message: '板子名称和人数不能为空' }, { status: 400 });
    }

    const { data: board, error } = await supabase
      .from('boards')
      .insert({
        name,
        description: description || null,
        player_count,
        character_config: character_config || {},
        is_default: is_default ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error('Create board error:', error);
      return json({ success: false, message: '创建板子失败' }, { status: 500 });
    }

    return json({ success: true, board });
  } catch (error) {
    console.error('Create board error:', error);
    return json({ success: false, message: '创建板子失败' }, { status: 500 });
  }
};
