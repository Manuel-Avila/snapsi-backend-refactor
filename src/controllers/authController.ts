import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import * as UserModel from "../models/userModel.js";

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, username, email, password, gender, age } = req.body;

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const newUserId = await UserModel.createUser({
      name,
      username,
      email,
      password: passwordHash,
      gender,
      age,
    });

    res.status(201).json({ message: "User registered successfully", userId: newUserId });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      res.status(409).json({ message: "The email or username is already taken." });
      return;
    }

    console.error("Error while registering user:", error);
    res.status(500).json({ message: "Error while registering user." });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const user = await UserModel.getUserForAuth(email);
    if (!user) {
      res.status(401).json({ message: "Invalid credentials." });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid credentials." });
      return;
    }

    const payload = { id: user.id, username: user.username };
    const token = jwt.sign(payload, process.env.JWT_SECRET || "", { expiresIn: "20d" });

    res.status(200).json({ token, message: "Login successful." });
  } catch (error) {
    console.error("Error while logging in user:", error);
    res.status(500).json({ message: "Error while logging in user." });
  }
};

export const googleLogin = async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({ message: "Google login is not implemented yet." });
};
