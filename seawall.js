"use strict";

var seawall = SAGE2_WebGLApp.extend({

	init: function(data) {
		// Create a canvas into the DOM
		this.WebGLAppInit('canvas', data);

		// Create a video element into the DOM
		//this.SAGE2Init('canvas', data);
		//this.canvasElement = document.getElementById("div" + data.id);

		// Set the background to black
		this.element.style.backgroundColor = 'black';

		this.renderer = null;
		this.camera   = null;
		this.scene    = null;
		this.ready    = null;

		this.cameraCube = null;
		this.sceneCube  = null;
		this.dragging   = null;
		this.rotating   = null;

		this.element.id = "div" + data.id;
		this.frame  = 0;
		this.width  = this.element.clientWidth;
		this.height = this.element.clientHeight;
		this.dragging = false;
		this.ready    = false;
		this.rotating = false;
		
		this.canvasElement = document.createElement('canvas');
		this.canvas.appendChild(this.canvasElement);
		this.canvasElement.width = this.width;
		this.canvasElement.height = this.height;

		// add tsunami parameters
		this.initializeTsunami(data);
		this.thismodel = new NAMI.app(this.initParameters, this.output, this.lifeCycle);

	},

	initialize: function(date) {
		console.log("initialize ctm");
		// CAMERA
		this.camera = new THREE.PerspectiveCamera(25, this.width / this.height, 1, 10000);
		this.camera.position.set(185, 40, 170);

		this.orbitControls = new THREE.OrbitControls(this.camera, this.element);
		this.orbitControls.maxPolarAngle = Math.PI / 2;
		this.orbitControls.minDistance = 200;
		this.orbitControls.maxDistance = 500;
		this.orbitControls.autoRotate  = true;
		this.orbitControls.zoomSpeed   = 0.1;
		this.orbitControls.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

		// SCENE
		this.scene = new THREE.Scene();

		// SKYBOX
		this.sceneCube  = new THREE.Scene();
		this.cameraCube = new THREE.PerspectiveCamera(25, this.width / this.height, 1, 10000);
		this.sceneCube.add(this.cameraCube);


		// Texture cube
		var cubeLoader = new THREE.CubeTextureLoader();
		var r    = this.resrcPath + "textures/";
		var urls = [r + "px.jpg", r + "nx.jpg", r + "py.jpg", r + "ny.jpg", r + "pz.jpg", r + "nz.jpg"];
		var textureCube = cubeLoader.load(urls);

		var shader = THREE.ShaderLib.cube;
		shader.uniforms.tCube.value = textureCube;

		var material = new THREE.ShaderMaterial({
			fragmentShader: shader.fragmentShader,
			vertexShader: shader.vertexShader,
			uniforms: shader.uniforms,
			depthWrite: false,
			side: THREE.BackSide
		});

		var mesh = new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100), material);
		this.sceneCube.add(mesh);

		// LIGHTS
		var light = new THREE.PointLight(0xffffff, 1);
		light.position.set(2, 5, 1);
		light.position.multiplyScalar(30);
		this.scene.add(light);

		var light2 = new THREE.PointLight(0xffffff, 0.75);
		light2.position.set(-12, 4.6, 2.4);
		light2.position.multiplyScalar(30);
		this.scene.add(light2);

		this.scene.add(new THREE.AmbientLight(0x050505));

		var _this = this;
		_this.earth = {};
		_this.simulation = {};

		// setup scene for earth		
		var position = new THREE.Vector3(0, 0, 0);
		var scale    = new THREE.Vector3(100, 100, 100);

		_this.earth.geometry = new THREE.SphereGeometry( 0.3, 32, 32 );

		var earthImage = this.resrcPath + "images/" + "NE2_ps_flat.jpg";
		var loader = new THREE.TextureLoader().load(earthImage, function(texture){
		    _this.earth.texture = texture;
		    _this.earth.material = new THREE.MeshBasicMaterial({map: _this.earth.texture});
		    _this.earth.mesh = new THREE.Mesh( _this.earth.geometry, _this.earth.material );
			_this.earth.mesh.position.copy(position);
			_this.earth.mesh.scale.copy(scale);
			_this.scene.add(_this.earth.mesh);
		    _this.refresh(date);

		} );

		console.log(_this);

		// setup scene for simulation
		this.ysouth = Math.PI/2 - _this.ymin*Math.PI/180.0;
		this.ynorth = Math.PI/2 - _this.ymax*Math.PI/180.0;

		_this.simulation.geometry = new THREE.SphereGeometry( 0.31, 32, 32, 0, Math.PI*2.0, this.ynorth, this.ysouth-this.ynorth)
		_this.simulation.texture = new THREE.CanvasTexture(_this.canvasElement);
		_this.simulation.material = new THREE.MeshBasicMaterial({color:0xffffff, map: _this.simulation.texture, transparent: true});
		_this.simulation.mesh = new THREE.Mesh( _this.simulation.geometry, _this.simulation.material );
		_this.simulation.mesh.position.copy(position);
		_this.simulation.mesh.scale.copy(scale);
		_this.scene.add(_this.simulation.mesh );


		// RENDERER
		if (this.renderer == null) {
			this.renderer = new THREE.WebGLRenderer({
				canvas: this.canvas,
				antialias: true
			});
			this.renderer.setSize(this.width, this.height);
			this.renderer.autoClear = false;

			this.renderer.gammaInput  = true;
			this.renderer.gammaOutput = true;
		}

		this.ready = true;
		this.canvas.parentNode.appendChild(this.canvasElement);
		this.canvas.parentNode.style.position = "relative";
		this.canvas.style.position = "absolute";
		this.canvasElement.style.position = "absolute";
		this.canvasElement.style = this.canvas.style.cssText;
		this.canvasElement.style.top = '0px';
		this.canvas.style.zIndex = 0;

		// draw!
		this.resize(date);
	},

	load: function(date) {
		// nothing
	},

	draw: function(date) {
		this.animate();
	},

	// Local Threejs specific resize calls.
	resizeApp: function(resizeData) {
		if (this.renderer != null && this.camera != null) {
			this.renderer.setSize(this.canvas.width, this.canvas.height);

			this.camera.setViewOffset(this.sage2_width, this.sage2_height,
				resizeData.leftViewOffset, resizeData.topViewOffset,
				resizeData.localWidth, resizeData.localHeight);
			this.cameraCube.setViewOffset(this.sage2_width, this.sage2_height,
				resizeData.leftViewOffset, resizeData.topViewOffset,
				resizeData.localWidth, resizeData.localHeight);
		}
	},

	animate: function() {
		if (this.ready) {
			requestAnimationFrame(this.animate.bind(this));
			this.simulation.mesh.material.map.needsUpdate = true;
			this.orbitControls.update();
			this.renderer.clear();
			this.renderer.render(this.sceneCube, this.cameraCube);
			this.renderer.render(this.scene, this.camera);
		}

	},

	event: function(eventType, position, user_id, data, date) {
		if (this.ready) {
			if (eventType === "pointerPress" && (data.button === "left")) {
				this.dragging = true;
				this.orbitControls.mouseDown(position.x, position.y, 0);
			} else if (eventType === "pointerMove" && this.dragging) {
				this.orbitControls.mouseMove(position.x, position.y);
				this.refresh(date);
			} else if (eventType === "pointerRelease" && (data.button === "left")) {
				this.dragging = false;
			}

			if (eventType === "pointerScroll") {
				this.orbitControls.scale(data.wheelDelta);
				this.refresh(date);
			}

			if (eventType === "keyboard") {
				if (data.character === " ") {
					this.rotating = !this.rotating;
					this.orbitControls.autoRotate = this.rotating;
					this.refresh(date);
				}
			}

			if (eventType === "specialKey") {
				if (data.code === 37 && data.state === "down") { // left
					this.orbitControls.pan(this.orbitControls.keyPanSpeed, 0);
					this.orbitControls.update();
					this.refresh(date);
				} else if (data.code === 38 && data.state === "down") { // up
					this.orbitControls.pan(0, this.orbitControls.keyPanSpeed);
					this.orbitControls.update();
					this.refresh(date);
				} else if (data.code === 39 && data.state === "down") { // right
					this.orbitControls.pan(-this.orbitControls.keyPanSpeed, 0);
					this.orbitControls.update();
					this.refresh(date);
				} else if (data.code === 40 && data.state === "down") { // down
					this.orbitControls.pan(0, -this.orbitControls.keyPanSpeed);
					this.orbitControls.update();
					this.refresh(date);
				}
			} else if (eventType === "widgetEvent") {
				switch (data.identifier) {
					case "Up":
						// up
						this.orbitControls.pan(0, this.orbitControls.keyPanSpeed);
						this.orbitControls.update();
						break;
					case "Down":
						// down
						this.orbitControls.pan(0, -this.orbitControls.keyPanSpeed);
						this.orbitControls.update();
						break;
					case "Left":
						// left
						this.orbitControls.pan(this.orbitControls.keyPanSpeed, 0);
						this.orbitControls.update();
						break;
					case "Right":
						// right
						this.orbitControls.pan(-this.orbitControls.keyPanSpeed, 0);
						this.orbitControls.update();
						break;
					case "ZoomIn":
						this.orbitControls.scale(4);
						break;
					case "ZoomOut":
						this.orbitControls.scale(-4);
						break;
					case "Loop":
						this.rotating = !this.rotating;
						this.orbitControls.autoRotate = this.rotating;
						break;
					default:
						console.log("No handler for:", data.identifier);
						return;
				}
				this.refresh(date);
			}
		}
	},

	initializeTsunami: function(data){

		var _this = this;
	
		this.cmax = 20.0;
		this.cmin = -20.0;
		this.colors = [[ 0.        ,  0.        ,  0.3 ,  0.0       *(this.cmax-this.cmin)+this.cmin],
		[ 0.        ,  0.        ,  0.48666667,  0.06666667*(this.cmax-this.cmin)+this.cmin],
		[ 0.        ,  0.        ,  0.67333333,  0.13333333*(this.cmax-this.cmin)+this.cmin],
		[ 0.        ,  0.        ,  0.86      ,  0.2       *(this.cmax-this.cmin)+this.cmin],
		[ 0.06666667,  0.06666667,  1.        ,  0.26666667*(this.cmax-this.cmin)+this.cmin],
		[ 0.33333333,  0.33333333,  1.        ,  0.33333333*(this.cmax-this.cmin)+this.cmin],
		[ 0.6       ,  0.6       ,  1.        ,  0.4       *(this.cmax-this.cmin)+this.cmin],
		[ 0.86666667,  0.86666667,  1.        ,  0.46666667*(this.cmax-this.cmin)+this.cmin],
		[ 1.        ,  0.86666667,  0.86666667,  0.53333333*(this.cmax-this.cmin)+this.cmin],
		[ 1.        ,  0.6       ,  0.6       ,  0.6       *(this.cmax-this.cmin)+this.cmin],
		[ 1.        ,  0.33333333,  0.33333333,  0.66666667*(this.cmax-this.cmin)+this.cmin],
		[ 1.        ,  0.06666667,  0.06666667,  0.73333333*(this.cmax-this.cmin)+this.cmin],
		[ 0.9       ,  0.        ,  0.        ,  0.8       *(this.cmax-this.cmin)+this.cmin],
		[ 0.76666667,  0.        ,  0.        ,  0.86666667*(this.cmax-this.cmin)+this.cmin],
		[ 0.63333333,  0.        ,  0.        ,  0.93333333*(this.cmax-this.cmin)+this.cmin],
		[ 0.5       ,  0.        ,  0.        ,  1.0       *(this.cmax-this.cmin)+this.cmin]]

		this.restartTimer = null;

		this.initParameters = {
			bathymetry: this.resrcPath + "images/" + "bathymetry.png",
			bathymetryMetadata: {
				zmin: -6709,
				zmax: 10684
			},
			asteroid:{
				ce: -100, // centroid easting °
				cn: 0.0,  // centroid northing °
				R_i: 250,   // m
				v_i: 20000, // m/s
				rho_i: 3.32 // g/cm3
			},
			coordinates: 'spherical',
			waveWidth: parseInt(2159),
			waveHeight: parseInt(960),
			displayWidth: parseInt(2159),
			displayHeight: parseInt(960),
			xmin: -179.99166666666667,
			xmax: 179.67499999999998,
			ymin: -79.991666666666646,
			ymax: 79.841666666666654,
			isPeriodic: true,
			canvas: this.canvasElement
		}

		_this.ymin = this.initParameters.ymin;
		_this.ymax = this.initParameters.ymax;

		this.output = {
			stopTime: 30 * 60 * 60,
			displayOption: 'heights',
			loop: true,
			colormap: this.colors
		};

		this.niterations = 0;

		this.lifeCycle = {
			dataWasLoaded: (model) => {
				// build the app
				this.initialize(data.date);

				this.controls.addButton({type: "prev", position: 1, identifier: "Left"});
				this.controls.addButton({type: "next", position: 7, identifier: "Right"});
				this.controls.addButton({type: "up-arrow", position: 4, identifier: "Up"});
				this.controls.addButton({type: "down-arrow", position: 10, identifier: "Down"});
				this.controls.addButton({type: "zoom-in", position: 12, identifier: "ZoomIn"});
				this.controls.addButton({type: "zoom-out", position: 11, identifier: "ZoomOut"});
				this.controls.addButton({type: "loop", position: 2, identifier: "Loop"});
				this.controls.finishedAddingControls();

				this.resizeCanvas();

				this.ready = true;
				this.refresh(data.date);
				
			},
			modelStepDidFinish: (model, controller) => {
				if (model.discretization.stepNumber % 1000 == 0) {
				    // console.log(model.currentTime/60/60, controller.stopTime/60/60);
				}
				this.niterations ++;

				if (this.niterations % 10 == 0) {
				    this.niterations = 0;
				    return false;					
					console.log("Ten iterations got finished");
				}
				else {
				    return true;
				}

			},

			modelSimulationWillStart: (model, controller) => {
				console.log("simulation has started");
				controller.paused = true;
				
				// para salir del lock de stepnumber = 0 y paused en primera iteración
				model.discretization.stepNumber += 1;

				model.displayPColor();

				clearTimeout(this.restartTimer);

				this.restartTimer = setTimeout(() =>{
				    controller.paused = false;
				}, 1000);

		
			}
		}

		this.thismodel = null;

	}


});
