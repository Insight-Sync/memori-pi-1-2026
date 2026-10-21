import express from "express";
import usuarioController from "../controllers/usuarioController.js";
import avatarController from "../controllers/avatarController.js";
import auth from "../middleware/auth.js";

const usuarioRoutes = express.Router();

// Rotas públicas.
usuarioRoutes.post("/auth", usuarioController.loginUsuario);
usuarioRoutes.post("/", usuarioController.createUsuario);

// Avatar do próprio usuário autenticado.
usuarioRoutes.patch(
  "/me/avatar",
  auth.Authorization,
  avatarController.atualizarAvatar,
);

// Rotas protegidas existentes.
usuarioRoutes.get(
  "/",
  auth.Authorization,
  usuarioController.getAllUsuarios,
);

usuarioRoutes.delete(
  "/:id",
  auth.Authorization,
  usuarioController.deleteUsuario,
);

usuarioRoutes.put(
  "/:id",
  auth.Authorization,
  usuarioController.updateUsuario,
);

usuarioRoutes.get(
  "/:id",
  auth.Authorization,
  usuarioController.getOneUsuario,
);

export default usuarioRoutes;