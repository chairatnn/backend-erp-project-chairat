import { Router } from "express";
import {
  createUser1,
  deleteUser1,
  getUsers1,
} from "../../modules/users/users.controller.js";

export const router = Router();

router.get("/", getUsers1);

router.post("/", createUser1);

router.delete("/:id", deleteUser1);
