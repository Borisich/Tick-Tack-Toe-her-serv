/*var app = require('http').createServer();
var io = require('socket.io')(app);

app.listen(6001);

var Room = require('./room');
*/



var Room = require('./room');


var express = require('express');
var app = express();

var server = require('http').Server(app);
var io = require('socket.io')(server);

app.set('port', (process.env.PORT || 6001));

/*
app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});
*/

app.all('/', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
 });
 
app.get('/', function(request, response) {
  
  response.send('Hello man');
});


app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});






console.log('Ok, google. Server is running');




//массив комнат для одновременной игры
var rooms = [];
//с методами поиска по разным критериям
rooms.searchByPlayer = function(player){
    for (var i = 0; i< rooms.length; i++){
        if ((rooms[i].player1 == player)||(rooms[i].player2 == player)){
            return { room: rooms[i], roomNumber: i};
        }
    }
    return false;
};
rooms.searchById = function(id){
    for (var i = 0; i< rooms.length; i++){
        if (rooms[i].id== id){
            return { room: rooms[i], roomNumber: i};
        }
    }
    return false;
};

io.on('connection', function (socket) {
    //отправка присоединившемуся клиенту запрос: пришли свои url параметры (url?params)
    socket.emit('require url params');
    socket.on('url params', function (data) {
        //Проверка параметров.
        //Если есть параметры, попытаться найти комнату с таким id
        //Если их нет, то создать комнату, отправить пригласительную ссылку на подключение к игре другого клиента
        if (data.params){
            console.log("Получены параметры от клиента: " + data.params);
            //Если есть комната с таким id, то начать игру
            var room = rooms.searchById(data.params).room;
            if (room)
            {
                console.log("Комната существует! Игра найдена");
                //Добавляем игрока в комнату, если его ещё нет
                if (!room.player2) {
                    room.addPlayer(socket);
                    //запускаем игру и чат
                    room.game();
                    room.chat();
                }
                else
                {
                    socket.emit("room is full");
                }
            }
            else {
                socket.emit("game not found");
            }
        }
        else{
            console.log("Создание комнаты...");
            room = new Room(socket, data.href);
            console.log("Создана комната "+room.id);
            rooms.push(room);
            socket.emit('invite link', room.inviteLink);
            socket.on('link getted', function(){
               console.log("Клиент получил ссылку для приглашения другого игрока");
            });
        }
    });
    //при отключении игрока игра завершается
    socket.on('disconnect', function () {

        var roomForDelete = rooms.searchByPlayer(socket);
        if (roomForDelete) {
            rooms.splice(roomForDelete.roomNumber, 1);
            console.log("Игрок отключился, удалена комната " + roomForDelete.room.id);
            roomForDelete.room.endGame("disconnect");
        }
        else{
            console.log("Игрок отключился, его комнаты уже не существует");
        }
        console.log("Количество активных комнат: "+rooms.length);
    });
});

