import { api } from "./client";
import type {
  TaskCreate,
  TaskUpdate,
  TaskResponse,
  PaginatedTasks,
  TaskFilter,
  TaskStatus,
  AuditLog,
} from "@/types/task";

function buildQuery(filters: TaskFilter): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.search) params.set("search", filters.search);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.page_size) params.set("page_size", String(filters.page_size));
  if (filters.sort_by) params.set("sort_by", filters.sort_by);
  if (filters.sort_order) params.set("sort_order", filters.sort_order);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const tasksApi = {
  list: (filters: TaskFilter = {}) =>
    api.get<PaginatedTasks>(`/api/v1/tasks/${buildQuery(filters)}`),

  get: (id: string) => api.get<TaskResponse>(`/api/v1/tasks/${id}`),

  create: (data: TaskCreate) => api.post<TaskResponse>("/api/v1/tasks/", data),

  update: (id: string, data: TaskUpdate) =>
    api.put<TaskResponse>(`/api/v1/tasks/${id}`, data),

  changeStatus: (id: string, status: TaskStatus) =>
    api.patch<TaskResponse>(`/api/v1/tasks/${id}/status`, { status }),

  delete: (id: string) => api.delete(`/api/v1/tasks/${id}`),

  getAuditTrail: (taskId: string) =>
    api.get<AuditLog[]>(`/api/v1/audit/tasks/${taskId}`),
};
