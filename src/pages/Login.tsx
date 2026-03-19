import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import iwattLogo from '@/assets/iwatt-logo.png';

const Login: React.FC = () => {
  const { isLoggedIn, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (isLoggedIn) return <Navigate to="/spotMarketBoard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate brief network delay for UX
    await new Promise((r) => setTimeout(r, 400));
    const ok = login(username, password);
    setLoading(false);
    if (ok) {
      navigate('/spotMarketBoard', { replace: true });
    } else {
      toast.error('用户名或密码错误');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(160deg, hsl(150, 20%, 96%) 0%, hsl(150, 15%, 92%) 100%)' }}
    >
      <Card className="w-full max-w-sm shadow-lg border-0">
        <CardContent className="pt-10 pb-8 px-8">
          {/* Brand */}
          <div className="flex flex-col items-center gap-2 mb-8">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, hsl(155, 53%, 22%), hsl(150, 59%, 30%))' }}
            >
              <img src={iwattLogo} alt="iWatt" className="h-9 w-9 object-contain" />
            </div>
            <h1 className="text-xl font-semibold text-foreground tracking-wide">iWatt ETRM</h1>
            <p className="text-sm text-muted-foreground">储能交易决策演示系统</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                autoComplete="username"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !username || !password}
            >
              {loading ? '登录中…' : '登 录'}
            </Button>
          </form>

          {/* Footer hint */}
          <p className="text-xs text-muted-foreground text-center mt-6">
            演示账号已配置，请输入用户名和密码登录
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
