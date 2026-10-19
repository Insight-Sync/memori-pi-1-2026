import usuarioService from "../services/usuarioService.js";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import jwtSecret from "../config/auth.js";

const getAllUsuarios = async (req, res) => {
  try {
    const usuarios = await usuarioService.getAll();
    res.status(200).json({ usuarios: usuarios });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

const createUsuario = async (req, res) => {
  try {
    const { nome, nomeUsuario, emailUsuario, senhaUsuario } = req.body;

    const campos = [nome, nomeUsuario, emailUsuario, senhaUsuario];

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
      usuario: {
        id: usuario._id,
        nome: usuario.nome,
        nomeUsuario: usuario.nomeUsuario,
        emailUsuario: usuario.emailUsuario,
      },
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
    if (ObjectId.isValid(req.params.id)) { 
      const id = req.params.id;
      await usuarioService.Delete(id);
      res.sendStatus(204);
    } else {
      res.status(400).json({ error: "A ID enviada é invalida" });
    } 
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

const updateUsuario = async (req, res) => {
  try {
    const id = req.params.id;
    if (ObjectId.isValid(req.params.id)) {
      const { nome, nomeUsuario, emailUsuario, senhaUsuario, permissao} = req.body;
      const usuario = await usuarioService.Update(
        id,
        nome,
        nomeUsuario,
        emailUsuario,
        senhaUsuario,
        permissao,
      );
      res.status(200).json({ usuario });
    } else {
      res.sendStatus(400);
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

const loginUsuario = async (req, res) => {
  try {
    const { emailUsuario, senhaUsuario } = req.body;

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
      { expiresIn: "48h" },
    );

    return res.status(200).json({
      token,
      usuario: {
        id: usuario._id,
        nome: usuario.nome,
        nomeUsuario: usuario.nomeUsuario,
        emailUsuario: usuario.emailUsuario,
        permissao: usuario.permissao,
      },
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
      if (ObjectId.isValid(req.params.id)) {
        const id = req.params.id;
        const usuario = await usuarioService.getOne(id);
        if (!usuario) {
          res.status(404).json({ error: "Usuário não encontrado." });
        } else {
          res.status(200).json({ usuario });
        } 
      } else {
        res.status(400).json({ error: "A ID enviada é invalida" });
      }
  } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  };

export default {getAllUsuarios, createUsuario, deleteUsuario, updateUsuario, getOneUsuario, loginUsuario};
