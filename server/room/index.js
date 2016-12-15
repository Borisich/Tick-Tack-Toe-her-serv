//Комната для игры
//Хранит 2-х игроков(http-соединения), идентификатор комнаты, пригласительную ссылку, логику игры
//Реализует процессы игры и чата
var Room = function(href){
    this.player1 = null;
    this.player2 = null;
    this.whosTurn = undefined;
    this.id = "?" + Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, Room.prototype.getIdLength());
    this.inviteLink = href + this.id;
    this.field = [0,0,0,0,0,0,0,0,0];

};
Room.prototype.getIdLength = function(){
  return 4;
}

Room.prototype.addPlayer1 = function(socket){
    this.player1 = socket;
};
Room.prototype.addPlayer2 = function(socket){
    this.player2 = socket;
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
Room.prototype.sendGameStateToPlayer1 = function(){
  var self = this;
  self.player1.emit('continue game', {player1Turn: self.player1Turn, field: self.field, symbol: 'x'});


};
Room.prototype.chat = function(){
    var self = this;
    self.player1.on('message', function(text){
        self.player1.emit('message dilivered to server',text);
        self.player2.emit('message',text);
    });
    self.player2.on('message', function(text){
        self.player2.emit('message dilivered to server',text);
        self.player1.emit('message',text);
    });
};

Room.prototype.game = function(){
    var self = this;
    //отправить всем участникам сообщение о начале игры
    self.player1.emit('start game');
    self.player2.emit('start game');
    //... и о том, что ходит первый игрок
    self.player1Turn = true;
    self.player1.emit('your turn','x');
    self.player2.emit('wait other player');
    //Игра

    //Когда ход игрока 1 закончен
    self.player1.on('turn finished', function(data){
        console.log("Первый походил! Квадрат № " + data);
        self.player1Turn = false;
        self.saveTurn(self.player1,data);
        self.player2.emit('other player turn', {symbol: 'x', num: data});
        if (self.winner()){
            self.endGame();
            return;
        }
        self.player2.once('other player turn getted', function(){
            self.player2.emit('your turn','o');
            self.player1.emit('opponent informed');
        });
    });
    //Когда ход игрока 2 закончен
    self.player2.on('turn finished', function(data){
        console.log("Второй походил! Квадрат № " + data);
        self.player1Turn = true;
        self.saveTurn(self.player2,data);
        self.player1.emit('other player turn', {symbol: 'o', num: data});
        if (self.winner()){
            self.endGame();
            return;
        }
        self.player1.once('other player turn getted', function(){
            self.player1.emit('your turn','x');
            self.player2.emit('opponent informed');
        });
    });
};

Room.prototype.endGame = function(reason){
    console.log("Игра закончилась!");
    var self = this;
    if (!reason) {
        switch (self.winner()) {
            case self.player1:
                console.log("Первый выиграл!");
                self.player1.emit('end game', 'win');
                self.player2.emit('end game', 'loose');
                break;
            case self.player2:
                console.log("Второй выиграл!");
                self.player1.emit('end game', 'loose');
                self.player2.emit('end game', 'win');
                break;
            case "pat":
                console.log("Ничья!");
                self.player1.emit('end game', 'pat');
                self.player2.emit('end game', 'pat');
                break;
            default:
        }
    }
    else{
        switch (reason) {
            case "disconnect":
                console.log("Причина: игрок отключился");
                self.player1 ? self.player1.emit('end game', 'disconnect'):{};
                self.player2 ? self.player2.emit('end game', 'disconnect'):{};
                break;
            default:
        }
    }
};
module.exports = Room;
