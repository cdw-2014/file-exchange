import React, { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { Room, File } from "../server/store";
import "./App.css";

const LOG_IN = "log-in-event";
const UPLOAD_FILE = "new-file-event";
const DELETE_FILE = "delete-file-event";
// const UPDATE_FILE = "update-file-event";
const DELETE_ROOM = "delete-room-event";

// const FILE_ALREADY_EXISTS_ERROR = "already-exists-error";
// const FILE_DOES_NOT_EXISTS_ERROR = "does-not-exists-error";
const ROOM_UPDATE_CALLBACK = "refresh-page-callback";
const ROOM_DELETE_CALLBACK = "delete-room-callback";

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<Room | null>(null);

  useEffect(() => {
    const newSocket = io(`http://${window.location.hostname}:8069`);
    newSocket.on(ROOM_UPDATE_CALLBACK, (data: Room) => {
      setRoom(data);
    });
    newSocket.on(ROOM_DELETE_CALLBACK, () => {
      console.log("Room was deleted.");
      setRoom(null);
    });
    setSocket(newSocket);
    return () => {
      newSocket.close();
    };
  }, [setSocket]);

  const handleRoomSubmit = (e: React.SyntheticEvent): void => {
    e.preventDefault();
    const target = e.target as typeof e.target & {
      roomId: { value: string };
    };
    socket?.emit(LOG_IN, target.roomId.value);
  };

  const handleUploadSubmit = (e: React.SyntheticEvent): void => {
    e.preventDefault();
    const target = e.target as typeof e.target & {
      fileName: { value: string };
      fileData: { value: string };
    };
    const file: File = {
      name: target.fileName.value,
      type: "text",
      data: target.fileData.value,
    };
    if (file.name !== "" && file.data !== "") {
      socket?.emit(UPLOAD_FILE, room?.id, file);
    }
  };

  const renderRoomForm = () => (
    <React.Fragment>
      <p>Join Room: </p>
      <form onSubmit={handleRoomSubmit}>
        <input id="roomId" name="roomId" />
        <button>Join</button>
      </form>
    </React.Fragment>
  );

  const renderFileUpload = () => (
    <React.Fragment>
      <h5>Upload</h5>
      <form onSubmit={handleUploadSubmit}>
        <input id="fileName" name="fileName" placeholder="Name" />
        <input id="fileData" name="fileData" placeholder="Content" />
        <button>Join</button>
      </form>
    </React.Fragment>
  );

  const renderFileList = () => (
    <React.Fragment>
      <h1>Files</h1>
      <table className="table-files">
        <thead>
          <tr>
            <td className="tf-name">Name</td>
            <td className="tf-type">Type</td>
            <td className="tf-data">Data</td>
            <td className="tf-delete"></td>
          </tr>
        </thead>
        <tbody>
          {room?.files.map((file, i) => (
            <tr key={i}>
              <td className="tf-name-row">{file.name}</td>
              <td className="tf-type-row">{file.type}</td>
              <td className="tf-data-row">{file.data}</td>
              <td className="tf-delete-row">
                <button
                  id={String(i)}
                  onClick={(e: React.SyntheticEvent) => {
                    socket?.emit(DELETE_FILE, room.id, file.name);
                  }}
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </React.Fragment>
  );

  const renderRoom = () => (
    <React.Fragment>
      {renderFileUpload()}
      {renderFileList()}
      <button
        onClick={(e: React.SyntheticEvent) => {
          e.preventDefault();
          if (
            window.confirm(
              "Are you sure you want to delete the room? The data will be permanently deleted, and all clients in the room will be kicked out."
            )
          ) {
            socket?.emit(DELETE_ROOM, room?.id);
          }
        }}
      >
        Delete Room
      </button>
    </React.Fragment>
  );

  const renderPage = () => {
    if (room) {
      return renderRoom();
    } else {
      return renderRoomForm();
    }
  };

  return <div className="App">{socket ? renderPage() : <p>Loading...</p>}</div>;
}

export default App;
