import mongoose from "mongoose";

const tentativaSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuarios",
      required: true,
    },
    desafioId: {
      type: String,
      required: true,
      enum: ["kkkk-puzzle"],
    },
    tentativaId: {
      type: String,
      required: true,
    },
    tempoSegundos: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: "O tempo deve ser um número inteiro de segundos.",
      },
    },
  },
  {
    timestamps: true,
  },
);

// Impede que o reenvio da mesma tentativa crie outro registro.
tentativaSchema.index(
  { usuario: 1, tentativaId: 1 },
  { unique: true },
);

tentativaSchema.index({
  desafioId: 1,
  tempoSegundos: 1,
  createdAt: 1,
});

const Tentativa = mongoose.model("Tentativa", tentativaSchema);

export default Tentativa;