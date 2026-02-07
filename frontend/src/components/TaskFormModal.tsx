import { useEffect } from "react";
import { Modal, Form, Input, Select, DatePicker, App } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/api/tasks";
import dayjs from "dayjs";
import type { TaskResponse } from "@/types/task";

interface Props {
  open: boolean;
  task: TaskResponse | null;
  onClose: () => void;
}

export function TaskFormModal({ open, task, onClose }: Props) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const isEdit = !!task;

  useEffect(() => {
    if (open) {
      if (task) {
        form.setFieldsValue({
          ...task,
          due_date: task.due_date ? dayjs(task.due_date) : null,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, task, form]);

  const createMutation = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => {
      message.success("Task created");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    },
    onError: (err: Error) => message.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof tasksApi.update>[1] }) =>
      tasksApi.update(id, data),
    onSuccess: () => {
      message.success("Task updated");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    },
    onError: (err: Error) => message.error(err.message),
  });

  const handleOk = async () => {
    const values = await form.validateFields();
    const payload = {
      ...values,
      due_date: values.due_date ? values.due_date.format("YYYY-MM-DD") : undefined,
    };

    if (isEdit && task) {
      updateMutation.mutate({ id: task.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Modal
      title={isEdit ? "Edit Task" : "New Task"}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ priority: "medium" }}>
        <Form.Item name="title" label="Title" rules={[{ required: true, message: "Title is required" }]}>
          <Input placeholder="What needs to be done?" />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={3} placeholder="Optional details..." />
        </Form.Item>
        <Form.Item name="priority" label="Priority">
          <Select
            options={[
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
              { value: "critical", label: "Critical" },
            ]}
          />
        </Form.Item>
        <Form.Item name="due_date" label="Due Date">
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
