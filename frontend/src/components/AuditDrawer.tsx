import { Drawer, Timeline, Typography, Spin, Empty, Tag } from "antd";
import { useQuery } from "@tanstack/react-query";
import { tasksApi } from "@/api/tasks";
import type { AuditLog } from "@/types/task";

const { Text } = Typography;

function formatEventType(eventType: string): { label: string; color: string } {
  switch (eventType) {
    case "task.created":
      return { label: "Created", color: "green" };
    case "task.updated":
      return { label: "Updated", color: "blue" };
    case "task.status_changed":
      return { label: "Status Changed", color: "orange" };
    case "task.deleted":
      return { label: "Deleted", color: "red" };
    default:
      return { label: eventType, color: "default" };
  }
}

function parseData(jsonStr: string | null): Record<string, unknown> | null {
  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

interface Props {
  taskId: string | null;
  onClose: () => void;
}

export function AuditDrawer({ taskId, onClose }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["audit", taskId],
    queryFn: () => tasksApi.getAuditTrail(taskId!),
    enabled: !!taskId,
  });

  return (
    <Drawer
      title="Audit Trail"
      open={!!taskId}
      onClose={onClose}
      width={400}
    >
      {isLoading ? (
        <Spin />
      ) : !data || data.length === 0 ? (
        <Empty description="No audit entries yet" />
      ) : (
        <Timeline
          items={data.map((log: AuditLog) => {
            const { label, color } = formatEventType(log.event_type);
            const logData = parseData(log.data);

            return {
              color,
              children: (
                <div>
                  <Tag color={color}>{label}</Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(log.created_at).toLocaleString()}
                  </Text>
                  {logData && (
                    <div style={{ marginTop: 4, fontSize: 12 }}>
                      {Object.entries(logData).map(([key, value]) => (
                        <div key={key}>
                          <Text type="secondary">{key}:</Text>{" "}
                          <Text>{String(value)}</Text>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ),
            };
          })}
        />
      )}
    </Drawer>
  );
}
