import { StatusCodes } from 'http-status-codes'
import { productService } from '~/services/productService'

const createNew = async (req, res, next) => {
  try {
    const createProduct = await productService.createNew(req.body)

    res.status(StatusCodes.CREATED).json({
      code: StatusCodes.CREATED,
      message: 'Tạo sản phẩm thành công',
      data: createProduct
    })
  } catch (error) {
    next(error)
  }
}

const getDetails = async (req, res, next) => {
  try {
    const productId = req.params.id

    const product = await productService.getDetails(productId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy chi tiết sản phẩm thành công',
      data: product
    })
  } catch (error) {
    next(error)
  }
}

const update = async (req, res, next) => {
  try {
    const productId = req.params.id

    const updatedProduct = await productService.update(productId, req.body)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Cập nhật sản phẩm thành công',
      data: updatedProduct
    })
  } catch (error) {
    next(error)
  }
}

const deleteProduct = async (req, res, next) => {
  try {
    const productId = req.params.id

    const result = await productService.deleteProduct(productId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Xóa sản phẩm thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const deleteSelectedProducts = async (req, res, next) => {
  try {
    const { data } = req.body

    const result = await productService.deleteSelectedProducts(data.productIds)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Xóa các sản phẩm được chọn thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getProducts = async (req, res, next) => {
  try {
    const { page, itemsPerPage, search, type, sort } = req.query
    const queryFilter = {
      search,
      type,
      sort
    }

    const result = await productService.getProducts(
      page,
      itemsPerPage,
      queryFilter
    )

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách sản phẩm thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getAllTypes = async (req, res, next) => {
  try {
    const result = await productService.getAllTypes()

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách loại sản phẩm thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const uploadImage = async (req, res, next) => {
  try {
    // Kiểm tra xem có file được upload không
    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        code: StatusCodes.BAD_REQUEST,
        message: 'Vui lòng chọn ảnh để upload',
        data: null
      })
    }

    // Upload ảnh lên Cloudinary thông qua service
    const uploadResult = await productService.uploadImage(
      req.file.buffer,
      'products'
    )

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Upload ảnh thành công',
      data: {
        imageUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id
      }
    })
  } catch (error) {
    next(error)
  }
}

export const productController = {
  createNew,
  getDetails,
  update,
  deleteProduct,
  deleteSelectedProducts,
  getProducts,
  getAllTypes,
  uploadImage
}
