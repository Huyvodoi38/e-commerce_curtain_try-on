export default function Footer() {
  return (
    <footer className="mt-16 border-t border-brand-200/60 bg-brand-50/60">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm text-brand-800 md:grid-cols-3">
        <div>
          <h3 className="text-base font-semibold text-brand-700">Rèm AI</h3>
          <p className="mt-2 text-brand-700/80">
            Cửa hàng rèm cửa cao cấp ứng dụng AI cho phép bạn xem trước
            mẫu rèm phù hợp với không gian thật của mình.
          </p>
        </div>
        <div>
          <h4 className="font-medium text-brand-700">Liên hệ</h4>
          <ul className="mt-2 space-y-1 text-brand-700/80">
            <li>Email: hello@remai.vn</li>
            <li>Hotline: 0123 456 789</li>
            <li>Địa chỉ: Hà Nội, Việt Nam</li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium text-brand-700">Giờ làm việc</h4>
          <ul className="mt-2 space-y-1 text-brand-700/80">
            <li>Thứ 2 - Thứ 6: 8:30 - 18:00</li>
            <li>Thứ 7: 9:00 - 17:00</li>
            <li>Chủ nhật: Nghỉ</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-brand-200/60 py-4 text-center text-xs text-brand-700/70">
        © {new Date().getFullYear()} Rèm AI. All rights reserved.
      </div>
    </footer>
  );
}
