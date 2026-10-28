import usuarioService from "../services/usuarioService.js";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import jwtSecret from "../config/auth.js";

const avataresPermitidos = new Set([
  "amarelo",
  "azul",
  "vermelho",
]);

const dadosPublicosUsuario = (usuario) => ({
  id: String(usuario._id),
  nome: usuario.nome,
  nomeUsuario: usuario.nomeUsuario,
  emailUsuario: usuario.emailUsuario,
  permissao: usuario.permissao,
  avatar: usuario.avatar ?? "amarelo",
});

const getAllUsuarios = async (req, res) => {
  try {
    const usuarios = await usuarioService.getAll();

    return res.status(200).json({ usuarios });
  } catch (error) {
    console.error("Falha ao listar usuários:", error.message);

    return res.status(500).json({
      error: "Erro interno do servidor.",
    });
  }
};

const createUsuario = async (req, res) => {
  try {
    const {
      nome,
      nomeUsuario,
      emailUsuario,
      senhaUsuario,
    } = req.body;

    const campos = [
      nome,
      nomeUsuario,
      emailUsuario,
      senhaUsuario,
    ];

    if (
      campos.some(
        (campo) => typeof campo !== "string" || !campo.trim(),
      )
    ) {
      return res.status(400).json({
        error: "Preencha nome, usuário, e-mail e senha.",
      });
    }

    const nomeLimpo = nome.trim();
    const usuarioLimpo = nomeUsuario.trim();
    const emailLimpo = emailUsuario.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
      return res.status(400).json({
        error: "Informe um e-mail válido.",
      });
    }

    if (senhaUsuario.length < 8) {
      return res.status(400).json({
        error: "A senha deve ter pelo menos 8 caracteres.",
      });
    }

    if (Buffer.byteLength(senhaUsuario, "utf8") > 72) {
      return res.status(400).json({
        error: "A senha excede o tamanho permitido.",
      });
    }

    if (await usuarioService.getByEmail(emailLimpo)) {
      return res.status(409).json({
        error: "Este e-mail já está cadastrado.",
      });
    }

    if (await usuarioService.getByNomeUsuario(usuarioLimpo)) {
      return res.status(409).json({
        error: "Este nome de usuário já está em uso.",
      });
    }

    const usuario = await usuarioService.Create(
      nomeLimpo,
      usuarioLimpo,
      emailLimpo,
      senhaUsuario,
      false,
    );

    return res.status(201).json({
      message: "Conta criada com sucesso.",
      usuario: dadosPublicosUsuario(usuario),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: "E-mail ou nome de usuário já cadastrado.",
      });
    }

    console.error("Falha ao cadastrar usuário:", error.message);

    return res.status(500).json({
      error: "Erro interno do servidor.",
    });
  }
};

const deleteUsuario = async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        error: "A ID enviada é inválida.",
      });
    }

    await usuarioService.Delete(id);

    return res.sendStatus(204);
  } catch (error) {
    console.error("Falha ao excluir usuário:", error.message);

    return res.status(500).json({
      error: "Erro interno do servidor.",
    });
  }
};

const updateUsuario = async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        error: "A ID enviada é inválida.",
      });
    }

    const {
      nome,
      nomeUsuario,
      emailUsuario,
      senhaUsuario,
      permissao,
    } = req.body;

    const usuario = await usuarioService.Update(
      id,
      nome,
      nomeUsuario,
      emailUsuario,
      senhaUsuario,
      permissao,
    );

    if (!usuario) {
      return res.status(404).json({
        error: "Usuário não encontrado.",
      });
    }

    return res.status(200).json({ usuario });
  } catch (error) {
    console.error("Falha ao atualizar usuário:", error.message);

    return res.status(500).json({
      error: "Erro interno do servidor.",
    });
  }
};

const loginUsuario = async (req, res) => {
  try {
    const {
      emailUsuario,
      senhaUsuario,
    } = req.body;

    if (
      typeof emailUsuario !== "string" ||
      !emailUsuario.trim() ||
      typeof senhaUsuario !== "string" ||
      !senhaUsuario
    ) {
      return res.status(400).json({
        error: "Informe o e-mail e a senha.",
      });
    }

    const usuario = await usuarioService.getByEmail(
      emailUsuario.trim().toLowerCase(),
    );

    if (
      !usuario ||
      !(await usuarioService.validarSenha(usuario, senhaUsuario))
    ) {
      return res.status(401).json({
        error: "E-mail ou senha inválidos.",
      });
    }

    const token = jwt.sign(
      {
        id: usuario._id,
        email: usuario.emailUsuario,
      },
      jwtSecret,
      {
        expiresIn: "48h",
      },
    );

    return res.status(200).json({
      token,
      usuario: dadosPublicosUsuario(usuario),
    });
  } catch (error) {
    console.error("Falha ao realizar login:", error.message);

    return res.status(500).json({
      error: "Erro interno do servidor.",
    });
  }
};

const getOneUsuario = async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        error: "A ID enviada é inválida.",
      });
    }

    const usuario = await usuarioService.getOne(id);

    if (!usuario) {
      return res.status(404).json({
        error: "Usuário não encontrado.",
      });
    }

    return res.status(200).json({ usuario });
  } catch (error) {
    console.error("Falha ao buscar usuário:", error.message);

    return res.status(500).json({
      error: "Erro interno do servidor.",
    });
  }
};

const atualizarAvatar = async (req, res) => {
  try {
    const id = req.loggedUser?.id;

    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      return res.status(401).json({
        error: "Usuário autenticado inválido.",
      });
    }

    const avatar = req.body?.avatar;

    if (
      typeof avatar !== "string" ||
      !avataresPermitidos.has(avatar)
    ) {
      return res.status(400).json({
        error: "Escolha um avatar válido: amarelo, azul ou vermelho.",
      });
    }

    const usuario = await usuarioService.atualizarAvatar(
      id,
      avatar,
    );

    if (!usuario) {
      return res.status(404).json({
        error: "Usuário não encontrado.",
      });
    }

    return res.status(200).json({
      usuario: dadosPublicosUsuario(usuario),
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        error: "O avatar informado é inválido.",
      });
    }

    console.error("Falha ao atualizar avatar:", error.message);

    return res.status(500).json({
      error: "Erro interno do servidor.",
    });
  }
};

export default {
  getAllUsuarios,
  createUsuario,
  deleteUsuario,
  updateUsuario,
  getOneUsuario,
  loginUsuario,
  atualizarAvatar,
};