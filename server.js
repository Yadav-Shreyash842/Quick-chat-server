import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import { Server } from "socket.io";

// create express app and http server
const app = express();
const server = http.createServer(app);

// socket io setup
export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// store online users
export const userSocketMap = {}; // { userId: socketId }

// socket.io connection handler
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  console.log("socket connected ->", socket.id, "user:", userId);

  if (userId) {
    userSocketMap[userId] = socket.id;
  }

  // Emit online users
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // =====================================================
  // 📹📞 VIDEO + AUDIO CALL SOCKET EVENTS
  // =====================================================

  /**
   * CALL USER (audio / video)
   * payload: { to, offer, type }
   * type: "audio" | "video"
   */
  socket.on("call-user", ({ to, offer, type }) => {
    const toSocketId = userSocketMap[to];
    if (toSocketId) {
      io.to(toSocketId).emit("incoming-call", {
        from: userId,
        offer,
        type, // 🔥 audio / video
      });
    }
  });

  /**
   * CALL ACCEPTED
   */
  socket.on("answer-call", ({ to, answer }) => {
    const toSocketId = userSocketMap[to];
    if (toSocketId) {
      io.to(toSocketId).emit("call-answered", { answer });
    }
  });

  /**
   * CALL REJECTED
   */
  socket.on("reject-call", ({ to }) => {
    const toSocketId = userSocketMap[to];
    if (toSocketId) {
      io.to(toSocketId).emit("call-rejected");
    }
  });

  /**
   * ICE CANDIDATE EXCHANGE
   */
  socket.on("ice-candidate", ({ to, candidate }) => {
    const toSocketId = userSocketMap[to];
    if (toSocketId) {
      io.to(toSocketId).emit("ice-candidate", { candidate });
    }
  });

  /**
   * END CALL
   */
  socket.on("end-call", ({ to }) => {
    const toSocketId = userSocketMap[to];
    if (toSocketId) {
      io.to(toSocketId).emit("call-ended");
    }
  });

  // =====================================================
  // ONLINE STATUS CHECK (EXISTING)
  // =====================================================
  socket.on("getOnlineStatus", (userId, callback) => {
    const isOnline = !!userSocketMap[userId];
    callback(isOnline);
  });

  // disconnect
  socket.on("disconnect", () => {
    console.log("user disconnected:", userId);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

// middlewares setup
app.use(express.json({ limit: "4mb" }));
app.use(cors());

// routes setup
app.use("/api/status", (req, res) => res.send("server is live"));
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRoutes);

// connect to mongoDB and start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  server.listen(PORT, () =>
    console.log("✅ server is running on port:", PORT)
  );
};

startServer();