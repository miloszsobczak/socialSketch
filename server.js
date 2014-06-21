var io = require('socket.io').listen(4000),
	express = require('express'),
	app = express(),
	port = Number(process.env.PORT || 5000),
	path = require("path");

var usersDatabase = [];

// serves main page
// console.log(app);
app.get("/", function(req, res) {
    res.sendfile('index.html');
});

app.use(express.static(_dirname));

app.listen(port, function() {
  console.log("Listening on " + port);
});
 

io.sockets.on("connection", function(socket){
	console.log("dołączył nowy użytkownik: " + socket.id);
	//wyslanie id dla jednego uzytkownika
	// socket.emit("getUserData", {id: socket.id});
	

	socket.on("setUserData", function(data){
		var tmpObj = JSON.parse(data);
		for (var key in tmpObj) {
			//sprawdza takie same wartosci
		   if (socket.hasOwnProperty(key)) {
		   	if (socket[key] !== tmpObj[key] && key !== "id")
		   	  socket[key] = tmpObj[key];
		   }
		}
	});

	// pobranie stanu canvasu dla podlaczoneg socketa
	socket.on("setCanvasState", function(data){
		console.log(data);
		//wysłanie updatu do wszystkich klientów
		socket.broadcast.emit("getCanvasState", {
			status: data.status,
			e: (data.e) ? data.e : null
		});
	});

	socket.on("disconnect", function(){
		delUserData();		
	});

	// connectDiss();

	(function addUserData(){
		var positionID = usersDatabase.indexOf(socket.id); 
		if (positionID === -1){
			usersDatabase.push(socket.id);
		}
		else{
			console.log("uzytkownik " + socket.id + " zostal znaleziony");
		}
		connectDiss();
	})();

	function delUserData(){
		var positionID = usersDatabase.indexOf(socket.id); 
		if (positionID !== -1){
			usersDatabase.splice(positionID, 1);
			// delete usersDatabase[positionID];
		}
		else{
			console.log("uzytkownik " + socket.id + " NIE zostal znaleziony");
		}
		connectDiss();
	}

	function connectDiss(){
		console.log("łącznie użytkowników podłączycyh jest: " + io.sockets.sockets.length);
		console.log(usersDatabase);
		// wyslanie wszystkim danych userów
		io.sockets.emit("getUsersData", {
			users: usersDatabase
		});	
	}
});
