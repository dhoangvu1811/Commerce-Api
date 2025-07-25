import express from 'express'

const app = express()

app.get('/', (req, res) => {
  res.send('Hello World')
})

app.listen({ port: 8017 }, () => {
  console.log('Server is running on http://localhost:8017')
})
