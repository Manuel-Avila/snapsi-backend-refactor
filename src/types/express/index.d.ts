import type { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface UserPayload extends JwtPayload {
      id: number;
      username: string;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

export {};
