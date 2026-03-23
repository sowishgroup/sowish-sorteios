"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Confetti from "react-confetti";
import { toPng } from "html-to-image";
import { supabase } from "@/lib/supabaseClient";

type Participant = {
  id: string;
  username: string;
  text: string;
};

const ROLL_FAST_MS = 60;
const ROLL_SLOW_MS = 180;
const ROLL_DURATION_MS = 4500;
const SLOW_DOWN_AT_MS = 3200;

export default function SorteioPage() {
  const params = useParams<{ media_id: string }>();
  const searchParams = useSearchParams();

  const mediaId = params.media_id;
  const mediaUrlFromQuery = searchParams.get("media_url") ?? "";
  const thumbnailFromQuery = searchParams.get("thumbnail_url") ?? "";
  const mediaTypeFromQuery = searchParams.get("media_type") ?? "";
  const captionFromQuery = searchParams.get("caption") ?? "";
  const likesFromQuery = searchParams.get("likes");
  const commentsFromQuery = searchParams.get("comments");

  const [userId, setUserId] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState(mediaUrlFromQuery);
  const [thumbnailUrl, setThumbnailUrl] = useState(thumbnailFromQuery);
  const [mediaType, setMediaType] = useState(mediaTypeFromQuery);
  const [isVideoOrReel, setIsVideoOrReel] = useState(
    mediaTypeFromQuery === "VIDEO" || mediaTypeFromQuery === "REELS"
  );
  const [caption, setCaption] = useState(captionFromQuery);
  const [likeCount, setLikeCount] = useState<number | null>(likesFromQuery ? parseInt(likesFromQuery, 10) : null);
  const [commentsCount, setCommentsCount] = useState<number | null>(commentsFromQuery ? parseInt(commentsFromQuery, 10) : null);
  const [participantsCount, setParticipantsCount] = useState<number | null>(null);
  const [numWinnersInput, setNumWinnersInput] = useState("1");
  const [keyword, setKeyword] = useState("");
  const [uniquePerUser, setUniquePerUser] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [validCommentsCount, setValidCommentsCount] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [commentStatus, setCommentStatus] = useState<string | null>(null);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentId, setCommentId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [winners, setWinners] = useState<Participant[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [rolling, setRolling] = useState(false);
  const [rollingIndex, setRollingIndex] = useState(0);
  const [showReveal, setShowReveal] = useState(false);

  const resultImageRef = useRef<HTMLDivElement>(null);
  /** Ref do card sem imagem externa, só para captura (evita CORS no download) */
  const resultPrintRef = useRef<HTMLDivElement>(null);
  const rollStartTime = useRef<number>(0);
  const rollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const loadUserAndMedia = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        setErrorMsg("Você precisa estar logado para realizar um sorteio.");
        return;
      }
      setUserId(session.user.id);
      if (!mediaId) return;
      try {
        const res = await fetch(`/api/instagram/media/${encodeURIComponent(mediaId)}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const type = data.media_type != null ? String(data.media_type) : "";
          const isVideoReel = type === "VIDEO" || type === "REELS" || data.is_video_or_reel === true;
          setMediaType(type);
          setIsVideoOrReel(isVideoReel);
          // Para vídeos/reels: media_url é o mp4, usar thumbnail_url para exibir imagem
          if (isVideoReel) {
            if (data.thumbnail_url) {
              setMediaUrl(data.thumbnail_url);
              setThumbnailUrl(data.thumbnail_url);
            } else if (data.media_url) {
              setMediaUrl(data.media_url);
            }
          } else {
            if (data.media_url) setMediaUrl(data.media_url);
            if (data.thumbnail_url) setThumbnailUrl(data.thumbnail_url);
          }
          if (data.caption != null) setCaption(data.caption ?? "");
          setLikeCount(typeof data.like_count === "number" ? data.like_count : null);
          setCommentsCount(typeof data.comments_count === "number" ? data.comments_count : null);
        }
      } catch (_) {
        if (!mediaUrl && !thumbnailUrl) {
          const fallback = mediaTypeFromQuery === "VIDEO" || mediaTypeFromQuery === "REELS"
            ? thumbnailFromQuery || mediaUrlFromQuery
            : mediaUrlFromQuery || thumbnailFromQuery;
          if (fallback) setMediaUrl(fallback);
        }
        if (!caption && captionFromQuery) setCaption(captionFromQuery);
      }
    };
    loadUserAndMedia();
  }, [mediaId]);

  // Roleta: ciclo rápido de nomes, depois desacelera e para na revelação
  useEffect(() => {
    if (!rolling || participants.length === 0) return;

    rollStartTime.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - rollStartTime.current;
      if (elapsed >= ROLL_DURATION_MS) {
        if (rollInterval.current) {
          clearInterval(rollInterval.current);
          rollInterval.current = null;
        }
        setRolling(false);
        setShowReveal(true);
        return;
      }
      setRollingIndex((i) => (i + 1) % participants.length);
    };

    tick();
    rollInterval.current = setInterval(tick, ROLL_FAST_MS);

    const slowDown = setInterval(() => {
      const elapsed = Date.now() - rollStartTime.current;
      if (elapsed >= SLOW_DOWN_AT_MS && rollInterval.current) {
        clearInterval(rollInterval.current);
        rollInterval.current = setInterval(() => {
          const e = Date.now() - rollStartTime.current;
          if (e >= ROLL_DURATION_MS) {
            if (rollInterval.current) clearInterval(rollInterval.current);
            setRolling(false);
            setShowReveal(true);
            return;
          }
          setRollingIndex((i) => (i + 1) % participants.length);
        }, ROLL_SLOW_MS);
        clearInterval(slowDown);
      }
    }, 100);

    return () => {
      if (rollInterval.current) clearInterval(rollInterval.current);
      clearInterval(slowDown);
    };
  }, [rolling, participants.length]);

  const numWinners = Math.max(1, parseInt(numWinnersInput, 10) || 1);

  const buildDefaultCommentText = (list: Participant[]) => {
    const usernames = list
      .map((w) => (w.username || "").trim())
      .filter((u) => u && u.toLowerCase() !== "desconhecido" && u !== "?");
    const mentions = usernames.map((u) => (u.startsWith("@") ? u : `@${u}`));
    if (mentions.length === 0) return "";
    return mentions.length === 1
      ? `Parabéns ${mentions[0]}! Você foi o ganhador do sorteio realizado pelo Sowish Sorteios.`
      : `Parabéns ${mentions.join(", ")}! Vocês foram os ganhadores do sorteio realizado pelo Sowish Sorteios.`;
  };

  const handleLoadComments = async () => {
    if (!userId || !mediaId) {
      setErrorMsg("Preencha os dados e tente novamente.");
      return;
    }

    setLoadingComments(true);
    setErrorMsg(null);
    setCommentsLoaded(false);
    setValidCommentsCount(null);

    try {
      const res = await fetch("/api/sorteio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          mediaId,
          numWinners,
          keyword: keyword.trim() || null,
          uniquePerUser,
          previewOnly: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message ?? "Erro ao carregar comentários.");
        return;
      }

      setParticipants((data.participants ?? []) as Participant[]);
      setParticipantsCount(
        typeof data.totalComments === "number" ? data.totalComments : null
      );
      setValidCommentsCount(
        typeof data.totalValidAfterFilters === "number"
          ? data.totalValidAfterFilters
          : null
      );
      setCommentsLoaded(true);
    } catch (err) {
      console.error(err);
      setErrorMsg("Erro inesperado ao carregar comentários.");
    } finally {
      setLoadingComments(false);
    }
  };

  const handleRunDraw = async () => {
    if (!userId || !mediaId || numWinners <= 0) {
      setErrorMsg("Preencha os dados e tente novamente.");
      return;
    }
    if (!commentsLoaded) {
      setErrorMsg("Primeiro clique em Carregar comentários.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setCommentStatus(null);
    setCommentId(null);
    setCommentText("");
    setWinners([]);
    setShowReveal(false);

    try {
      const res = await fetch("/api/sorteio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          mediaId,
          numWinners,
          keyword: keyword.trim() || null,
          uniquePerUser,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message ?? "Erro ao realizar sorteio.");
        return;
      }

      const win = (data.winners ?? []) as Participant[];
      const part = (data.participants ?? []) as Participant[];

      if (win.length === 0 && part.length === 0) {
        setErrorMsg(
          data.message ?? "Nenhum comentário válido para este post."
        );
        return;
      }

      setWinners(win);
      setParticipants(part.length > 0 ? part : win);
      setParticipantsCount(part.length > 0 ? part.length : win.length);
      setValidCommentsCount(
        typeof data.totalValidAfterFilters === "number"
          ? data.totalValidAfterFilters
          : null
      );
      setCommentText(buildDefaultCommentText(win));
      setRollingIndex(0);
      setRolling(true);
    } catch (err) {
      console.error(err);
      setErrorMsg("Erro inesperado ao realizar o sorteio.");
    } finally {
      setLoading(false);
    }
  };

  const handleCommentWinners = async () => {
    if (!userId || !mediaId || winners.length === 0) {
      setCommentStatus(
        "Não há vencedores carregados para comentar. Rode o sorteio novamente."
      );
      return;
    }

    const text = commentText.trim();
    if (!text) {
      setCommentStatus("Edite o texto do comentário antes de postar.");
      return;
    }

    const usernames = winners
      .map((w) => (w.username || "").trim())
      .filter((u) => u && u.toLowerCase() !== "desconhecido" && u !== "?");

    setCommentLoading(true);
    setCommentStatus(null);
    try {
      const res = await fetch("/api/sorteio/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          mediaId,
          usernames,
          message: text,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCommentStatus(
          data?.message ?? "Erro ao comentar automaticamente no Instagram."
        );
        return;
      }
      setCommentId(data?.id ?? null);
      setCommentText(data?.message ?? "");
      setCommentStatus("Comentário publicado no Instagram com sucesso.");
    } catch (e) {
      console.error(e);
      setCommentStatus(
        "Erro inesperado ao comentar automaticamente no Instagram."
      );
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!userId || !commentId) {
      setCommentStatus("Nenhum comentário automático para excluir.");
      return;
    }
    setCommentLoading(true);
    setCommentStatus(null);
    try {
      const res = await fetch("/api/sorteio/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          mediaId,
          commentId,
          action: "delete",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCommentStatus(
          data?.message ?? "Erro ao excluir comentário no Instagram."
        );
        return;
      }
      setCommentStatus("Comentário excluído do Instagram com sucesso.");
      setCommentId(null);
      setCommentText("");
    } catch (e) {
      console.error(e);
      setCommentStatus(
        "Erro inesperado ao excluir o comentário no Instagram."
      );
    } finally {
      setCommentLoading(false);
    }
  };

  const handleUpdateComment = async () => {
    if (!userId || !mediaId || !commentId) {
      setCommentStatus("Nenhum comentário automático para editar.");
      return;
    }
    const text = commentText.trim();
    if (!text) {
      setCommentStatus("Preencha o texto do comentário para salvar a edição.");
      return;
    }
    setCommentLoading(true);
    setCommentStatus(null);
    try {
      // Estratégia: recriar o comentário com o novo texto
      const res = await fetch("/api/sorteio/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          mediaId,
          commentId,
          message: text,
          action: "update",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCommentStatus(
          data?.message ?? "Erro ao editar comentário no Instagram."
        );
        return;
      }
      setCommentId(data?.id ?? null);
      setCommentText(data?.message ?? text);
      setCommentStatus("Comentário atualizado no Instagram com sucesso.");
    } catch (e) {
      console.error(e);
      setCommentStatus("Erro inesperado ao editar o comentário.");
    } finally {
      setCommentLoading(false);
    }
  };

  const currentParticipant = participants[rollingIndex];

  // Para vídeos/reels, usar thumbnail (imagem) em vez de media_url (mp4)
  const displayImageUrl =
    isVideoOrReel ? thumbnailUrl || mediaUrl : mediaUrl;

  return (
    <main className="min-h-screen text-slate-900">
      {(showReveal && winners.length > 0) && (
        <Confetti recycle={false} numberOfPieces={400} />
      )}

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 mt-4 md:mt-6 space-y-6">
        <header className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
            Sorteio
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">
            Configurar sorteio do{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#E1306C] via-[#F77737] to-[#FCAF45]">
              post selecionado
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Defina as regras, debite 1 crédito e deixe o Sowish escolher os
            vencedores. Os nomes rodam na tela antes do resultado.
          </p>
        </header>

        {/* Tela da roleta: nomes rodando */}
        {rolling && participants.length > 0 && (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-md px-4"
            aria-live="polite"
          >
            <p className="text-sm uppercase tracking-widest text-slate-500 mb-4">
              Sorteador
            </p>
            <div className="text-center min-h-[120px] flex flex-col justify-center">
              <p
                key={rollingIndex}
                className="text-3xl sm:text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#E1306C] via-[#F77737] to-[#FCAF45] animate-pulse"
              >
                @{currentParticipant?.username ?? "..."}
              </p>
              <p className="mt-2 text-sm text-slate-500 line-clamp-2 max-w-md mx-auto">
                {currentParticipant?.text}
              </p>
            </div>
            <p className="mt-8 text-xs text-slate-500">
              Parando em instantes...
            </p>
          </div>
        )}

        {/* Tela de revelação: ganhador(es) + compartilhar */}
        {showReveal && winners.length > 0 && (
          <section className="space-y-6">
            {/* Card visível: mostra a imagem real do post */}
            <div
              ref={resultImageRef}
              className="rounded-2xl border border-slate-200/80 bg-white/75 backdrop-blur-sm p-6 sm:p-8 max-w-2xl mx-auto shadow-lg"
              style={{ minHeight: 400 }}
            >
              <div className="text-center mb-6">
                <p className="text-lg sm:text-xl font-semibold text-[#E1306C] mb-1">
                  Parabéns!
                </p>
                {winners.length === 1 ? (
                  <p className="text-xl sm:text-2xl text-slate-800">
                    O ganhador(a) é{" "}
                    <span className="font-bold text-[#E1306C]">
                      @{winners[0].username}
                    </span>
                  </p>
                ) : (
                  <p className="text-xl sm:text-2xl text-slate-800">
                    Os ganhadores são:
                  </p>
                )}
              </div>

              <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-6">
                {winners.map((w) => (
                  <div
                    key={w.id}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-[#E1306C] via-[#F77737] to-[#FCAF45] p-[3px] shadow-lg flex items-center justify-center">
                      <div className="w-full h-full rounded-full bg-white overflow-hidden flex items-center justify-center">
                        <img
                          src={`https://unavatar.io/instagram/${encodeURIComponent(
                            w.username || ""
                          )}`}
                          alt={`Foto de @${w.username}`}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = "none";
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector(".avatar-fallback")) {
                              const fallback = document.createElement("span");
                              fallback.className =
                                "avatar-fallback text-3xl sm:text-4xl font-bold text-slate-700";
                              fallback.textContent = (w.username || "?")
                                .charAt(0)
                                .toUpperCase();
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      </div>
                    </div>
                    <p className="mt-2 font-semibold text-slate-800">
                      @{w.username}
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-2 max-w-[200px]">
                      {w.text}
                    </p>
                  </div>
                ))}
              </div>

              <div className="relative w-full aspect-square max-w-sm mx-auto rounded-xl overflow-hidden border border-slate-200 bg-slate-200">
                {displayImageUrl ? (
                  <img
                    src={displayImageUrl}
                    alt="Post do sorteio"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent && !parent.querySelector(".post-image-fallback")) {
                        const fallback = document.createElement("div");
                        fallback.className = "post-image-fallback absolute inset-0 flex items-center justify-center text-slate-500 text-sm";
                        fallback.textContent = "Post do sorteio";
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                ) : null}
                {!displayImageUrl && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
                    Post do sorteio
                  </div>
                )}
              </div>

              {(likeCount != null || commentsCount != null || participantsCount != null) && (
                <p className="text-center text-sm text-slate-600 mt-3">
                  {likeCount != null && <span>{likeCount.toLocaleString("pt-BR")} curtidas</span>}
                  {likeCount != null && commentsCount != null && " · "}
                  {commentsCount != null && <span>{commentsCount.toLocaleString("pt-BR")} comentários</span>}
                  {participantsCount != null && (
                    <span className="block mt-1 font-medium">
                      {participantsCount.toLocaleString("pt-BR")} participantes no sorteio
                    </span>
                  )}
                </p>
              )}

              <p className="text-center text-xs text-slate-500 mt-4">
                Sowish Sorteios · Resultado oficial do sorteio
              </p>

              <div className="mt-4 flex flex-col items-center gap-3">
                <div className="w-full max-w-md space-y-2 text-left">
                  <label className="block text-[11px] font-medium text-slate-600">
                    Texto para postar o resultado
                  </label>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                    placeholder="Digite o texto do comentário..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-[#E1306C] focus:border-[#E1306C]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCommentWinners}
                  disabled={commentLoading || winners.length === 0}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#E1306C] to-[#F77737] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {commentLoading
                    ? "Comentando no Instagram..."
                    : "Comentar no post marcando o ganhador"}
                </button>
                {commentId && (
                  <div className="w-full max-w-md space-y-2 text-left">
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={handleUpdateComment}
                        disabled={commentLoading}
                        className="rounded-full border border-slate-300 bg-white px-3 py-1 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        Salvar edição
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteComment}
                        disabled={commentLoading}
                        className="rounded-full border border-red-300 bg-red-50 px-3 py-1 font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
                      >
                        Excluir comentário
                      </button>
                    </div>
                  </div>
                )}
                {commentStatus && (
                  <p className="text-[11px] text-slate-600 text-center max-w-md">
                    {commentStatus}
                  </p>
                )}
              </div>
            </div>

            {/* Removido compartilhamento automático e download de imagem conforme solicitado */}
          </section>
        )}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)] items-start">
          <section className="space-y-4">
            {!showReveal && (
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50/80 shadow-sm">
                {displayImageUrl ? (
                  <div className="relative w-full aspect-square">
                    <img
                      src={displayImageUrl}
                      alt={caption || "Post do Instagram"}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-sm text-slate-500">
                    Não foi possível carregar a imagem do post.
                  </div>
                )}
                <div className="p-4 border-t border-slate-200">
                  {(likeCount != null || commentsCount != null) && (
                    <p className="text-xs text-slate-500 mb-2">
                      {likeCount != null && <span>{likeCount.toLocaleString("pt-BR")} curtidas</span>}
                      {likeCount != null && commentsCount != null && " · "}
                      {commentsCount != null && <span>{commentsCount.toLocaleString("pt-BR")} comentários</span>}
                    </p>
                  )}
                  <p className="text-xs text-slate-600 line-clamp-3">
                    {caption || "Post sem legenda."}
                  </p>
                </div>
              </div>
            )}

            {showReveal && winners.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 lg:hidden">
                <h2 className="text-sm font-semibold text-[#E1306C] mb-2">
                  Vencedores
                </h2>
                <ul className="space-y-2">
                  {winners.map((w) => (
                    <li
                      key={w.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="font-semibold text-[#F77737]">
                        @{w.username}
                      </span>
                      <span className="text-slate-500 line-clamp-1">
                        {w.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {!showReveal && (
            <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 space-y-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Configurações do sorteio</h2>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Número de ganhadores
                </label>
                <input
                  type="number"
                  min={1}
                  value={numWinnersInput}
                  onChange={(e) => {
                    setNumWinnersInput(e.target.value);
                    setCommentsLoaded(false);
                    setValidCommentsCount(null);
                  }}
                  onBlur={() => {
                    const n = parseInt(numWinnersInput, 10);
                    if (Number.isNaN(n) || n < 1) setNumWinnersInput("1");
                    else setNumWinnersInput(String(n));
                  }}
                  className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#E1306C] focus:border-[#E1306C]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Palavra-chave obrigatória (opcional)
                </label>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => {
                    setKeyword(e.target.value);
                    setCommentsLoaded(false);
                    setValidCommentsCount(null);
                  }}
                  placeholder="Ex: #sowishsorteios"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#E1306C] focus:border-[#E1306C]"
                />
                <p className="text-xs text-slate-500">
                  Apenas comentários que contiverem essa palavra serão válidos.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <input
                  id="uniquePerUser"
                  type="checkbox"
                  checked={uniquePerUser}
                  onChange={(e) => {
                    setUniquePerUser(e.target.checked);
                    setCommentsLoaded(false);
                    setValidCommentsCount(null);
                  }}
                  className="mt-1 h-4 w-4 rounded border-slate-400 bg-white text-[#E1306C] focus:ring-[#E1306C]"
                />
                <label
                  htmlFor="uniquePerUser"
                  className="text-sm text-slate-700 cursor-pointer"
                >
                  Filtrar duplicados — 1 chance por pessoa
                </label>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-200 bg-white/70 p-3">
                <button
                  type="button"
                  onClick={handleLoadComments}
                  disabled={loadingComments}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loadingComments ? "Carregando comentários..." : "Carregar comentários"}
                </button>
                {loadingComments && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-[#E1306C]" />
                    Buscando e validando comentários do post...
                  </div>
                )}
                {!loadingComments && commentsLoaded && (
                  <p className="text-xs text-emerald-700">
                    Comentários válidos carregados:{" "}
                    <span className="font-semibold">
                      {validCommentsCount ?? 0}
                    </span>
                  </p>
                )}
              </div>

              {errorMsg && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {errorMsg}
                </p>
              )}

              <button
                type="button"
                disabled={
                  loading ||
                  loadingComments ||
                  !commentsLoaded ||
                  (validCommentsCount ?? 0) <= 0
                }
                onClick={handleRunDraw}
                className="mt-2 w-full rounded-xl bg-gradient-to-r from-[#E1306C] to-[#F77737] hover:brightness-110 text-white font-semibold py-3.5 text-sm uppercase tracking-wide transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading
                  ? "Realizando sorteio..."
                  : "Realizar Sorteio (Custa 1 Crédito)"}
              </button>

              <p className="text-xs text-slate-500">
                Primeiro carregue os comentários para ver quantos são válidos.
                Depois clique em Realizar Sorteio para seguir com a roleta.
              </p>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
