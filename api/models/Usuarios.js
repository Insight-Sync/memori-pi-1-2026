import mongoose from "mongoose";

const usuariosSchema = new mongoose.Schema({
  nome: String,
  nomeUsuario: String,
  emailUsuario: String,
  senhaUsuario: {
    type: String,
    select: false,
  },
  permissao: {
    type: Boolean,
    required: true,
    default: false,
  },
  avatar: {
    type: String,
    enum: ["amarelo", "azul", "vermelho"],
    default: "amarelo",
  },
});

usuariosSchema.set("toJSON", {
  transform(_documento, resultado) {
    delete resultado.senhaUsuario;
    return resultado;
  },
});

const Usuarios = mongoose.model("Usuarios", usuariosSchema);

export default Usuarios;