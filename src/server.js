import express from "express";
import SocketIO from "socket.io"
// import WebSocket from 'ws';
import http from "http";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use('/public', express.static(__dirname + "/public"))
app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));

// app.listen(3000, handleListen);

const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer);

function publicRooms() {

    const {
        sockets: {
            adapter: {sids, rooms},
        },
    } = wsServer;
    const publicRooms = [];
    rooms.forEach((_,key) => {
        if(sids.get(key) === undefined) {
            publicRooms.push(key);
        }
    });
    return publicRooms
}

function countRoom(roomName) {
    return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}

wsServer.on("connection", (socket) => {
    // wsServer.socketsJoin("free");
    socket["nickname"] = "Anon";
    socket.onAny((e) => {
        console.log(`Socket Event: ${e}`);
    })
    socket.on("room", (roomName, done) => {
        socket.join(roomName);
        done();
        socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName));
        wsServer.sockets.emit("room_change", publicRooms());
    })
    socket.on("disconnecting", () => {
        socket.rooms.forEach(room => 
            socket.to(room).emit("bye", socket.nickname, countRoom(room) - 1)
        );
    })
    socket.on("disconnect", () => {
        wsServer.sockets.emit("room_change", publicRooms());
    })
    socket.on("new_message", (msg, room, done) => {
        socket.to(room).emit("new_message", `${socket.nickname} : ${msg}`);
        done();
    })
    socket.on("nickname", (nickname) => (socket["nickname"] = nickname));
})

// const wss = new WebSocket.Server({ server });
// const sockets = [];

// wss.on("connection", (socket) => {
//     sockets.push(socket);
//     socket["nickname"] = "Anon";
//     console.log("Connected to Browser");
//     socket.send("hello");
//     socket.on("message", (msg) => {
//         const message = JSON.parse(msg);
//         switch(message.type) {
//             case "new_message" :
//             sockets.forEach((aSocket) => aSocket.send(`${socket.nickname} : ${message.payload}`))
//             case "nickname" :
//                 socket["nickname"] = message.payload;
//         }
//         // console.log("message",message);
//     })
//     socket.on("close", () =>{
//         console.log("Disconnection from the Server")
//     })
// })

const handleListen = () => console.log(`Listening on http://localhost:3000`);
httpServer.listen(3000, handleListen);