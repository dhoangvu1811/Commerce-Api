/**
 * Database Seed Script
 * Tạo dữ liệu mẫu cho database E-commerce
 */

import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import {
  PrismaClient,
  UserStatus,
  AccountType,
  VoucherType
} from '../src/generated/prisma/index.js'
import bcryptLib from 'bcrypt'

// Create PostgreSQL connection pool
const connectionString = process.env.DATABASE_URL!
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

// Create Prisma Client with adapter
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Bắt đầu seed database...')

  // 1. Tạo Roles
  console.log('📝 Đang tạo Roles...')
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin' }
  })

  const userRole = await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: { name: 'user' }
  })

  const employeeRole = await prisma.role.upsert({
    where: { name: 'employee' },
    update: {},
    create: { name: 'employee' }
  })

  // 2. Tạo Users (Admin & User)
  console.log('👤 Đang tạo Users...')
  const hashedPassword = await bcryptLib.hash('123456', 10)

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@commerce.vn' },
    update: {},
    create: {
      name: 'Admin Commerce',
      email: 'admin@commerce.vn',
      password: hashedPassword,
      phoneNumber: '0901234567',
      address: '123 Nguyễn Huệ, Q.1, TP.HCM',
      gender: 'male',
      emailVerified: true,
      status: UserStatus.active,
      typeAccount: AccountType.LOCAL,
      roleId: adminRole.id,
      dateOfBirth: new Date('1990-01-01')
    }
  })

  const normalUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      name: 'Nguyễn Văn A',
      email: 'user@example.com',
      password: hashedPassword,
      phoneNumber: '0912345678',
      address: '456 Lê Lợi, Q.1, TP.HCM',
      gender: 'male',
      emailVerified: true,
      status: UserStatus.active,
      typeAccount: AccountType.LOCAL,
      roleId: userRole.id,
      dateOfBirth: new Date('1995-05-15')
    }
  })

  const normalUser2 = await prisma.user.upsert({
    where: { email: 'nguyen.thi.b@gmail.com' },
    update: {},
    create: {
      name: 'Nguyễn Thị B',
      email: 'nguyen.thi.b@gmail.com',
      password: hashedPassword,
      phoneNumber: '0923456789',
      address: '789 Trần Hưng Đạo, Q.5, TP.HCM',
      gender: 'female',
      emailVerified: true,
      status: UserStatus.active,
      typeAccount: AccountType.LOCAL,
      roleId: userRole.id,
      dateOfBirth: new Date('1998-08-20')
    }
  })

  // 3. Tạo Categories
  console.log('📂 Đang tạo Categories...')
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'dien-thoai' },
      update: {},
      create: {
        name: 'Điện thoại',
        slug: 'dien-thoai',
        description: 'Điện thoại di động, smartphone các loại',
        image:
          'https://res.cloudinary.com/demo/image/upload/v1234567890/categories/phone.jpg'
      }
    }),
    prisma.category.upsert({
      where: { slug: 'laptop' },
      update: {},
      create: {
        name: 'Laptop',
        slug: 'laptop',
        description: 'Laptop, máy tính xách tay',
        image:
          'https://res.cloudinary.com/demo/image/upload/v1234567890/categories/laptop.jpg'
      }
    }),
    prisma.category.upsert({
      where: { slug: 'tablet' },
      update: {},
      create: {
        name: 'Tablet',
        slug: 'tablet',
        description: 'Máy tính bảng, iPad',
        image:
          'https://res.cloudinary.com/demo/image/upload/v1234567890/categories/tablet.jpg'
      }
    }),
    prisma.category.upsert({
      where: { slug: 'phu-kien' },
      update: {},
      create: {
        name: 'Phụ kiện',
        slug: 'phu-kien',
        description: 'Phụ kiện điện thoại, tai nghe, sạc dự phòng',
        image:
          'https://res.cloudinary.com/demo/image/upload/v1234567890/categories/accessories.jpg'
      }
    })
  ])

  // 4. Tạo Products
  console.log('📦 Đang tạo Products...')
  const products = await Promise.all([
    // Điện thoại
    prisma.product.upsert({
      where: { slug: 'iphone-15-pro-max' },
      update: {},
      create: {
        name: 'iPhone 15 Pro Max 256GB',
        slug: 'iphone-15-pro-max',
        description:
          'iPhone 15 Pro Max với chip A17 Pro, camera 48MP, titanium cao cấp',
        price: 29990000,
        stock: 50,
        rating: 4.8,
        selled: 45,
        discount: 5,
        categoryId: categories[0].id,
        status: 'active',
        image:
          'https://res.cloudinary.com/demo/image/upload/v1234567890/products/iphone15promax.jpg'
      }
    }),
    prisma.product.upsert({
      where: { slug: 'samsung-galaxy-s24-ultra' },
      update: {},
      create: {
        name: 'Samsung Galaxy S24 Ultra 512GB',
        slug: 'samsung-galaxy-s24-ultra',
        description:
          'Galaxy S24 Ultra với bút S Pen, camera 200MP, màn hình Dynamic AMOLED 2X',
        price: 33990000,
        stock: 30,
        rating: 4.7,
        selled: 28,
        discount: 8,
        categoryId: categories[0].id,
        status: 'active',
        image:
          'https://res.cloudinary.com/demo/image/upload/v1234567890/products/s24ultra.jpg'
      }
    }),
    prisma.product.upsert({
      where: { slug: 'xiaomi-14-pro' },
      update: {},
      create: {
        name: 'Xiaomi 14 Pro 12GB/256GB',
        slug: 'xiaomi-14-pro',
        description: 'Xiaomi 14 Pro với Snapdragon 8 Gen 3, camera Leica',
        price: 18990000,
        stock: 40,
        rating: 4.5,
        selled: 62,
        discount: 10,
        categoryId: categories[0].id,
        status: 'active',
        image:
          'https://res.cloudinary.com/demo/image/upload/v1234567890/products/xiaomi14pro.jpg'
      }
    }),

    // Laptop
    prisma.product.upsert({
      where: { slug: 'macbook-pro-14-m3' },
      update: {},
      create: {
        name: 'MacBook Pro 14" M3 Pro 18GB/512GB',
        slug: 'macbook-pro-14-m3',
        description:
          'MacBook Pro 14 inch với chip M3 Pro, màn hình Liquid Retina XDR',
        price: 52990000,
        stock: 25,
        rating: 4.9,
        selled: 18,
        discount: 3,
        categoryId: categories[1].id,
        status: 'active',
        image:
          'https://res.cloudinary.com/demo/image/upload/v1234567890/products/macbookpro14.jpg'
      }
    }),
    prisma.product.upsert({
      where: { slug: 'dell-xps-15' },
      update: {},
      create: {
        name: 'Dell XPS 15 9530 i7-13700H RTX 4060',
        slug: 'dell-xps-15',
        description:
          'Dell XPS 15 với Intel Core i7 Gen 13, NVIDIA RTX 4060, màn hình OLED 3.5K',
        price: 45990000,
        stock: 15,
        rating: 4.6,
        selled: 12,
        discount: 7,
        categoryId: categories[1].id,
        status: 'active',
        image:
          'https://res.cloudinary.com/demo/image/upload/v1234567890/products/dellxps15.jpg'
      }
    }),

    // Tablet
    prisma.product.upsert({
      where: { slug: 'ipad-pro-12-9-m2' },
      update: {},
      create: {
        name: 'iPad Pro 12.9 inch M2 WiFi 256GB',
        slug: 'ipad-pro-12-9-m2',
        description: 'iPad Pro 12.9" với chip M2, màn hình Liquid Retina XDR',
        price: 28990000,
        stock: 20,
        rating: 4.8,
        selled: 35,
        discount: 5,
        categoryId: categories[2].id,
        status: 'active',
        image:
          'https://res.cloudinary.com/demo/image/upload/v1234567890/products/ipadpro12.jpg'
      }
    }),

    // Phụ kiện
    prisma.product.upsert({
      where: { slug: 'airpods-pro-2' },
      update: {},
      create: {
        name: 'AirPods Pro 2 với MagSafe (USB-C)',
        slug: 'airpods-pro-2',
        description: 'AirPods Pro thế hệ 2 với chip H2, chống ồn chủ động',
        price: 6290000,
        stock: 100,
        rating: 4.7,
        selled: 156,
        discount: 8,
        categoryId: categories[3].id,
        status: 'active',
        image:
          'https://res.cloudinary.com/demo/image/upload/v1234567890/products/airpodspro2.jpg'
      }
    }),
    prisma.product.upsert({
      where: { slug: 'anker-powercore-20000' },
      update: {},
      create: {
        name: 'Anker PowerCore 20000mAh PD 20W',
        slug: 'anker-powercore-20000',
        description: 'Sạc dự phòng Anker 20000mAh, hỗ trợ sạc nhanh PD 20W',
        price: 890000,
        stock: 200,
        rating: 4.5,
        selled: 278,
        discount: 15,
        categoryId: categories[3].id,
        status: 'active',
        image:
          'https://res.cloudinary.com/demo/image/upload/v1234567890/products/anker20000.jpg'
      }
    })
  ])

  // 5. Tạo Vouchers
  console.log('🎟️ Đang tạo Vouchers...')
  await Promise.all([
    prisma.voucher.upsert({
      where: { code: 'WELCOME2024' },
      update: {},
      create: {
        code: 'WELCOME2024',
        type: VoucherType.percent,
        amount: 10,
        maxDiscount: 500000,
        minOrderValue: 1000000,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        usageLimit: 1000,
        usedCount: 0,
        isActive: true,
        description: 'Giảm 10% cho đơn hàng từ 1 triệu, tối đa 500k'
      }
    }),
    prisma.voucher.upsert({
      where: { code: 'FREESHIP50K' },
      update: {},
      create: {
        code: 'FREESHIP50K',
        type: VoucherType.fixed,
        amount: 50000,
        minOrderValue: 500000,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        usageLimit: 5000,
        usedCount: 0,
        isActive: true,
        description: 'Miễn phí vận chuyển 50k cho đơn từ 500k'
      }
    }),
    prisma.voucher.upsert({
      where: { code: 'SALE500K' },
      update: {},
      create: {
        code: 'SALE500K',
        type: VoucherType.fixed,
        amount: 500000,
        minOrderValue: 5000000,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        usageLimit: 100,
        usedCount: 0,
        isActive: true,
        description: 'Giảm 500k cho đơn hàng từ 5 triệu'
      }
    }),
    prisma.voucher.upsert({
      where: { code: 'TET2024' },
      update: {},
      create: {
        code: 'TET2024',
        type: VoucherType.percent,
        amount: 20,
        maxDiscount: 2000000,
        minOrderValue: 3000000,
        startDate: new Date('2024-01-20'),
        endDate: new Date('2024-02-15'),
        usageLimit: 500,
        usedCount: 0,
        isActive: true,
        description: 'Giảm 20% dịp Tết 2024, tối đa 2 triệu'
      }
    })
  ])

  // 6. Tạo Shipping Addresses
  console.log('📍 Đang tạo Shipping Addresses...')
  await Promise.all([
    prisma.shippingAddress.upsert({
      where: { id: 1 },
      update: {},
      create: {
        userId: normalUser.id,
        fullName: 'Nguyễn Văn A',
        phone: '0912345678',
        address: '456 Lê Lợi',
        city: 'TP. Hồ Chí Minh',
        province: 'Hồ Chí Minh',
        postalCode: '700000',
        isDefault: true
      }
    }),
    prisma.shippingAddress.upsert({
      where: { id: 2 },
      update: {},
      create: {
        userId: normalUser2.id,
        fullName: 'Nguyễn Thị B',
        phone: '0923456789',
        address: '789 Trần Hưng Đạo',
        city: 'TP. Hồ Chí Minh',
        province: 'Hồ Chí Minh',
        postalCode: '700000',
        isDefault: true
      }
    })
  ])

  console.log('✅ Seed database hoàn tất!')
  console.log('\n📊 Tóm tắt dữ liệu:')
  console.log(`  - Roles: 3 (admin, user, employee)`)
  console.log(`  - Users: 3 (1 admin, 2 users)`)
  console.log(`  - Categories: ${categories.length}`)
  console.log(`  - Products: ${products.length}`)
  console.log(`  - Vouchers: 4`)
  console.log(`  - Shipping Addresses: 2`)
  console.log('\n🔑 Thông tin đăng nhập:')
  console.log(`  Admin: admin@commerce.vn / 123456`)
  console.log(`  User 1: user@example.com / 123456`)
  console.log(`  User 2: nguyen.thi.b@gmail.com / 123456`)
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
