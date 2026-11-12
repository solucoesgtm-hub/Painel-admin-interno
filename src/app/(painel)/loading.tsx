import { Esqueleto } from "@/components/ui/base";

export default function Carregando() {
  return (
    <div aria-busy="true" aria-label="Carregando">
      <Esqueleto className="mb-2 h-4 w-28" />
      <Esqueleto className="mb-8 h-8 w-72" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Esqueleto key={i} className="h-32 rounded-lg" />)}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Esqueleto className="h-80 rounded-lg xl:col-span-2" />
        <Esqueleto className="h-80 rounded-lg" />
      </div>
      <p className="sr-only">Carregando dados…</p>
    </div>
  );
}
