import express from "express";
import rankingController from "../controllers/rankingController.js";
import tentativaController from "../controllers/tentativaController.js";
import auth from "../middleware/auth.js";

const rankingRoutes = express.Router();

// Novas rotas de ranking por tempo.
rankingRoutes.post(
  "/app/resultados",
  auth.Authorization,
  tentativaController.verificarUsuario,
  tentativaController.salvarResultado,
);

rankingRoutes.get(
  "/app/tempos",
  auth.Authorization,
  tentativaController.verificarUsuario,
  tentativaController.getRankingTempos,
);

rankingRoutes.get(
  "/app/minhas-tentativas",
  auth.Authorization,
  tentativaController.verificarUsuario,
  tentativaController.getMinhasTentativas,
);

// Rotas existentes do ranking por pontos.
rankingRoutes.get(
  "/app/top",
  rankingController.getRankingOrdenado,
);

rankingRoutes.get(
  "/",
  rankingController.getAllRankings,
);

rankingRoutes.post(
  "/",
  rankingController.createRanking,
);

rankingRoutes.delete(
  "/:id",
  rankingController.deleteRanking,
);

rankingRoutes.put(
  "/:id",
  rankingController.updateRanking,
);

rankingRoutes.get(
  "/:id",
  rankingController.getOneRanking,
);

export default rankingRoutes;