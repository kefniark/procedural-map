import commonjs from "rollup-plugin-commonjs"
import resolve from "rollup-plugin-node-resolve"
import typescript from "rollup-plugin-typescript"
import { terser } from "rollup-plugin-terser";
import pkg from "./package.json"

export default {
	input: "src/index.ts",
	output: [
		{
			file: pkg.module,
			format: "esm"
		}
	],
	plugins: [
		typescript(),
		resolve(),
		commonjs(),
		terser()
	]
}
