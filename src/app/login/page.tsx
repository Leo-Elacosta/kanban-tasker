"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckSquare, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  // Auth States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw new Error(error.message);
        router.push("/board");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Redirects to the login page after email confirmation
            emailRedirectTo: `${window.location.origin}/login`, 
         },
        });
        if (error) throw new Error(error.message);
        setError("Conta criada! Verifique seu email para confirmar.");
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-200 flex items-center justify-center p-4 font-sans text-black">
      
      {/* Main Card */}
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="bg-black p-8 text-center text-white flex flex-col items-center">
          <div className="bg-white/10 p-3 rounded-xl mb-4">
            <CheckSquare className="w-10 h-10" />
          </div>
          <h1 className="font-extrabold text-3xl tracking-wider uppercase mb-1">Tasker</h1>
          <p className="text-gray-400 text-sm font-medium tracking-wide">
            {isLogin ? "Bem-vindo!" : "Crie sua conta"}
          </p>
        </div>

        {/* Form Section */}
        <div className="p-8">
          {error && (
            <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 text-sm font-medium ${error.includes("Conta criada") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium transition-shadow"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Senha
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium transition-shadow"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black text-white font-bold py-3.5 mt-2 rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-all shadow-lg shadow-black/20 flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? "Entrar no Tasker" : "Criar Minha Conta"}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Login/Signup */}
          <div className="mt-8 text-center border-t border-gray-100 pt-6">
            <p className="text-sm text-gray-500 font-medium">
              {isLogin ? "Ainda não tem uma conta?" : "Já possui uma conta?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                }}
                className="text-black font-extrabold hover:underline transition-all"
              >
                {isLogin ? "Cadastre-se" : "Faça Login"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}