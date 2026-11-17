// Símbolo animado do login: pinguim flutuando, com halo girando e brilho pulsando atrás.
// Tudo em CSS; quem prefere menos movimento recebe a marca parada (regra global em globals.css).
import { SimboloGTM } from "@/components/layout/logo";
import { cn } from "@/components/ui/base";

export function MarcaAnimada({ className }: { className?: string }) {
  return (
    <div className={cn("relative grid place-items-center", className)} aria-hidden>
      {/* Brilho suave atrás da marca */}
      <span className="animate-pulsar absolute inset-[-18%] rounded-full bg-[radial-gradient(closest-side,rgb(127_162_255/0.35),transparent)] blur-2xl" />
      {/* Halo: anel com um arco de luz que gira devagar */}
      <span
        className="animate-girar absolute inset-[-9%] rounded-full [mask:radial-gradient(farthest-side,transparent_calc(100%-2px),#000_calc(100%-1px))]"
        style={{ background: "conic-gradient(from 0deg, transparent 0deg, rgb(169 192 255 / 0.9) 60deg, transparent 140deg, transparent 360deg)" }}
      />
      <span className="absolute inset-[-9%] rounded-full border border-white/10" />
      <span className="absolute inset-[-20%] rounded-full border border-dashed border-white/[0.07] animate-girar [animation-direction:reverse] [animation-duration:60s]" />
      <div className="animate-surgir-marca">
        <div className="animate-flutuar">
          <SimboloGTM fundo={false} className="size-full drop-shadow-[0_24px_40px_rgb(0_0_0/0.55)]" />
        </div>
      </div>
    </div>
  );
}
