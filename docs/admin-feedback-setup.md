# Thiết lập phân quyền, cổng quản trị và phản hồi

## Cập nhật database

Ứng dụng dùng `public.users` và session cookie riêng; không dùng Supabase Auth `auth.users`. Chạy migration trên đúng database được trỏ bởi `DATABASE_URL`:

```powershell
npm run db:migrate
```

Sau đó cấp quyền admin cho một tài khoản đã đăng ký trong Supabase SQL Editor:

```sql
UPDATE public.users
SET role = 'admin'
WHERE email = lower('email-cua-ban@example.com');
```

Đăng xuất rồi đăng nhập lại để được chuyển đến `/admin`. Tài khoản tạo mới mặc định là `student`; admin có thể tạo giáo viên trong **Quản trị → Tài khoản**.

Migration tạo bảng `feedbacks`, `courses`, `lessons`, `assignments` và `assignment_submissions`; khóa ngoại `feedbacks.user_id` trỏ đến `public.users.id` (kiểu integer) để khớp với hệ thống đăng nhập hiện tại. Các bảng quản trị bật RLS và chỉ cấp policy cho `service_role`. Ứng dụng xác thực và phân quyền ở server qua session cookie; `auth.uid()` không đại diện cho người dùng trong `public.users`.

## Discord webhook

Đặt URL webhook trong biến môi trường **server-side** có tên `DISCORD_FEEDBACK_WEBHOOK_URL` (trong `.env.local` cho máy phát triển; Environment Variables trên Vercel cho từng môi trường cần dùng), rồi khởi động lại hoặc redeploy ứng dụng. Không đặt URL này trong biến `NEXT_PUBLIC_*`, không commit giá trị URL và không chia sẻ URL webhook.

Feedback được ghi vào database trước khi gọi Discord. Nếu Discord lỗi, phản hồi vẫn được lưu và giao diện báo rằng thông báo chưa gửi được; có thể xem lại ở **Quản trị → Phản hồi**.

## Phân quyền

Các trang `/admin/*`, `/teacher/*` và API quản trị/giáo viên đều kiểm tra quyền ở server. Mọi truy vấn nội dung của giáo viên giới hạn theo `teacher_id`; admin có thể quản lý mọi khóa học. Không dùng client-side guard làm lớp bảo vệ duy nhất.
