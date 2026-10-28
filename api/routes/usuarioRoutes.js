import express from "express";
import usuarioController from "../controllers/usuarioController.js";
import auth from "../middleware/auth.js";

const usuarioRoutes = express.Router();

usuarioRoutes.post(
  "/auth",
  usuarioController.loginUsuario,
);

usuarioRoutes.post(
  "/",
  usuarioController.createUsuario,
);

usuarioRoutes.patch(
  "/me/avatar",
  auth.Authorization,
  usuarioController.atualizarAvatar,
);

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