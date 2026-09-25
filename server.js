var http = require("http");
var WebSocket = require("ws");

var server = http.createServer(function (request, response) {
  response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("ROLLER multiplayer relay is running. Connect from the game on port 8000.\n");
});
var socketServer = new WebSocket.Server({ server: server });
var players = {};
var lobbies = {};
var nextId = 1;

function makeCode() {
  var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var code = "";
  do {
    code = "";
    for (var i = 0; i < 6; i++) { code += alphabet[Math.floor(Math.random() * alphabet.length)]; }
  } while (lobbies[code]);
  return code;
}

function sendLobby(code) {
  if (!code || !lobbies[code]) { return; }
  var message = JSON.stringify({ type: "players", players: lobbies[code].players });
  lobbies[code].clients.forEach(function (client) {
    if (client.readyState === WebSocket.OPEN) { client.send(message); }
  });
}

socketServer.on("connection", function (socket) {
  var id = String(nextId++);
  players[id] = { x: 0, y: 0, aim: 0, level: 0, alive: true, lobby: "" };
  socket.send(JSON.stringify({ type: "welcome", id: id }));

  socket.on("message", function (raw) {
    try {
      var message = JSON.parse(raw.toString());
      if (message.type === "create") {
        var createdCode = makeCode();
        lobbies[createdCode] = { clients: new Set([socket]), players: {} };
        players[id].lobby = createdCode;
        lobbies[createdCode].players[id] = { x: 0, y: 0, aim: 0, level: 0, alive: true };
        socket.send(JSON.stringify({ type: "lobby", code: createdCode }));
        sendLobby(createdCode);
        return;
      }
      if (message.type === "join") {
        var joinCode = String(message.code || "").toUpperCase();
        if (!lobbies[joinCode]) { socket.send(JSON.stringify({ type: "lobby", error: "Lobby not found." })); return; }
        lobbies[joinCode].clients.add(socket);
        players[id].lobby = joinCode;
        lobbies[joinCode].players[id] = { x: 0, y: 0, aim: 0, level: 0, alive: true };
        socket.send(JSON.stringify({ type: "lobby", code: joinCode }));
        sendLobby(joinCode);
        return;
      }
      if (message.type !== "state" || !players[id] || !players[id].lobby) { return; }
      players[id] = {
        x: Number(message.x) || 0,
        y: Number(message.y) || 0,
        aim: Number(message.aim) || 0,
        level: Number(message.level) || 0,
        alive: !!message.alive,
        lobby: players[id].lobby
      };
      lobbies[players[id].lobby].players[id] = players[id];
    } catch (error) {
      return;
    }
  });

  socket.on("close", function () {
    var lobbyCode = players[id] && players[id].lobby;
    if (lobbyCode && lobbies[lobbyCode]) {
      lobbies[lobbyCode].clients.delete(socket);
      delete lobbies[lobbyCode].players[id];
      if (lobbies[lobbyCode].clients.size === 0) { delete lobbies[lobbyCode]; }
      else { sendLobby(lobbyCode); }
    }
    delete players[id];
  });
});

setInterval(function () {
  for (var code in lobbies) { sendLobby(code); }
}, 50);

server.listen(8080, "0.0.0.0", function () {
  console.log("Multiplayer relay listening on ws://0.0.0.0:8080");
});
