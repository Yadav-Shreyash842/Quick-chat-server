import express from "express";
import { protectRoute } from "../middleware/auth.js";
import {
  createGroup, getMyGroups, getGroupMessages, sendGroupMessage,
  startGroupCall, endGroupCall, getGroupCalls,
} from "../controllers/groupController.js";

const groupRoutes = express.Router();

groupRoutes.post("/create", protectRoute, createGroup);
groupRoutes.get("/my-groups", protectRoute, getMyGroups);
groupRoutes.get("/messages/:groupId", protectRoute, getGroupMessages);
groupRoutes.post("/send/:groupId", protectRoute, sendGroupMessage);
groupRoutes.post("/call/start/:groupId", protectRoute, startGroupCall);
groupRoutes.put("/call/end/:callId", protectRoute, endGroupCall);
groupRoutes.get("/call/history/:groupId", protectRoute, getGroupCalls);

export default groupRoutes;
