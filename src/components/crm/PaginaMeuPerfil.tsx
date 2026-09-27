"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import { alterarSegurancaAction, salvarPerfilAction } from "@/app/acoes-crm";
import { Avatar } from "@/components/Avatar";
import { CrachaModal } from "@/components/CrachaModal";
import {
  IconeCheck,
  IconeCopiar,
  IconeCracha,
  IconeDownload,
  IconeEditar,
  IconeEscudo,
  IconeEstrela,
  IconeGaleria,
  IconeImprimir,
  IconeLinkExterno,
  IconeLixeira,
  IconePlus,
  IconeProjetos,
  IconeSparkles,
  IconeUpload,
  IconeUsuario,
  IconeVideo,
} from "@/components/Icones";
import { CurriculoImpressao } from "@/components/CurriculoImpressao";
import { ImportarGithub } from "@/components/crm/ImportarGithub";
import { Insignias } from "@/components/Insignias";
import { StickerCanvas } from "@/components/crm/StickerCanvas";
import { VideoEmbed } from "@/components/VideoEmbed";
import { IconeGitHub, IconeInstagram, IconeLinkedIn } from "@/components/RedesBadges";
import { aoSetasDasAbas } from "@/lib/abas";
import { blobDoDataUrl, caminhoDaMidia, nomeDaImagem } from "@/lib/blob";
import { CORES_SALA, corDoAluno, nomeDaCor } from "@/lib/cores";
import { LISTA_HABILIDADES, corHabilidade } from "@/lib/habilidades";
import {
  DOMINIO_EMAIL_ESCOLA,
  FOTO_LADO,
  LADO_CAPA,
  MAX_HABILIDADES,
  MAX_PROJETOS,
  MAX_VIDEOS,
  PROPORCAO_CAPA,
  conferirTamanhoDaImagem,
} from "@/lib/limites";
import type { AlunoNaTela, MidiaAluno, ProjetoAluno, StickerPerfil, UsuarioSessao } from "@/lib/tipos";
import { mesmoVideo, normalizarVideo, type VideoAluno } from "@/lib/video";

type Props = {
  usuario: UsuarioSessao;
  alunoAtual: AlunoNaTela | null;
  salas: { id: string; nome: string }[];
};

