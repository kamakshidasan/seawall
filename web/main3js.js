let viewer;
let events = {
    'rotate': {
        pressed: false,
        initialPoint: []
    }
};
let tsunamiView;
let canvas2;
let restartTimer;
let canvas = document.createElement('canvas');
/*
Model setup
*/

let cmax = 20.0;
let cmin = -20.0;
let colors = [[ 0.        ,  0.        ,  0.3 ,  0.0       *(cmax-cmin)+cmin],
[ 0.        ,  0.        ,  0.48666667,  0.06666667*(cmax-cmin)+cmin],
[ 0.        ,  0.        ,  0.67333333,  0.13333333*(cmax-cmin)+cmin],
[ 0.        ,  0.        ,  0.86      ,  0.2       *(cmax-cmin)+cmin],
[ 0.06666667,  0.06666667,  1.        ,  0.26666667*(cmax-cmin)+cmin],
[ 0.33333333,  0.33333333,  1.        ,  0.33333333*(cmax-cmin)+cmin],
[ 0.6       ,  0.6       ,  1.        ,  0.4       *(cmax-cmin)+cmin],
[ 0.86666667,  0.86666667,  1.        ,  0.46666667*(cmax-cmin)+cmin],
[ 1.        ,  0.86666667,  0.86666667,  0.53333333*(cmax-cmin)+cmin],
[ 1.        ,  0.6       ,  0.6       ,  0.6       *(cmax-cmin)+cmin],
[ 1.        ,  0.33333333,  0.33333333,  0.66666667*(cmax-cmin)+cmin],
[ 1.        ,  0.06666667,  0.06666667,  0.73333333*(cmax-cmin)+cmin],
[ 0.9       ,  0.        ,  0.        ,  0.8       *(cmax-cmin)+cmin],
[ 0.76666667,  0.        ,  0.        ,  0.86666667*(cmax-cmin)+cmin],
[ 0.63333333,  0.        ,  0.        ,  0.93333333*(cmax-cmin)+cmin],
[ 0.5       ,  0.        ,  0.        ,  1.0       *(cmax-cmin)+cmin]]
let data = {
    bathymetry: '../tsunamilab/assets/bathymetry.png',
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
    waveWidth: parseInt(2159*2),
    waveHeight: parseInt(960*2),
    displayWidth: parseInt(2159*2),
    displayHeight: parseInt(960*2),
    xmin: -179.99166666666667,
    xmax: 179.67499999999998,
    ymin: -79.991666666666646,
    ymax: 79.841666666666654,
    isPeriodic: true,
    canvas:canvas,
}

let output = {
    stopTime: 30 * 60 * 60,
    displayOption: 'heights',
    loop: true,
    colormap: colors
};

let niterations = 0;

let lifeCycle = {
    dataWasLoaded: (model) => {

        document.body.appendChild(model.canvas);
        init();



    },
    modelStepDidFinish: (model, controller) => {
        if (model.discretization.stepNumber % 1000 == 0) {
            // console.log(model.currentTime/60/60, controller.stopTime/60/60);
        }
        niterations = niterations + 1;


        if (niterations % 10 == 0) {
            niterations = 0;
            return false;
        }
        else {
            return true;
        }

    },

    modelSimulationWillStart: (model, controller) => {
        controller.paused = true;

        // para salir del lock de stepnumber = 0 y paused en primera iteración
        model.discretization.stepNumber += 1;


        model.displayPColor();

        clearTimeout(restartTimer);

        restartTimer = setTimeout(() =>{
            controller.paused = false;
        }, 1000);


    }
}

let thismodel;

/* 3js functoins */

var camera, scene, renderer;
var earth = {};
var simulation = {};

var geometry, material, earthMesh;
var controls;

function init() {

	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 10 );
	camera.position.z = 1;

    scene = new THREE.Scene();

    controls = new THREE.OrbitControls( camera );
    camera.position.set( 0, 0, 1 );
    controls.update();

    earth.geometry = new THREE.SphereGeometry( 0.3, 32, 32 );
    loader = new THREE.TextureLoader().load( "NE2_ps_flat.jpg",function(texture){
        earth.texture = texture;
        earth.material = new THREE.MeshBasicMaterial({map: earth.texture});
        earth.mesh = new THREE.Mesh( earth.geometry, earth.material );
        scene.add( earth.mesh );
        animate();

    } );
    var ysouth = Math.PI/2 - data.ymin*Math.PI/180.0;
    var ynorth = Math.PI/2 - data.ymax*Math.PI/180.0;


    simulation.geometry = new THREE.SphereGeometry( 0.31, 32, 32,	0, Math.PI*2.0,	ynorth, ysouth-ynorth)
    simulation.texture = new THREE.CanvasTexture( thismodel.model.canvas );
    simulation.material = new THREE.MeshBasicMaterial({color:0xffffff, map: simulation.texture, transparent: true});
    simulation.mesh = new THREE.Mesh( simulation.geometry, simulation.material );
    scene.add( simulation.mesh );

    renderer = new THREE.WebGLRenderer( { antialias: true, canvas:document.getElementById('3jscanvas') } );
    renderer.setSize( window.innerWidth, window.innerHeight );

    renderer.render(scene, camera);

}

function animate() {

	requestAnimationFrame( animate );

    simulation.mesh.material.map.needsUpdate = true;

	controls.update();

	renderer.render( scene, camera );

}


thismodel = new NAMI.app(data, output, lifeCycle);
