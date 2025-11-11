import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
   sendrId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recvrId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String,  },
    image: { type: String,},
    seen: { type: Boolean, default: false },
},{timestamps:true});


const message = mongoose.model("Message", messageSchema);
export default message;