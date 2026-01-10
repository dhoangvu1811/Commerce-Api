/**
 * MongoDB operations type definitions
 */

import type { ObjectId, ClientSession, WithId, Document } from 'mongodb'

/**
 * Options cho các operations có thể sử dụng transaction
 */
export interface TransactionOptions {
  session?: ClientSession
}

/**
 * Kết quả insert operation
 */
export interface InsertResult {
  acknowledged: boolean
  insertedId: ObjectId
}

/**
 * Kết quả update operation
 */
export interface UpdateResult {
  acknowledged: boolean
  matchedCount: number
  modifiedCount: number
  upsertedCount: number
  upsertedId?: ObjectId
}

/**
 * Kết quả delete operation
 */
export interface DeleteResult {
  acknowledged: boolean
  deletedCount: number
}

/**
 * Base model interface cho tất cả models
 */
export interface IBaseModel<T extends Document> {
  createNew: (
    data: Partial<T>,
    options?: TransactionOptions
  ) => Promise<WithId<T>>
  findOneById: (id: string) => Promise<WithId<T> | null>
  update: (
    id: string,
    data: Partial<T>,
    options?: TransactionOptions
  ) => Promise<WithId<T> | null>
  deleteOneById: (
    id: string,
    options?: TransactionOptions
  ) => Promise<DeleteResult>
}

/**
 * Pagination query params
 */
export interface PaginationParams {
  page?: number
  itemsPerPage?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * MongoDB sort direction
 */
export type MongoSortDirection = 1 | -1

/**
 * MongoDB sort options object
 */
export type MongoSortOptions = Record<string, MongoSortDirection>

/**
 * Generic filter type
 */
export type MongoFilter<T> = {
  [K in keyof T]?:
    | T[K]
    | {
        $regex?: RegExp
        $in?: T[K][]
        $gte?: T[K]
        $lte?: T[K]
        $gt?: T[K]
        $lt?: T[K]
      }
}

/**
 * Aggregation pipeline stage
 */
export type AggregatePipelineStage =
  | { $match: Record<string, unknown> }
  | { $group: Record<string, unknown> }
  | { $sort: MongoSortOptions }
  | { $skip: number }
  | { $limit: number }
  | { $lookup: LookupStage }
  | { $unwind: string | UnwindStage }
  | { $project: Record<string, unknown> }
  | { $count: string }

/**
 * Lookup stage options
 */
export interface LookupStage {
  from: string
  localField: string
  foreignField: string
  as: string
}

/**
 * Unwind stage options
 */
export interface UnwindStage {
  path: string
  preserveNullAndEmptyArrays?: boolean
}
