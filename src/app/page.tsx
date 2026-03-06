import Image from "next/image";
import { AuthForm } from "@/components/AuthForm";

/** Azul da logo Sowish */
const LOGO_BLUE = "#2563eb";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900 relative">
      {/* Plano de fundo: imagem apenas no desktop */}
      <div
        className="hidden lg:block absolute inset-0 bg-slate-200"
        aria-hidden
      >
        <Image
          src="/banner.png"
          alt=""
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/15" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col px-6 py-10 lg:flex-row lg:items-center lg:gap-16 lg:min-h-screen">
        <section className="flex-1 space-y-7 rounded-2xl bg-white/85 backdrop-blur-sm p-6 lg:p-8 shadow-lg border border-white/50">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Sowish"
              width={56}
              height={56}
              className="h-12 w-12 object-contain"
            />
            <div>
              <p
                className="text-xs uppercase tracking-[0.3em] font-semibold"
                style={{ color: LOGO_BLUE }}
              >
                Sowish Sorteios
              </p>
              <p className="text-[11px] text-slate-500">
                powered by Sowish Group
              </p>
            </div>
          </div>

          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.3rem] lg:leading-[1.05]">
            Faça{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#E1306C] via-[#F77737] to-[#FCAF45]">
              sorteios épicos
            </span>{" "}
            no Instagram em poucos cliques.
          </h1>

          <p className="max-w-xl text-base text-slate-600 sm:text-lg">
            Centralize seus sorteios, conecte o Instagram oficial da marca,
            rastreie comentários reais e anuncie vencedores com transparência
            total.
          </p>

          <div className="grid gap-4 text-sm sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm">
              <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#E1306C]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FCAF45]" />
                Créditos inteligentes
              </div>
              <p className="text-xs text-slate-600">
                Pague apenas pelos sorteios que rodar. Sem mensalidade fixa.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm">
              <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#F77737]">
                Comentários reais
              </div>
              <p className="text-xs text-slate-600">
                Buscamos diretamente da Instagram Graph API, com filtros
                avançados.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm">
              <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#E1306C]">
                Anúncio memorável
              </div>
              <p className="text-xs text-slate-600">
                Tela de vencedores com animação e layout pronto para print.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-4 py-1.5 text-[11px] text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Compatível com posts de feed, reels e carrosséis.
            </span>
            <span className="text-[11px] text-slate-500">
              Comece hoje, pague só quando sortear.
            </span>
          </div>
        </section>

        <section className="mt-10 flex-1 lg:mt-0 flex justify-center">
          <div className="w-full max-w-md">
            <div className="relative mb-4 rounded-2xl border border-slate-200/80 bg-white/85 backdrop-blur-sm px-4 py-3 text-center text-[11px] text-slate-600 shadow-lg">
              Sorteios para criadores, marcas e agências
            </div>
            <AuthForm />
          </div>
        </section>
      </div>
    </main>
  );
}
