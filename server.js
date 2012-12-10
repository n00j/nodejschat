var express = require('express'), 
	http = require('http');

var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server, {log: false});

app.use("/js", express.static(__dirname + '/js'));

server.listen(8080);

// routing
app.get('/', function (req, res) {
	res.sendfile(__dirname + '/index.html');
});

// usernames which are currently connected to the chat
var usernames = {};
var chatrooms = {};
io.sockets.on('connection', function(socket) {

	socket.on('sendchat', function(data) {
		// we tell the client to execute 'updatechat with 2 parameters'
		io.sockets.in(socket.chatroom).emit('updatechat', socket.username, data);
	});

	// when the client emits 'adduser', this listens and executes
	socket.on('adduser', function(info) {
		username = info.username;
		chatroom = info.chatroom;

		if (!(usernames[username] == undefined || usernames[username] == null))
		{
			socket.emit('errorConnect', "The username '" + username + "' is already in use.");
			return;
		}
		// we store the username in the socket session for this client
		socket.username = username;
		// we store the room
		socket.chatroom = chatroom;
		if (chatrooms[chatroom] == undefined)
		{
			chatrooms[chatroom] = {
				name: chatroom,
				usernames: {},
				usercount: 0
			}
		}
		// add the client's username to the global list
		usernames[username] = username;
		chatrooms[chatroom].usernames[username] = username;
		chatrooms[chatroom].usercount++;
		socket.join(chatroom);

		// echo to the client the chatroom name
		socket.emit('successfullyjoinchat', chatroom);
		// echo to the client they've connected
		socket.emit('updatechat', 'SERVER', 'you have connected');
		// echo globablly (all clients) that a person has connected
		socket.broadcast.to(chatroom).emit('updatechat', 'SERVER', username + ' has connected');
		// update the list of users in chat, client-side
		io.sockets.in(chatroom).emit('updateusers', chatrooms[chatroom].usernames);
	});

	// when the user disconnects.. perform this
	socket.on('disconnect', function() {
		// remove the username from global usernames list
		try
		{
			delete usernames[socket.username];
			delete chatrooms[socket.chatroom].usernames[username];
			chatrooms[socket.chatroom].usercount--;
			// echo globally that this client has left
			if (chatrooms[socket.chatroom].usercount > 0)
			{
				io.sockets.in(socket.chatroom).emit('updatechat', 'SERVER', socket.username + ' has disconnected');
				// update list of users in chat, client-side
				io.sockets.in(socket.chatroom).emit('updateusers', usernames);
			}

			socket.leave(socket.chatroom);
		}
		catch(e)
		{
			console.log(socket.username, socket.chatroom, chatrooms);
		}
		

	});

});