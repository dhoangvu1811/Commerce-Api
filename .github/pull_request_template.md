# Tiêu đề PR (theo Conventional Commits)

<!-- Ví dụ: feat(voucher): thêm endpoint public GET /V1/vouchers/active -->

## Mô tả

- Tóm tắt ngắn gọn thay đổi và lý do.
- Nêu rõ bối cảnh/issue liên quan.

## Liên kết

- Issue: #
- PR liên quan (nếu có):

## Thay đổi chính

- [ ] API: thêm/sửa/xóa endpoint? Nêu rõ method + path + auth
- [ ] DB/Schema: thay đổi model/migration?
- [ ] Logic: nghiệp vụ chính thay đổi gì?
- [ ] UI (nếu repo FE): cập nhật giao diện?

## Spec API (nếu có thay đổi API)

- Endpoint:
  - Method & Path:
  - Auth: public | user | admin
  - Request: body/query/params (schema tóm tắt)
  - Response mẫu: { code, message, data }
  - Mã lỗi: 400/401/403/404/409/422/500

## Kiểm thử

- [ ] Unit test (nếu có)
- [ ] Kiểm thử thủ công: mô tả các bước kiểm, input/expected
- [ ] Postman/Insomnia collection cập nhật (nếu có)

## Ảnh hưởng & Rủi ro

- Ảnh hưởng đến module:
- Tương thích ngược: yes/no (nếu no: nêu migration/guide)
- Rủi ro tiềm ẩn:
- Kế hoạch rollback: (git revert, tắt feature flag, v.v.)

## Kiểm tra chất lượng

- [ ] Lint pass (npm run lint)
- [ ] Build pass (npm run build)
- [ ] Test pass (npm test nếu có)
- [ ] Smoke test local OK (dev/prod)

## Checklist triển khai

- [ ] ENV/Secrets cập nhật (nếu cần)
- [ ] Migration chạy (nếu có)
- [ ] Thông báo đến các team liên quan (FE/BE/QA/DevOps)

## Ảnh chụp màn hình/Logs (tùy chọn)

- Đính kèm minh họa hành vi mới hoặc lỗi đã fix.
