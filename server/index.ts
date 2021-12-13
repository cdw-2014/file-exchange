#!/usr/bin/env node
import { Socket } from "socket.io";
import { Room, File } from "./store";

const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIO = require("socket.io");

const PORT = 8069;

const LOG_IN = "log-in-event";
const UPLOAD_FILE = "new-file-event";
const DELETE_FILE = "delete-file-event";
const UPDATE_FILE = "update-file-event";
const DELETE_ROOM = "delete-room-event";

const FILE_ALREADY_EXISTS_ERROR = "already-exists-error";
const FILE_DOES_NOT_EXISTS_ERROR = "does-not-exists-error";
const ROOM_UPDATE_CALLBACK = "refresh-page-callback";
const ROOM_DELETE_CALLBACK = "delete-room-callback";

const app = express();
const server = http.createServer(app);

const io = socketIO(server, {
  cors: true,
  origins: "*",
});

app.use(cors());

//! ROOM DATA STORED HERE
//TODO: Persist room data somewhere?
var store: Room[] = [];

//* Util function: get room by ID
const getRoomIfExists = (roomId: string): Room | undefined => {
  return store.find((room) => room.id === roomId);
};

//! NEW SOCKET CONNECTS
//TODO: Break socket events into separate files for better readability
io.on("connection", (socket: Socket) => {
  console.log(`${socket} has connected.`);

  //* Socket joins a room
  /**
   *
   */
  socket.on(LOG_IN, (roomId: string) => {
    socket.join(roomId);
    console.log(`${socket} has joined room ${roomId}.`);

    // Checks if room already exists
    const existingRoom = getRoomIfExists(roomId);
    if (existingRoom === undefined) {
      store.push({ id: roomId, files: [] }); // create the room if no other socket has joined the requested room ID
    }
    socket.emit(ROOM_UPDATE_CALLBACK, getRoomIfExists(roomId)); // Returns room's files to socket
  });

  //* Socket uploads a new file to the room
  /**
   *
   */
  socket.on(UPLOAD_FILE, (roomId: string, data: File) => {
    // Gets the room data
    const existingRoom = getRoomIfExists(roomId);
    // Checks for file in the room with same name as newly uploaded file
    if (existingRoom?.files.some((file) => file.name === data.name)) {
      socket.emit(FILE_ALREADY_EXISTS_ERROR, data); // Returns error if file already exists
    } else if (existingRoom) {
      let newFilesList: File[] = (existingRoom as Room).files; // Creates a copy of files
      newFilesList.push(data); // Add new file to copy

      // Create Room object with existing room data + updated file list
      let newRoomData: Room = {
        ...(existingRoom as Room),
        files: newFilesList,
      };
      store[store.indexOf(existingRoom as Room)] = newRoomData; // Update the store
      io.in(roomId).emit(ROOM_UPDATE_CALLBACK, newRoomData); // Emit room's new files to all sockets in room
    }
  });

  //* Socket deletes a file from room
  /**
   *
   */
  socket.on(DELETE_FILE, (roomId: string, fileName: string) => {
    // Gets the room data
    const existingRoom = getRoomIfExists(roomId);

    // Checks for file in the room with same name as the file requested to be deleted
    if (!existingRoom?.files.some((file) => file.name === fileName)) {
      socket.emit(FILE_DOES_NOT_EXISTS_ERROR, fileName); // Returns error if file does not exist
    } else if (existingRoom) {
      let newFilesList: File[] = (existingRoom as Room).files; // Creates a copy of files
      newFilesList = newFilesList.filter((file) => file.name !== fileName); // Filters out deleted file from copy of files

      // Create Room object with existing room data + updated file list
      let newRoomData: Room = {
        ...(existingRoom as Room),
        files: newFilesList,
      };
      store[store.indexOf(existingRoom as Room)] = newRoomData; // Update the store
      io.in(roomId).emit(ROOM_UPDATE_CALLBACK, newRoomData); // Emit room's new files to all sockets in room
    }
  });

  //* Socket updates an existing file from the room
  /**
   *
   */
  socket.on(UPDATE_FILE, (roomId: string, data: File) => {
    // Gets the room data
    const existingRoom = getRoomIfExists(roomId);

    // Checks for file in the room with same name as the file requested to be updated
    if (!existingRoom?.files.some((file) => file.name === data.name)) {
      socket.emit(FILE_DOES_NOT_EXISTS_ERROR, data); // Returns error if file does not exist
    } else if (existingRoom) {
      let newFilesList: File[] = (existingRoom as Room).files; // Creates a copy of files
      newFilesList[newFilesList.indexOf(data)] = data; // Updates the file in the copy

      // Create Room object with existing room data + updated file list
      let newRoomData: Room = {
        ...(existingRoom as Room),
        files: newFilesList,
      };
      store[store.indexOf(existingRoom as Room)] = newRoomData; // Update the store
      io.in(roomId).emit(ROOM_UPDATE_CALLBACK, newRoomData); // Emit room's new files to all sockets in room
    }
  });

  //* Socket deletes the room
  /**
   *
   */
  socket.on(DELETE_ROOM, (roomId: string) => {
    // Gets the room data
    const existingRoom = getRoomIfExists(roomId);
    if (existingRoom) {
      console.log(`Deleting room ${roomId}.`);
      io.in(roomId).emit(ROOM_DELETE_CALLBACK); // Delete room callback
      io.in(roomId).socketsLeave(roomId); // Force all sockets to leave room
      store = store.filter((room) => room.id !== roomId); // Deletes room data from store
    }
  });

  socket.on("disconnect", () => {
    console.log(`${socket} has disconnected.`);
  });
});

server.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});

export {};
