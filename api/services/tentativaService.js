import Tentativa from "../models/Tentativas.js";
import Usuario from "../models/Usuarios.js";

class TentativaService {
  async salvar(usuarioId, desafioId, tentativaId, tempoSegundos) {
    await Tentativa.init();

    try {
      const tentativa = await Tentativa.create({
        usuario: usuarioId,
        desafioId,
        tentativaId,
        tempoSegundos,
      });

      return {
        tentativa,
        criada: true,
        conflito: false,
      };
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }

      const tentativa = await Tentativa.findOne({
        usuario: usuarioId,
        tentativaId,
      });

      if (!tentativa) {
        throw error;
      }

      const conflito =
        tentativa.desafioId !== desafioId ||
        tentativa.tempoSegundos !== tempoSegundos;

      return {
        tentativa,
        criada: false,
        conflito,
      };
    }
  }

  async listarMinhas(usuarioId, desafioId) {
    return Tentativa.find({
      usuario: usuarioId,
      desafioId,
    })
      .sort({ createdAt: -1, _id: -1 })
      .lean();
  }

  async buscarRanking(desafioId) {
    const resultados = await Tentativa.aggregate([
      {
        $match: { desafioId },
      },
      {
        $sort: {
          tempoSegundos: 1,
          createdAt: 1,
          _id: 1,
        },
      },
      {
        $group: {
          _id: "$usuario",
          tempoSegundos: { $first: "$tempoSegundos" },
          concluidoEm: { $first: "$createdAt" },
          resultadoId: { $first: "$_id" },
        },
      },
      {
        $sort: {
          tempoSegundos: 1,
          concluidoEm: 1,
          resultadoId: 1,
        },
      },
      {
        $lookup: {
          from: Usuario.collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "pessoa",
        },
      },
      {
        $unwind: "$pessoa",
      },
      {
        $project: {
          _id: 0,
          usuarioId: { $toString: "$_id" },
          nome: "$pessoa.nome",
          nomeUsuario: "$pessoa.nomeUsuario",
          avatar: {
            $ifNull: ["$pessoa.avatar", "amarelo"],
          },
          tempoSegundos: 1,
          concluidoEm: 1,
        },
      },
    ]);

    return resultados.map((resultado, index) => ({
      ...resultado,
      posicao: index + 1,
    }));
  }
}

export default new TentativaService();