import config from './config/config.js'
import app from './server/express.js'
import mongoose from 'mongoose'

import dns from 'dns'
dns.setServers(['8.8.8.8'])

mongoose.Promise = global.Promise
mongoose
  .connect(config.mongoUri)
  .then(() => console.log('Connected to the database!'))
  .catch((err) => console.error('Unable to connect to database:', err.message))


mongoose.connection.on('error', (err) => {
  console.error(`MongoDB connection error: ${err.message}`)
})

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to My Portfolio application.' })
})

app.listen(config.port, (err) => {
  if (err) console.log(err)
  console.info('Server started on port %s.', config.port)
})
