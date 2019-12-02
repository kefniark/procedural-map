import { Engine } from "@babylonjs/core/Engines/engine"
import { Scene } from "@babylonjs/core/scene"
import { Vector3, Color3 } from "@babylonjs/core/Maths/math"
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera"
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
// import { GridMaterial } from "@babylonjs/materials/grid"
import "@babylonjs/core/Meshes/meshBuilder"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { SpriteManager } from "@babylonjs/core/Sprites/spriteManager"
import { Sprite } from "@babylonjs/core/Sprites/sprite"
import noisejs from "noisejs"
import { SquareGridWall, Color, clamp } from "coopa"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"

const canvas = document.getElementById("renderCanvas")
if (!canvas) throw new Error("Canvas not initialized")

function GET(parameterName: string) {
    var result = null,
        tmp = [];
    location.search
        .substr(1)
        .split("&")
        .forEach(function (item) {
          tmp = item.split("=");
          if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
        });
    return result;
}

const engine = new Engine(canvas as any)
const scene = new Scene(engine)
const camera = new FreeCamera("camera1", new Vector3(0, 5, -10), scene)
camera.position.x = 634
camera.position.y = 169
camera.position.z = 830
camera.setTarget(Vector3.Zero())
camera.attachControl(canvas, true)

// main settings
// import "@babylonjs/core/Debug/debugLayer"
// import "@babylonjs/inspector"
// scene.debugLayer.show()
let seed = Math.random()
const param = GET("seed")
if (param) seed = parseInt(param, 10)
const size = 512
const tileSize = 1.5
const amplitude = 256
const frequency = 0.01 / 5 / 96

// This creates a light, aiming 0,1,0 - to the sky (non-mesh)
const light = new HemisphericLight("light1", new Vector3(0, 1, 0), scene)
light.intensity = 1.2
light.direction.x = 0.1
light.direction.z = 0.1

// Create a material
const waterMat = new StandardMaterial("water", scene)
const palette = Color.germanPalette()
const wat = palette[10].rgb()
const waterTexture = new Texture("https://i.ibb.co/cgzWmjT/39278603-seamless-water-texture-abstract-pond-background.jpg", scene)
waterTexture.uScale = size
waterTexture.vScale = size
waterMat.diffuseTexture = waterTexture
waterMat.diffuseColor = new Color3(wat[0] / 255, wat[1] / 255, wat[2] / 255)
waterMat.alpha = 0.6
waterMat.specularColor = new Color3(0, 0, 0)

const material = new StandardMaterial("grass", scene)
const grassTexture = new Texture("./terrain.png", scene)
// grassTexture.uScale = size * tileSize;
// grassTexture.vScale = size * tileSize;
material.diffuseTexture = grassTexture
material.specularColor = new Color3(0, 0, 0)
// const mat = palette[3].rgb()
// material.diffuseColor = new Color3(mat[0] / 255, mat[1] / 255, mat[2] / 255)
// material.specularColor = new Color3(0.4, 0.4, 0.4)

// Our built-in 'sphere' shape. Params: name, subdivs, size, scene
// var sphere = Mesh.CreateSphere("sphere1", 16, 2, scene)
// sphere.position.y = 2
// sphere.material = material

// Render every frame
engine.runRenderLoop(() => {
	scene.render()
})

interface ITile {
	index: number
	height: number
	type: TerrainType
	u: number
	v: number
}

interface IBiome {
	id: TerrainType,
	name: string,
	humidity: number
}

enum TerrainType {
	Desert = 0,
	Forest = 1,
	Grass = 2,
	Mountain = 3,
	Sand = 4,
	Snow = 5,
	Underwater = 6
}

const textures: { [id: string]: { u: number, v: number } } = {
	"desert": { u: 0, v: 1 },
	"forest": { u: 0.25, v: 1 },
	"grass": { u: 0.5, v: 1 },
	"mountain": { u: 0.75, v: 1 },
	"sand": { u: 0, v: 0.75 },
	"snow": { u: 0.25, v: 0.75 },
	"underwater": { u: 0.5, v: 0.75 }
}

