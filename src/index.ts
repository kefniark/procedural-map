import { Engine } from "@babylonjs/core/Engines/engine"
import { Scene } from "@babylonjs/core/scene"
import { Vector3, Color3 } from "@babylonjs/core/Maths/math"
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera"
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
// import { GridMaterial } from "@babylonjs/materials/grid"
import noisejs from "noisejs"
import { SquareGridWall, Color } from "coopa"

import "@babylonjs/core/Meshes/meshBuilder"

import "@babylonjs/core/Debug/debugLayer"
import "@babylonjs/inspector"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { SpriteManager } from "@babylonjs/core/Sprites/spriteManager"
import { Sprite } from "@babylonjs/core/Sprites/sprite"

const canvas = document.getElementById("renderCanvas")
if (!canvas) throw new Error("Canvas not initialized")

const engine = new Engine(canvas as any)
var scene = new Scene(engine)
var camera = new FreeCamera("camera1", new Vector3(0, 5, -10), scene)
camera.position.x = -260
camera.position.y = 25.7
camera.position.z = 116
camera.setTarget(Vector3.Zero())
camera.attachControl(canvas, true)

// main settings
scene.debugLayer.show()
const seed = Math.random()
const size = 96
const tileSize = 3
const amplitude = 8
const frequency = 0.05 / 96

// This creates a light, aiming 0,1,0 - to the sky (non-mesh)
var light = new HemisphericLight("light1", new Vector3(0, 1, 0), scene)
light.intensity = 0.7

// Create a material
var waterMat = new StandardMaterial("water", scene)
const palette = Color.germanPalette()
const wat = palette[10].rgb()
waterMat.diffuseColor = new Color3(wat[0] / 255, wat[1] / 255, wat[2] / 255)
waterMat.alpha = 0.6
waterMat.specularColor = new Color3(0.4, 0.4, 0.4)

var material = new StandardMaterial("grid", scene)
const mat = palette[3].rgb()
material.diffuseColor = new Color3(mat[0] / 255, mat[1] / 255, mat[2] / 255)
material.specularColor = new Color3(0.4, 0.4, 0.4)

// Our built-in 'sphere' shape. Params: name, subdivs, size, scene
var sphere = Mesh.CreateSphere("sphere1", 16, 2, scene)
sphere.position.y = 2
sphere.material = material

// Render every frame
engine.runRenderLoop(() => {
	scene.render()
})

interface ITile {
	index: number
	height: number
	type: number
}

var ground = Mesh.CreateGround("ground1", size * 2, size * 2, 2, scene)
ground.material = waterMat
ground.scaling.x = tileSize
ground.scaling.z = tileSize

const noise = new (noisejs as any).Noise(seed)
const grid = new SquareGridWall<ITile>(size, size, false, (i, j, type) => {
	if (type === 3) {
		const octave1 = noise.perlin2(i * size * frequency, j * size * frequency) * amplitude
		const octave2 = noise.perlin2(i * size * frequency / 2, j * size * frequency / 2) * amplitude / 4
		const octave3 = noise.perlin2(i * size * frequency / 4, j * size * frequency / 4) * amplitude / 8
		return {
			height: (octave1 + octave2 + octave3) * (octave1 + octave2 + octave3),
			index: i + 0.5 + (j + 0.5) * (size + 1),
			type: 0
		} as ITile
	}
	return {
		height: 0,
		index: 0,
		type: 0
	} as ITile
})

const custom = new Mesh("custom", scene)
custom.material = material
custom.position.y = -2.5

var spriteManagerTrees = new SpriteManager("treesManager", "https://i.ibb.co/fkppPk8/bush-1.png", 10000, 512, scene);

var points: number[][] = []
var indices: number[] = []
for (var y = 0; y < grid.heightTile; y++) {
	for (var x = 0; x < grid.widthTile; x++) {
		const tile = grid.getTile(x, y)

		const topLeft = tile.leftWall().upWall()
		const topLeftContent = topLeft.content()
		const bottomLeft = tile.leftWall().downWall()
		const bottomLeftContent = bottomLeft.content()
		const topRight = tile.rightWall().upWall()
		const topRightContent = topRight.content()
		const bottomRight = tile.rightWall().downWall()
		const bottomRightContent = bottomRight.content()

		if (!topLeftContent) continue
		if (!bottomLeftContent) continue
		if (!topRightContent) continue
		if (!bottomRightContent) continue

		if (!points[topLeftContent.index])
			points[topLeftContent.index] = [topLeft.x * tileSize - size * tileSize, topLeftContent.height, topLeft.y * tileSize - size * tileSize]
		if (!points[bottomLeftContent.index])
			points[bottomLeftContent.index] = [bottomLeft.x * tileSize - size * tileSize, bottomLeftContent.height, bottomLeft.y * tileSize - size * tileSize]
		if (!points[topRightContent.index])
			points[topRightContent.index] = [topRight.x * tileSize - size * tileSize, topRightContent.height, topRight.y * tileSize - size * tileSize]
		if (!points[bottomRightContent.index])
			points[bottomRightContent.index] = [bottomRight.x * tileSize - size * tileSize, bottomRightContent.height, bottomRight.y * tileSize - size * tileSize]

		indices.push(topRightContent.index, bottomLeftContent.index, topLeftContent.index)
		indices.push(topRightContent.index, bottomRightContent.index, bottomLeftContent.index)

		const avgHeight = (topLeftContent.height + bottomLeftContent.height + topRightContent.height + bottomRightContent.height) / 4
		if (avgHeight < 2.8) continue
		if (Math.random() < 0.6) continue
		const tree = new Sprite("tree", spriteManagerTrees)
		tree.position.x = tile.x * tileSize - size * tileSize + Math.random() - 0.5
		tree.position.y = avgHeight - 0.5
		tree.position.z = tile.y * tileSize - size * tileSize + Math.random() - 0.5
		tree.size = 4
	}
}

var vertexData = new VertexData()
vertexData.positions = points.flat()
vertexData.indices = indices

const normals: any[] = []
VertexData.ComputeNormals(vertexData.positions, indices, normals)
vertexData.normals = normals
vertexData.applyToMesh(custom)
