const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const https = require('https')
const querystring = require('querystring')

const secret = require(path.join(__dirname, 'WARNING-SECRET-API-KEY.json'))

const hash = crypto.createHash('md5')

const saveOutput = (body, timestamp) => {
	const outfilePath = path.join(__dirname, `${timestamp}.output.json`)
	const jsonOutput = JSON.stringify(JSON.parse(body), null, 2)
	fs.writeFileSync(outfilePath, jsonOutput)
	console.log(`Saved: ${outfilePath}`)
}

const post = text => {
	return new Promise((resolve, reject) => {
		const unixTimeSeconds = Math.floor(new Date().getTime() / 1000)
		const signature = secret.api_key + unixTimeSeconds
		const hashedSignature = hash.update(signature).digest('hex')
		const postData = querystring.stringify({text})

		const options = {
			method: 'POST',
			host: 'api.readable.io',
			path: '/api/text',
			headers: {
				API_SIGNATURE: hashedSignature,
				API_REQUEST_TIME: unixTimeSeconds,
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': Buffer.byteLength(postData)
			}
		}

		const req = https.request(options, res => {
			const serverError = res.statusCode >= 400

			let body = ''

			res.setEncoding('utf8')

			res.on('data', chunk => {
				body += chunk
			})

			res.on('end', () => {
				if (serverError) {
					return reject(body)
				}

				saveOutput(body, unixTimeSeconds)
				resolve(body)
			})

			res.on('close', () => {
				if (serverError) {
					return reject(body)
				}

				saveOutput(body, unixTimeSeconds)
				resolve(body)
			})

			res.on('error', err => {
				console.error(err)
				console.error(body)
				saveOutput(body, unixTimeSeconds)
				reject(err)
			})
		})

		req.write(postData)
		req.end()
	})
}

const inputFilePath = path.join(__dirname, 'text-input.txt')
const text = fs.readFileSync(inputFilePath, 'UTF8').toString()

post(text).then(() => {
	console.log('Exiting')
}).catch(err => {
	console.error(err)
})
