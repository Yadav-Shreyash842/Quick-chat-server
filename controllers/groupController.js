import Group from "../models/Group.js";
import GroupMessage from "../models/GroupMessage.js";
import GroupCall from "../models/GroupCall.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../lib/socket.js";

// Create a new group
export const createGroup = async (req, res) => {
  try {
    const { name, members } = req.body;
    const admin = req.user._id;

    if (!name || !members || members.length < 1) {
      return res.json({ success: false, message: "Name and at least 1 member required" });
    }

    // include admin in members
    const allMembers = [...new Set([...members, admin.toString()])];

    const group = await Group.create({ name, members: allMembers, admin });
    const populated = await group.populate("members", "-password");

    res.json({ success: true, group: populated });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get all groups for logged-in user
export const getMyGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    const groups = await Group.find({ members: userId }).populate("members", "-password");
    res.json({ success: true, groups });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get messages for a group
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const messages = await GroupMessage.find({ groupId }).populate("sendrId", "fullName profilePic");
    res.json({ success: true, messages });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Send message to a group
export const sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { text, image } = req.body;
    const sendrId = req.user._id;

    let imageUrl;
    if (image) {
      const uploaded = await cloudinary.uploader.upload(image);
      imageUrl = uploaded.secure_url;
    }

    const newMessage = await GroupMessage.create({ groupId, sendrId, text, image: imageUrl });
    const populated = await newMessage.populate("sendrId", "fullName profilePic");

    // emit to all group members
    const group = await Group.findById(groupId);
    group.members.forEach((memberId) => {
      const socketId = userSocketMap[memberId.toString()];
      if (socketId && memberId.toString() !== sendrId.toString()) {
        io.to(socketId).emit("newGroupMessage", { groupId, message: populated });
      }
    });

    res.json({ success: true, newMessage: populated });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Start a group call — saves record, notifies all members via socket
export const startGroupCall = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { type } = req.body;
    const initiator = req.user._id;

    const call = await GroupCall.create({ groupId, initiator, type });
    const group = await Group.findById(groupId).populate("members", "fullName profilePic");
    const initiatorUser = group.members.find(m => m._id.toString() === initiator.toString());

    // notify all other members
    group.members.forEach((member) => {
      if (member._id.toString() === initiator.toString()) return;
      const socketId = userSocketMap[member._id.toString()];
      if (socketId) {
        io.to(socketId).emit("incoming-group-call", {
          callId: call._id,
          groupId,
          groupName: group.name,
          groupMembers: group.members,
          initiatorId: initiator,
          initiatorName: initiatorUser?.fullName || "Someone",
          initiatorPic: initiatorUser?.profilePic || null,
          type,
        });
      }
    });

    res.json({ success: true, callId: call._id, group });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// End a group call — update duration in DB
export const endGroupCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const { duration } = req.body;
    const endedAt = new Date();
    await GroupCall.findByIdAndUpdate(callId, { duration, endedAt });
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get call history for a group
export const getGroupCalls = async (req, res) => {
  try {
    const { groupId } = req.params;
    const calls = await GroupCall.find({ groupId })
      .populate("initiator", "fullName profilePic")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, calls });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
