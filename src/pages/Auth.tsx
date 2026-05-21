import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LayoutDashboard, LogIn, UserPlus, AlertCircle } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Optionally show success message for signup
        setError('Conta criada com sucesso! Você já pode fazer login.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro durante a autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 mix-blend-multiply"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-danger/20 rounded-full blur-3xl opacity-50 mix-blend-multiply"></div>
      
      <div className="glass-panel w-full max-w-md p-8 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary/10 p-3 rounded-2xl mb-4">
            <LayoutDashboard size={40} className="text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-text mb-2">Balanço Geral</h1>
          <p className="text-text-light text-center">
            Inteligência artificial para sua gestão financeira
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-danger shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-danger-hover">{error}</p>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glass-input w-full"
              placeholder="seu@email.com"
              maxLength={255}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input w-full"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 px-4 rounded-xl transition-all shadow-lg shadow-primary/30 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : isLogin ? (
              <>
                <LogIn size={20} /> Entrar
              </>
            ) : (
              <>
                <UserPlus size={20} /> Criar Conta
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-text-light">
            {isLogin ? "Ainda não tem uma conta?" : "Já possui uma conta?"}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 text-primary hover:underline font-medium"
            >
              {isLogin ? "Cadastre-se" : "Faça Login"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
