import { GameState, Player, Vote, VoteResult, DeathCause, RoleType } from '@/types/gameState';
import { RuleEngine } from './RuleEngine';

export class VoteResolver {
  private ruleEngine: RuleEngine;

  constructor() {
    this.ruleEngine = new RuleEngine();
  }

  resolveVotes(votes: Vote[], state: GameState): VoteResult {
    const voteCounts: Record<string, number> = {};
    const targetVotes: Record<string, string[]> = {};

    votes.forEach(vote => {
      voteCounts[vote.targetName] = (voteCounts[vote.targetName] || 0) + 1;
      
      if (!targetVotes[vote.targetName]) {
        targetVotes[vote.targetName] = [];
      }
      targetVotes[vote.targetName].push(vote.voterId);
    });

    const maxVotes = Math.max(...Object.values(voteCounts), 0);
    const leaders = Object.entries(voteCounts)
      .filter(([_, count]) => count === maxVotes)
      .map(([name]) => name);

    if (leaders.length === 0) {
      return {
        type: 'skip',
        votes: voteCounts,
      };
    }

    if (leaders.length > 1) {
      return {
        type: 'tie',
        votes: voteCounts,
      };
    }

    const eliminatedPlayerName = leaders[0];
    const eliminatedPlayer = state.players.find(p => p.name === eliminatedPlayerName);

    if (!eliminatedPlayer) {
      return {
        type: 'skip',
        votes: voteCounts,
      };
    }

    return {
      type: 'eliminated',
      eliminatedPlayer: eliminatedPlayer.id,
      votes: voteCounts,
    };
  }

  validateVote(vote: Vote, state: GameState): { valid: boolean; reason: string } {
    const voter = state.players.find(p => p.id === vote.voterId);
    
    if (!voter) {
      return { valid: false, reason: '投票者不存在' };
    }

    if (!voter.isAlive) {
      return { valid: false, reason: '投票者已死亡' };
    }

    if (voter.isSpectator) {
      return { valid: false, reason: '观战者不能投票' };
    }

    if (state.currentPhase !== 'voting') {
      return { valid: false, reason: '当前不是投票阶段' };
    }

    if (voter.role === 'idiot' && !voter.isAlive) {
      return { valid: false, reason: '白痴已死亡，不能投票' };
    }

    const target = state.players.find(p => p.id === vote.targetId);
    
    if (!target) {
      return { valid: false, reason: '目标不存在' };
    }

    if (!target.isAlive) {
      return { valid: false, reason: '目标已死亡' };
    }

    if (target.isSpectator) {
      return { valid: false, reason: '不能投票给观战者' };
    }

    if (vote.voterId === vote.targetId) {
      return { valid: false, reason: '不能投票给自己' };
    }

    if (voter.role === 'idiot' && !voter.isAlive && target.id === voter.id) {
      return { valid: false, reason: '白痴翻牌后不能投票' };
    }

    return { valid: true, reason: '投票有效' };
  }

  checkVoteCompletion(state: GameState): { completed: boolean; missingVotes: number } {
    const alivePlayers = state.players.filter(p => p.isAlive && !p.isSpectator);
    const totalVotes = state.votes.filter(v => v.round === state.currentRound).length;
    
    if (alivePlayers.length === 0) {
      return { completed: true, missingVotes: 0 };
    }

    const missingVotes = alivePlayers.length - totalVotes;
    return { completed: missingVotes === 0, missingVotes };
  }

  getVoteStatistics(votes: Vote[], state: GameState): {
    totalVotes: number;
    voteParticipation: number;
    averageVotesPerRound: number;
  } {
    const totalVotes = votes.length;
    const rounds = [...new Set(votes.map(v => v.round))].length;
    const alivePlayers = state.players.filter(p => p.isAlive && !p.isSpectator);
    const voteParticipation = alivePlayers.length > 0 ? 
      (alivePlayers.filter(p => 
        votes.some(v => v.voterId === p.id)
      ).length / alivePlayers.length) * 100 : 0;
    
    return {
      totalVotes,
      voteParticipation: Math.round(voteParticipation),
      averageVotesPerRound: rounds > 0 ? Math.round(totalVotes / rounds) : 0,
    };
  }

  getVoteResultMessage(result: VoteResult, players: Player[]): string {
    switch (result.type) {
      case 'skip':
        return '所有玩家选择弃票，无人出局';
      case 'tie': {
        const leaders = Object.entries(result.votes)
          .filter(([_, count]) => count === Math.max(...Object.values(result.votes)))
          .map(([name]) => name);
        return `${leaders.join('、')} 平票，无人出局`;
      }
      case 'eliminated': {
        const eliminatedPlayer = players.find(p => p.id === result.eliminatedPlayer);
        return `${eliminatedPlayer?.name} 被投票出局`;
      }
      default:
        return '未知结果';
    }
  }

  calculateVotePercentages(votes: Vote[], state: GameState): Record<string, number> {
    const voteCounts: Record<string, number> = {};
    const totalVotes = votes.length;

    votes.forEach(vote => {
      voteCounts[vote.targetName] = (voteCounts[vote.targetName] || 0) + 1;
    });

    const percentages: Record<string, number> = {};
    Object.entries(voteCounts).forEach(([playerName, count]) => {
      percentages[playerName] = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
    });

    return percentages;
  }

  getLeadingPlayers(votes: Vote[], limit: number = 3): string[] {
    const voteCounts: Record<string, number> = {};

    votes.forEach(vote => {
      voteCounts[vote.targetName] = (voteCounts[vote.targetName] || 0) + 1;
    });

    return Object.entries(voteCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([name]) => name);
  }

  getVoteHistory(votes: Vote[], playerName: string): Vote[] {
    return votes.filter(v => v.voterName === playerName);
  }

  hasVoted(playerId: string, round: number, votes: Vote[]): boolean {
    return votes.some(v => v.voterId === playerId && v.round === round);
  }

  getVoteTargets(voter: Player, players: Player[]): Player[] {
    return players.filter(p => 
      p.id !== voter.id && 
      p.isAlive && 
      !p.isSpectator
    );
  }

  validateHunterShoot(voter: Player, target: Player): { valid: boolean; reason: string } {
    if (voter.role !== 'hunter') {
      return { valid: false, reason: '只有猎人可以开枪' };
    }

    if (!voter.isAlive) {
      return { valid: false, reason: '猎人已死亡' };
    }

    if (!target.isAlive) {
      return { valid: false, reason: '目标已死亡' };
    }

    if (target.isSpectator) {
      return { valid: false, reason: '不能开枪观战者' };
    }

    if (voter.id === target.id) {
      return { valid: false, reason: '不能开枪自己' };
    }

    return { valid: true, reason: '可以开枪' };
  }
}
