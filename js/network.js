var Network = {
  socket: null,
  id: "",
  players: {},
  connected: false,
  lobbyCode: "",
  tickCount: 0
};

Network.connect = function () {
  if (!window.WebSocket) { return; }
  var protocol = location.protocol === "https:" ? "wss:" : "ws:";
  var relayHost = location.hostname;
  if (relayHost.indexOf("-8000.") >= 0) {
    relayHost = relayHost.replace("-8000.", "-8080.");
  }
  var port = location.port === "8000" ? ":8080" : "";
  try {
    Network.socket = new WebSocket(protocol + "//" + relayHost + port);
    Network.socket.onopen = function () { Network.connected = true; };
    Network.socket.onclose = function () { Network.connected = false; };
    Network.socket.onerror = function () { Network.connected = false; };
    Network.socket.onmessage = function (event) {
      var message = JSON.parse(event.data);
      if (message.type === "welcome") { Network.id = message.id; }
      if (message.type === "lobby") {
        Network.lobbyCode = message.code || "";
        Network.setStatus(Network.lobbyCode ? "Lobby connected." : (message.error || "Lobby unavailable."));
        Network.showCode(Network.lobbyCode);
      }
      if (message.type === "players") { Network.players = message.players || {}; }
    };
  } catch (error) {
    Network.connected = false;
  }
};

Network.tick = function () {
  if (!Network.connected || !Network.lobbyCode || !Network.socket || Network.socket.readyState !== WebSocket.OPEN) { return; }
  Network.tickCount++;
  if (Network.tickCount % 3 !== 0) { return; }
  Network.socket.send(JSON.stringify({
    type: "state",
    x: Player.x,
    y: Player.y,
    aim: Player.aimAngle,
    level: Game.levelNumber,
    alive: Game.mode !== "dead"
  }));
};

Network.sendLobby = function (type, code) {
  if (!Network.connected || !Network.socket || Network.socket.readyState !== WebSocket.OPEN) {
    Network.setStatus("Relay is offline. Start npm run multiplayer.");
    return;
  }
  Network.socket.send(JSON.stringify({ type: type, code: String(code || "").trim().toUpperCase() }));
};

Network.createLobby = function () { Network.sendLobby("create"); };
Network.joinLobby = function (code) { Network.sendLobby("join", code); };
Network.setStatus = function (text) {
  var element = document.getElementById("multiplayer-status");
  if (element) { element.textContent = text; }
};
Network.showCode = function (code) {
  var element = document.getElementById("multiplayer-code-display");
  if (element) { element.textContent = code ? "CODE: " + code : ""; }
};

Network.draw = function () {
  if (!Network.connected) { return; }
  var ctx = Draw.ctx;
  for (var id in Network.players) {
    if (id === Network.id) { continue; }
    var player = Network.players[id];
    if (!player.alive || player.level !== Game.levelNumber) { continue; }
    var x = player.x + CONFIG.PLAYER_SIZE / 2;
    var y = player.y + CONFIG.PLAYER_SIZE / 2;
    ctx.fillStyle = "#5ce1e6";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = CONFIG.LINE_WIDTH;
    ctx.beginPath();
    ctx.arc(x, y, CONFIG.PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(x + Math.cos(player.aim) * 9, y + Math.sin(player.aim) * 9, 4, 0, Math.PI * 2);
    ctx.fill();
  }
};

Network.connect();
