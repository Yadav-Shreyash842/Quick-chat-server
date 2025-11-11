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
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// store onlinne users
export const userSocketMap = {}; // {userId: socketId}


// socket.io connection handler
// socket.io connection handler
io.on("connection", (socket) =>{
    const userId = socket.handshake.query.userId;
    console.log("socket connected -> socket.id:", socket.id, "handshake.query:", socket.handshake.query);
    console.log("user connected", userId);

    if (userId) {
        userSocketMap[userId] = socket.id;
        console.log("userSocketMap updated:", userSocketMap);
    } else {
        console.log("No userId in handshake query for socket:", socket.id);
    }

    // Emit online users to all connected users
    console.log("Emitting getOnlineUsers with:", Object.keys(userSocketMap));
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
    socket.on("disconnect", () => {
        console.log("user disconnected", userId, "socket:", socket.id);
        delete userSocketMap[userId];
        console.log("userSocketMap after disconnect:", userSocketMap);
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });

    socket.on("getOnlineStatus", (userId, callback) => {
        console.log("Checking online status for user:", userId);
        console.log("Current userSocketMap:", userSocketMap);
        
        const isOnline = !!userSocketMap[userId];
        callback(isOnline);
        console.log("Online status sent to client:", isOnline);
        console.log("Received getOnlineStatus for user:", userId);
        console.log("Emitting online status:", isOnline);
    });
})



// middlewares setup
app.use(express.json({ limit: "4mb" }));
app.use(cors());

// routes setup

app.use("/api/status", (req, res) => res.send("server is live"));
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRoutes);


// connect to mongoDB
const startServer = async () => {
    await connectDB();
    server.listen(PORT, () => console.log("server is running on port:" + PORT));
}

const PORT = process.env.PORT || 5000;
startServer();

// Test event emitter for debugging
setTimeout(() => {
    const testMessage = {
        sendrId: "testSenderId",
        recvrId: "testReceiverId",
        text: "Test message",
        _id: "testMessageId",
        createdAt: new Date().toISOString(),
    };
    console.log("Emitting test newMessage event:", testMessage);
    io.emit("newMessage", testMessage);
}, 10000);
