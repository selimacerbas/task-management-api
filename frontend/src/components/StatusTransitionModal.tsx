import { Modal, Button, Space, Tag, Typography, App } from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/api/tasks";
import { VALID_TRANSITIONS, type TaskResponse, type TaskStatus } from "@/types/task";

const { Text } = Typography;

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: "default",
  in_progress: "processing",
  done: "success",
  blocked: "warning",
  cancelled: "error",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  blocked: "Blocked",
  cancelled: "Cancelled",
};

interface Props {
  task: TaskResponse | null;
  onClose: () => void;
}

export function StatusTransitionModal({ task, onClose }: Props) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      tasksApi.changeStatus(id, status),
    onSuccess: () => {
      message.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    },
    onError: (err: Error) => message.error(err.message),
  });

  if (!task) return null;

  const allowedTransitions = VALID_TRANSITIONS[task.status] || [];

  return (
    <Modal
      title="Change Status"
      open={!!task}
      onCancel={onClose}
      footer={null}
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Text>
          Current: <Tag color={STATUS_COLORS[task.status]}>{STATUS_LABELS[task.status]}</Tag>
        </Text>

        {allowedTransitions.length === 0 ? (
          <Text type="secondary">No transitions available from this status.</Text>
        ) : (
          <Space wrap style={{ marginTop: 12 }}>
            {allowedTransitions.map((status) => (
              <Button
                key={status}
                onClick={() => mutation.mutate({ id: task.id, status })}
                loading={mutation.isPending}
                icon={<ArrowRightOutlined />}
              >
                <Tag color={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Tag>
              </Button>
            ))}
          </Space>
        )}
      </Space>
    </Modal>
  );
}
