"use client";
import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { Aviso, Botao, Campo, Entrada } from "@/components/ui/base";
import { entrar, type EstadoLogin } from "./acoes";

export function FormularioLogin() {
  const [estado, acao, enviando] = useActionState<EstadoLogin, FormData>(entrar, { erro: null, email: "" });
  const [ver, setVer] = useState(false);

  return (
    <form action={acao} className="mt-8 space-y-4" noValidate>
      {estado.erro && <Aviso tom="risco">{estado.erro}</Aviso>}
      <Campo rotulo="E-mail" id="email">
        <Entrada id="email" name="email" type="email" autoComplete="username" inputMode="email" required
          defaultValue={estado.email} aria-invalid={!!estado.erro} />
      </Campo>
      <Campo rotulo="Senha" id="senha">
        <div className="relative">
          <Entrada id="senha" name="senha" type={ver ? "text" : "password"} autoComplete="current-password" required
            className="pr-12" aria-invalid={!!estado.erro} />
          <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? "Esconder senha" : "Mostrar senha"} aria-pressed={ver}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center text-tinta-3 hover:text-tinta">
            {ver ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
          </button>
        </div>
      </Campo>
      <Botao type="submit" icone={enviando ? undefined : LogIn} disabled={enviando} aria-busy={enviando} className="reflexo min-h-12 w-full">
        {enviando && <Loader2 aria-hidden className="size-4 animate-spin" />}
        {enviando ? "Conferindo acesso…" : "Entrar"}
      </Botao>    </form>
  );
}
