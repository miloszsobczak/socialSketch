;(function(){
	var socket = io('http://127.0.0.1:4000'),
		Application;

	var Canvas = function(canvasSelector){
		var canvas = $(canvasSelector),
			screen = canvas.getContext("2d"),
			self = this,
			users = [];

		this.canvas = canvas;
		this.blocked = false;

		this.preperArea(screen);

		try {
			createConnection(function(){
				var drawObj = new Draw(),
				    drawObjSocket = new Draw(),
				    myUser = new User(self);

				//pobranie o wszystkich
				socket.on('getUsersData', function(data){
					// console.log(data);
					self.updateUsers(data);
					// myUser.updateStorage(JSON.stringify(data));
				});

				socket.on('getCanvasState', function(data){	
					//rysowanie canvasu przez innych userow
					drawObjSocket[data.status].apply(this, [canvas, data.e]);
				});
				canvas.addEventListener("mousedown", function(e){
					var coords;

					if (!self.blocked && !myUser.listener.action.SPACEDOWN){
						coords = getCoordsFromEvent(e, canvas);

						drawObj.start(this, coords);
						
						socket.emit('setCanvasState', {
							status: "start",
							e: coords
						});
					}
				});
				canvas.addEventListener("mousemove", function(e){
					var coords;

					if (!self.blocked && drawObj.isDrawing){
						coords = getCoordsFromEvent(e, canvas);

						drawObj.go(this, coords);
						
						socket.emit('setCanvasState', {
							status: "go",
							e: coords
						});
					}
				});
				canvas.addEventListener("mouseup", function(){
					if (!self.blocked && drawObj.isDrawing){
						drawObj.end(this);
						socket.emit('setCanvasState', {
							status: "end"
						});
					}
				});
			});
		}
		catch(error){
			console.error(error);
		}

	};

	Canvas.prototype = {
		preperArea: function(screen){
			screen.strokeStyle = '#000';
		    screen.lineJoin="round";
		    screen.lineCap="round";
			screen.fillStyle = "#00000";
			// screen.scale(0.5, 0.5);
		},
		updateUsers: function(gotUsers){
			var handle__html = "",
				template = "";

			this.users = gotUsers;

			template = Handlebars.compile($("#handle__user-tpl").innerHTML);
			handle__html = template({users: this.users.users});
			$("#handle__user-html").innerHTML = handle__html;

			console.log(this.users);
		}
	};	

	var User = function(canvas){
		this.listener = new Listener();
	}

	User.prototype = {
		setName : function(name){
			// this.name = name;
			// console.log(this)
			// console.log(JSON.stringify(this));
			// this.updateStorage(JSON.stringify(this));
		},
		updateStorage: function(data){
			var loc = window.localStorage;
			// console.log(loc);
			if (loc.getItem("drawUser") === null){
				loc.setItem("drawUser", JSON.stringify(data))
			}
			else{
				var tmpObj = JSON.parse(data),
				    userDataLocal = JSON.parse(loc.getItem("drawUser"));

				for (var key in tmpObj) {
				   //sprawdza takie same wartosci
				   if (userDataLocal.hasOwnProperty(key)) {
				   	if (userDataLocal[key] !== tmpObj[key] && typeof key !== "function")
				   	  userDataLocal[key] = tmpObj[key];
				   }
				}
				socket.emit("setUserData", loc.getItem("drawUser"));
			}
		}
	}

	function Draw(){
		this.isDrawing = false;
		this.x = 0;
		this.y = 0;
	};

	Draw.prototype = {
		start: function(canvas, e){
			var screen = canvas.getContext("2d"),
				x = e.x,
            	y = e.y;
			
			this.isDrawing = true;
			canvas.previousX = [];
			canvas.previousY = [];

			canvas.previousX.push(x);
			canvas.previousY.push(y);

			screen.lineWidth = 2;
		},
		go: function(canvas, e){
			var screen = canvas.getContext("2d"),
				x = e.x,
            	y = e.y;

        	screen.save;
			screen.beginPath();
			screen.moveTo(canvas.previousX[canvas.previousX.length-1], canvas.previousY[canvas.previousY.length-1]);
        	canvas.previousX.push(x);
			canvas.previousY.push(y);

			var thickness = canvas.previousX.length/5;

			if (thickness >= 2 && screen.lineWidth < 7 ){
				screen.lineWidth = thickness;	
			}
			else if(thickness >= 7){
				screen.lineWidth = 7;
			}
        	
        	// screen.lineTo(x, y);  
			screen.quadraticCurveTo(canvas.previousX[canvas.previousX.length-2], canvas.previousY[canvas.previousY.length-2], x, y);

        	screen.fill();
			screen.stroke();
			screen.restore();
		},
		end: function(canvas){
			var screen = canvas.getContext("2d");

			canvas.previousX.length = 0;
			canvas.previousY.length = 0;		

			this.isDrawing = false;
		}		
	};

	var Listener = function() {
		var self = this,
			canvas = Application.canvas;

	    this.KEYS = { SPACE: 32 };
	    this.action = {
	    	SPACEDOWN: false,
	    	MOUSEDOWN: false
	    }

	    window.addEventListener("keydown", function(e){
			if (e.keyCode === self.KEYS.SPACE){
				self.action.SPACEDOWN = true;

				if (self.action.MOUSEDOWN === false){
					// canvas.classList.add("grab");
					canvas.style.cursor = "move";
				}
			}
		}, false);

		window.addEventListener("keyup", function(e){
			if (e.keyCode === self.KEYS.SPACE){
				self.action.SPACEDOWN = false;

				canvas.style.cursor = "crosshair";
			}
		}, false);

		canvas.addEventListener("mousedown", function(e){
			if (self.action.SPACEDOWN === true && self.action.MOUSEDOWN === false){
			 	self.action.MOUSEDOWN = true;
			 	self.lastCoords = getCoordsFromEvent(e, canvas);
			 	Application.blocked = true;
			}
		}, false);

		canvas.addEventListener("mouseup", function(e){
			if (self.action.MOUSEDOWN === true){
			 	self.action.MOUSEDOWN = false;
			 	self.lastCoords = getCoordsFromEvent(e, canvas);
			 	Application.blocked = false;
			}
		}, false);

		canvas.addEventListener("mousemove", function(e){
			if (self.action.SPACEDOWN === true && self.action.MOUSEDOWN === true){
			 	self.translateCanvas(canvas, getCoordsFromEvent(e, canvas));
			}
		}, false);

	};

	Listener.prototype = {
		translateCanvas: function(canvas, coords){
			var ctx = canvas.getContext("2d"),
				width = canvas.width,
				height = canvas.height,
				movement = {
					x: coords.x - this.lastCoords.x,
					y: coords.y - this.lastCoords.y
				};

			var shiftContext = function(ctx, w, h, dx, dy) {
		        var imageData = ctx.getImageData(dx, dy, 1500, 1500);
		        
		        ctx.clearRect(0, 0, w, h);
		        ctx.putImageData(imageData, 0, 0);
		    }

		    shiftContext(ctx, 1500, 1500, -movement.x, -movement.y);   
		}
	}

	function createConnection(callback){
		var isConnected = false;
		socket.on('connect', function(){
			isConnected = true;
			callback();
		});

		socket.on('disconnect', function(){
			isConnected = false;
			console.error("connection closed")
			callback();
		});

		return isConnected;
	};

	function getCoordsFromEvent(e, area){
		return{
			x: e.pageX - area.offsetLeft,
			y: e.pageY - area.offsetTop
		}
	}

	window.onload = function(){
		Application = new Canvas ("#drawArea");
	};
})();

