//Комната для игры
//Хранит 2-х игроков(http-соединения), идентификатор комнаты, пригласительную ссылку, логику игры
//Реализует процессы игры и чата
var Room = function(href){
    this.player1 = {player: null, nowTurn: true, playerNumber: 1};
    this.player2 = {player: null, nowTurn: false, playerNumber: 2};
    this.id = "?" + Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, Room.prototype.getIdLength());
    this.inviteLink = href + this.id;
    this.field = [0,0,0,0,0,0,0,0,0];
    this.canDelete = true;

};
Room.prototype.getIdLength = function(){
  return 4;
}

Room.prototype.addPlayer1 = function(socket){
    this.player1.player = socket;
};
Room.prototype.addPlayer2 = function(socket){
    this.player2.player = socket;
};
Room.prototype.toggleTurn = function(){
  this.player1.nowTurn = !this.player1.nowTurn;
  this.player2.nowTurn = !this.player2.nowTurn;
}
Room.prototype.sendGameStatus = function(){
  var self = this;
  if (self.player1.player && self.player2.player) {
    self.canDelete = false;
  }
  var player2OpponentOffline;
  var player1OpponentOffline;
  self.player1.player ? player2OpponentOffline = false : player2OpponentOffline = true;
  self.player2.player ? player1OpponentOffline = false : player1OpponentOffline = true;

  for (var i = 0; i < arguments.length; i++) {
    if (arguments[i]){
      if (arguments[i] == this.player1.player){
        arguments[i].emit('game status', {playerNumber: self.player1.playerNumber, nowTurn: self.player1.nowTurn, roomId: self.id, field: self.field});
        arguments[i].emit('opponent status', {opponentOffline: player1OpponentOffline});
      }
      else if (arguments[i] == this.player2.player){
        arguments[i].emit('game status', {playerNumber: self.player2.playerNumber, nowTurn: self.player2.nowTurn, roomId: self.id, field: self.field});
        arguments[i].emit('opponent status', {opponentOffline: player2OpponentOffline});
      }
    }
  }
  if (self.winner()){
      self.endGame();
  }
}

Room.prototype.turnProcessing = function(data){
  var self = this;
  if (data.playerNumber == 1){
    console.log("Первый походил! Квадрат № " + data.targetId);
    self.saveTurn(self.player1,data.targetId);
  }
  else if (data.playerNumber == 2){
    console.log("Второй походил! Квадрат № " + data.targetId);
    self.saveTurn(self.player2,data.targetId);
  }
  if (!self.winner()) {
    self.toggleTurn();
  }
  else{
    self.player1.nowTurn = false;
    self.player2.nowTurn = false;
  }
  self.sendGameStatus(self.player1.player, self.player2.player);

};

Room.prototype.saveTurn = function(player,n){
    if (player == this.player1){
        this.field[n-1] = 1;
    }
    else if (player == this.player2){
        this.field[n-1] = -1;
    }
};
Room.prototype.winner = function(){
    if((this.field[0]+this.field[1]+this.field[2]==3) ||
        (this.field[3]+this.field[4]+this.field[5]==3) ||
        (this.field[6]+this.field[7]+this.field[8]==3) ||
        (this.field[0]+this.field[3]+this.field[6]==3) ||
        (this.field[1]+this.field[4]+this.field[7]==3) ||
        (this.field[2]+this.field[5]+this.field[8]==3) ||
        (this.field[4]+this.field[6]+this.field[2]==3) ||
        (this.field[0]+this.field[4]+this.field[8]==3)
    ) {
        return this.player1;
    }
    else if (
        (this.field[0]+this.field[1]+this.field[2]==-3) ||
        (this.field[3]+this.field[4]+this.field[5]==-3) ||
        (this.field[6]+this.field[7]+this.field[8]==-3) ||
        (this.field[0]+this.field[3]+this.field[6]==-3) ||
        (this.field[1]+this.field[4]+this.field[7]==-3) ||
        (this.field[2]+this.field[5]+this.field[8]==-3) ||
        (this.field[4]+this.field[6]+this.field[2]==-3) ||
        (this.field[0]+this.field[4]+this.field[8]==-3)
    ){
        return this.player2;
    }
    else if (
        (this.field[0] != 0) &&
        (this.field[1] != 0) &&
        (this.field[2] != 0) &&
        (this.field[3] != 0) &&
        (this.field[4] != 0) &&
        (this.field[5] != 0) &&
        (this.field[6] != 0) &&
        (this.field[7] != 0) &&
        (this.field[8] != 0)
    ){
        return "pat";
    }
    else
        return null;
};

Room.prototype.chat = function(){
    var self = this;
    if (self.player1.player){
      self.player1.player.removeAllListeners('message');
      self.player1.player.on('message', function(text){
          self.player1.player.emit('message dilivered to server',text);
          self.player2.player ? self.player2.player.emit('message',text) : {};
      });
    }
    if (self.player2.player){
      self.player2.player.removeAllListeners('message');
      self.player2.player.on('message', function(text){
          self.player2.player.emit('message dilivered to server',text);
          self.player1.player ? self.player1.player.emit('message',text) : {};
      });
    }
};



Room.prototype.game = function(){
  console.log("Game started!");
  var self = this;
  self.sendGameStatus(self.player1.player, self.player2.player);

  if (self.player1.player){
    self.player1.player.removeAllListeners('turn done');
    self.player1.player.on('turn done', function(data){
      self.turnProcessing(data);
    });
  }
  if (self.player2.player){
    self.player2.player.removeAllListeners('turn done');
    self.player2.player.on('turn done', function(data){
      self.turnProcessing(data);
    });
  }
}

Room.prototype.endGame = function(reason){
    console.log("Игра закончилась!");
    var self = this;
    self.player1.nowTurn = false;
    self.player2.nowTurn = false;
    if (!reason) {
        switch (self.winner()) {
            case self.player1:
                console.log("Первый выиграл!");
                self.player1.player ? self.player1.player.emit('end game', 'win') : {};
                self.player2.player ? self.player2.player.emit('end game', 'loose') : {};
                break;
            case self.player2:
                console.log("Второй выиграл!");
                self.player1.player ? self.player1.player.emit('end game', 'loose') : {};
                self.player2.player ? self.player2.player.emit('end game', 'win') : {};
                break;
            case "pat":
                console.log("Ничья!");
                self.player1.player ? self.player1.player.emit('end game', 'pat') : {};
                self.player2.player ? self.player2.player.emit('end game', 'pat') : {};
                break;
            default:
        }
    }
    else{
        switch (reason) {
            case "disconnect":
                console.log("Причина: игрок отключился");
                /*self.player1 ? self.player1.player.emit('end game', 'disconnect'):{};
                self.player2 ? self.player2.player.emit('end game', 'disconnect'):{};
                break;*/
            default:
        }
    }
};
module.exports = Room;
