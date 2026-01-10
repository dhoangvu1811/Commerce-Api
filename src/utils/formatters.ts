/**
 * Data Formatters
 * Các hàm format dữ liệu
 */

import { pick } from 'lodash'
import type { User, PublicUser } from '~/types/user.types.js'

/**
 * Chuyển đổi chuỗi thành slug URL-friendly
 * @param {string} val - Chuỗi cần chuyển đổi
 * @returns {string} Slug đã được format
 * @example slugify('Hello World') // 'hello-world'
 */
export const slugify = (val: string | undefined | null): string => {
  if (!val) return ''
  return String(val)
    .normalize('NFKD') // split accented characters into their base characters and diacritical marks
    .replace(/[\u0300-\u036f]/g, '') // remove all the accents
    .trim() // trim leading or trailing whitespace
    .toLowerCase() // convert to lowercase
    .replace(/[^a-z0-9 -]/g, '') // remove non-alphanumeric characters
    .replace(/\s+/g, '-') // replace spaces with hyphens
    .replace(/-+/g, '-') // remove consecutive hyphens
}

/**
 * Lấy một số trường cụ thể từ user object để tránh trả về dữ liệu nhạy cảm
 * @param {User | null | undefined} user - User object
 * @returns {PublicUser | Record<string, never>} User object đã lọc hoặc object rỗng
 */
export const pickUser = (user: User | null | undefined): PublicUser | Record<string, never> => {
  if (!user) return {}
  return pick(user, [
    '_id',
    'email',
    'userName',
    'displayName',
    'avatar',
    'role',
    'isActive',
    'createdAt',
    'updatedAt'
  ]) as PublicUser
}
