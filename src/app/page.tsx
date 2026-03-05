import { AuthForm } from "@/components/AuthForm";

function InstaLogo() {
  return (
    <div className="relative h-12 w-12 rounded-3xl bg-gradient-to-tr from-[#FEDA77] via-[#D62976] to-[#4F5BD5] p-[2px] shadow-lg">
      <div className="h-full w-full rounded-3xl bg-slate-950 flex items-center justify-center">
        <div className="h-6 w-6 rounded-2xl border-2 border-slate-50/80 flex items-center justify-center">
          <div className="h-2.5 w-2.5 rounded-full border-2 border-slate-50/80" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10 lg:flex-row lg:items-center lg:gap-16">
        <section className="flex-1 space-y-7">
          <div className="flex items-center gap-3">
            <InstaLogo />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-200/80">
                Sowish Sorteios
              </p>
              <p className="text-[11px] text-slate-200/70">
                powered by Instagram giveaways
              </p>
            </div>
          </div>

          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[3.3rem] lg:leading-[1.05]">
            Faça{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FEDA77] via-[#F56040] to-[#D62976]">
              sorteios épicos
            </span>{" "}
            no Instagram em poucos cliques.
          </h1>

          <p className="max-w-xl text-base text-slate-100/80 sm:text-lg">
            Centralize seus sorteios, conecte o Instagram oficial da marca,
            rastreie comentários reais e anuncie vencedores com transparência
            total.
          </p>

          <div className="grid gap-4 text-sm text-slate-100/90 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-950/40 border border-white/10 p-4 shadow-lg shadow-[#D62976]/20">
              <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#FEDA77]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FCAF45] animate-pulse" />
                Créditos inteligentes
              </div>
              <p className="text-xs text-slate-200/90">
                Pague apenas pelos sorteios que rodar. Sem mensalidade fixa.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950/40 border border-white/10 p-4 shadow-lg shadow-[#F56040]/20">
              <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#F56040]">
                Comentários reais
              </div>
              <p className="text-xs text-slate-200/90">
                Buscamos diretamente da Instagram Graph API, com filtros
                avançados.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950/40 border border-white/10 p-4 shadow-lg shadow-[#D62976]/25">
              <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#D62976]">
                Anúncio memorável
              </div>
              <p className="text-xs text-slate-200/90">
                Tela de vencedores com animação e layout pronto para print.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-950/60 border border-white/10 px-4 py-1.5 text-[11px] text-slate-200/80">
              <span className="h-1.5 w-1.5 rounded-full bg-[#58C322]" />
              Compatível com posts de feed, reels e carrosséis.
            </span>
            <span className="text-[11px] text-slate-200/70">
              Comece hoje, pague só quando sortear.
            </span>
          </div>
        </section>

        <section className="mt-10 flex-1 lg:mt-0 flex justify-center">
          <div className="w-full max-w-md">
            <div className="relative mb-4 h-10 overflow-hidden rounded-full border border-white/10 bg-slate-950/80">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_0_0,#FEDA77,transparent_55%),radial-gradient(circle_at_100%_0,#D62976,transparent_55%),radial-gradient(circle_at_0_100%,#4F5BD5,transparent_55%)] opacity-50 blur-2xl" />
              <div className="relative z-10 flex h-full items-center justify-between px-4 text-[11px] text-slate-100/90">
                <span>Sorteios para criadores, marcas e agências</span>
                <span className="rounded-full bg-slate-900/80 px-3 py-1 text-[10px] uppercase tracking-wide border border-white/10">
                  Beta privado
                </span>
              </div>
            </div>
            <AuthForm />
          </div>
        </section>
      </div>
    </main>
  );
}