export function PaginaMeuPerfil({ usuario, alunoAtual, salas }: Props) {
  const [estado, formAction, salvando] = useActionState(salvarPerfilAction, { ok: false });
  const [estadoSeguranca, acaoSeguranca, alterandoSenha] = useActionState(alterarSegurancaAction, {
    ok: false,
  });

  // Senha trocada: limpa os campos para o formulário não reenviar o valor antigo.
  useEffect(() => {
    if (estadoSeguranca.ok) {
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
    }
  }, [estadoSeguranca]);
  const [abaAtiva, setAbaAtiva] = useState<
    "dados" | "projetos" | "estudio" | "midias" | "videos" | "conta"
  >("dados");
  const [crachaAberto, setCrachaAberto] = useState(false);
  const [curriculoAberto, setCurriculoAberto] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);

  // Stickers e Elementos Decorativos Estilo Canva
  const [stickers, setStickers] = useState<StickerPerfil[]>(
    alunoAtual?.stickers && Array.isArray(alunoAtual.stickers) ? alunoAtual.stickers : [],
  );

  // Campos do Aluno
  const [nome, setNome] = useState(alunoAtual?.nome ?? usuario.nome ?? "Theo Padilha");
  const [sala, setSala] = useState(alunoAtual?.sala ?? usuario.sala ?? "DSM3");
  // O e-mail é do domínio da escola, então o campo guarda só a parte de antes do
  // `@` e o sufixo é desenhado ao lado, fixo. Antes o campo era um `<input
  // type="email">` livre com o Gmail do Théo como valor inicial chumbado — quem
  // abrisse o editor sem e-mail salvava um endereço que não era dele.
  const emailDoAluno = alunoAtual?.email ?? "";
  const [emailLocal, setEmailLocal] = useState(
    emailDoAluno.endsWith(`@${DOMINIO_EMAIL_ESCOLA}`)
      ? emailDoAluno.slice(0, -(DOMINIO_EMAIL_ESCOLA.length + 1))
      : "",
  );
  const email = emailLocal.trim()
    ? `${emailLocal.trim().toLowerCase()}@${DOMINIO_EMAIL_ESCOLA}`
    : "";
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [bio, setBio] = useState(alunoAtual?.bio ?? "");
  const [linkedin, setLinkedin] = useState(alunoAtual?.linkedin ?? "");
  const [github, setGithub] = useState(alunoAtual?.github ?? "");
  const [instagram, setInstagram] = useState(alunoAtual?.instagram ?? "");

  // Competências: o estado inicial é o que `aluno.habilidades` já traz resolvido
  // da camada de dados (o regex da bio, quando o aluno nunca editou). É de
  // propósito — o aluno vê o que o perfil já afirma sobre ele e confirma ou tira.
  const [habilidades, setHabilidades] = useState<string[]>(alunoAtual?.habilidades ?? []);
  const [foto, setFoto] = useState(alunoAtual?.foto_url ?? "");
  const [avisoFoto, setAvisoFoto] = useState<string | null>(null);

  // Aparência do perfil público. `corPerfil` vazio NÃO é "sem cor": é "usa a cor
  // da minha turma" (NULL no banco), que é o que todos os alunos têm hoje — e é
  // para cá que o aluno volta depois de ter escolhido uma cor. `sanitizarCor("")`
  // devolve null, então o mesmo input serve para escolher e para desescolher.
  // `CORES_SALA.includes` e não o valor cru: um `cor_perfil` fora da paleta
  // (escrito à mão no banco antes da CHECK `alunos_cor_perfil_paleta`) não acende
  // amostra nenhuma, e um grupo de rádio sem nenhum marcado não envia `cor` — a
  // guarda de presença da action pularia o campo e a cor velha nunca sairia.
  // Tratar o órfão como "sem escolha" faz o grupo sempre ter um marcado.
  const corSalva = alunoAtual?.cor_perfil;
  const [corPerfil, setCorPerfil] = useState(
    corSalva && (CORES_SALA as readonly string[]).includes(corSalva) ? corSalva : "",
  );
  const [capa, setCapa] = useState(alunoAtual?.banner_url ?? "");
  const [avisoCapa, setAvisoCapa] = useState<string | null>(null);

  // Lista de projetos / criações
  const [projetos, setProjetos] = useState<ProjetoAluno[]>(
    alunoAtual?.projetos && Array.isArray(alunoAtual.projetos) ? alunoAtual.projetos : [],
  );
  const [novoProjTitulo, setNovoProjTitulo] = useState("");
  const [novoProjDesc, setNovoProjDesc] = useState("");
  const [novoProjLink, setNovoProjLink] = useState("");
  const [novoProjImg, setNovoProjImg] = useState("");

  // Lista de mídias (Imagens e GIFs da Galeria)
  const [midias, setMidias] = useState<MidiaAluno[]>(
    alunoAtual?.midias && Array.isArray(alunoAtual.midias) ? alunoAtual.midias : [],
  );
  const [novaMidiaUrl, setNovaMidiaUrl] = useState("");
  const [novaMidiaTipo, setNovaMidiaTipo] = useState<"imagem" | "gif">("imagem");
  const [novaMidiaLegenda, setNovaMidiaLegenda] = useState("");
  // Aviso de arquivo grande demais, colado onde o aluno está olhando. O GIF
  // entra cru (não passa pelo canvas que redimensiona), então sem isto o
  // arquivo viajava inteiro até o servidor para ser recusado lá.
  const [avisoMidia, setAvisoMidia] = useState<string | null>(null);
  const [avisoProjeto, setAvisoProjeto] = useState<string | null>(null);

  // Lista de vídeos (YouTube e Vimeo). O estado guarda `{ id, tipo, titulo }`:
  // a URL que o aluno colou morre no `normalizarVideo`, e o que vai para o
  // banco é o id — é ele que decide o host do iframe no perfil público.
  const [videos, setVideos] = useState<VideoAluno[]>(
    alunoAtual?.videos && Array.isArray(alunoAtual.videos) ? alunoAtual.videos : [],
  );
  const [novoVideoLink, setNovoVideoLink] = useState("");
  const [avisoVideo, setAvisoVideo] = useState<string | null>(null);
  // Qual campo tem arquivo subindo para o Blob agora, ou null.
  //
  // Existe porque a imagem só vira URL depois que o Blob responde, e até lá o
  // campo fica vazio: sem isto o aluno clica em "Adicionar" e não acontece
  // nada, sem saber se quebrou ou se ainda está subindo.
  const [enviando, setEnviando] = useState<"midia" | "projeto" | null>(null);

  const urlPerfil =
    typeof window !== "undefined"
      ? `${window.location.origin}/alunos/${alunoAtual?.slug ?? "theo-padilha"}`
      : `https://alunos-sesi.vercel.app/alunos/${alunoAtual?.slug ?? "theo-padilha"}`;

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(urlPerfil);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2400);
    } catch {}
  }

  // Os chips são a única porta de entrada de competência, e todos saem de
  // `LISTA_HABILIDADES` por `hab.nome`: a comparação no banco é case-sensitive
  // (`endossos` guarda a habilidade na chave primária), então texto digitado à
  // mão criaria uma competência que nenhum endosso alcança.
  function alternarHabilidade(nome: string) {
    setHabilidades((escolhidas) => {
      if (escolhidas.includes(nome)) return escolhidas.filter((h) => h !== nome);
      if (escolhidas.length >= MAX_HABILIDADES) return escolhidas;
      return [...escolhidas, nome];
    });
  }

  function adicionarProjeto() {
    if (!novoProjTitulo.trim()) return;
    // Mesmo teto do `adicionarVideo`, e aqui o corte do servidor é silencioso:
    // `sanitizarProjetos` faz `slice(0, MAX_PROJETOS)`, então o 11º projeto
    // entraria na tela e sumiria no submit — junto com a capa, que já subiu
    // para o Blob e não volta.
    if (projetos.length >= MAX_PROJETOS) {
      setAvisoProjeto(`O perfil aceita ${MAX_PROJETOS} projetos. Remova um para adicionar outro.`);
      return;
    }
    // Mesma porta que a mídia. Aqui pesa mais: uma capa gigante na lista vai
    // junta no POST, e com o bodySizeLimit de 4mb o servidor recusa a action
    // inteira — o aluno perderia a edição toda, não só a capa.
    const aviso = conferirTamanhoDaImagem(novoProjImg.trim(), "projetos");
    if (aviso) {
      setAvisoProjeto(aviso);
      return;
    }
    const novo: ProjetoAluno = {
      id: `proj_${Date.now()}`,
      titulo: novoProjTitulo.trim(),
      descricao: novoProjDesc.trim(),
      link: novoProjLink.trim() || undefined,
      imagem: novoProjImg.trim() || undefined,
    };
    setProjetos([...projetos, novo]);
    setNovoProjTitulo("");
    setNovoProjDesc("");
    setNovoProjLink("");
    setNovoProjImg("");
    setAvisoProjeto(null);
  }

  function removerProjeto(id: string) {
    setProjetos(projetos.filter((p) => p.id !== id));
  }

  /**
   * Recebe o que veio do GitHub e devolve quantos couberam.
   *
   * O corte em `MAX_PROJETOS` é feito aqui, e não no `ImportarGithub`, porque a
   * regra é a mesma que o formulário já usa ao adicionar um projeto à mão — e
   * quem conhece a lista atual é este componente. O servidor corta de novo em
   * `sanitizarProjetos`; se os dois discordassem, o aluno perderia projeto sem
   * aviso no submit.
   */
  function importarProjetos(novos: ProjetoAluno[]) {
    const cabem = novos.slice(0, Math.max(0, MAX_PROJETOS - projetos.length));
    setProjetos([...projetos, ...cabem]);
    return { adicionados: cabem.length, ignorados: novos.length - cabem.length };
  }

  function adicionarMidia() {
    const url = novaMidiaUrl.trim();
    if (!url) return;
    // Segunda porta de entrada de imagem gigante: data URL colado à mão no
    // campo de texto. A primeira é o upload de GIF, logo abaixo.
    const aviso = conferirTamanhoDaImagem(url, "midias");
    if (aviso) {
      setAvisoMidia(aviso);
      return;
    }
    const tipo = url.toLowerCase().includes(".gif") ? "gif" : novaMidiaTipo;
    setMidias([...midias, { url, tipo, legenda: novaMidiaLegenda.trim() || undefined }]);
    setNovaMidiaUrl("");
    setNovaMidiaLegenda("");
    setAvisoMidia(null);
  }

  function removerMidia(index: number) {
    setMidias(midias.filter((_, i) => i !== index));
  }

  // O teto de vídeos é do perfil inteiro, não da edição: o aluno que já tem
  // `MAX_VIDEOS` salvos não ganha um a mais por abrir o editor. Aqui o corte é
  // avisado, e não silencioso como o do `importarProjetos` — o aluno digitou um
  // link, então merece saber por que ele não entrou.
  function adicionarVideo() {
    const link = novoVideoLink.trim();
    if (!link) return;
    const video = normalizarVideo(link);
    if (!video) {
      setAvisoVideo("Link não reconhecido. Cole um endereço de vídeo do YouTube ou do Vimeo.");
      return;
    }
    if (videos.some((v) => mesmoVideo(v, video))) {
      setAvisoVideo("Este vídeo já está no seu perfil.");
      return;
    }
    if (videos.length >= MAX_VIDEOS) {
      setAvisoVideo(`O perfil aceita ${MAX_VIDEOS} vídeos. Remova um para adicionar outro.`);
      return;
    }
    setVideos([...videos, video]);
    setNovoVideoLink("");
    setAvisoVideo(null);
  }

  function removerVideo(video: VideoAluno) {
    setVideos(videos.filter((v) => !mesmoVideo(v, video)));
  }

  // O título é editado no item já na lista, e o corte em 80 aqui é o mesmo que
  // `sanitizarVideos` aplica no servidor — sem ele o aluno digitaria 200
  // caracteres e veria o texto encolher só depois de salvar.
  function definirTituloVideo(video: VideoAluno, titulo: string) {
    setVideos(
      videos.map((v) =>
        mesmoVideo(v, video) ? { ...v, titulo: titulo.slice(0, 80) || undefined } : v,
      ),
    );
  }

  async function comprimirImagemArquivo(file: File, maxDim = 1280, qualidade = 0.85): Promise<string> {
    return new Promise((resolve, reject) => {
      if (file.type === "image/gif") {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }
      const img = new Image();
      const urlObj = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(urlObj);
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        // Sem contexto não há compressão. Devolver o cru aqui é seguro porque
        // quem recebe confere o teto de bytes depois (`conferirTamanhoDaImagem`
        // no `aceitarMidia`): o arquivo grande é barrado com aviso ao aluno, e
        // não passa adiante como se tivesse sido comprimido.
        if (!ctx) {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", qualidade));
      };
      img.onerror = () => {
        URL.revokeObjectURL(urlObj);
        reject(new Error("Erro ao carregar imagem"));
      };
      img.src = urlObj;
    });
  }

  /**
   * Recorta a maior faixa central com a proporção pedida e reduz para `largura`.
   *
   * Caminho próprio, e não `comprimirImagemArquivo`: aquele escala preservando
   * a proporção (uma foto 4:3 sairia 256×192) e devolve GIF cru sem passar pelo
   * canvas. O avatar é redondo em toda tela e a capa é uma faixa larga, então o
   * corte acontece aqui — enquadrar pelo centro é o que recorta o excesso das
   * bordas em vez de espremer o rosto.
   */
  async function recortarFaixa(
    file: File,
    largura: number,
    proporcao: number,
    qualidade = 0.82,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const urlObj = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(urlObj);
        // O try existe para a promise nunca ficar pendurada: um SVG sem dimensão
        // ou um arquivo truncado decodifica e só explode no `drawImage`. Pendurada
        // ela não rejeita, o `finally` do chamador não roda e o input nunca zera.
        try {
          // A faixa de origem: a maior com a proporção pedida que cabe na
          // imagem. Quando a imagem já é mais larga que a proporção, quem manda
          // é a largura e sobra altura; quando é mais alta, o contrário.
          let larguraFonte = img.width;
          let alturaFonte = Math.round(img.width / proporcao);
          if (alturaFonte > img.height) {
            alturaFonte = img.height;
            larguraFonte = Math.round(img.height * proporcao);
          }
          const sobraX = (img.width - larguraFonte) / 2;
          const sobraY = (img.height - alturaFonte) / 2;
          const canvas = document.createElement("canvas");
          canvas.width = largura;
          canvas.height = Math.round(largura / proporcao);
          const ctx = canvas.getContext("2d");
          // Sem contexto não há recorte. O cru que sai daqui é barrado adiante
          // pelo teto de bytes do campo (`conferirTamanhoDaImagem`), então o
          // aluno não fica com uma imagem acima do limite sem saber.
          if (!ctx) {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
            return;
          }
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(
            img,
            sobraX,
            sobraY,
            larguraFonte,
            alturaFonte,
            0,
            0,
            canvas.width,
            canvas.height,
          );
          resolve(canvas.toDataURL("image/jpeg", qualidade));
        } catch {
          reject(new Error("Erro ao processar imagem"));
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(urlObj);
        reject(new Error("Erro ao carregar imagem"));
      };
      img.src = urlObj;
    });
  }

  /** O avatar é redondo em toda tela: quadrado, 1:1. */
  function recortarFotoQuadrada(file: File, lado = FOTO_LADO, qualidade = 0.82) {
    return recortarFaixa(file, lado, 1, qualidade);
  }

  /**
   * A capa é a faixa larga do topo do perfil, 3:1.
   *
   * O degrau de qualidade existe porque a saída é sempre 1280×427: sem ele, uma
   * foto com muito detalhe (folhagem, multidão) estourava o teto e o aviso
   * "escolha um arquivo menor" não tinha o que oferecer — reencodar o mesmo
   * conteúdo em 0.82 dá exatamente o mesmo tamanho, então trocar de arquivo não
   * resolvia. Cada degrau abaixo custa uma rasterização, e só acontece quando o
   * anterior de fato não coube.
   */
  async function recortarCapa(file: File, largura = LADO_CAPA) {
    let ultimo = "";
    for (const qualidade of [0.82, 0.7, 0.6]) {
      ultimo = await recortarFaixa(file, largura, PROPORCAO_CAPA, qualidade);
      if (!conferirTamanhoDaImagem(ultimo, "capa")) return ultimo;
    }
    // Nem a 0.6 coube: devolve o último e deixa o aviso do chamador explicar o
    // teto, em vez de a promessa ficar pendurada.
    return ultimo;
  }

  /**
   * Sobe o data URL já comprimido para o Blob e devolve a URL pública.
   *
   * É aqui que a imagem sai do corpo do POST: o formulário passa a carregar
   * uma URL de ~100 caracteres em vez de megabytes de base64. Era isso que
   * fazia duas mídias no limite (2 MB cada) somarem os 4.194.304 B exatos do
   * `bodySizeLimit` e derrubarem o salvamento inteiro — junto com a capa, que
   * estava válida.
   */
  async function subirImagem(dataUrl: string, campo: "midia" | "projeto"): Promise<string> {
    const alunoId = usuario.alunoId;
    if (!alunoId) {
      throw new Error("Sua conta não está ligada a um perfil de aluno.");
    }

    const arquivo = blobDoDataUrl(dataUrl);
    const { url } = await upload(
      caminhoDaMidia(alunoId, nomeDaImagem(arquivo.type)),
      arquivo,
      {
        access: "public",
        handleUploadUrl: "/api/upload",
        clientPayload: JSON.stringify({ campo }),
      },
    );
    return url;
  }

  /** Aceita a imagem só se ela couber no teto; senão explica o motivo. */
  async function aceitarMidia(dataUrl: string) {
    const aviso = conferirTamanhoDaImagem(dataUrl, "midias");
    if (aviso) {
      setAvisoMidia(aviso);
      setNovaMidiaUrl("");
      return;
    }

    setAvisoMidia(null);
    setEnviando("midia");
    try {
      setNovaMidiaUrl(await subirImagem(dataUrl, "midia"));
    } catch {
      // A imagem continua no computador do aluno: o que falhou foi o envio,
      // não a escolha. "Tente de novo" é o que ele pode fazer a respeito.
      setAvisoMidia("Não foi possível enviar a imagem. Tente de novo.");
      setNovaMidiaUrl("");
    } finally {
      setEnviando(null);
    }
  }

  async function aceitarCapaProjeto(dataUrl: string) {
    const aviso = conferirTamanhoDaImagem(dataUrl, "projetos");
    if (aviso) {
      setAvisoProjeto(aviso);
      setNovoProjImg("");
      return;
    }

    setAvisoProjeto(null);
    setEnviando("projeto");
    try {
      setNovoProjImg(await subirImagem(dataUrl, "projeto"));
    } catch {
      setAvisoProjeto("Não foi possível enviar a imagem. Tente de novo.");
      setNovoProjImg("");
    } finally {
      setEnviando(null);
    }
  }

  async function handleUploadArquivoMidia(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // O GIF sai daqui cru, sem passar pelo canvas: é o caminho que mais
      // estoura o teto, e o `aceitarMidia` é quem barra.
      const dataUrl = await comprimirImagemArquivo(file, 1280, 0.85);
      aceitarMidia(dataUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) aceitarMidia(result);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleUploadArquivoProjeto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await comprimirImagemArquivo(file, 1000, 0.82);
      aceitarCapaProjeto(dataUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) aceitarCapaProjeto(result);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await recortarFotoQuadrada(file);
      // O teto é rede de proteção, não o caminho comum: 256×256 em JPEG sai
      // tipicamente entre 15 e 25 KB, e é JPEG mesmo quando a entrada é GIF ou
      // PNG, porque o canvas reencoda. O aviso existe para o arquivo patológico.
      const aviso = conferirTamanhoDaImagem(dataUrl, "foto");
      setAvisoFoto(aviso);
      // Recusou: a foto que já estava no perfil continua onde está. Apagá-la por
      // causa de um arquivo grande seria perder a foto duas vezes.
      if (!aviso) setFoto(dataUrl);
    } catch {
      setAvisoFoto("Não foi possível ler esse arquivo. Tente uma imagem JPG ou PNG.");
    } finally {
      // O input guarda o último arquivo escolhido: sem zerar, escolher o MESMO
      // arquivo de novo não dispara onChange e o botão parece quebrado.
      input.value = "";
    }
  }

  async function handleUploadCapa(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await recortarCapa(file);
      // Mesmo teto que o servidor aplica (`MAX_DATA_URL_CAPA`), conferido aqui
      // para o aluno ver o motivo na hora em vez de o salvamento descartar a
      // capa em silêncio lá na frente.
      const aviso = conferirTamanhoDaImagem(dataUrl, "capa");
      setAvisoCapa(aviso);
      // Recusou: a capa que já estava no perfil continua onde está.
      if (!aviso) setCapa(dataUrl);
    } catch {
      setAvisoCapa("Não foi possível ler esse arquivo. Tente uma imagem JPG ou PNG.");
    } finally {
      input.value = "";
    }
  }

  const ehSuperAdm = usuario.role === "super_adm";
  const noTetoDeHabilidades = habilidades.length >= MAX_HABILIDADES;

  return (
    <div className="pagina-perfil-container">
      {/* ── NAVEGAÇÃO DE TOPO / BREADCRUMB ─────────────────────────────────── */}
      <div className="perfil-topo-bar">
        <div className="perfil-breadcrumb">
          <span className="crumb-secao">WORKSPACE CRM</span>
          <span className="crumb-div">/</span>
          <span className="crumb-secao">ESTUDANTES</span>
          <span className="crumb-div">/</span>
          <span className="crumb-atual">{nome || "Meu Perfil"}</span>
        </div>

        <div className="perfil-topo-acoes">
          {alunoAtual ? (
            <button
              type="button"
              className="btn-perfil-acao"
              onClick={() => setCrachaAberto(true)}
              title="Abrir e baixar crachá digital institucional"
            >
              <IconeCracha tamanho={16} />
              <span>Ver Crachá Digital</span>
            </button>
          ) : null}

          {alunoAtual ? (
            <button
              type="button"
              className="btn-perfil-acao"
              onClick={() => setCurriculoAberto(true)}
              title="Gerar Mini-Currículo em formato A4"
            >
              <IconeDownload tamanho={15} />
              <span>Mini-Currículo (A4)</span>
            </button>
          ) : null}

          <Link
            href={`/u/${alunoAtual?.slug ?? "theo-padilha"}`}
            target="_blank"
            className="btn-perfil-acao"
            title="Abrir cartão NFC / Link na Bio"
          >
            <span>Cartão NFC / Bio</span>
          </Link>

          <Link
            href={`/validar/${alunoAtual?.slug ?? "theo-padilha"}`}
            target="_blank"
            className="btn-perfil-acao"
            title="Verificar autenticidade oficial da matrícula"
          >
            <IconeEscudo tamanho={14} />
            <span>Validar Matrícula</span>
          </Link>

          <Link
            href={`/alunos/${alunoAtual?.slug ?? "theo-padilha"}`}
            target="_blank"
            className="btn-perfil-acao"
            title="Abrir portfólio público em nova aba"
          >
            <IconeLinkExterno tamanho={15} />
            <span>Página Pública</span>
          </Link>
        </div>
      </div>

      {/* ── BANNER HERO INSTITUCIONAL (Estilo Imagem 4) ────────────────────── */}
      <section className="perfil-hero-banner" style={{ position: "relative", overflow: "hidden" }}>
        {/* Stickers posicionados estilo Canva no banner */}
        {stickers.filter((s) => s.alvo !== "projeto").map((st) => (
          <div
            key={st.id}
            className="sticker-flutuante-hero"
            style={{
              position: "absolute",
              left: `${st.x}%`,
              top: `${st.y}%`,
              width: `${st.tamanho || 70}px`,
              transform: `translate(-50%, -50%) rotate(${st.rotacao || 0}deg)`,
              pointerEvents: "none",
              zIndex: 3,
            }}
            title={st.rotulo || "Elemento visual"}
          >
            <img src={st.url} alt={st.rotulo || "Sticker"} style={{ width: "100%", height: "auto", display: "block" }} />
          </div>
        ))}

        <div className="hero-banner-conteudo">
          <div className="hero-banner-avatar-wrap">
            <Avatar nome={nome} foto={foto} className="hero-banner-avatar" />
            <span className="hero-banner-status-dot" title="Online" />
          </div>

          <div className="hero-banner-textos">
            <div className="hero-banner-tag-linha">
              <span className="hero-banner-tag-cargo">
                {ehSuperAdm ? "SUPER ADM · GESTOR" : "ESTUDANTE · AUTOR"}
              </span>
              <span className="hero-banner-tag-sala">{sala}</span>
              {alunoAtual?.fixado ? <span className="selo selo-fixado">Fixado</span> : null}
              {alunoAtual?.destaque ? <span className="selo selo-adm">Destaque</span> : null}
            </div>

            <h2 className="hero-banner-nome">{nome}</h2>

            <div className="hero-banner-meta-linha">
              <span className="meta-item">
                <IconeUsuario tamanho={14} /> @{usuario.username}
              </span>
              <span className="meta-item">
                <IconeEstrela preenchida tamanho={14} /> {alunoAtual?.estrelas ?? 0} estrelas recebidas
              </span>
              {linkedin ? (
                <span className="meta-item meta-rede-ativa">
                  <IconeLinkedIn tamanho={14} /> LinkedIn Ativo
                </span>
              ) : null}
              {github ? (
                <span className="meta-item meta-rede-ativa">
                  <IconeGitHub tamanho={14} /> GitHub Ativo
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Feedback de Ação Salvar */}
      {estado.mensagem ? (
        <div
          className={`alerta-banner ${estado.ok ? "alerta-sucesso" : "alerta-erro"}`}
          role="alert"
        >
          {estado.ok ? <IconeCheck tamanho={18} /> : null}
          <span>{estado.mensagem}</span>
        </div>
      ) : null}

      {/* ── FORMULÁRIO PRINCIPAL DE EDIÇÃO EM DOIS BLOCOS (Imagem 4) ─────── */}
      <form action={formAction} className="perfil-grid-layout">
        <input type="hidden" name="nome" value={nome} />
        {/* `sala` não vai no payload de propósito: o action do aluno ignora o
            campo, e mandar um valor que ninguém lê só sugere que ele manda. */}
        <input type="hidden" name="bio" value={bio} />
        <input type="hidden" name="linkedin" value={linkedin} />
        <input type="hidden" name="github" value={github} />
        <input type="hidden" name="instagram" value={instagram} />
        <input type="hidden" name="email" value={email} />
        {/* A troca de senha sai pelo botão próprio do card de segurança
            (formAction={acaoSeguranca}); o "Salvar Todas as Alterações" não
            recebe estes campos de propósito. */}
        <input type="hidden" name="projetos" value={JSON.stringify(projetos)} />
        <input type="hidden" name="midias" value={JSON.stringify(midias)} />
        <input type="hidden" name="stickers" value={JSON.stringify(stickers)} />
        {/* Vídeo não é campo de presença, ao contrário da foto: o action lê o
            campo e grava a lista que vier (vazia inclusive), então este input
            existe para o salvamento não zerar os vídeos do aluno. */}
        <input type="hidden" name="videos" value={JSON.stringify(videos)} />
        {/* Foto e competências são campos de presença: o action só toca a coluna
            se o campo existir no form. Por isso os dois inputs ficam aqui, fora
            de qualquer bloco condicional — esconder um deles quando vazio
            tornaria a remoção da foto impossível. */}
        <input type="hidden" name="foto" value={foto} />
        <input type="hidden" name="habilidades" value={JSON.stringify(habilidades)} />
        {/* A capa segue a regra de presença da foto: o input existe sempre, e o
            valor vazio é o que apaga a capa. A cor NÃO tem input escondido — o
            grupo de rádio do card de aparência manda o valor, e um radio sempre
            tem um marcado (o "usar a cor da turma" é uma das opções). */}
        <input type="hidden" name="banner" value={capa} />

        {/* ── COLUNA ESQUERDA: RESUMO, AÇÕES E CONTATOS ─────────────────── */}
        <aside className="perfil-coluna-esquerda">
          {/* Card 1: Identidade e Ações Rápidas */}
          <div className="painel-card">
            <div className="painel-card-header">
              <span className="painel-card-label">IDENTIFICAÇÃO</span>
            </div>

            <div className="perfil-card-identidade">
              <Avatar nome={nome} foto={foto} className="perfil-card-avatar" />
              <div className="perfil-card-identidade-info">
                <h3>{nome}</h3>
                <span className="perfil-card-sala-pill">{sala}</span>
              </div>
            </div>

            <div className="edit-foto-controles">
              <label className="edit-foto-botao">
                <IconeUpload tamanho={15} />
                <span>{foto ? "Trocar foto" : "Escolher foto"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleUploadFoto}
                />
              </label>
              {foto ? (
                <button
                  type="button"
                  className="edit-foto-remover"
                  onClick={() => {
                    setFoto("");
                    setAvisoFoto(null);
                  }}
                >
                  <IconeLixeira tamanho={15} />
                  <span>Remover foto</span>
                </button>
              ) : null}
            </div>
            <span className="dica-campo">
              A imagem é recortada em quadrado pelo centro e reduzida para {FOTO_LADO}×
              {FOTO_LADO} pixels. Vale para a vitrine, a tabela, o cartão e o crachá.
            </span>
            {avisoFoto ? (
              <span className="edit-foto-aviso" role="alert">
                {avisoFoto}
              </span>
            ) : null}

            <div className="perfil-acoes-rapidas">
              <button
                type="button"
                className="btn-acao-rapida"
                onClick={copiarLink}
                title="Copiar link do portfólio"
              >
                <IconeCopiar tamanho={15} />
                <span>{linkCopiado ? "Link Copiado!" : "Copiar Link"}</span>
              </button>

              <button
                type="button"
                className="btn-acao-rapida"
                onClick={() => setCrachaAberto(true)}
                title="Visualizar crachá digital 3D"
              >
                <IconeCracha tamanho={15} />
                <span>Crachá Digital</span>
              </button>

              <button
                type="button"
                className="btn-acao-rapida"
                onClick={() => setCurriculoAberto(true)}
                title="Gerar Mini-Currículo A4 para vagas de estágio"
              >
                <IconeDownload tamanho={15} />
                <span>Mini-Currículo A4</span>
              </button>

              <Link
                href={`/u/${alunoAtual?.slug ?? "theo-padilha"}`}
                target="_blank"
                className="btn-acao-rapida"
                title="Abrir versão Cartão NFC / Linktree"
              >
                <span>Cartão NFC / Bio</span>
              </Link>
            </div>
          </div>

          {/* Card 2: Aparência do perfil público */}
          <div className="painel-card">
            <div className="painel-card-header">
              <span className="painel-card-label">APARÊNCIA</span>
            </div>

            <div className="campo-aparencia">
              <span className="label-rede" id="rotulo-cor-destaque">
                Cor de destaque
              </span>
              {/* Rádio nativo, e não botões com `role="radio"`: o grupo de rádio
                  do navegador já traz as setas do teclado e o "um marcado só",
                  que um grupo de botões teria que reimplementar à mão. */}
              <div className="seletor-cor" role="radiogroup" aria-labelledby="rotulo-cor-destaque">
                {/* A amostra da turma é a primeira e a única sem cor fixa: ela
                    desenha exatamente a cor que o perfil mostra hoje. Vazia é o
                    valor que volta o aluno ao padrão da sala (NULL no banco). */}
                <label
                  className={`amostra-cor amostra-cor-padrao${corPerfil === "" ? " amostra-cor-ativa" : ""}`}
                  style={{ ["--cor" as string]: corDoAluno(null, sala) }}
                  title="Usar a cor da minha turma"
                >
                  <input
                    type="radio"
                    name="cor"
                    value=""
                    className="sr-only"
                    checked={corPerfil === ""}
                    onChange={() => setCorPerfil("")}
                  />
                  <span className="sr-only">Usar a cor da minha turma</span>
                  {corPerfil === "" ? <IconeCheck tamanho={14} /> : null}
                </label>

                {CORES_SALA.map((c) => (
                  <label
                    key={c}
                    className={`amostra-cor${corPerfil === c ? " amostra-cor-ativa" : ""}`}
                    style={{ ["--cor" as string]: c }}
                    title={`Usar a cor ${nomeDaCor(c)}`}
                  >
                    <input
                      type="radio"
                      name="cor"
                      value={c}
                      className="sr-only"
                      checked={corPerfil === c}
                      onChange={() => setCorPerfil(c)}
                    />
                    <span className="sr-only">{nomeDaCor(c)}</span>
                    {corPerfil === c ? <IconeCheck tamanho={14} /> : null}
                  </label>
                ))}
              </div>
              <span className="dica-campo">
                Pinta o topo do seu perfil, o seu card na vitrine e o crachá. Sem escolha, vale a
                cor da turma.
              </span>
            </div>

            <div className="campo-aparencia">
              <span className="label-rede">Capa do perfil</span>
              <div
                className="capa-preview"
                style={{ ["--cor" as string]: corDoAluno(corPerfil, sala) }}
              >
                {capa ? (
                  <img src={capa} alt="Prévia da capa do perfil" />
                ) : (
                  <span className="capa-preview-vazia">
                    Sem capa — o topo do perfil usa um degradê da cor de destaque
                  </span>
                )}
              </div>
              <div className="edit-foto-controles">
                <label className="edit-foto-botao">
                  <IconeUpload tamanho={15} />
                  <span>{capa ? "Trocar capa" : "Escolher capa"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleUploadCapa}
                  />
                </label>
                {capa ? (
                  <button
                    type="button"
                    className="edit-foto-remover"
                    onClick={() => {
                      setCapa("");
                      setAvisoCapa(null);
                    }}
                  >
                    <IconeLixeira tamanho={15} />
                    <span>Remover capa</span>
                  </button>
                ) : null}
              </div>
              <span className="dica-campo">
                A imagem vira uma faixa de {LADO_CAPA}×{Math.round(LADO_CAPA / PROPORCAO_CAPA)}{" "}
                pixels, recortada pelo centro — o que ficar fora dessa faixa não aparece.
              </span>
              {avisoCapa ? (
                <span className="edit-foto-aviso" role="alert">
                  {avisoCapa}
                </span>
              ) : null}
            </div>
          </div>

          {/* Card 3: Redes Profissionais (Inputs Diretos) */}
          <div className="painel-card">
            <div className="painel-card-header">
              <span className="painel-card-label">REDES PROFISSIONAIS</span>
            </div>

            <div className="campos-redes-grupo">
              <div className="campo-rede-item">
                <label htmlFor="perfil-linkedin" className="label-rede">
                  <IconeLinkedIn tamanho={15} /> LinkedIn
                </label>
                <input
                  id="perfil-linkedin"
                  type="text"
                  className="input-rede"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/usuario"
                />
              </div>

              <div className="campo-rede-item">
                <label htmlFor="perfil-github" className="label-rede">
                  <IconeGitHub tamanho={15} /> GitHub
                </label>
                <input
                  id="perfil-github"
                  type="text"
                  className="input-rede"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  placeholder="ex: usuario ou link github.com/..."
                />
              </div>

              <div className="campo-rede-item">
                <label htmlFor="perfil-instagram" className="label-rede">
                  <IconeInstagram tamanho={15} /> Instagram
                </label>
                <input
                  id="perfil-instagram"
                  type="text"
                  className="input-rede"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@seu_usuario"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Contexto & Estatísticas Institucionais */}
          <div className="painel-card">
            <div className="painel-card-header">
              <span className="painel-card-label">CONTEXTO INSTITUCIONAL</span>
            </div>

            <div className="stats-lista">
              <div className="stat-linha">
                <span className="stat-titulo">Turma Cadastrada</span>
                <span className="stat-valor">{sala}</span>
              </div>
              <div className="stat-linha">
                <span className="stat-titulo">Estrelas Recebidas</span>
                <span className="stat-valor">{alunoAtual?.estrelas ?? 0}</span>
              </div>
              <div className="stat-linha">
                <span className="stat-titulo">Projetos Ativos</span>
                <span className="stat-valor">{projetos.length}</span>
              </div>
              <div className="stat-linha">
                <span className="stat-titulo">Mídias na Galeria</span>
                <span className="stat-valor">{midias.length}</span>
              </div>
              <div className="stat-linha">
                <span className="stat-titulo">Nível de Permissão</span>
                <span className="stat-valor">{ehSuperAdm ? "Super Administrador" : "Estudante"}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* ── COLUNA DIREITA: TABS DE CONFIGURAÇÃO & CONTEÚDO ─────────────── */}
        <main className="perfil-coluna-direita">
          {/* Navegação de Abas do Editor (Estilo Imagem 4) */}
          <div className="perfil-tabs-barra" role="tablist">
            <button
              type="button"
              id="perfil-tab-dados"
              className={`perfil-tab-btn ${abaAtiva === "dados" ? "perfil-tab-ativo" : ""}`}
              onClick={() => setAbaAtiva("dados")}
              onKeyDown={aoSetasDasAbas}
              role="tab"
              aria-selected={abaAtiva === "dados"}
              aria-controls="perfil-painel-dados"
              tabIndex={abaAtiva === "dados" ? 0 : -1}
            >
              <IconeUsuario tamanho={15} />
              <span>Dados & Bio</span>
            </button>

            <button
              type="button"
              id="perfil-tab-projetos"
              className={`perfil-tab-btn ${abaAtiva === "projetos" ? "perfil-tab-ativo" : ""}`}
              onClick={() => setAbaAtiva("projetos")}
              onKeyDown={aoSetasDasAbas}
              role="tab"
              aria-selected={abaAtiva === "projetos"}
              aria-controls="perfil-painel-projetos"
              tabIndex={abaAtiva === "projetos" ? 0 : -1}
            >
              <IconeProjetos tamanho={15} />
              <span>Projetos & Criações</span>
              {projetos.length > 0 ? <span className="tab-contador">{projetos.length}</span> : null}
            </button>

            <button
              type="button"
              id="perfil-tab-estudio"
              className={`perfil-tab-btn ${abaAtiva === "estudio" ? "perfil-tab-ativo" : ""}`}
              onClick={() => setAbaAtiva("estudio")}
              onKeyDown={aoSetasDasAbas}
              role="tab"
              aria-selected={abaAtiva === "estudio"}
              aria-controls="perfil-painel-estudio"
              tabIndex={abaAtiva === "estudio" ? 0 : -1}
            >
              <IconeSparkles tamanho={15} />
              <span>Estúdio Canva & GIFs</span>
              {stickers.length > 0 ? <span className="tab-contador">{stickers.length}</span> : null}
            </button>

            <button
              type="button"
              id="perfil-tab-midias"
              className={`perfil-tab-btn ${abaAtiva === "midias" ? "perfil-tab-ativo" : ""}`}
              onClick={() => setAbaAtiva("midias")}
              onKeyDown={aoSetasDasAbas}
              role="tab"
              aria-selected={abaAtiva === "midias"}
              aria-controls="perfil-painel-midias"
              tabIndex={abaAtiva === "midias" ? 0 : -1}
            >
              <IconeGaleria tamanho={15} />
              <span>Galeria de Imagens</span>
              {midias.length > 0 ? <span className="tab-contador">{midias.length}</span> : null}
            </button>

            <button
              type="button"
              id="perfil-tab-videos"
              className={`perfil-tab-btn ${abaAtiva === "videos" ? "perfil-tab-ativo" : ""}`}
              onClick={() => setAbaAtiva("videos")}
              onKeyDown={aoSetasDasAbas}
              role="tab"
              aria-selected={abaAtiva === "videos"}
              aria-controls="perfil-painel-videos"
              tabIndex={abaAtiva === "videos" ? 0 : -1}
            >
              <IconeVideo tamanho={15} />
              <span>Vídeos</span>
              {videos.length > 0 ? <span className="tab-contador">{videos.length}</span> : null}
            </button>

            <button
              type="button"
              id="perfil-tab-conta"
              className={`perfil-tab-btn ${abaAtiva === "conta" ? "perfil-tab-ativo" : ""}`}
              onClick={() => setAbaAtiva("conta")}
              onKeyDown={aoSetasDasAbas}
              role="tab"
              aria-selected={abaAtiva === "conta"}
              aria-controls="perfil-painel-conta"
              tabIndex={abaAtiva === "conta" ? 0 : -1}
            >
              <IconeEscudo tamanho={15} />
              <span>Segurança & Conta</span>
            </button>
          </div>

          {/* ── ABA 1: DADOS & BIO ─────────────────────────────────────────── */}
          <div
            className="perfil-tab-painel"
            id="perfil-painel-dados"
            role="tabpanel"
            aria-labelledby="perfil-tab-dados"
            style={{ display: abaAtiva === "dados" ? "block" : "none" }}
          >
            <div className="painel-card">
              <header className="painel-card-topo">
                <h3>Dados Cadastrais do Aluno</h3>
                <p>Informações principais exibidas na vitrine e crachá do SESI</p>
              </header>

              <div className="formulario-corpo">
                <div className="form-dupla">
                  <label className="campo-form">
                    <span className="label-texto">Nome Completo *</span>
                    <input
                      type="text"
                      className="input-texto"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                      placeholder="Seu nome oficial"
                    />
                  </label>

                  {/* Sala é somente leitura: quem move aluno de turma é o ADM.
                      Antes era um <select> que salvava de verdade, então o
                      aluno trocava de sala sozinho; agora seria um campo que
                      grava nada e volta no reload — pior que não existir. */}
                  <label className="campo-form">
                    <span className="label-texto">Sala / Turma</span>
                    <input
                      type="text"
                      className="input-texto input-somente-leitura"
                      value={sala}
                      readOnly
                      aria-readonly="true"
                    />
                    <span className="dica-campo">
                      Para mudar de turma, fale com o professor ou com o ADM.
                    </span>
                  </label>
                </div>

                <label className="campo-form">
                  <div className="label-com-contagem">
                    <span className="label-texto">Bio & Apresentação Pessoal</span>
                    <span className="contagem-caracteres">{bio.length} / 280</span>
                  </div>
                  <textarea
                    className="input-textarea"
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={280}
                    placeholder="Descreva seu foco de aprendizado, tecnologias que domina e aspirações no SESI..."
                  />
                </label>

                  {/* Competências: chips da lista fechada, clicáveis. O teto trava
                      em vez de só contar — o aluno descobre o limite aqui, e não
                      depois de salvar. */}
                  <div className="campo-form">
                    <div className="edit-hab-cabecalho">
                      <span className="label-texto">Competências Técnicas</span>
                      <span
                        className={`edit-hab-contador ${
                          noTetoDeHabilidades ? "edit-hab-contador-cheio" : ""
                        }`}
                      >
                        {habilidades.length}/{MAX_HABILIDADES}
                      </span>
                    </div>
                    <div className="edit-hab-chips">
                      {LISTA_HABILIDADES.map((hab) => {
                        const escolhida = habilidades.includes(hab.nome);
                        const bloqueada = !escolhida && noTetoDeHabilidades;
                        return (
                          <button
                            key={hab.nome}
                            type="button"
                            className={`edit-hab-chip ${escolhida ? "edit-hab-chip-ativa" : ""}`}
                            style={{ ["--cor-hab" as string]: corHabilidade(hab.nome) }}
                            onClick={() => alternarHabilidade(hab.nome)}
                            disabled={bloqueada}
                            aria-pressed={escolhida}
                            title={
                              bloqueada
                                ? `Você já escolheu ${MAX_HABILIDADES}. Tire uma para trocar.`
                                : undefined
                            }
                          >
                            <span className="edit-hab-ponto" />
                            {hab.nome}
                          </button>
                        );
                      })}
                    </div>
                    <span className="dica-campo">
                      Escolha até {MAX_HABILIDADES} do que você domina de verdade. O nome tem que
                      ser um destes: é por ele que a turma endossa, e endosso de competência com
                      outro nome não conta.
                    </span>
                  </div>
                </div>
              </div>

            {/* Grade completa, e não a faixa compacta: aqui o ponto é o aluno
                ver o quanto falta em cada insígnia, não só o que já conquistou. */}
            <div className="painel-card">
              <header className="painel-card-topo">
                <h3>Insígnias & Conquistas</h3>
                <p>Elas vêm das estrelas e dos endossos dos colegas — não se escolhe ter.</p>
              </header>
              <Insignias
                placar={{
                  estrelas: alunoAtual?.estrelas ?? 0,
                  habilidades_votos: alunoAtual?.habilidades_votos,
                }}
              />
            </div>
          </div>

          {/* ── ABA 2: PROJETOS & CRIAÇÕES ─────────────────────────────────── */}
          <div
            className="perfil-tab-painel"
            id="perfil-painel-projetos"
            role="tabpanel"
            aria-labelledby="perfil-tab-projetos"
            style={{ display: abaAtiva === "projetos" ? "block" : "none" }}
          >
              <ImportarGithub
                handleInicial={github}
                projetos={projetos}
                onImportar={importarProjetos}
              />

              {/* Projetos Existentes */}
              <div className="painel-card">
                <header className="painel-card-topo">
                  <h3>Criações & Projetos Cadastrados ({projetos.length})</h3>
                  <p>Trabalhos escolares, sistemas e criações desenvolvidas na escola</p>
                </header>

                {projetos.length === 0 ? (
                  <div className="vazio-suave">
                    <p>Nenhum projeto cadastrado ainda. Use o formulário abaixo para adicionar seu primeiro trabalho.</p>
                  </div>
                ) : (
                  <div className="grade-projetos-editor">
                    {projetos.map((proj) => (
                      <div key={proj.id} className="card-projeto-item-editor">
                        {proj.imagem ? (
                          <div className="proj-thumb-wrap">
                            <img src={proj.imagem} alt={proj.titulo} className="proj-thumb-img" />
                          </div>
                        ) : (
                          <div className="proj-thumb-placeholder">
                            <IconeProjetos tamanho={24} />
                          </div>
                        )}
                        <div className="proj-info-wrap">
                          <h4 className="proj-item-titulo">{proj.titulo}</h4>
                          <p className="proj-item-desc">{proj.descricao}</p>
                          {proj.link ? (
                            <a
                              href={proj.link}
                              target="_blank"
                              rel="noreferrer"
                              className="proj-item-link"
                            >
                              <IconeLinkExterno tamanho={13} /> {proj.link}
                            </a>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="btn-deletar-item"
                          onClick={() => removerProjeto(proj.id)}
                          title="Excluir projeto"
                        >
                          <IconeLixeira tamanho={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Adicionar Novo Projeto */}
              <div className="painel-card">
                <header className="painel-card-topo">
                  <h3>+ Cadastrar Nova Criação</h3>
                  <p>Adicione um projeto escolar com foto de capa e link externo</p>
                </header>

                <div className="formulario-corpo">
                  <div className="form-dupla">
                    <label className="campo-form">
                      <span className="label-texto">Título do Projeto *</span>
                      <input
                        type="text"
                        className="input-texto"
                        value={novoProjTitulo}
                        onChange={(e) => setNovoProjTitulo(e.target.value)}
                        placeholder="Ex: Robô Seguidor de Linha FLL"
                      />
                    </label>

                    <label className="campo-form">
                      <span className="label-texto">Link da Criação (GitHub, Vercel, Figma)</span>
                      <input
                        type="url"
                        className="input-texto"
                        value={novoProjLink}
                        onChange={(e) => setNovoProjLink(e.target.value)}
                        placeholder="https://..."
                      />
                    </label>
                  </div>

                  <label className="campo-form">
                    <span className="label-texto">Descrição Resumida</span>
                    <textarea
                      className="input-textarea"
                      rows={2}
                      value={novoProjDesc}
                      onChange={(e) => setNovoProjDesc(e.target.value)}
                      placeholder="Explique o objetivo do projeto, tecnologias utilizadas e resultados..."
                    />
                  </label>

                  <div className="campo-form">
                    <span className="label-texto">Imagem de Capa do Projeto</span>
                    <div className="upload-linha-flex">
                      <input
                        type="text"
                        className="input-texto"
                        value={novoProjImg}
                        onChange={(e) => {
                          setNovoProjImg(e.target.value);
                          setAvisoProjeto(conferirTamanhoDaImagem(e.target.value.trim(), "projetos"));
                        }}
                        placeholder="Cole a URL ou selecione uma imagem do dispositivo"
                      />
                      <label className="botao botao-secundario btn-upload-label">
                        <IconeUpload tamanho={15} />
                        <span>Arquivo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={handleUploadArquivoProjeto}
                        />
                      </label>
                    </div>
                    {enviando === "projeto" ? (
                      <span
                        role="status"
                        style={{ color: "var(--dim)", fontSize: "0.82rem", fontWeight: 700 }}
                      >
                        Enviando a imagem…
                      </span>
                    ) : null}
                    {novoProjImg ? (
                      <div className="preview-mini-wrap">
                        <img src={novoProjImg} alt="Pré-visualização" className="preview-mini-img" />
                        <button
                          type="button"
                          className="btn-limpar-preview"
                          onClick={() => setNovoProjImg("")}
                        >
                          ✕ Remover imagem
                        </button>
                      </div>
                    ) : null}
                    {avisoProjeto ? (
                      <span
                        role="alert"
                        style={{ color: "var(--vermelho)", fontSize: "0.82rem", fontWeight: 700 }}
                      >
                        ⚠ {avisoProjeto}
                      </span>
                    ) : null}
                  </div>

                  <div className="form-acoes-fim">
                    <button
                      type="button"
                      className="botao botao-primario"
                      onClick={adicionarProjeto}
                      disabled={!novoProjTitulo.trim()}
                    >
                      <IconePlus tamanho={15} /> Adicionar Projeto à Lista
                    </button>
                  </div>
                </div>
              </div>
            </div>

          {/* ── ABA ESTÚDIO VISUAL (CANVA) ────────────────────────── */}
          <div
            className="perfil-tab-painel"
            id="perfil-painel-estudio"
            role="tabpanel"
            aria-labelledby="perfil-tab-estudio"
            style={{ display: abaAtiva === "estudio" ? "block" : "none" }}
          >
            <StickerCanvas
              nomeAluno={nome}
              fotoAluno={foto}
              salaAluno={sala}
              projetos={projetos}
              stickers={stickers}
              onChangeStickers={setStickers}
            />
          </div>

          {/* ── ABA 3: GALERIA DE MÍDIAS (Sem bugs de layout da Imagem 3) ──── */}
          <div
            className="perfil-tab-painel"
            id="perfil-painel-midias"
            role="tabpanel"
            aria-labelledby="perfil-tab-midias"
            style={{ display: abaAtiva === "midias" ? "block" : "none" }}
          >
              <div className="painel-card">
                <header className="painel-card-topo">
                  <h3>Galeria de Fotos & Demonstrações ({midias.length})</h3>
                  <p>Mídias que comprovam suas habilidades práticas em bancada e código</p>
                </header>

                {midias.length === 0 ? (
                  <div className="vazio-suave">
                    <p>Nenhuma imagem cadastrada na sua galeria. Adicione fotos de workshops, placas ou certificações.</p>
                  </div>
                ) : (
                  <div className="galeria-grid-organizada">
                    {midias.map((mid, idx) => (
                      <div key={idx} className="galeria-card-organizado">
                        <div className="galeria-card-img-wrap">
                          <img src={mid.url} alt={mid.legenda ?? "Mídia"} className="galeria-card-img" />
                          <button
                            type="button"
                            className="btn-deletar-midia-overlay"
                            onClick={() => removerMidia(idx)}
                            title="Remover mídia"
                          >
                            <IconeLixeira tamanho={14} />
                          </button>
                        </div>
                        {mid.legenda ? (
                          <div className="galeria-card-legenda">
                            <span>{mid.legenda}</span>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload de Nova Mídia */}
              <div className="painel-card">
                <header className="painel-card-topo">
                  <h3>+ Adicionar Foto ou GIF à Galeria</h3>
                  <p>Selecione um arquivo local (comprimido automaticamente) ou informe uma URL</p>
                </header>

                <div className="formulario-corpo">
                  <div className="campo-form">
                    <span className="label-texto">Origem da Imagem</span>
                    <div className="upload-linha-flex">
                      <input
                        type="text"
                        className="input-texto"
                        value={novaMidiaUrl}
                        onChange={(e) => {
                          setNovaMidiaUrl(e.target.value);
                          setAvisoMidia(conferirTamanhoDaImagem(e.target.value.trim(), "midias"));
                        }}
                        placeholder="Cole o link direto da imagem ou GIF..."
                      />
                      <label className="botao botao-secundario btn-upload-label">
                        <IconeUpload tamanho={15} />
                        <span>Arquivo Local</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={handleUploadArquivoMidia}
                        />
                      </label>
                    </div>
                  </div>

                  <label className="campo-form">
                    <span className="label-texto">Legenda Educacional da Foto</span>
                    <input
                      type="text"
                      className="input-texto"
                      value={novaMidiaLegenda}
                      onChange={(e) => setNovaMidiaLegenda(e.target.value)}
                      placeholder="Ex: Bancada de teste com microcontrolador ESP32"
                    />
                  </label>

                  {enviando === "midia" ? (
                    <span
                      role="status"
                      style={{ color: "var(--dim)", fontSize: "0.82rem", fontWeight: 700 }}
                    >
                      Enviando a imagem…
                    </span>
                  ) : null}

                  {novaMidiaUrl ? (
                    <div className="preview-galeria-novo">
                      <img src={novaMidiaUrl} alt="Preview" className="preview-galeria-img" />
                      <button
                        type="button"
                        className="btn-limpar-preview"
                        onClick={() => setNovaMidiaUrl("")}
                      >
                        ✕ Cancelar
                      </button>
                    </div>
                  ) : null}

                  {avisoMidia ? (
                    <span
                      role="alert"
                      style={{ color: "var(--vermelho)", fontSize: "0.82rem", fontWeight: 700 }}
                    >
                      ⚠ {avisoMidia}
                    </span>
                  ) : null}

                  <div className="form-acoes-fim">
                    <button
                      type="button"
                      className="botao botao-primario"
                      onClick={adicionarMidia}
                      disabled={!novaMidiaUrl.trim()}
                    >
                      <IconePlus tamanho={15} /> Incluir na Galeria
                    </button>
                  </div>
                </div>
              </div>
            </div>

          {/* ── ABA: VÍDEOS (YouTube e Vimeo) ──────────────────────────────── */}
          <div
            className="perfil-tab-painel"
            id="perfil-painel-videos"
            role="tabpanel"
            aria-labelledby="perfil-tab-videos"
            style={{ display: abaAtiva === "videos" ? "block" : "none" }}
          >
              <div className="painel-card">
                <header className="painel-card-topo">
                  <h3>Vídeos do Perfil ({videos.length})</h3>
                  <p>Demonstrações em vídeo publicadas no YouTube ou no Vimeo</p>
                </header>

                {videos.length === 0 ? (
                  <div className="vazio-suave">
                    <p>Nenhum vídeo no perfil ainda. Cole abaixo o link de um vídeo do YouTube ou do Vimeo.</p>
                  </div>
                ) : (
                  <div className="edit-video-lista">
                    {videos.map((v) => (
                      <div key={`${v.tipo}-${v.id}`} className="edit-video-item">
                        <VideoEmbed video={v} />
                        <div className="edit-video-controles">
                          <input
                            type="text"
                            className="input-texto"
                            value={v.titulo ?? ""}
                            onChange={(e) => definirTituloVideo(v, e.target.value)}
                            placeholder="Título do vídeo (opcional)"
                            aria-label="Título do vídeo"
                          />
                          <button
                            type="button"
                            className="edit-video-remover"
                            onClick={() => removerVideo(v)}
                            title="Remover vídeo"
                          >
                            <IconeLixeira tamanho={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Adicionar Novo Vídeo */}
              <div className="painel-card">
                <header className="painel-card-topo">
                  <h3>+ Adicionar Vídeo</h3>
                  <p>Até {MAX_VIDEOS} vídeos por perfil, sempre por link do YouTube ou do Vimeo</p>
                </header>

                <div className="formulario-corpo">
                  <div className="campo-form">
                    <span className="label-texto">Link do Vídeo</span>
                    <div className="edit-video-linha">
                      <input
                        type="text"
                        className="input-texto"
                        value={novoVideoLink}
                        onChange={(e) => setNovoVideoLink(e.target.value)}
                        placeholder="Ex: https://www.youtube.com/watch?v=..."
                      />
                      <button
                        type="button"
                        className="botao botao-primario"
                        onClick={adicionarVideo}
                        disabled={!novoVideoLink.trim()}
                      >
                        <IconePlus tamanho={15} /> Adicionar
                      </button>
                    </div>
                  </div>

                  {avisoVideo ? (
                    <span
                      role="alert"
                      style={{ color: "var(--vermelho)", fontSize: "0.82rem", fontWeight: 700 }}
                    >
                      ⚠ {avisoVideo}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

          {/* ── ABA 4: CONTA & SEGURANÇA ────────────────────────────────────── */}
          <div
            className="perfil-tab-painel"
            id="perfil-painel-conta"
            role="tabpanel"
            aria-labelledby="perfil-tab-conta"
            style={{ display: abaAtiva === "conta" ? "block" : "none" }}
          >
            {/* Card 1: Identidade, Nome Visual e E-mail */}
            <div className="painel-card">
              <header className="painel-card-topo">
                <h3>Nome Visual & E-mail Cadastrado</h3>
                <p>Configure sua identificação visível para a turma e seu e-mail institucional</p>
              </header>

              <div className="formulario-corpo">
                <div className="form-dupla">
                  <label className="campo-form">
                    <span className="label-texto">Nome Visual de Exibição *</span>
                    <input
                      type="text"
                      className="input-texto"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: Theo Padilha"
                      required
                    />
                    <span className="campo-dica">
                      Nome que aparece em destaque na vitrine, no crachá e nas listagens escolares.
                    </span>
                  </label>

                  <label className="campo-form">
                    <span className="label-texto">E-mail da escola</span>
                    <div className="campo-email">
                      <input
                        type="text"
                        className="input-texto"
                        value={emailLocal}
                        onChange={(e) => setEmailLocal(e.target.value)}
                        placeholder="theo_padilha"
                        autoComplete="off"
                        spellCheck={false}
                        inputMode="email"
                      />
                      <span className="campo-email-sufixo">@{DOMINIO_EMAIL_ESCOLA}</span>
                    </div>
                    <span className="campo-dica">
                      Só o e-mail da escola — é ele que mostra que este perfil é de um
                      estudante matriculado. Deixe vazio para não exibir.
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Card 2: Alteração de Senha Segura */}
            <div className="painel-card">
              <header className="painel-card-topo">
                <h3>Alterar Senha de Acesso</h3>
                <p>Confirme a senha atual e defina uma nova com pelo menos 8 caracteres</p>
              </header>

              <div className="formulario-corpo">
                <label className="campo-form">
                  <span className="label-texto">Senha Atual</span>
                  <input
                    type="password"
                    name="senhaAtual"
                    className="input-texto"
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    placeholder="Sua senha de hoje, para confirmar que é você"
                    autoComplete="current-password"
                  />
                </label>

                <div className="form-dupla">
                  <label className="campo-form">
                    <span className="label-texto">Nova Senha</span>
                    <input
                      type="password"
                      name="novaSenha"
                      className="input-texto"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Mínimo 8 caracteres (opcional)"
                      autoComplete="new-password"
                    />
                  </label>

                  <label className="campo-form">
                    <span className="label-texto">Confirmar Nova Senha</span>
                    <input
                      type="password"
                      name="confirmarSenha"
                      className="input-texto"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      placeholder="Repita a nova senha digitada"
                      autoComplete="new-password"
                    />
                  </label>
                </div>
                {novaSenha && novaSenha !== confirmarSenha ? (
                  <span className="aviso-senha-invalida" style={{ color: "var(--vermelho)", fontSize: "0.82rem", fontWeight: 700 }}>
                    ⚠ A confirmação de senha não coincide com a nova senha digitada.
                  </span>
                ) : null}
                {novaSenha && novaSenha.length < 8 ? (
                  <span className="aviso-senha-invalida" style={{ color: "var(--vermelho)", fontSize: "0.82rem", fontWeight: 700 }}>
                    ⚠ A nova senha precisa ter pelo menos 8 caracteres.
                  </span>
                ) : null}
                {novaSenha && !senhaAtual ? (
                  <span className="aviso-senha-invalida" style={{ color: "var(--amarelo)", fontSize: "0.82rem", fontWeight: 700 }}>
                    ⚠ Informe a senha atual para confirmar a troca.
                  </span>
                ) : null}

                {estadoSeguranca.mensagem ? (
                  <span
                    className="aviso-senha-invalida"
                    style={{
                      color: estadoSeguranca.ok ? "var(--verde)" : "var(--vermelho)",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                    }}
                  >
                    {estadoSeguranca.ok ? "✓" : "⚠"} {estadoSeguranca.mensagem}
                  </span>
                ) : null}

                <button
                  type="submit"
                  className="botao botao-primario"
                  formAction={acaoSeguranca}
                  disabled={alterandoSenha || !novaSenha}
                >
                  <IconeEscudo tamanho={16} />
                  <span>{alterandoSenha ? "Alterando senha..." : "Alterar Senha"}</span>
                </button>
              </div>
            </div>

            {/* Card 3: Credenciais e Nível de Acesso */}
            <div className="painel-card">
              <header className="painel-card-topo">
                <h3>Credenciais de Autenticação</h3>
                <p>Informações técnicas e proteção criptográfica da sua conta</p>
              </header>

              <div className="formulario-corpo">
                <div className="info-bloco-seguranca">
                  <div className="seguranca-item">
                    <span className="seguranca-rotulo">Nome de Usuário (Login)</span>
                    <span className="seguranca-dado">@{usuario.username}</span>
                  </div>
                  <div className="seguranca-item">
                    <span className="seguranca-rotulo">Privilégio da Conta</span>
                    <span className="seguranca-dado">
                      {ehSuperAdm ? "Super Administrador (Acesso Total)" : "Estudante SESI"}
                    </span>
                  </div>
                  <div className="seguranca-item">
                    <span className="seguranca-rotulo">E-mail da escola</span>
                    <span className="seguranca-dado">{email || "— não informado"}</span>
                  </div>
                  <div className="seguranca-item">
                    <span className="seguranca-rotulo">ID do Registro</span>
                    <span className="seguranca-dado" style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                      {usuario.id}
                    </span>
                  </div>
                </div>

                <div className="aviso-seguranca-box">
                  <IconeEscudo tamanho={20} />
                  <p>
                    Sua conta possui acesso protegido por hash criptográfico Argon2id e sessão com
                    cookie HttpOnly de integridade estrita.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── BARRA FIXA DE SALVAMENTO ──────────────────────────────────── */}
          <div className="perfil-barra-salvar">
            <span className="salvar-dica">
              As alterações salvas são refletidas instantaneamente na vitrine da turma e no crachá digital.
            </span>
            <button
              type="submit"
              className="botao botao-primario btn-salvar-perfil-grande"
              disabled={salvando}
            >
              <IconeCheck tamanho={16} />
              <span>{salvando ? "Salvando Alterações..." : "Salvar Todas as Alterações"}</span>
            </button>
          </div>
        </main>
      </form>

      {/* Crachá Modal */}
      {crachaAberto && alunoAtual ? (
        <CrachaModal aluno={alunoAtual} onClose={() => setCrachaAberto(false)} />
      ) : null}

      {/* Mini-Currículo A4 Modal */}
      {curriculoAberto && alunoAtual ? (
        <CurriculoImpressao aluno={alunoAtual} onFechar={() => setCurriculoAberto(false)} />
      ) : null}
    </div>
  );
}