const regions = [
	{
		level: 0.28, name: "mountain", biomes: [
			{ id: 5, humidity: 0.75, name: "snow" },
			{ id: 3, humidity: 0, name: "mountain" }
		] as IBiome[]
	},
	{
		level: 0.1, name: "hill", biomes: [
			{ id: 1, humidity: 0.5, name: "forest" },
			{ id: 2, humidity: 0, name: "grass" }
		] as IBiome[]
	},
	{
		level: 0.022, name: "plain", biomes: [
			{ id: 1, humidity: 0.7, name: "forest" },
			{ id: 2, humidity: 0.1, name: "grass" },
			{ id: 0, humidity: 0, name: "desert" }
		] as IBiome[]
	},
	{
		level: 0.005, name: "beach", biomes: [
			{ id: 4, humidity: 0, name: "sand" }
		] as IBiome[]
	},
	{
		level: 0, name: "sea", biomes: [
			{ id: 6, humidity: 0, name: "underwater" }
		] as IBiome[]
	}
]

const moistureNoise = new (noisejs as any).Noise(seed)
function computeBiome(level: number, x: number, y: number) {
	let res: IBiome | undefined = undefined
	// console.log("Compute biome", level)
	for (let i = regions.length - 1; i >= 0; i--) {
		const reg = regions[i]
		if (reg.level > level) continue

		const humid = clamp(moistureNoise.perlin2(x / 15, y / 15) / 2 + 0.5, 0, 1)
		for (let j = reg.biomes.length - 1; j >= 0; j--) {
			if (reg.biomes[j].humidity > humid) continue
			res = reg.biomes[j]
		}
	}
	return res
}

const easeInCirc = (t: number) => 1 - Math.sqrt(1 - Math.pow(t, 2))
// const easeInQuart = (t: number) => t * t * t * t

const ground = Mesh.CreateGround("ground1", size * 2, size * 2, 2, scene)
ground.material = waterMat
ground.scaling.x = tileSize
ground.scaling.z = tileSize

const noise = new (noisejs as any).Noise(seed)
const grid = new SquareGridWall<ITile>(size, size, false, (i, j, type) => {
	if (type === 3) {
		const octaves: number[] = []
		const levels: number[] = []

		for (var oc = 0; oc < 6; oc++) {
			levels[oc] = Math.pow(2, oc)
			octaves[oc] = noise.perlin2(i * size * frequency * levels[oc], j * size * frequency * levels[oc]) / levels[oc]
		}

		const u = (i + 0.5) / size
		const v = 1 - (j + 0.5) / size
		const distance = clamp(Math.hypot(u - 0.5, v - 0.5) * 2, 0, 1)
		const mask = 1 - distance * distance

		// height normalize
		let height = clamp(octaves.reduce((a, b) => a + b, 0), -1, 1) * 0.5 + 0.5
		height = easeInCirc(height)
		height *= mask
		// console.log(height, mask)

		let biome = computeBiome(height, i, j)
		if (!biome) throw new Error("Unknown biome")
		if (!textures[biome.name]) throw new Error("Unknown biome : " + biome)

		// delinear
		height = height * amplitude

		return {
			height,
			index: i + 0.5 + (j + 0.5) * (size + 1),
			type: biome.id,
			u: textures[biome.name].u,
			v: textures[biome.name].v
			// u,
			// v
		} as ITile
	}
	return {
		height: 0,
		index: 0,
		type: 0,
		u: 0,
		v: 0
	} as ITile
})

const custom = new Mesh("custom", scene)
custom.material = material
custom.position.y = -3

const spriteManagerTrees = new SpriteManager("treesManager", "https://i.ibb.co/fkppPk8/bush-1.png", 50000, 512, scene);

