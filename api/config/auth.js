import "dotenv/config";

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error("JWT_SECRET não foi configurado no arquivo .env.");
}

export default jwtSecret;