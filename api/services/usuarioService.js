import Usuario from "../models/Usuarios.js";
import bcrypt from "bcryptjs";
import { timingSafeEqual } from "node:crypto";

class UsuarioService {
  async getAll() {
    return Usuario.find();
  }

  async Create(nome, nomeUsuario, emailUsuario, senhaUsuario, permissao) {
    const senhaHash = await bcrypt.hash(senhaUsuario, 12);

    return Usuario.create({
      nome,
      nomeUsuario,
      emailUsuario,
      senhaUsuario: senhaHash,
      permissao,
      avatar: "amarelo",
    });
  }

  async Delete(id) {
    return Usuario.findByIdAndDelete(id);
  }

  async Update(id, nome, nomeUsuario, emailUsuario, senhaUsuario, permissao) {
    const dados = {};

    if (nome !== undefined) dados.nome = nome;
    if (nomeUsuario !== undefined) dados.nomeUsuario = nomeUsuario;
    if (emailUsuario !== undefined) dados.emailUsuario = emailUsuario;
    if (permissao !== undefined) dados.permissao = permissao;

    if (senhaUsuario !== undefined && senhaUsuario !== "") {
      if (typeof senhaUsuario !== "string") {
        throw new Error("Senha inválida.");
      }

      dados.senhaUsuario = await bcrypt.hash(senhaUsuario, 12);
    }

    return Usuario.findByIdAndUpdate(
      id,
      { $set: dados },
      { new: true, runValidators: true },
    );
  }

  async atualizarAvatar(id, avatar) {
    return Usuario.findByIdAndUpdate(
      id,
      { $set: { avatar } },
      { new: true, runValidators: true },
    );
  }

  async getOne(id) {
    return Usuario.findById(id);
  }

  async getByEmail(emailUsuario) {
    return Usuario.findOne({ emailUsuario }).select("+senhaUsuario");
  }

  async getByNomeUsuario(nomeUsuario) {
    return Usuario.findOne({ nomeUsuario });
  }

  async validarSenha(usuario, senhaInformada) {
    const senhaSalva = usuario.senhaUsuario;

    if (typeof senhaSalva !== "string") {
      return false;
    }

    if (/^\$2[aby]\$/.test(senhaSalva)) {
      return bcrypt.compare(senhaInformada, senhaSalva);
    }

    const informada = Buffer.from(senhaInformada);
    const salva = Buffer.from(senhaSalva);

    const confere =
      informada.length === salva.length &&
      timingSafeEqual(informada, salva);

    if (!confere) {
      return false;
    }

    usuario.senhaUsuario = await bcrypt.hash(senhaInformada, 12);
    await usuario.save();

    return true;
  }
}

export default new UsuarioService();