const points: number[][] = []
const uvs: number[][] = []
const indices: number[] = []
for (let y = 0; y < grid.heightTile; y++) {
	for (let x = 0; x < grid.widthTile; x++) {
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

		points.push([topLeft.x * tileSize - size * tileSize, topLeftContent.height, topLeft.y * tileSize - size * tileSize])
		points.push([bottomLeft.x * tileSize - size * tileSize, bottomLeftContent.height, bottomLeft.y * tileSize - size * tileSize])
		points.push([topRight.x * tileSize - size * tileSize, topRightContent.height, topRight.y * tileSize - size * tileSize])
		points.push([bottomRight.x * tileSize - size * tileSize, bottomRightContent.height, bottomRight.y * tileSize - size * tileSize])

		indices.push(points.length - 4, points.length - 2, points.length - 3)
		indices.push(points.length - 1, points.length - 3, points.length - 2)

		uvs.push([topLeftContent.u, topLeftContent.v])
		uvs.push([topLeftContent.u, topLeftContent.v - 0.25])
		uvs.push([topLeftContent.u + 0.25, topLeftContent.v])
		uvs.push([topLeftContent.u + 0.25, topLeftContent.v - 0.25])
		// points.length
		// if (!points[topLeftContent.index]) {
		// 	points[topLeftContent.index] = [topLeft.x * tileSize - size * tileSize, topLeftContent.height, topLeft.y * tileSize - size * tileSize]
		// 	uvs[topLeftContent.index] = [topLeftContent.u, topLeftContent.v]
		// }
		// if (!points[bottomLeftContent.index]) {
		// 	points[bottomLeftContent.index] = [bottomLeft.x * tileSize - size * tileSize, bottomLeftContent.height, bottomLeft.y * tileSize - size * tileSize]
		// 	uvs[bottomLeftContent.index] = [bottomLeftContent.u, bottomLeftContent.v - 0.25]
		// }
		// if (!points[topRightContent.index]) {
		// 	points[topRightContent.index] = [topRight.x * tileSize - size * tileSize, topRightContent.height, topRight.y * tileSize - size * tileSize]
		// 	uvs[topRightContent.index] = [topRightContent.u + 0.25, topRightContent.v]
		// }
		// if (!points[bottomRightContent.index]) {
		// 	points[bottomRightContent.index] = [bottomRight.x * tileSize - size * tileSize, bottomRightContent.height, bottomRight.y * tileSize - size * tileSize]
		// 	uvs[bottomRightContent.index] = [bottomRightContent.u + 0.25, bottomRightContent.v - 0.25]
		// }

		// indices.push(topRightContent.index, bottomLeftContent.index, topLeftContent.index)
		// indices.push(topRightContent.index, bottomRightContent.index, bottomLeftContent.index)

		const avgHeight = (topLeftContent.height + bottomLeftContent.height + topRightContent.height + bottomRightContent.height) / 4
		if (avgHeight < 2.8) continue
		let threshold = 0.98
		if (topLeftContent.type === TerrainType.Forest) threshold = 0.08
		if (topLeftContent.type === TerrainType.Sand) threshold = 1
		if (topLeftContent.type === TerrainType.Snow) threshold = 1
		if (topLeftContent.type === TerrainType.Underwater) threshold = 1
		if (Math.random() < threshold) continue

		const tree = new Sprite("tree", spriteManagerTrees)
		tree.position.x = tile.x * tileSize - size * tileSize + Math.random() - 0.5
		tree.position.y = avgHeight - 0.5
		tree.position.z = tile.y * tileSize - size * tileSize + Math.random() - 0.5
		tree.size = 4
	}
}

// console.log('height range',
// 	Math.min(...points.map(p => p[1])),
// 	Math.max(...points.map(p => p[1]))
// )
// console.log(points, uvs)
const vertexData = new VertexData()
vertexData.positions = points.flat()
vertexData.indices = indices
vertexData.uvs = uvs.flat()

const normals: any[] = []
VertexData.ComputeNormals(vertexData.positions, indices, normals)
vertexData.normals = normals
vertexData.applyToMesh(custom)
