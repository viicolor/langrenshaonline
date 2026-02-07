import { useEffect, useState, useCallback, useRef } from 'react';
import { gameFlowService, type GameFlowState, type FlowNodeInfo } from '@/services/gameFlow';
import { toast } from 'sonner';

export interface UseGameFlowOptions {
  gameId: string;
  playerId: string;
  playerRole?: string;
  enabled?: boolean;
  heartbeatInterval?: number;
}

export interface UseGameFlowReturn {
  flowState: GameFlowState | null;
  currentNode: FlowNodeInfo | null;
  remainingSeconds: number;
  remainingTimeFormatted: string;
  nodeTypeLabel: string;
  canOperate: boolean;
  allowedActions: string[];
  isLoading: boolean;
  error: Error | null;
  sendHeartbeat: () => Promise<void>;
  submitOperate: (operateType: string, operateContent?: any) => Promise<void>;
  refreshFlowState: () => Promise<void>;
}

export const useGameFlow = (options: UseGameFlowOptions): UseGameFlowReturn => {
  const {
    gameId,
    playerId,
    playerRole,
    enabled = true,
    heartbeatInterval = 5000,
  } = options;

  const [flowState, setFlowState] = useState<GameFlowState | null>(null);
  const [currentNode, setCurrentNode] = useState<FlowNodeInfo | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<any>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const refreshFlowState = useCallback(async () => {
    try {
      setIsLoading(true);
      const state = await gameFlowService.getGameFlowState(gameId);
      setFlowState(state);
      setRemainingSeconds(state?.node_remaining_seconds || 0);
      setError(null);
    } catch (err) {
      console.error('Refresh flow state error:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  const sendHeartbeat = useCallback(async () => {
    try {
      await gameFlowService.sendHeartbeat(gameId, playerId);
      setError(null);
    } catch (err) {
      console.error('Heartbeat error:', err);
      setError(err as Error);
    }
  }, [gameId, playerId]);

  const submitOperate = useCallback(async (operateType: string, operateContent: any = {}) => {
    try {
      setIsLoading(true);
      await gameFlowService.submitPlayerOperate(gameId, playerId, operateType, operateContent);
      setError(null);
      toast.success('操作成功');
    } catch (err) {
      console.error('Submit operate error:', err);
      setError(err as Error);
      toast.error('操作失败', {
        description: err instanceof Error ? err.message : '未知错误',
      });
    } finally {
      setIsLoading(false);
    }
  }, [gameId, playerId]);

  const canOperate = useCallback(() => {
    if (!currentNode || !playerRole) return false;
    return gameFlowService.canPlayerOperate(currentNode, playerId, playerRole);
  }, [currentNode, playerId, playerRole]);

  const allowedActions = useCallback(() => {
    if (!currentNode) return [];
    return gameFlowService.getAllowedActions(currentNode);
  }, [currentNode]);

  const nodeTypeLabel = useCallback(() => {
    if (!currentNode) return '';
    return gameFlowService.getNodeTypeLabel(currentNode.node_type);
  }, [currentNode]);

  const remainingTimeFormatted = useCallback(() => {
    return gameFlowService.formatRemainingTime(remainingSeconds);
  }, [remainingSeconds]);

  useEffect(() => {
    if (!enabled || !gameId) return;

    refreshFlowState();
  }, [enabled, gameId, refreshFlowState]);

  useEffect(() => {
    if (!enabled || !gameId) return;

    const channel = gameFlowService.subscribeToGameFlowChanges(gameId, (state) => {
      setFlowState(state);
      setRemainingSeconds(state.node_remaining_seconds || 0);
      setError(null);
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        gameFlowService.unsubscribeFromGameFlowChanges(channelRef.current);
      }
    };
  }, [enabled, gameId]);

  useEffect(() => {
    if (!enabled || !gameId || !playerId) return;

    heartbeatIntervalRef.current = setInterval(async () => {
      await sendHeartbeat();
    }, heartbeatInterval);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [enabled, gameId, playerId, heartbeatInterval, sendHeartbeat]);

  useEffect(() => {
    if (!enabled || !gameId || !currentNode) return;

    const loadCurrentNode = async () => {
      if (!flowState?.current_node_id) return;

      const node = await gameFlowService.getFlowNodeByCode(flowState.current_node_id);
      setCurrentNode(node);
    };

    loadCurrentNode();
  }, [enabled, gameId, flowState?.current_node_id]);

  return {
    flowState,
    currentNode,
    remainingSeconds,
    remainingTimeFormatted,
    nodeTypeLabel,
    canOperate,
    allowedActions,
    isLoading,
    error,
    sendHeartbeat,
    submitOperate,
    refreshFlowState,
  };
};
