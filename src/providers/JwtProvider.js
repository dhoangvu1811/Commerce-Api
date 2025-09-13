import jwt from 'jsonwebtoken'
import { env } from '~/config/environment'

// Tạo Access Token
const generateAccessToken = (userData) => {
  return jwt.sign(
    {
      _id: userData._id,
      email: userData.email,
      role: userData.role
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN || '15m' }
  )
}

// Tạo Refresh Token
const generateRefreshToken = (userData) => {
  return jwt.sign(
    {
      _id: userData._id
    },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN || '7d' }
  )
}

// Verify Access Token
const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET)
}

// Verify Refresh Token
const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET)
}

// Decode token không verify (để debug hoặc lấy thông tin)
const decodeToken = (token) => {
  return jwt.decode(token)
}

export const JwtProvider = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken
}
