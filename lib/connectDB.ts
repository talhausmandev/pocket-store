import mongoose, { type ConnectOptions } from "mongoose"

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local")
}

interface Cached {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

const globalWithMongoose = global as typeof globalThis & {
  mongoose?: Cached
}

let cached = globalWithMongoose.mongoose

if (!cached) {
  cached = globalWithMongoose.mongoose = { conn: null, promise: null }
}

const connectDB = async () => {
  if (cached?.conn) {
    return cached.conn
  }

  if (!cached?.promise) {
    const opts: ConnectOptions = {
      bufferCommands: false,
    }

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => {
      console.log("Connected to DB ✅")
      return mongooseInstance
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e as Error
  }

  return cached.conn
}

export default connectDB
