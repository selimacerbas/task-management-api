import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Input, Button, App } from "antd";
import {
  LockOutlined,
  MailOutlined,
  ProjectOutlined,
  ApiOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  NodeIndexOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/hooks/useAuth";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await login(values);
      message.success("Welcome back!");
      navigate("/tasks");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-scene">
      <div className="auth-grid" />

      <div className="auth-content">
        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <ProjectOutlined />
          </div>
          <span className="auth-brand-name">Task Management</span>
        </div>

        {/* Glass card */}
        <div className="auth-glass-card">
          <h1 className="auth-heading">Welcome back</h1>
          <p className="auth-subheading">Sign in to continue to your workspace</p>

          <Form layout="vertical" onFinish={onFinish} autoComplete="off" size="large">
            <Form.Item
              name="email"
              rules={[{ required: true, type: "email", message: "Valid email required" }]}
            >
              <Input prefix={<MailOutlined />} placeholder="Email address" />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[{ required: true, min: 8, message: "Min 8 characters" }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Password" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 20 }}>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Sign In
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: "center" }}>
            <span className="auth-footer-text">
              Don't have an account? <Link to="/register">Create one</Link>
            </span>
          </div>
        </div>

        {/* Feature pills */}
        <div className="auth-features">
          <span className="auth-feature-pill">
            <ApiOutlined /> Microservices
          </span>
          <span className="auth-feature-pill">
            <ThunderboltOutlined /> Event-Driven
          </span>
          <span className="auth-feature-pill">
            <SafetyOutlined /> JWT Auth
          </span>
          <span className="auth-feature-pill">
            <NodeIndexOutlined /> OpenTelemetry
          </span>
        </div>

        {/* Tech bar */}
        <div className="auth-tech-bar">
          <span>FastAPI</span>
          <span className="dot" />
          <span>React</span>
          <span className="dot" />
          <span>PostgreSQL</span>
          <span className="dot" />
          <span>Redis Streams</span>
          <span className="dot" />
          <span>Docker</span>
        </div>
      </div>
    </div>
  );
}
