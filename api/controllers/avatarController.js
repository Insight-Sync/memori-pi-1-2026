import Usuarios from "../models/Usuarios.js";

const AVATARES = new Set([
  "amarelo",
  "azul",
  "vermelho",
]);

const atualizarAvatar = async (req, res) => {
  try {
    const id = req.loggedUser?.id;

    if (!id || !/^[a-f0-9]{24}$/i.test(String(id))) {
      return res.status(401).json({
        error: "Sessão inválida. Entre novamente.",
      });
    }

    const avatar = req.body?.avatar;

    if (typeof avatar !== "string" || !AVATARES.has(avatar)) {
      return res.status(400).json({
        error: "Escolha um avatar válido.",
      });
    }

    const usuario = await Usuarios.findByIdAndUpdate(
      id,
      { $set: { avatar } },
      { new: true, runValidators: true },
    );

    if (!usuario) {
      return res.status(404).json({
        error: "Usuário não encontrado.",
      });
    }

    return res.status(200).json({ usuario });
  } catch (error) {
    console.error("Falha ao salvar avatar:", error.message);

    return res.status(500).json({
      error: "Não foi possível salvar o avatar.",
    });
  }
};

export default { atualizarAvatar };