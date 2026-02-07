import { useState, useMemo } from "react";
import {
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
  Card,
  Row,
  Col,
  Statistic,
  Avatar,
} from "antd";
import {
  PlusOutlined,
  LogoutOutlined,
  ReloadOutlined,
  MoreOutlined,
  HistoryOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ProjectOutlined,
  SunOutlined,
  MoonOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/api/tasks";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { TaskFormModal } from "@/components/TaskFormModal";
import { StatusTransitionModal } from "@/components/StatusTransitionModal";
import { AuditDrawer } from "@/components/AuditDrawer";
import type { TaskResponse, TaskStatus, TaskPriority, TaskFilter } from "@/types/task";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";

const { Title, Text } = Typography;
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
  low: "#52c41a",
  medium: "#3b82f6",
  high: "#fa8c16",
  critical: "#f5222d",
};

export function TasksPage() {
  const { user, logout } = useAuth();
  const { toggle, isDark } = useTheme();
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

  const stats = useMemo(() => {
    const items = data?.items || [];
    return {
      total: data?.total || 0,
      inProgress: items.filter((t) => t.status === "in_progress").length,
      done: items.filter((t) => t.status === "done").length,
      blocked: items.filter((t) => t.status === "blocked").length,
    };
  }, [data]);

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

  const userInitial = user?.username?.charAt(0).toUpperCase() || "U";

  const columns: ColumnsType<TaskResponse> = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      sorter: true,
      ellipsis: true,
      width: "30%",
      render: (title: string, record: TaskResponse) => (
        <div>
          <Text strong style={{ fontSize: 14 }}>{title}</Text>
          {record.description && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.description.length > 60
                  ? record.description.slice(0, 60) + "..."
                  : record.description}
              </Text>
            </div>
          )}
        </div>
      ),
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
      width: 110,
      render: (priority: TaskPriority) => (
        <span>
          <span
            className="priority-dot"
            style={{ backgroundColor: PRIORITY_COLORS[priority] }}
          />
          {priority.charAt(0).toUpperCase() + priority.slice(1)}
        </span>
      ),
    },
    {
      title: "Due Date",
      dataIndex: "due_date",
      key: "due_date",
      width: 120,
      render: (date: string | null) => {
        if (!date) return <Text type="secondary">-</Text>;
        const isOverdue = new Date(date) < new Date();
        return (
          <Text type={isOverdue ? "danger" : undefined}>
            {new Date(date).toLocaleDateString()}
          </Text>
        );
      },
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 120,
      sorter: true,
      render: (date: string) => (
        <Text type="secondary">{new Date(date).toLocaleDateString()}</Text>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 50,
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
          <Button type="text" icon={<MoreOutlined />} size="small" />
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
    <div className="dash-layout">
      <div className="dash-grid" />

      {/* Header */}
      <header className="app-header" style={{ height: 56, lineHeight: "56px" }}>
        <Space align="center" size={12}>
          <div className="header-brand-icon">
            <ProjectOutlined style={{ color: "white", fontSize: 16 }} />
          </div>
          <Title level={5} style={{ margin: 0 }}>Task Management</Title>
        </Space>

        <Space align="center" size={8}>
          <Tooltip title={isDark ? "Light mode" : "Dark mode"}>
            <button className="theme-toggle" onClick={toggle}>
              {isDark ? <SunOutlined /> : <MoonOutlined />}
            </button>
          </Tooltip>
          <Text type="secondary" style={{ marginLeft: 4 }}>{user?.username}</Text>
          <Avatar size={32} style={{ backgroundColor: "#3b82f6", cursor: "default" }}>
            {userInitial}
          </Avatar>
          <Tooltip title="Sign out">
            <Button type="text" icon={<LogoutOutlined />} onClick={logout} size="small" />
          </Tooltip>
        </Space>
      </header>

      <div className="dash-content">
        {/* Stats */}
        <Row gutter={16} style={{ marginBottom: 24 }} className="stats-row">
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Tasks"
                value={stats.total}
                prefix={<ProjectOutlined style={{ color: "#3b82f6" }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="In Progress"
                value={stats.inProgress}
                prefix={<ClockCircleOutlined style={{ color: "#3b82f6" }} />}
                valueStyle={{ color: "#3b82f6" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Completed"
                value={stats.done}
                prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Blocked"
                value={stats.blocked}
                prefix={<ExclamationCircleOutlined style={{ color: "#faad14" }} />}
                valueStyle={{ color: "#faad14" }}
              />
            </Card>
          </Col>
        </Row>

        {/* Filters */}
        <Card size="small" className="dash-filter-card" style={{ marginBottom: 16 }} bordered={false}>
          <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
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
                options={(["low", "medium", "high", "critical"] as const).map((p) => ({
                  value: p,
                  label: (
                    <span>
                      <span className="priority-dot" style={{ backgroundColor: PRIORITY_COLORS[p] }} />
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </span>
                  ),
                }))}
              />
            </Space>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingTask(null); setFormOpen(true); }}>
                New Task
              </Button>
            </Space>
          </Space>
        </Card>

        {/* Table */}
        <Card bordered={false} className="dash-table-card" styles={{ body: { padding: 0 } }}>
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
            size="middle"
          />
        </Card>

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
      </div>
    </div>
  );
}
