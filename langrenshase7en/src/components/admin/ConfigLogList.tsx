import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminService, ConfigLogWithAdmin } from '@/services/admin';
import { useQuery } from '@tanstack/react-query';

const OPERATE_TYPE_LABELS: Record<number, string> = {
  1: '角色新增',
  2: '角色编辑',
  3: '板子新增',
  4: '板子编辑',
  5: '全局配置修改',
  6: '流程配置修改',
};

export default function ConfigLogList() {
  const [operateTypeFilter, setOperateTypeFilter] = useState<number | 'all'>('all');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-config-logs', operateTypeFilter],
    queryFn: () =>
      adminService.getConfigLogs({
        limit: 100,
        ...(operateTypeFilter !== 'all' ? { operateType: operateTypeFilter } : {}),
      }),
  });

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="font-display">配置生效日志</CardTitle>
        <p className="text-sm text-muted-foreground">
          记录板子、角色、全局配置、流程等修改，便于追溯与回滚
        </p>
        <div className="flex items-center gap-2 pt-2">
          <span className="text-sm text-muted-foreground">操作类型：</span>
          <Select
            value={operateTypeFilter === 'all' ? 'all' : String(operateTypeFilter)}
            onValueChange={v => setOperateTypeFilter(v === 'all' ? 'all' : Number(v))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              {Object.entries(OPERATE_TYPE_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">加载中…</p>
        ) : !logs?.length ? (
          <p className="text-sm text-muted-foreground">暂无日志</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3 font-medium">时间</th>
                  <th className="text-left py-2 px-3 font-medium">操作人</th>
                  <th className="text-left py-2 px-3 font-medium">类型</th>
                  <th className="text-left py-2 px-3 font-medium">对象</th>
                  <th className="text-left py-2 px-3 font-medium">对象ID</th>
                  <th className="text-left py-2 px-3 font-medium">结果</th>
                  <th className="text-left py-2 px-3 font-medium">说明</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: ConfigLogWithAdmin) => (
                  <tr key={log.id} className="border-b border-border/30">
                    <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                      {log.operate_time
                        ? new Date(log.operate_time).toLocaleString('zh-CN')
                        : '-'}
                    </td>
                    <td className="py-2 px-3">{log.operate_by || '-'}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline">
                        {OPERATE_TYPE_LABELS[log.operate_type] ?? `类型${log.operate_type}`}
                      </Badge>
                    </td>
                    <td className="py-2 px-3">{log.operate_object || '-'}</td>
                    <td className="py-2 px-3 font-mono text-xs">{log.operate_object_id || '-'}</td>
                    <td className="py-2 px-3">
                      {log.operate_result === 1 ? (
                        <Badge className="bg-green-600">成功</Badge>
                      ) : (
                        <Badge variant="destructive">失败</Badge>
                      )}
                    </td>
                    <td className="py-2 px-3 max-w-[200px] truncate" title={log.operate_desc ?? ''}>
                      {log.operate_desc || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
