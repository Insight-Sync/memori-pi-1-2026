import mongoose from "mongoose";
import tentativaService from "../services/tentativaService.js";
import Usuario from "../models/Usuarios.js";

const DESAFIO_ATUAL = "kkkk-puzzle";

const uuidValido =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function apresentarTentativa(tentativa) {
  return {
    id: tentativa._id.toString(),
    usuarioId: tentativa.usuario.toString(),
    desafioId: tentativa.desafioId,
    tentativaId: tentativa.tentativaId,
    tempoSegundos: tentativa.tempoSegundos,
    concluidoEm: tentativa.createdAt,
  };
}

// Confere se a conta do token ainda existe.
const verificarUsuario = async (req, res, next) => {
  try {
    const usuarioId = req.loggedUser?.id;

    if (!mongoose.isObjectIdOrHexString(usuarioId)) {
      return res.status(401).json({
        error: "Sessão inválida. Entre novamente.",
      });
    }

    const existe = await Usuario.exists({ _id: usuarioId });

    if (!existe) {
      return res.status(401).json({
        error: "Usuário não encontrado. Entre novamente.",
      });
    }

    next();
  } catch (error) {
    console.error("Falha ao verificar usuário:", error.message);

    return res.status(500).json({
      error: "Não foi possível verificar a sessão.",
    });
  }
};

const salvarResultado = async (req, res) => {
  try {
    const {
      desafioId,
      tentativaId,
      tempoSegundos,
    } = req.body ?? {};

    if (desafioId !== DESAFIO_ATUAL) {
      return res.status(400).json({
        error: "Desafio inválido.",
      });
    }

    if (
      typeof tentativaId !== "string" ||
      !uuidValido.test(tentativaId)
    ) {
      return res.status(400).json({
        error: "Identificador da tentativa inválido.",
      });
    }

    if (
      !Number.isSafeInteger(tempoSegundos) ||
      tempoSegundos < 1
    ) {
      return res.status(400).json({
        error: "O tempo deve ser um número inteiro positivo de segundos.",
      });
    }

    const resultado = await tentativaService.salvar(
      req.loggedUser.id,
      desafioId,
      tentativaId.toLowerCase(),
      tempoSegundos,
    );

    if (resultado.conflito) {
      return res.status(409).json({
        error: "Esta tentativa já foi salva com outro resultado.",
      });
    }

    return res.status(resultado.criada ? 201 : 200).json({
      message: resultado.criada
        ? "Tempo salvo com sucesso."
        : "Esta tentativa já estava salva.",
      tentativa: apresentarTentativa(resultado.tentativa),
    });
  } catch (error) {
    console.error("Falha ao salvar resultado:", error.message);

    return res.status(500).json({
      error: "Não foi possível salvar o resultado.",
    });
  }
};

const getRankingTempos = async (req, res) => {
  try {
    const desafioId = req.query.desafioId ?? DESAFIO_ATUAL;

    if (desafioId !== DESAFIO_ATUAL) {
      return res.status(400).json({
        error: "Desafio inválido.",
      });
    }

    const rankings = await tentativaService.buscarRanking(desafioId);

    const meuResultado =
      rankings.find(
        (resultado) => resultado.usuarioId === req.loggedUser.id,
      ) ?? null;

    return res.status(200).json({
      desafioId,
      rankings,
      meuResultado,
    });
  } catch (error) {
    console.error("Falha ao consultar ranking:", error.message);

    return res.status(500).json({
      error: "Não foi possível carregar o ranking.",
    });
  }
};

const getMinhasTentativas = async (req, res) => {
  try {
    const desafioId = req.query.desafioId ?? DESAFIO_ATUAL;

    if (desafioId !== DESAFIO_ATUAL) {
      return res.status(400).json({
        error: "Desafio inválido.",
      });
    }

    const tentativas = await tentativaService.listarMinhas(
      req.loggedUser.id,
      desafioId,
    );

    return res.status(200).json({
      tentativas: tentativas.map(apresentarTentativa),
    });
  } catch (error) {
    console.error("Falha ao consultar tentativas:", error.message);

    return res.status(500).json({
      error: "Não foi possível carregar suas tentativas.",
    });
  }
};

export default {
  verificarUsuario,
  salvarResultado,
  getRankingTempos,
  getMinhasTentativas,
};