import { useState } from "react";
import {
  Layout,
  Typography,
  Button,
  Space,
  Input,
  Select,
  Table,
  Tag,
  Dropdown,
  App,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  LogoutOutlined,
  ReloadOutlined,
  MoreOutlined,
  HistoryOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/api/tasks";
import { useAuth } from "@/hooks/useAuth";
import { TaskFormModal } from "@/components/TaskFormModal";
import { StatusTransitionModal } from "@/components/StatusTransitionModal";
import { AuditDrawer } from "@/components/AuditDrawer";
import type { TaskResponse, TaskStatus, TaskPriority, TaskFilter } from "@/types/task";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";

const { Header, Content } = Layout;
const { Title } = Typography;
const { Search } = Input;

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

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "green",
  medium: "blue",
  high: "orange",
  critical: "red",
};

export function TasksPage() {
  const { user, logout } = useAuth();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<TaskFilter>({ page: 1, page_size: 10 });
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskResponse | null>(null);
  const [statusTask, setStatusTask] = useState<TaskResponse | null>(null);
  const [auditTaskId, setAuditTaskId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => tasksApi.list(filters),
  });

  const deleteMutation = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => {
      message.success("Task deleted");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err: Error) => message.error(err.message),
  });

  const handleDelete = (task: TaskResponse) => {
    modal.confirm({
      title: "Delete Task",
      content: `Are you sure you want to delete "${task.title}"?`,
      okText: "Delete",
      okType: "danger",
      onOk: () => deleteMutation.mutateAsync(task.id),
    });
  };

  const columns: ColumnsType<TaskResponse> = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      sorter: true,
      ellipsis: true,
      width: "30%",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status: TaskStatus) => (
        <Tag color={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Tag>
      ),
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      width: 100,
      render: (priority: TaskPriority) => (
        <Tag color={PRIORITY_COLORS[priority]}>{priority.toUpperCase()}</Tag>
      ),
    },
    {
      title: "Due Date",
      dataIndex: "due_date",
      key: "due_date",
      width: 120,
      render: (date: string | null) => date || "-",
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 120,
      sorter: true,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      render: (_: unknown, record: TaskResponse) => (
        <Dropdown
          menu={{
            items: [
              { key: "status", icon: <Tag />, label: "Change Status", onClick: () => setStatusTask(record) },
              { key: "edit", icon: <EditOutlined />, label: "Edit", onClick: () => { setEditingTask(record); setFormOpen(true); } },
              { key: "audit", icon: <HistoryOutlined />, label: "Audit Trail", onClick: () => setAuditTaskId(record.id) },
              { type: "divider" },
              { key: "delete", icon: <DeleteOutlined />, label: "Delete", danger: true, onClick: () => handleDelete(record) },
            ],
          }}
          trigger={["click"]}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const handleTableChange = (pagination: TablePaginationConfig, _filters: unknown, sorter: unknown) => {
    const s = sorter as { field?: string; order?: string };
    setFilters((prev) => ({
      ...prev,
      page: pagination.current || 1,
      page_size: pagination.pageSize || 10,
      sort_by: s.field as string | undefined,
      sort_order: s.order === "ascend" ? "asc" : "desc",
    }));
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", padding: "0 24px", borderBottom: "1px solid #f0f0f0" }}>
        <Title level={4} style={{ margin: 0 }}>Task Management</Title>
        <Space>
          <span>{user?.username}</span>
          <Tooltip title="Logout">
            <Button type="text" icon={<LogoutOutlined />} onClick={logout} />
          </Tooltip>
        </Space>
      </Header>

      <Content style={{ padding: 24 }}>
        {/* Filters */}
        <Space style={{ marginBottom: 16, width: "100%", justifyContent: "space-between" }} wrap>
          <Space wrap>
            <Search
              placeholder="Search tasks..."
              allowClear
              onSearch={(v) => setFilters((p) => ({ ...p, search: v || undefined, page: 1 }))}
              style={{ width: 250 }}
            />
            <Select
              placeholder="Status"
              allowClear
              style={{ width: 140 }}
              onChange={(v) => setFilters((p) => ({ ...p, status: v, page: 1 }))}
              options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <Select
              placeholder="Priority"
              allowClear
              style={{ width: 130 }}
              onChange={(v) => setFilters((p) => ({ ...p, priority: v, page: 1 }))}
              options={["low", "medium", "high", "critical"].map((p) => ({ value: p, label: p.toUpperCase() }))}
            />
          </Space>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingTask(null); setFormOpen(true); }}>
              New Task
            </Button>
          </Space>
        </Space>

        {/* Table */}
        <Table<TaskResponse>
          rowKey="id"
          columns={columns}
          dataSource={data?.items}
          loading={isLoading}
          onChange={handleTableChange}
          pagination={{
            current: data?.page,
            pageSize: data?.page_size,
            total: data?.total,
            showSizeChanger: true,
            showTotal: (total) => `${total} tasks`,
          }}
          locale={{ emptyText: "No tasks yet. Create your first task!" }}
        />

        {/* Modals */}
        <TaskFormModal
          open={formOpen}
          task={editingTask}
          onClose={() => { setFormOpen(false); setEditingTask(null); }}
        />
        <StatusTransitionModal
          task={statusTask}
          onClose={() => setStatusTask(null)}
        />
        <AuditDrawer
          taskId={auditTaskId}
          onClose={() => setAuditTaskId(null)}
        />
      </Content>
    </Layout>
  );
}
