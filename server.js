import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import User from "./models/User.js";
import { app, server, io, userSocketMap } from "./lib/socket.js";

// middlewares
app.use(express.json({ limit: "4mb" }));
app.use(cors());

// routes
app.use("/api/status", (req, res) => res.send("server is live"));
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);

// socket.io connection handler
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  console.log("socket connected ->", socket.id, "user:", userId);

  if (userId) userSocketMap[userId] = socket.id;
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("call-user", async ({ to, offer, type }) => {
    const toSocketId = userSocketMap[to];
    if (toSocketId) {
      try {
        const caller = await User.findById(userId).select("fullName profilePic");
        io.to(toSocketId).emit("incoming-call", {
          from: userId, offer, type,
          caller: caller ? { _id: userId, fullName: caller.fullName, profilePic: caller.profilePic } : null,
        });
      } catch (error) {
        console.error("Error fetching caller details:", error);
        io.to(toSocketId).emit("incoming-call", { from: userId, offer, type, caller: null });
      }
    }
  });

  socket.on("answer-call", ({ to, answer }) => {
    const toSocketId = userSocketMap[to];
    if (toSocketId) io.to(toSocketId).emit("call-answered", { answer });
  });

  socket.on("reject-call", ({ to }) => {
    const toSocketId = userSocketMap[to];
    if (toSocketId) io.to(toSocketId).emit("call-rejected");
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    const toSocketId = userSocketMap[to];
    if (toSocketId) io.to(toSocketId).emit("ice-candidate", { candidate });
  });

  socket.on("end-call", ({ to }) => {
    const toSocketId = userSocketMap[to];
    if (toSocketId) io.to(toSocketId).emit("call-ended");
  });

  socket.on("getOnlineStatus", (uid, callback) => {
    callback(!!userSocketMap[uid]);
  });

  // ── GROUP CALL SIGNALING ──
  // mesh: each pair exchanges offer/answer directly via server relay
  socket.on("group-call-offer", ({ to, offer, type, callId, from }) => {
    const toSocketId = userSocketMap[to];
    if (toSocketId) io.to(toSocketId).emit("group-call-offer", { from, offer, type, callId });
  });

  socket.on("group-call-answer", ({ to, answer, from }) => {
    const toSocketId = userSocketMap[to];
    if (toSocketId) io.to(toSocketId).emit("group-call-answer", { from, answer });
  });

  socket.on("group-ice-candidate", ({ to, candidate, from }) => {
    const toSocketId = userSocketMap[to];
    if (toSocketId) io.to(toSocketId).emit("group-ice-candidate", { from, candidate });
  });

  socket.on("group-call-ended", async ({ groupId, callId }) => {
    try {
      const group = await (await import("./models/Group.js")).default.findById(groupId);
      if (group) {
        group.members.forEach((memberId) => {
          const sid = userSocketMap[memberId.toString()];
          if (sid && sid !== socket.id) io.to(sid).emit("group-call-ended", { groupId, callId });
        });
      }
    } catch {}
  });

  socket.on("group-call-rejected", ({ to, from }) => {
    const toSocketId = userSocketMap[to];
    if (toSocketId) io.to(toSocketId).emit("group-call-rejected", { from });
  });

  socket.on("disconnect", () => {
    console.log("user disconnected:", userId);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => console.log("✅ server is running on port:", PORT));
};

startServer();
