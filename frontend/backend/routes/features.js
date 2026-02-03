import express from "express";
import flags from "../config/featuresConfig.js";

const router = express.Router();

router.get("/features", (req, res) => {
  return res.json({ success: true, features: flags });
});

export default router;
