import { useEffect } from 'react';
import { useGameFlow } from '@/hooks/useGameFlow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertCircle, CheckCircle2, Activity } from 'lucide-react';

interface GameFlowPanelProps {
  gameId: string;
  playerId: string;
  playerRole?: string;
  enabled?: boolean;
}

const GameFlowPanel = ({ gameId, playerId, playerRole, enabled = true }: GameFlowPanelProps) => {
  const {
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
  } = useGameFlow({
    gameId,
    playerId,
    playerRole,
    enabled,
    heartbeatInterval: 5000,
  });

  useEffect(() => {
    if (enabled && !isLoading && !error && flowState?.current_node_id) {
      console.log('[GameFlow] 当前流程节点:', currentNode?.node_name, '剩余时间:', remainingTimeFormatted);
    }
  }, [enabled, isLoading, error, flowState?.current_node_id, currentNode?.node_name, remainingTimeFormatted]);

  if (!enabled) {
    return null;
  }

  if (isLoading && !flowState) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="w-4 h-4 animate-spin" />
            <span>加载流程状态...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            流程加载失败
          </CardTitle>
          <CardDescription>{error.message}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!flowState || !currentNode) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">流程未启动</div>
        </CardContent>
      </Card>
    );
  }

  const isTimeoutWarning = remainingSeconds <= 10 && remainingSeconds > 0;
  const isTimeoutCritical = remainingSeconds <= 5 && remainingSeconds > 0;
  const isTimeout = remainingSeconds <= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <span>当前阶段</span>
          </div>
          <Badge variant={isTimeout ? 'destructive' : isTimeoutCritical ? 'destructive' : isTimeoutWarning ? 'secondary' : 'outline'}>
            {nodeTypeLabel}
          </Badge>
        </CardTitle>
        <CardDescription>{currentNode.node_name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">剩余时间</span>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${isTimeout ? 'text-destructive' : isTimeoutCritical ? 'text-orange-500' : ''}`}>
              {remainingTimeFormatted}
            </span>
            {isTimeoutWarning && (
              <Badge variant="destructive" className="text-xs">
                即将超时
              </Badge>
            )}
            {isTimeout && (
              <Badge variant="destructive" className="text-xs">
                已超时
              </Badge>
            )}
          </div>
        </div>

        {currentNode.description && (
          <div className="text-sm text-muted-foreground">
            {currentNode.description}
          </div>
        )}

        {allowedActions.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">允许的操作</span>
            <div className="flex flex-wrap gap-2">
              {allowedActions.map((action) => (
                <Badge key={action} variant="outline" className="text-xs">
                  {action}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {canOperate ? (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>您可以进行操作</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            <span>当前不可操作</span>
          </div>
        )}

        <div className="pt-4 border-t">
          <div className="text-xs text-muted-foreground space-y-1">
            <div>节点代码: {currentNode.node_code}</div>
            <div>节点类型: {currentNode.node_type}</div>
            <div>超时时长: {currentNode.timeout_seconds}秒</div>
            {flowState.node_start_time && (
              <div>开始时间: {new Date(flowState.node_start_time).toLocaleString()}</div>
            )}
            {flowState.last_heartbeat_time && (
              <div>最后心跳: {new Date(flowState.last_heartbeat_time).toLocaleString()}</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GameFlowPanel;
