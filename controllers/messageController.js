import Message from "../models/Message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { io , userSocketMap} from "../server.js";

// get all user except logged in user
export const getUserForSidebar = async (req, res) => {
   try {
       const userId = req.user._id; 
       const filteredUsers = await User.find({_id: {$ne: userId}}).select("-password "); 
       
       // count of unread messages from each user
       const unseenMessages = {}
       const promises = filteredUsers.map(async (user) => {
           const message = await Message.countDocuments({sendrId: user._id, recvrId: userId, seen: false});
           if(message.length > 0){
                unseenMessages[user._id] = message.length;
           }
       });

       await Promise.all(promises);
       res.json({success:true, users: filteredUsers, unseenMessages});
        
   } catch (error) {
       console.log(error.message);
       res.json({success:false, message: error.message});
   }
}

// get all messages selected user
export const getMessages = async (req, res) => {
    try {
        const {id: selectedUserId} = req.params;
        const myId = req.user._id;

        const messages = await Message.find({
            $or: [
                { sendrId: myId, recvrId: selectedUserId },
                { sendrId: selectedUserId, recvrId: myId }
            ]
        })

        await Message.updateMany(
            {sendrId: selectedUserId, recvrId: myId},
            {seen: true}
        );

        res.json({success:true, messages});
        
    } catch (error) {
        console.log(error.message);
        res.json({success:false, message: error.message});
    }
}

// api to mark messages as seen using message id
export const markMessageAsSeen = async (req, res) => {
    try {
        const {id} = req.params;
        await Message.findByIdAndUpdate(id, {seen: true});
        res.json({success:true});
    } catch (error) {
        console.log(error.message);
        res.json({success:false, message: error.message});
    }
}

// send message to selected user
export const sendMessage = async (req, res) => {
    try {
        const {text , image} = req.body;
        const recvrId = req.params.id;
        const sendrId = req.user._id;

        let imageUrl;
        if(image){
             const uploadedImage = await cloudinary.uploader.upload(image)
             imageUrl = uploadedImage.secure_url;
        }

        const newMessage = await Message.create({
            sendrId, 
            recvrId, 
            text,
            image: imageUrl
        });

        // emit message using socket.io
        const recvrSocketId = userSocketMap[recvrId];
        if(recvrSocketId){
            console.log("Emitting newMessage event:", newMessage);
            console.log("Recipient socket ID:", recvrSocketId);
            io.to(recvrSocketId).emit("newMessage", newMessage);
        }

        console.log("Recipient user ID:", recvrId);
        console.log("Sender user ID:", sendrId);


        res.json({success:true, newMessage});
        
    } catch (error) {
        console.log(error.message);
        res.json({success:false, message: error.message});
    }
}