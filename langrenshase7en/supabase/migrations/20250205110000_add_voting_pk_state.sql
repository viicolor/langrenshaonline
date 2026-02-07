-- 放逐投票平票 PK：平票玩家轮流发言后再次投票，最多 2 轮，二次平票为平安日

ALTER TABLE public.game_records
  ADD COLUMN IF NOT EXISTS voting_pk_state JSONB DEFAULT NULL;

COMMENT ON COLUMN public.game_records.voting_pk_state IS '投票平票 PK 状态：pkRound(1|2), pkSeats, speechOrder, speechIndex, currentSpeakerSeat, phase(pk_speech|pk_vote)';
